const {test,before,after,beforeEach}=require('node:test');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,updateDoc,collection,getDocs}=require('firebase/firestore');
const fs=require('node:fs');
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-drixel',firestore:{rules:fs.readFileSync('firestore.rules','utf8')}});});
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{await env.clearFirestore();await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();await setDoc(doc(db,'security_config/admin'),{passkeysRequired:false});await setDoc(doc(db,'orders/one'),{userId:'alice',customer:{email:'alice@example.com'},total:100,paymentStatus:'pending'});await setDoc(doc(db,'settings/store_config'),{deliveryFee:70,resendApiKey:'legacy-must-not-be-public'});});});
const user=(uid,claims={})=>env.authenticatedContext(uid,{email:uid+'@example.com',...claims}).firestore();
test('customers cannot create paid or unpaid orders directly',async()=>{for(const paymentStatus of ['paid','pending']) await assertFails(setDoc(doc(user('alice'),'orders/new'),{userId:'alice',customer:{email:'alice@example.com'},total:1,paymentStatus}));});
test('order owner can read, another account cannot; clients cannot modify payment',async()=>{await assertSucceeds(getDoc(doc(user('alice'),'orders/one')));await assertFails(getDoc(doc(user('bob'),'orders/one')));await assertFails(updateDoc(doc(user('alice'),'orders/one'),{paymentStatus:'paid'}));});
test('administrator writes also use audited server actions',async()=>{const db=user('admin',{admin:true});await assertSucceeds(getDoc(doc(db,'orders/one')));await assertFails(updateDoc(doc(db,'orders/one'),{paymentStatus:'paid'}));});
test('an unverified administrator email grants no access',async()=>{const db=user('fake',{email:'admin@drixelsa.co.za',email_verified:false});await assertFails(setDoc(doc(db,'products/test'),{price:1}));await assertFails(getDocs(collection(db,'orders')));});
test('verified administrator can manage products',async()=>{await assertSucceeds(setDoc(doc(user('admin',{email:'admin@drixelsa.co.za',email_verified:true}),'products/test'),{price:100}));});
test('profiles cannot self-assign or update privileged roles',async()=>{const db=user('alice');await assertFails(setDoc(doc(db,'users/alice'),{role:'admin'}));await assertSucceeds(setDoc(doc(db,'users/alice'),{role:'customer',name:'Alice'}));await assertFails(updateDoc(doc(db,'users/alice'),{role:'admin'}));await assertSucceeds(updateDoc(doc(db,'users/alice'),{name:'New name'}));});
test('carts are private to each account',async()=>{await assertSucceeds(setDoc(doc(user('alice'),'carts/alice'),{items:[],updatedAt:'now'}));await assertFails(getDoc(doc(user('bob'),'carts/alice')));await assertFails(setDoc(doc(user('alice'),'carts/bob'),{items:[]}));});
test('newsletter lists, contact inbox and legacy settings cannot be read publicly',async()=>{const db=env.unauthenticatedContext().firestore();for(const path of ['subscribers','contacts','mail_jobs']) await assertFails(getDocs(collection(db,path)));await assertFails(getDoc(doc(db,'settings/store_config')));await assertFails(setDoc(doc(db,'subscribers/one'),{email:'x@example.com'}));});
test('public product reads remain available',async()=>{await assertSucceeds(getDocs(collection(env.unauthenticatedContext().firestore(),'products')));});

const serverRequire=require('node:module').createRequire(require('node:path').resolve('functions/index.js'));
serverRequire('firebase-admin/app').initializeApp({projectId:'demo-drixel'});
const {getFirestore}=serverRequire('firebase-admin/firestore');
const commerce=require('../functions/commerce');
const crypto=require('node:crypto');
const ctx={auth:{uid:'alice',token:{email:'alice@example.com'}}};
const input={requestId:'checkout_request_123456',paymentMethod:'bank',expectedTotalCents:17000,items:[{productId:'tee',size:'M',color:'Black',quantity:1}],customer:{name:'Alice',email:'alice@example.com',phone:'0123456789',address:'10 Street',city:'Cape Town',province:'Western Cape',postalCode:'7700'}};
async function seedStock(stock=1){await getFirestore().doc('products/tee').set({name:'Tee',price:100,sizes:['M'],colors:[{name:'Black'}],stock,status:'active'});}
test('server rejects tampered totals without consuming stock',async()=>{await seedStock();await require('node:assert/strict').rejects(commerce.createOrder.run({...input,expectedTotalCents:1},ctx));require('node:assert/strict').equal((await getFirestore().doc('products/tee').get()).data().stock,1);});
test('repeated checkout request returns one order and decrements stock once',async()=>{await seedStock(2);const [a,b]=await Promise.all([commerce.createOrder.run(input,ctx),commerce.createOrder.run(input,ctx)]);const assert=require('node:assert/strict');assert.equal(a.id,b.id);assert.equal((await getFirestore().doc('products/tee').get()).data().stock,1);assert.equal(a.paymentStatus,'pending');});
test('concurrent customers cannot buy the same last item',async()=>{await seedStock();const results=await Promise.allSettled([commerce.createOrder.run(input,ctx),commerce.createOrder.run({...input,requestId:'another_request_123456'},ctx)]);require('node:assert/strict').equal(results.filter(r=>r.status==='fulfilled').length,1);require('node:assert/strict').equal((await getFirestore().doc('products/tee').get()).data().stock,0);});
test('cancelling an unpaid order restores stock exactly once',async()=>{await seedStock();const order=await commerce.createOrder.run(input,ctx);const action={orderId:order.id,status:'cancelled'},adminCtx={auth:{uid:'admin',token:{admin:true}}};await commerce.adminOrderAction.run(action,adminCtx);await commerce.adminOrderAction.run(action,adminCtx);require('node:assert/strict').equal((await getFirestore().doc('products/tee').get()).data().stock,1);});
test('order lookup never reveals another customer order',async()=>{await seedStock();const order=await commerce.createOrder.run(input,ctx);await require('node:assert/strict').rejects(commerce.getOrder.run({orderId:order.id},{auth:{uid:'bob',token:{email:'bob@example.com'}}}));require('node:assert/strict').equal((await commerce.getOrder.run({orderId:order.orderNumber},ctx)).id,order.id);});
test('webhook handler verifies the signature and ignores duplicate delivery',async()=>{
    await seedStock();const order=await commerce.createOrder.run(input,ctx);
    await getFirestore().doc('orders/'+order.id).update({paymentMethod:'yoco',checkoutId:'checkout_123',paymentMode:'live'});
    process.env.YOCO_WEBHOOK_SECRET='whsec_'+Buffer.from('integration-secret').toString('base64');
    const body={id:'evt123',type:'payment.succeeded',payload:{id:'payment123',amount:17000,currency:'ZAR',mode:'live',status:'succeeded',metadata:{checkoutId:'checkout_123'}}},rawBody=Buffer.from(JSON.stringify(body)),timestamp=String(Math.floor(Date.now()/1000));
    const sig=crypto.createHmac('sha256',Buffer.from('integration-secret')).update('evt123.'+timestamp+'.').update(rawBody).digest('base64');
    const req={method:'POST',body,rawBody,headers:{'webhook-id':'evt123','webhook-timestamp':timestamp,'webhook-signature':'v1,'+sig}};
    const statuses=[];const res={status(s){statuses.push(s);return this;},send(){return this;}};
    await commerce.yocoWebhook(req,res);await commerce.yocoWebhook(req,res);
    const assert=require('node:assert/strict');assert.deepEqual(statuses,[200,200]);assert.equal((await getFirestore().doc('orders/'+order.id).get()).data().paymentStatus,'paid');assert.equal((await getFirestore().doc('products/tee').get()).data().stock,0);
});
const notifications=require('../functions/notifications');
test('newsletter signup queues confirmation exactly once and stays pending',async()=>{
    await notifications.subscribeNewsletter.run({email:'subscriber@example.com'},{rawRequest:{ip:'127.0.0.1'}});
    await notifications.subscribeNewsletter.run({email:'subscriber@example.com'},{rawRequest:{ip:'127.0.0.1'}});
    const assert=require('node:assert/strict');assert.equal((await getFirestore().collection('mail_jobs').get()).size,1);assert.equal((await getFirestore().collection('subscribers').get()).docs[0].data().status,'pending');
});
test('mail delivery reports provider rejection and retries with a stable idempotency key',async()=>{
    const ref=getFirestore().doc('mail_jobs/testmail');await ref.set({status:'queued',to:['alice@example.com'],subject:'Test',html:'<p>Test</p>'});
    const original=global.fetch;process.env.RESEND_API_KEY='fake-test-key';let calls=0;const assert=require('node:assert/strict');
    try {
        global.fetch=async()=>({ok:false,status:422,json:async()=>({error:'rejected'})});
        await assert.rejects(notifications.deliverMail.run(await ref.get(),{params:{id:'testmail'}}));assert.equal((await ref.get()).data().status,'failed');
        global.fetch=async(url,options)=>{calls++;assert.equal(options.headers['Idempotency-Key'],'testmail');return {ok:true,status:200,json:async()=>({id:'email123'})};};
        await notifications.deliverMail.run(await ref.get(),{params:{id:'testmail'}});await notifications.deliverMail.run(await ref.get(),{params:{id:'testmail'}});
        assert.equal((await ref.get()).data().status,'sent');assert.equal(calls,1);
    } finally {global.fetch=original;}
});


test('campaign queue records are server-owned while administrators can edit drafts',async()=>{const db=user('admin',{admin:true});await assertSucceeds(setDoc(doc(db,'email_campaigns/draft'),{status:'draft',subject:'Test'}));await assertSucceeds(updateDoc(doc(db,'email_campaigns/draft'),{subject:'Edited'}));await assertFails(updateDoc(doc(db,'email_campaigns/draft'),{status:'queued'}));for(const name of ['campaign_jobs','email_deliveries','email_events','email_suppressions','operations_health']){await assertFails(setDoc(doc(db,name+'/test'),{status:'pending'}));await assertSucceeds(getDocs(collection(db,name)));await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(),name)));}await assertFails(getDoc(doc(db,'campaign_keys/test')));});
test('only safe storefront settings are public',async()=>{await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'settings/store'),{brandName:'Drixel'});await setDoc(doc(ctx.firestore(),'settings/storefront'),{resendApiKey:'private'});});const db=env.unauthenticatedContext().firestore();await assertSucceeds(getDoc(doc(db,'settings/store')));await assertFails(getDoc(doc(db,'settings/storefront')));await assertFails(getDoc(doc(db,'settings/markets')));});

test('studio media metadata is restricted to administrators',async()=>{const admin=user('admin',{admin:true});await assertSucceeds(setDoc(doc(admin,'media_assets/photo'),{url:'https://example.com/image.png'}));await assertSucceeds(getDocs(collection(admin,'media_assets')));await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(),'media_assets')));await assertFails(setDoc(doc(user('alice'),'media_assets/customer'),{url:'https://example.com/fake.png'}));});

test('passkey protection cannot be bypassed by directly writing to Firestore',async()=>{
 const stamp=Math.floor(Date.now()/1000);await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'security_config/admin'),{passkeysRequired:true});await setDoc(doc(ctx.firestore(),'admin_security/admin'),{enabled:true,version:'v1'});});
 await assertFails(setDoc(doc(user('admin',{admin:true}),'products/passkey'),{price:100}));
 await assertSucceeds(setDoc(doc(user('admin',{admin:true,drixel_admin_verified_at:stamp,drixel_admin_key_version:'v1'}),'products/passkey'),{price:100}));
 for(const claims of [{drixel_admin_verified_at:stamp-901,drixel_admin_key_version:'v1'},{drixel_admin_verified_at:stamp+60,drixel_admin_key_version:'v1'},{drixel_admin_verified_at:stamp,drixel_admin_key_version:'old'}])await assertFails(setDoc(doc(user('admin',{admin:true,...claims}),'products/blocked'),{price:100}));
 await assertFails(setDoc(doc(user('admin',{admin:true,drixel_admin_verified_at:stamp,drixel_admin_key_version:'v1'}),'admin_security/admin'),{enabled:false}));
});

test('public clients cannot enumerate discount codes or write arbitrary contact documents',async()=>{
 const db=env.unauthenticatedContext().firestore();await assertFails(getDocs(collection(db,'coupons')));await assertFails(setDoc(doc(db,'contacts/spam'),{html:'arbitrary content'}));
 await assertSucceeds(setDoc(doc(user('admin',{admin:true}),'coupons/test'),{code:'PRIVATE',active:true}));
});

test('reviews stay private until moderation and cannot self-publish or spoof authors',async()=>{
 const {serverTimestamp,query,where}=require('firebase/firestore');
 await env.withSecurityRulesDisabled(async ctx=>setDoc(doc(ctx.firestore(),'products/tee'),{name:'Tee'}));
 const db=user('alice'),ref=doc(db,'product_reviews/tee_alice'),review={productId:'tee',userId:'alice',author:'Alice',body:'Fits comfortably and feels good.',rating:4,status:'pending',updatedAt:serverTimestamp()};
 await assertSucceeds(setDoc(ref,review));
 await assertFails(getDoc(doc(user('bob'),'product_reviews/tee_alice')));
 await assertFails(setDoc(ref,{...review,status:'published'}));
 await assertFails(setDoc(ref,{...review,rating:6}));
 await assertFails(setDoc(ref,{...review,userId:'bob'}));
 await assertSucceeds(updateDoc(doc(user('admin',{admin:true}),'product_reviews/tee_alice'),{status:'published'}));
 await assertSucceeds(getDocs(query(collection(env.unauthenticatedContext().firestore(),'product_reviews'),where('productId','==','tee'),where('status','==','published'))));
});
test('feedback is private and only administrators can resolve a concern',async()=>{
 const {serverTimestamp}=require('firebase/firestore');const ref=doc(user('alice'),'customer_feedback/concern');
 await assertSucceeds(setDoc(ref,{userId:'alice',category:'Fit & sizing',orderReference:'',message:'Please help me choose the right size.',status:'new',createdAt:serverTimestamp()}));
 await assertSucceeds(getDoc(ref));await assertFails(getDoc(doc(user('bob'),'customer_feedback/concern')));await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'customer_feedback/concern')));
 await assertFails(updateDoc(ref,{status:'resolved'}));await assertSucceeds(updateDoc(doc(user('admin',{admin:true}),'customer_feedback/concern'),{status:'resolved'}));
});

test('missing security configuration denies administrator writes by default',async()=>{
 const {deleteDoc}=require('firebase/firestore');
 await env.withSecurityRulesDisabled(async ctx=>{await deleteDoc(doc(ctx.firestore(),'security_config/admin'));});
 await assertFails(setDoc(doc(user('admin',{admin:true}),'products/unprotected'),{price:1}));
});
