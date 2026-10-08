'use strict';
const functions = require('firebase-functions/v1');
const {getFirestore,Timestamp} = require('firebase-admin/firestore');
const crypto = require('node:crypto');
const core = require('./commerce-core');
const db = () => getFirestore();
const stamp = () => new Date().toISOString();
const admins = new Set(['admin@drixelsa.co.za','drixelsa@gmail.com']);
function isAdmin(auth) { return !!auth && (auth.token.admin === true || (auth.token.email_verified === true && admins.has(auth.token.email?.toLowerCase()))); }
function requireUser(context) { if (!context.auth?.token.email) core.fail('Please sign in to continue.', 'unauthenticated'); return context.auth; }
const callable = fn => async (data, context) => {
    try { return await fn(data || {}, context); }
    catch (error) { if (error instanceof core.CommerceError) throw new functions.https.HttpsError(error.code,error.message); console.error('Commerce operation failed',error); throw new functions.https.HttpsError('internal','We could not complete this request. Please try again.'); }
};
function origin() { const url = new URL(process.env.STORE_URL || 'https://drixelsa.co.za'); if(url.protocol!=='https:') throw Error('STORE_URL must use HTTPS'); return url.origin; }
async function rateLimit(key, max = 20) {
    const ref=db().collection('request_limits').doc(core.hash(`${key}:${Math.floor(Date.now()/3600000)}`));
    await db().runTransaction(async tx => { const snap=await tx.get(ref); const count=snap.data()?.count || 0; if(count>=max) core.fail('Too many requests. Please try again later.','resource-exhausted'); tx.set(ref,{count:count+1,expiresAt:Timestamp.fromMillis(Date.now()+7200000)}); });
}
async function resolveItems(input) {
    const items=core.normalizeItems(input);
    for (const item of items) {
        const direct=await db().collection('products').doc(item.productId).get();
        if(direct.exists) continue;
        const legacyId=/^\d+$/.test(item.productId)?Number(item.productId):item.productId;
        const matches=await db().collection('products').where('id','==',legacyId).limit(2).get();
        if(matches.size!==1) core.fail('An item is not published in the store. Please remove it and refresh the collection.','failed-precondition');
        item.productId=matches.docs[0].id;
    }
    return core.normalizeItems(items);
}
async function transactionQuote(tx, items, couponCode) {
    const products=new Map();
    for(const id of new Set(items.map(i=>i.productId))) {const snap=await tx.get(db().collection('products').doc(id)); products.set(id,snap.data());}
    const settings=(await tx.get(db().doc('settings/store_config'))).data() || {};
    let coupon=null, couponRef=null;
    if(couponCode) {
        const code=core.text(couponCode,'discount code',40).toUpperCase();
        const matches=await tx.get(db().collection('coupons').where('code','==',code).limit(2));
        if(matches.size!==1) core.fail('This discount code is unavailable.');
        coupon=matches.docs[0].data(); couponRef=matches.docs[0].ref;
    }
    const quote=core.priceItems(items,products);
    const discountCents=core.discountFor(coupon,quote.subtotalCents);
    const shippingCents=quote.subtotalCents>=core.money(settings.freeDeliveryThreshold ?? 1000)?0:core.money(settings.deliveryFee ?? 70);
    const totalCents=quote.subtotalCents-discountCents+shippingCents;
    if(!Number.isSafeInteger(totalCents) || totalCents<=0 || totalCents>100000000) core.fail('Invalid order total.');
    return {...quote,discountCents,shippingCents,totalCents,couponRef,coupon};
}
function publicQuote(q) {return {items:q.lines,subtotal:q.subtotalCents/100,shipping:q.shippingCents/100,discount:q.discountCents/100,total:q.totalCents/100,totalCents:q.totalCents,currency:'ZAR'};}
exports.getCheckoutConfig=functions.https.onCall(callable(async()=>{const settings=(await db().doc('settings/store_config').get()).data() || {}; return {yocoEnabled:process.env.CARD_PAYMENTS_ENABLED==='true',deliveryFee:core.money(settings.deliveryFee ?? 70)/100,freeDeliveryThreshold:core.money(settings.freeDeliveryThreshold ?? 1000)/100};}));
exports.quoteCheckout=functions.https.onCall(callable(async(data,context)=>{
    const user=requireUser(context); await rateLimit(`quote:${user.uid}`,100);
    const items=await resolveItems(data.items);
    return db().runTransaction(async tx=>publicQuote(await transactionQuote(tx,items,data.couponCode)));
}));
exports.createOrder=functions.https.onCall(callable(async(data,context)=>{
    const user=requireUser(context); await rateLimit(`order:${user.uid}`,20);
    if(!['bank','snapscan','yoco'].includes(data.paymentMethod)) core.fail('Choose a payment method.');
    if(data.paymentMethod==='yoco' && process.env.CARD_PAYMENTS_ENABLED!=='true') core.fail('Card payments are currently unavailable. Choose bank transfer or SnapScan.','failed-precondition');
    if(!/^[a-zA-Z0-9_-]{16,80}$/.test(data.requestId || '')) core.fail('Invalid checkout request. Please reload.');
    const shippingCustomer=core.customer(data.customer,user.token.email);
    const normalized=core.normalizeItems(data.items);
    const fingerprint=core.hash(JSON.stringify({items:normalized,customer:shippingCustomer,method:data.paymentMethod,coupon:data.couponCode || '',expectedTotalCents:data.expectedTotalCents}));
    const id=core.hash(`${user.uid}:${data.requestId}`).slice(0,32), ref=db().collection('orders').doc(id);
    // Check idempotency before resolving products: a successful retry must work even after a product is archived.
    const previous=await ref.get();
    if(previous.exists) { if(previous.data().requestFingerprint!==fingerprint) core.fail('This checkout changed. Start a new checkout.','already-exists'); return orderResult(id,previous.data()); }
    const items=await resolveItems(normalized);
    return db().runTransaction(async tx=>{
        const existing=await tx.get(ref);
        if(existing.exists) {if(existing.data().requestFingerprint!==fingerprint) core.fail('This checkout changed.','already-exists'); return orderResult(id,existing.data());}
        const q=await transactionQuote(tx,items,data.couponCode);
        if(data.expectedTotalCents!==q.totalCents) core.fail('Prices or delivery charges changed. Review your bag again.','failed-precondition');
        const order={...publicQuote(q),userId:user.uid,customer:shippingCustomer,orderNumber:`DRX-${id.slice(0,16).toUpperCase()}`,order_id:`DRX-${id.slice(0,16).toUpperCase()}`,
            paymentMethod:data.paymentMethod,paymentStatus:'pending',status:'pending',createdAt:stamp(),updatedAt:stamp(),requestFingerprint:fingerprint,
            reservationExpiresAt:Timestamp.fromMillis(Date.now()+(data.paymentMethod==='yoco'?30*60000:48*3600000)),stockReleased:false,
            couponId:q.couponRef?.id || null,subscribed:data.subscribed===true};
        for(const [productId,change] of q.changes) {const update={}; if(change.stock!==null) update.stock=change.stock; if(change.variants) update.variants=change.variants; if(Object.keys(update).length) tx.update(db().collection('products').doc(productId),update);}
        if(q.couponRef) tx.update(q.couponRef,{usedCount:(q.coupon.usedCount || 0)+1});
        tx.create(ref,order);
        return orderResult(id,order);
    });
}));
function orderResult(id,order) {return {id,orderNumber:order.orderNumber,total:order.total,totalCents:order.totalCents,paymentMethod:order.paymentMethod,paymentStatus:order.paymentStatus,status:order.status};}
exports.startYocoCheckout=functions.runWith({secrets:['YOCO_SECRET_KEY']}).https.onCall(callable(async(data,context)=>{
    const user=requireUser(context); await rateLimit(`payment:${user.uid}`,30);
    if(process.env.CARD_PAYMENTS_ENABLED!=='true' || !process.env.YOCO_SECRET_KEY) core.fail('Card payments are unavailable.','failed-precondition');
    const id=core.text(data.orderId,'order',80); if(id.includes('/')) core.fail('Invalid order.');
    const ref=db().collection('orders').doc(id), snap=await ref.get(), order=snap.data();
    if(!order || order.userId!==user.uid) core.fail('Order not found.','not-found');
    if(order.paymentMethod!=='yoco' || order.paymentStatus!=='pending' || order.stockReleased || order.reservationExpiresAt?.toMillis()<=Date.now()) core.fail('This payment session is no longer available.','failed-precondition');
    if(order.checkoutUrl) return {redirectUrl:order.checkoutUrl};
    const response=await fetch('https://payments.yoco.com/api/checkouts',{method:'POST',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${process.env.YOCO_SECRET_KEY}`,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({amount:order.totalCents,currency:'ZAR',externalId:id,metadata:{orderId:id},successUrl:`${origin()}/orderConfirmation.html?order=${id}`,cancelUrl:`${origin()}/orderConfirmation.html?order=${id}&payment=cancelled`,failureUrl:`${origin()}/orderConfirmation.html?order=${id}&payment=failed`})});
    const checkout=await response.json();
    if(!response.ok || !checkout.id || !checkout.redirectUrl) {console.error('Yoco checkout request failed',response.status); core.fail('The payment provider is unavailable. Your unpaid order is saved; please retry.','unavailable');}
    const url=new URL(checkout.redirectUrl);
    if(url.protocol!=='https:' || !(url.hostname==='yoco.com' || url.hostname.endsWith('.yoco.com'))) throw Error('Unexpected payment redirect');
    const mode=process.env.YOCO_SECRET_KEY.startsWith('sk_live_')?'live':'test';
    await db().runTransaction(async tx=>{const current=(await tx.get(ref)).data(); if(current.stockReleased || current.paymentStatus!=='pending') core.fail('This order is no longer payable.','failed-precondition'); tx.update(ref,{checkoutId:checkout.id,checkoutUrl:url.href,paymentMode:mode});});
    return {redirectUrl:url.href};
}));
exports.yocoWebhook=functions.runWith({secrets:['YOCO_WEBHOOK_SECRET']}).https.onRequest(async(req,res)=>{
    if(req.method!=='POST') return res.status(405).send('POST required');
    if(!core.verifyWebhook(req.headers,req.rawBody,process.env.YOCO_WEBHOOK_SECRET)) return res.status(401).send('Invalid signature');
    try {
        const event=req.body;
        if(event.type!=='payment.succeeded') return res.status(200).send('Ignored');
        const checkoutId=event.payload?.metadata?.checkoutId;
        if(typeof checkoutId!=='string') return res.status(400).send('Missing checkout');
        const matches=await db().collection('orders').where('checkoutId','==',checkoutId).limit(2).get();
        // A webhook may race the checkout response. Ask Yoco to retry instead of discarding it.
        if(matches.size!==1) return res.status(503).send('Checkout not yet reconciled');
        const eventRef=db().collection('payment_events').doc(core.hash(event.id || req.headers['webhook-id']));
        await db().runTransaction(async tx=>{const seen=await tx.get(eventRef), snap=await tx.get(matches.docs[0].ref); if(seen.exists) return; const update=core.paymentUpdate(snap.data(),event); if(update) tx.update(snap.ref,{...update,updatedAt:stamp()}); tx.create(eventRef,{orderId:snap.id,processedAt:stamp()});});
        return res.status(200).send('Received');
    } catch(error) {console.error('Payment reconciliation failed',error.message); return res.status(500).send('Reconciliation failed');}
});
// Read all stock documents before writes; released orders cannot be released twice.
async function releaseStock(tx,order) {
    const products=new Map();
    for(const item of order.items || []) {const id=item.productId || item.id; if((item.stockTracked || item.variantTracked) && !products.has(id)) products.set(id,await tx.get(db().collection('products').doc(id)));}
    let coupon=null; if(order.couponId) coupon=await tx.get(db().collection('coupons').doc(order.couponId));
    for(const [id,snap] of products) {
        if(!snap.exists) continue;
        const p=snap.data(), update={};
        for(const item of order.items.filter(i=>(i.productId || i.id)===id)) {
            if(item.stockTracked && Number.isInteger(p.stock)) p.stock+=item.quantity;
            if(item.variantTracked && Array.isArray(p.variants)) {const v=p.variants.find(v=>v.size===item.size && v.color===item.color); if(v && Number.isInteger(v.stock)) v.stock+=item.quantity;}
        }
        if(Number.isInteger(p.stock)) update.stock=p.stock;
        if(Array.isArray(p.variants)) update.variants=p.variants;
        if(Object.keys(update).length) tx.update(snap.ref,update);
    }
    if(coupon?.exists) tx.update(coupon.ref,{usedCount:Math.max(0,(coupon.data().usedCount || 0)-1)});
}
async function requireAdminDevice(user) {
 const policy=(await db().doc('admin_security/'+user.uid).get()).data(),config=(await db().doc('security_config/admin').get()).data(),token=user.token,now=Date.now()/1000,stamp=Number(token.drixel_admin_verified_at);
 if(token.drixel_admin_access_id){const id=token.drixel_admin_access_id,grant=/^[a-f0-9]{64}$/.test(id)?(await db().doc('admin_access/'+id).get()).data():null;if(!grant?.active||grant.uid!==user.uid||grant.version!==token.drixel_admin_access_version)core.fail('Administrator access has been removed.','permission-denied');}
 if((config?.authenticatorRequired===true&&(!policy?.totpEnabled||token.drixel_admin_method!=='totp'))||(policy?.totpEnabled&&token.drixel_admin_method!=='totp')||(config?.passkeysRequired&&!policy?.enabled)||(policy?.enabled&&!(token.drixel_admin_key_version===policy.version&&Number.isFinite(stamp)&&stamp<=now&&stamp>now-900)))core.fail('Verify your administrator security to continue.','permission-denied');
}
exports.adminOrderAction=functions.https.onCall(callable(async(data,context)=>{
    if(!isAdmin(context.auth)) core.fail('Verified administrator access required.','permission-denied');
    await requireAdminDevice(context.auth);
    const id=core.text(data.orderId,'order',100); if(id.includes('/')) core.fail('Invalid order.');
    const ref=db().collection('orders').doc(id);
    await db().runTransaction(async tx=>{
        const snap=await tx.get(ref); if(!snap.exists) core.fail('Order not found.','not-found');
        const order=snap.data(), update=core.adminUpdate(order,data);
        if(update.status==='cancelled' && !order.stockReleased) {await releaseStock(tx,order); update.stockReleased=true; update.reservationExpiresAt=null;}
        if(!Object.keys(update).length) return;
        tx.update(ref,{...update,updatedAt:stamp()});
        tx.create(db().collection('order_audit').doc(),{orderId:id,actor:context.auth.uid,action:data.action || data.status,at:stamp()});
    });
    return {success:true};
}));
exports.expireReservations=functions.pubsub.schedule('every 15 minutes').onRun(async()=>{
    const expired=await db().collection('orders').where('reservationExpiresAt','<=',Timestamp.now()).limit(100).get();
    for(const doc of expired.docs) await db().runTransaction(async tx=>{const snap=await tx.get(doc.ref),order=snap.data(); if(order.stockReleased || order.paymentStatus==='paid' || !order.reservationExpiresAt || order.reservationExpiresAt.toMillis()>Date.now()) return; await releaseStock(tx,order); tx.update(doc.ref,{stockReleased:true,status:'cancelled',reservationExpiresAt:null,updatedAt:stamp()});});
});
exports.getOrder=functions.https.onCall(callable(async(data,context)=>{
    const user=requireUser(context); await rateLimit(`track:${user.uid}`,100);
    const id=core.text(data.orderId,'order number',100); if(id.includes('/')) core.fail('Invalid order.');
    let snap=await db().collection('orders').doc(id).get();
    if(!snap.exists) {const q=await db().collection('orders').where('orderNumber','==',id.toUpperCase()).limit(1).get(); snap=q.docs[0];}
    const order=snap?.data();
    const owner=order?.userId===user.uid || (!order?.userId && user.token.email_verified===true && order?.customer?.email===user.token.email);
    if(!order || (!owner && !isAdmin(user))) core.fail('Order not found for this account.','not-found');
    if(!owner)await requireAdminDevice(user);
    return {id:snap.id,orderNumber:order.orderNumber,status:order.status,paymentStatus:order.paymentStatus,paymentMethod:order.paymentMethod,total:order.total,shipping:order.shipping,trackingNumber:order.trackingNumber || '',courierService:order.courierService || '',trackingUrl:order.trackingUrl || '',stockReleased:order.stockReleased===true};
}));
exports.isStoreAdmin=isAdmin;
exports._internal={transactionQuote,releaseStock};

