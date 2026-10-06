'use strict';
const crypto = require('node:crypto');
const {submitBatch, unsubscribeMarkup, deliveryKey, pause} = require('./marketing-delivery');
const email = value => String(value || '').trim().toLowerCase();
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const active = s => validEmail(email(s.email)) && !s.suppressed && (!s.status || s.status === 'active');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function segment(value = {}) {
 const result = {kind:value.kind||'subscribers',source: String(value.source || ''), market: String(value.market || ''), purchase: String(value.purchase || 'all'), orderStatus: String(value.orderStatus || '')};
 if(!['subscribers','order_customers'].includes(result.kind) || !['','footer','storefront','checkout'].includes(result.source) || !['','za','us','ng','bw'].includes(result.market) || !['all','buyers','nonbuyers'].includes(result.purchase) || !['','processing','packed','shipped'].includes(result.orderStatus)) throw Error('Invalid audience filters.');
 return result;
}
function selectAudience(subscribers, orders, selected) {
 const f = segment(selected);
 if(f.kind==='order_customers'){if(!f.orderStatus)throw Error('Choose an affected order status for an order notice.');const recipients=new Map();for(const o of orders){const address=email(o.customer?.email);if(!validEmail(address)||o.status!==f.orderStatus||f.market&&o.market!==f.market)continue;const person=recipients.get(address)||{id:'order_'+hash(address),email:address,operational:true,orderIds:[]};person.orderIds.push(o.id);recipients.set(address,person);}return [...recipients.values()];}
 const paid = new Set(orders.filter(o => o.paymentStatus === 'paid').map(o => email(o.customer?.email))), affected = new Set(orders.filter(o => !f.orderStatus || o.status === f.orderStatus).map(o => email(o.customer?.email))), people = new Map();
 for(const s of subscribers) {
  const address = email(s.email);
  if(!active(s) || f.source && s.source !== f.source || f.market && s.market !== f.market || f.purchase === 'buyers' && !paid.has(address) || f.purchase === 'nonbuyers' && paid.has(address) || f.orderStatus && !affected.has(address)) continue;
  people.set(address, {id:s.id, email:address});
 }
 return [...people.values()];
}
function verifyWebhook(raw, headers, secret, now = Date.now()) {
 const id=headers['svix-id'], timestamp=headers['svix-timestamp'], signatures=headers['svix-signature'];
 if(!secret?.startsWith('whsec_') || !id || !/^\d+$/.test(timestamp || '') || Math.abs(now / 1000 - Number(timestamp)) > 300 || !Buffer.isBuffer(raw)) throw Error('Invalid webhook signature.');
 const expected=crypto.createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(`${id}.${timestamp}.`).update(raw).digest();
 const verified=String(signatures || '').split(' ').some(value => {const [version,signature]=value.split(',');const actual=Buffer.from(signature || '', 'base64');return version==='v1' && actual.length===expected.length && crypto.timingSafeEqual(actual, expected);});
 if(!verified) throw Error('Invalid webhook signature.');
 return JSON.parse(raw.toString('utf8'));
}
function createEngine({db, FieldValue, requireAdmin, cors, send = submitBatch, now = Date.now, env = process.env}) {
 const campaigns=()=>db.collection('email_campaigns'), jobs=()=>db.collection('campaign_jobs');
 const fail=(message,status=400)=>Object.assign(Error(message),{status});
 const campaignId=value=>{if(typeof value!=='string'||!value||value.length>128||value.includes('/'))throw fail('Invalid campaign ID.');return value;};
 const records=snapshot=>snapshot.docs.map(s=>({...s.data(),id:s.id}));
 const endpoint=fn=>async(req,res)=>{if(cors(req,res))return;if(req.method!=='POST')return res.status(405).json({success:false,message:'Method not allowed.'});try{const actor=await requireAdmin(req);return res.status(200).json({success:true,...await fn(req.body||{},actor||{})});}catch(e){console.error('Campaign action failed:',e.message);return res.status(e.status||400).json({success:false,message:e.message});}};
 const enqueue=endpoint(async(body,actor)=>{
  if(!env.RESEND_API_KEY)throw fail('Email service is not configured.',503);
  const id=campaignId(body.campaignId),ref=campaigns().doc(id),due=body.scheduledAt?Date.parse(body.scheduledAt):now();
  if(!Number.isFinite(due)||due<now()-60000||due>now()+365*86400000)throw fail('Choose a future send time within one year.');
  let campaign;
  await db.runTransaction(async tx=>{const snap=await tx.get(ref);campaign=snap.data();if(!snap.exists||campaign.status!=='draft')throw fail('Only a saved draft can be queued.',409);if(!campaign.subject?.trim()||campaign.subject.length>300||!campaign.html?.trim()||campaign.html.length>200000)throw fail('Campaign content is incomplete or too large.');const audience=segment(campaign.audience);if(audience.kind==='order_customers'&&campaign.category!=='update')throw fail('Order notices are only available for service updates.');tx.update(ref,{status:'preparing',lastError:'',queuedAt:FieldValue.serverTimestamp(),queuedBy:actor.uid||''});});
  try {
   const subs=records(await db.collection('subscribers').get());
   const orders=campaign.audience?.kind==='order_customers' || campaign.audience?.purchase && campaign.audience.purchase!=='all' || campaign.audience?.orderStatus ? records(await db.collection('orders').get()) : [];
   const people=selectAudience(subs,orders,campaign.audience);
   if(!people.length)throw fail('No active subscribers match these filters.');
   if(people.length>50000)throw fail('Split audiences larger than 50,000 into separate campaigns.');
   await db.collection('campaign_keys').doc(hash(id)).set({campaignId:id});
   const total=Math.ceil(people.length/100);
   for(let i=0;i<total;i++){await jobs().doc(hash(id)+'_'+i).set({campaignId:id,index:i,status:'pending',dueAt:due,people:people.slice(i*100,i*100+100),createdAt:FieldValue.serverTimestamp()});}
   await ref.update({status:due>now()?'scheduled':'queued',scheduledAt:new Date(due).toISOString(),recipientCount:people.length,totalBatches:total,completedBatches:0,acceptedCount:0,failedCount:0,skippedCount:0});
   return {queued:true,recipientCount:people.length,scheduledAt:new Date(due).toISOString()};
  }catch(e){await ref.update({status:'failed',lastError:String(e.message).slice(0,300)});throw e;}
 });
 const cancel=endpoint(async(body,actor)=>{const ref=campaigns().doc(campaignId(body.campaignId));await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!['scheduled','queued','sending','delivery_unknown'].includes(snap.data()?.status))throw fail('This campaign cannot be cancelled.',409);tx.update(ref,{status:'cancelled',cancelledAt:FieldValue.serverTimestamp(),cancelledBy:actor.uid||''});});return {cancelled:true};});
 async function complete(ref,job,result) {
  await db.runTransaction(async tx=>{const fresh=await tx.get(ref),cRef=campaigns().doc(job.campaignId),cSnap=await tx.get(cRef),c=cSnap.data();if(['accepted','failed','skipped'].includes(fresh.data()?.status))return;
   const accepted=(c.acceptedCount||0)+(result.accepted||0),failed=(c.failedCount||0)+(result.failed||0),skipped=(c.skippedCount||0)+(result.skipped||0),completed=(c.completedBatches||0)+1;
   tx.update(ref,{status:result.failed?'failed':result.accepted?'accepted':'skipped',...result,finishedAt:FieldValue.serverTimestamp()});
   const terminal=completed>=c.totalBatches;tx.update(cRef,{acceptedCount:accepted,failedCount:failed,skippedCount:skipped,completedBatches:completed,lastError:result.error||c.lastError||'',status:['cancelled','delivery_unknown'].includes(c.status)?c.status:terminal?(failed?(accepted?'partial':'failed'):'sent'):'queued',...(terminal?{sentAt:FieldValue.serverTimestamp()}:{})});
  });
 }
 async function processJob(ref) {
  let job,campaign,claimed=false;
  await db.runTransaction(async tx=>{const snap=await tx.get(ref);job=snap.data();if(!job||job.status!=='pending'||job.dueAt>now())return;const cRef=campaigns().doc(job.campaignId),c=await tx.get(cRef);campaign=c.data();if(!['queued','scheduled','sending'].includes(campaign?.status)){if(campaign?.status==='delivery_unknown')tx.update(ref,{status:'paused'});else if(campaign?.status!=='preparing')tx.update(ref,{status:'cancelled'});return;}tx.update(ref,{status:'processing',startedAt:now()});tx.update(cRef,{status:'sending'});claimed=true;});
  if(!claimed)return;
  try {
   const people=[];
   for(const person of job.people){if(person.operational){const suppressed=await db.collection('email_suppressions').doc(hash(person.email)).get();if(suppressed.exists)continue;let affected=false;for(const id of person.orderIds){const o=await db.collection('orders').doc(id).get();if(o.exists&&o.data().status===campaign.audience.orderStatus&&email(o.data().customer?.email)===person.email){affected=true;break;}}if(affected)people.push(person);continue;}const sRef=db.collection('subscribers').doc(person.id),sSnap=await sRef.get(),s=sSnap.data();if(!sSnap.exists||!active(s)||email(s.email)!==person.email)continue;const suppressed=await db.collection('email_suppressions').doc(hash(person.email)).get();if(suppressed.exists)continue;
    const token=await db.runTransaction(async tx=>{const fresh=await tx.get(sRef);if(!fresh.exists||!active(fresh.data()))return null;const existing=fresh.data()?.unsubscribeToken;if(/^[a-f0-9]{64}$/.test(existing||''))return existing;const token=crypto.randomBytes(32).toString('hex');tx.set(sRef,{unsubscribeToken:token},{merge:true});return token;});if(token)people.push({...person,token});
   }
   const skipped=job.people.length-people.length;
   if(!people.length){await complete(ref,job,{skipped,accepted:0,failed:0});return;}
   const messages=people.map(person=>{const url=(env.PUBLIC_SITE_URL||'https://drixel-sa.web.app').replace(/\/$/,'')+'/api/unsubscribe?id='+encodeURIComponent(person.id)+'&token='+person.token,footer=person.operational?'':unsubscribeMarkup(url);return {from:env.MAIL_FROM||'Drixel SA <info@customer.drixelsa.co.za>',to:[person.email],subject:campaign.subject.trim(),html:campaign.html.includes('</body>')?campaign.html.replace('</body>',footer+'</body>'):campaign.html+footer,...(person.operational?{}:{headers:{'List-Unsubscribe':'<'+url+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}}),tags:[{name:'campaign',value:hash(job.campaignId)},{name:'batch',value:String(job.index)}]};});
   // Cancel before provider submission. Cancellation cannot recall already accepted mail.
   if((await campaigns().doc(job.campaignId).get()).data()?.status==='cancelled'){await ref.update({status:'cancelled'});return;}
   job.submittedCount=messages.length;job.skipped=skipped;
   await ref.update({submittedPeople:people.map(({id,email,operational})=>({id,email,operational:Boolean(operational)})),submittedCount:messages.length});
   const result=await send(messages,deliveryKey(job.campaignId,job.index));
   for(let i=0;i<result.length;i++)await linkDelivery(result[i].id,job.campaignId,people[i]);
   await complete(ref,job,{accepted:people.length,failed:0,skipped,providerIds:result.map(r=>r.id)});
  }catch(e){if(e.unknown===false){await complete(ref,job,{accepted:0,failed:job.submittedCount||job.people.length,skipped:job.skipped||0,error:String(e.message).slice(0,300)});}else{await ref.update({status:'delivery_unknown',error:String(e.message).slice(0,300)});await markUnknown(job.campaignId,'Batch '+job.index+': '+String(e.message).slice(0,250));}}
 }
 async function markUnknown(id,message){await db.runTransaction(async tx=>{const ref=campaigns().doc(id),snap=await tx.get(ref);tx.update(ref,{...(snap.data()?.status==='cancelled'?{}:{status:'delivery_unknown'}),lastError:message});});}
 async function tick() {
  await db.collection('operations_health').doc('campaignWorker').set({lastStartedAt:now(),status:'running'},{merge:true});
  if(!env.RESEND_API_KEY)throw Error('RESEND_API_KEY is missing.');
  // Interrupted provider calls are never automatically retried after their lease.
  const stale=await jobs().where('status','==','processing').get();
  for(const snap of stale.docs)if((snap.data().startedAt||0)<now()-15*60000){await snap.ref.update({status:'delivery_unknown',error:'Worker interrupted; reconcile provider logs.'});await markUnknown(snap.data().campaignId,'A worker was interrupted. Reconcile its batch before resuming.');}
  const pending=await jobs().where('status','==','pending').where('dueAt','<=',now()).orderBy('dueAt').limit(100).get();
  for(const snap of pending.docs){await processJob(snap.ref);await pause(650);}
  await db.collection('operations_health').doc('campaignWorker').set({lastFinishedAt:now(),status:'ok',checkedBatches:pending.docs.length},{merge:true});
 }
 const reconcile=endpoint(async(body,actor)=>{
  const id=campaignId(body.campaignId),index=Number(body.batchIndex),note=String(body.note||'').trim();if(!Number.isInteger(index)||index<0||!note||note.length>1000||!['accepted','not_accepted'].includes(body.decision))throw fail('Select a batch, record provider evidence and choose a reconciliation result.');
  const campaign=await campaigns().doc(id).get();if(campaign.data()?.status==='cancelled')throw fail('Cancelled campaigns cannot resume.',409);
  const ref=jobs().doc(hash(id)+'_'+index),snap=await ref.get(),job=snap.data();if(!snap.exists||job.status!=='delivery_unknown')throw fail('Only an uncertain batch can be reconciled.',409);
  if(body.decision==='accepted'){const ids=body.providerIds;if(!Array.isArray(ids)||ids.length!==job.submittedCount||ids.some(x=>typeof x!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(x))||new Set(ids).size!==ids.length)throw fail('Provide one unique provider email ID for every submitted recipient.');for(let i=0;i<ids.length;i++)await linkDelivery(ids[i],id,job.submittedPeople[i]);await complete(ref,job,{accepted:ids.length,failed:0,skipped:job.people.length-ids.length,providerIds:ids,reconciliationNote:note,reconciledBy:actor.uid||''});}
  else{await db.runTransaction(async tx=>{const fresh=await tx.get(ref);if(fresh.data()?.status!=='delivery_unknown')throw fail('Batch changed. Refresh first.',409);tx.update(ref,{status:'pending',reconciliationNote:note,reconciledBy:actor.uid||''});tx.update(campaigns().doc(id),{status:'queued',lastError:''});});}
  const all=await jobs().where('campaignId','==',id).get();
  if(!all.docs.some(s=>s.data().status==='delivery_unknown')){for(const j of all.docs)if(j.data().status==='paused')await j.ref.update({status:'pending'});const c=await campaigns().doc(id).get();if(c.data().status==='delivery_unknown'){const data=c.data(),terminal=data.completedBatches>=data.totalBatches;await c.ref.update({status:terminal?(data.failedCount?(data.acceptedCount?'partial':'failed'):'sent'):'queued',lastError:''});}}
  return {reconciled:true};
 });
 async function linkDelivery(providerId,campaignId,person){
  const ref=db.collection('email_deliveries').doc(providerId),cRef=campaigns().doc(campaignId);
  await db.runTransaction(async tx=>{const old=await tx.get(ref),c=await tx.get(cRef),d=old.data()||{};if(d.campaignId&&d.campaignId!==campaignId)throw fail('Provider email ID is linked to another campaign.',409);if(!d.campaignId&&c.exists)for(const kind of ['delivered','bounced','complained','delayed','failed'])if(d[kind])tx.update(cRef,{[kind+'Count']:FieldValue.increment(1)});tx.set(ref,{campaignId,subscriberId:person.operational?'':person.id,email:person.email,acceptedAt:FieldValue.serverTimestamp()},{merge:true});});
 }
 const webhook=async(req,res)=>{
  if(req.method!=='POST')return res.status(405).send('Method not allowed');
  let event;try{event=verifyWebhook(req.rawBody,{'svix-id':req.get('svix-id'),'svix-timestamp':req.get('svix-timestamp'),'svix-signature':req.get('svix-signature')},env.RESEND_WEBHOOK_SECRET,now());}catch{return res.status(400).send('Invalid signature');}
  try{
   const types={'email.delivered':'delivered','email.bounced':'bounced','email.complained':'complained','email.delivery_delayed':'delayed','email.failed':'failed'},kind=types[event.type];if(!kind)return res.status(200).send('Ignored');
   const providerId=event.data?.email_id;if(typeof providerId!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(providerId))return res.status(400).send('Invalid event');
   const id=hash(req.get('svix-id')),receipt=db.collection('email_events').doc(id),deliveryRef=db.collection('email_deliveries').doc(providerId);
   await db.runTransaction(async tx=>{const existing=await tx.get(receipt),delivery=await tx.get(deliveryRef);if(existing.exists)return;const d=delivery.data()||{},cRef=d.campaignId?campaigns().doc(d.campaignId):null,cSnap=cRef?await tx.get(cRef):null;
    tx.set(receipt,{type:event.type,providerId,receivedAt:FieldValue.serverTimestamp()});tx.set(deliveryRef,{[kind]:true,lastEventAt:FieldValue.serverTimestamp()},{merge:true});
    if(cRef&&cSnap.exists&&!d[kind])tx.update(cRef,{[kind+'Count']:FieldValue.increment(1)});
    if(['bounced','complained'].includes(kind))for(const address of (Array.isArray(event.data?.to)?event.data.to:[event.data?.to])){if(!validEmail(email(address)))continue;tx.set(db.collection('email_suppressions').doc(hash(email(address))),{email:email(address),reason:kind,updatedAt:FieldValue.serverTimestamp()});if(d.subscriberId)tx.set(db.collection('subscribers').doc(d.subscriberId),{suppressed:true,suppressionReason:kind},{merge:true});}
   });return res.status(200).send('OK');
  }catch(e){console.error('Email webhook persistence failed:',e.message);return res.status(503).send('Retry later');}
 };
 return {enqueue,cancel,reconcile,tick,processJob,webhook};
}
module.exports={createEngine,selectAudience,segment,verifyWebhook,active};
