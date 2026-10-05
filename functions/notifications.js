'use strict';
const functions=require('firebase-functions/v1');
const {getFirestore,Timestamp}=require('firebase-admin/firestore');
const crypto=require('node:crypto');
const {hash,email,text,escapeHtml:e,CommerceError}=require('./commerce-core');
const db=()=>getFirestore();
const storeUrl=()=>new URL(process.env.STORE_URL || 'https://drixelsa.co.za').origin;
async function enqueue(id,job) {
    try {await db().collection('mail_jobs').doc(hash(id)).create({...job,status:'queued',createdAt:new Date().toISOString()});}
    catch(error) {if(error.code!==6 && error.code!=='already-exists') throw error;}
}
async function sendMail(job,key) {
    if(!process.env.RESEND_API_KEY) throw Error('RESEND_API_KEY is not configured');
    const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:process.env.MAIL_FROM || 'Drixel SA <info@customer.drixelsa.co.za>',to:job.to,subject:job.subject,html:job.html,...(job.cc?.length?{cc:job.cc}:{}),...(job.replyTo?{reply_to:job.replyTo}:{})})});
    const data=await response.json();
    if(!response.ok || !data.id || data.error) throw Error(`Email provider rejected request (${response.status})`);
    return data.id;
}
exports.deliverMail=functions.runWith({secrets:['RESEND_API_KEY'],failurePolicy:true}).firestore.document('mail_jobs/{id}').onCreate(async(snap,context)=>{
    const current=(await snap.ref.get()).data(); if(current.status==='sent' || current.status==='needs_review') return;
    // Resend retains idempotency keys for 24 hours. Do not risk a duplicate after that window.
    if(current.firstAttemptAt && Date.now()-Date.parse(current.firstAttemptAt)>23*3600000) {await snap.ref.update({status:'needs_review'}); return;}
    await snap.ref.update({firstAttemptAt:current.firstAttemptAt || new Date().toISOString(),status:'sending'});
    try {const providerId=await sendMail(current,context.params.id); await snap.ref.update({status:'sent',providerId,sentAt:new Date().toISOString()});}
    catch(error) {await snap.ref.update({status:'failed',lastError:error.message}); throw error;}
});
exports.orderNotifications=functions.runWith({failurePolicy:true}).firestore.document('orders/{id}').onWrite(async(change,context)=>{
    if(!change.after.exists) return;
    const order=change.after.data(), before=change.before.data();
    let event=!before?'received':before.paymentStatus!==order.paymentStatus && order.paymentStatus==='paid'?'payment verified':before.status!==order.status?order.status:null;
    if(!event) return;
    const reference=e(order.orderNumber || context.params.id), link=`${storeUrl()}/orderConfirmation.html?order=${encodeURIComponent(context.params.id)}`;
    let detail=`Your order is ${e(event)}. Payment status: ${e(order.paymentStatus)}.`;
    if(order.status==='payment_review') detail='Your payment was received after the stock reservation expired. Our team must reconcile availability before shipping.';
    if(order.status==='cancelled') detail='This order was cancelled and its stock reservation was released. Do not make a payment against it. Contact us if you already paid.';
    let instructions='';
    if(order.paymentStatus!=='paid' && order.status==='pending') {
        if(order.paymentMethod==='bank') instructions=`<p>Bank: Standard Bank<br>Account name: Drixel SA<br>Account number: 071337873<br>Reference: ${reference}</p><p>Pay within 48 hours. Dispatch starts only after verification.</p>`;
        if(order.paymentMethod==='snapscan') instructions=`<p><a href="https://pos.snapscan.io/qr/qvxSxlIE?amount=${order.totalCents}&amp;reference=${encodeURIComponent(order.orderNumber)}">Pay with SnapScan</a>. Reference: ${reference}. Pay within 48 hours. Payment requires manual verification.</p>`;
    }
    const html=`<h1>Drixel SA</h1><h2>Order ${reference}</h2><p>${detail}</p><p>Total: R${Number(order.total).toFixed(2)}</p>${instructions}<p><a href="${link}">View your order</a> (sign-in required)</p><p>Questions? Reply to our support team at info@drixelsa.co.za.</p>`;
    await enqueue(`${context.eventId}:customer`,{to:[email(order.customer.email)],subject:`Drixel SA — order ${order.orderNumber}: ${event}`,html});
    if(!before || order.status==='payment_review') await enqueue(`${context.eventId}:admin`,{to:[process.env.ORDER_ADMIN_EMAIL || 'drixelsa@gmail.com'],subject:`Drixel order ${order.orderNumber}: ${event}`,html});
    if(!before && order.subscribed) await subscribe(order.customer.email);
});
async function publicRateLimit(context) {
    const key=hash(`${context.rawRequest?.ip || 'unknown'}:${Math.floor(Date.now()/3600000)}`),ref=db().collection('request_limits').doc(key);
    await db().runTransaction(async tx=>{const snap=await tx.get(ref),count=snap.data()?.count || 0; if(count>=5) throw new functions.https.HttpsError('resource-exhausted','Please try again later.'); tx.set(ref,{count:count+1,expiresAt:Timestamp.fromMillis(Date.now()+7200000)});});
}
async function subscribe(address) {
    const normalized=email(address), id=hash(normalized), ref=db().collection('subscribers').doc(id),token=crypto.randomBytes(32).toString('hex');
    await db().runTransaction(async tx=>{
        const snap=await tx.get(ref),old=snap.data();
        if(old?.status==='active' || (old?.requestedAt && Date.now()-Date.parse(old.requestedAt)<86400000)) return;
        tx.set(ref,{email:normalized,status:'pending',tokenHash:hash(token),requestedAt:new Date().toISOString(),consent:'newsletter-v1'});
        tx.create(db().collection('mail_jobs').doc(hash(`subscribe:${id}:${token}`)),{
            to:[normalized],subject:'Confirm your Drixel SA updates',status:'queued',createdAt:new Date().toISOString(),
            html:`<h1>Drixel SA</h1><p>Confirm that you want to receive collection news and offers.</p><p><a href="${storeUrl()}/api/newsletter?id=${id}&amp;token=${token}">Manage subscription</a></p><p>If you did not request this, ignore this email. You are not subscribed yet.</p>`
        });
    });
}
exports.subscribeNewsletter=functions.https.onCall(async(data,context)=>{try {await publicRateLimit(context); await subscribe(data?.email); return {success:true,message:'If needed, a confirmation email will be sent. Check your inbox to complete signup.'};} catch(error) {if(error instanceof CommerceError) throw new functions.https.HttpsError(error.code,error.message); if(error instanceof functions.https.HttpsError) throw error; console.error(error); throw new functions.https.HttpsError('internal','Signup is temporarily unavailable.');}});
exports.newsletterPreferences=functions.https.onRequest(async(req,res)=>{
    res.set('Cache-Control','no-store'); res.set('Referrer-Policy','no-referrer'); res.set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");
    if(!['GET','POST'].includes(req.method)) return res.status(405).send('Method not allowed');
    const {id,token}=req.query;
    if(typeof id!=='string' || !/^[a-f0-9]{64}$/.test(id) || typeof token!=='string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).send('Invalid link');
    const ref=db().collection('subscribers').doc(id);
    try {
        const snap=await ref.get(),s=snap.data();
        if(!s || s.tokenHash!==hash(token)) return res.status(400).send('This link is no longer valid.');
        if(req.method==='POST') {
            const action=req.body?.action;
            if(!['confirm','unsubscribe'].includes(action)) return res.status(400).send('Invalid action');
            await db().runTransaction(async tx=>{const current=(await tx.get(ref)).data(); if(current.tokenHash!==hash(token)) throw Error('Expired token'); tx.update(ref,{status:action==='confirm'?'active':'unsubscribed',updatedAt:new Date().toISOString()});});
            return res.status(200).send(action==='confirm'?'You are subscribed to Drixel SA updates. Keep this link to unsubscribe.':'You have unsubscribed from Drixel SA marketing emails.');
        }
        return res.status(200).send(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Drixel SA subscriptions</title><body style="font:18px Arial;max-width:600px;margin:60px auto;padding:24px"><h1>Drixel SA</h1><p>Manage your email updates.</p><form method="post"><button name="action" value="confirm">Confirm subscription</button> <button name="action" value="unsubscribe">Unsubscribe</button></form></body></html>`);
    } catch(error) {console.error('Newsletter preference update failed',error.message); return res.status(500).send('Please try again later.');}
});
exports.sendContact=functions.https.onCall(async(data,context)=>{
    try {
        await publicRateLimit(context);
        const contact={name:text(data?.name,'name',100),email:email(data?.email),subject:text(data?.subject,'subject',200),message:text(data?.message,'message',4000,true),createdAt:new Date().toISOString()};
        const ref=await db().collection('contacts').add(contact);
        await enqueue(`contact:${ref.id}`,{to:[process.env.ORDER_ADMIN_EMAIL || 'drixelsa@gmail.com'],replyTo:contact.email,subject:`Drixel enquiry: ${contact.subject}`,html:`<p>From ${e(contact.name)} (${e(contact.email)})</p><p>${e(contact.message).replace(/\n/g,'<br>')}</p>`});
        return {success:true};
    } catch(error) {if(error instanceof CommerceError) throw new functions.https.HttpsError(error.code,error.message); if(error instanceof functions.https.HttpsError) throw error; console.error(error); throw new functions.https.HttpsError('internal','Your message could not be submitted.');}
});
exports.sendMail=sendMail;
