import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {getFirestore} from './firestore.mjs';
import {verifyIdToken} from './auth.mjs';
import {consumeRateLimit,apiError} from './security.mjs';
import {sendMail} from './email.mjs';
import {MARKETS} from '../../src/i18n/markets.js';
import {escapeHtml as esc,productEmailRows,safeEmailUrl} from './product-email.mjs';
const DAY=86400000,NEVER=8640000000000000;
export const REMINDER_CONSENT='shopping-reminders-v1';
export const reminderId=uid=>createHash('sha256').update(uid).digest('hex');
const hash=reminderId,kindValid=kind=>['bag','wishlist'].includes(kind);
const stamp=value=>typeof value==='number'?value:value?.seconds?value.seconds*1000:Date.parse(value)||0;
const preferences=(p,email)=>p?.email===email?{bag:p.bag===true,wishlist:p.wishlist===true}:{bag:false,wishlist:false};
export function normaliseSavedItems(items,kind){
 if(!Array.isArray(items)||items.length>20)throw apiError('Save up to 20 items for email reminders.',400);
 const result=items.map(item=>{const productId=String(item?.productId||item?.id||'');if(!productId||productId.length>128||productId.includes('/'))throw apiError('Invalid saved product.',400);const quantity=kind==='wishlist'?1:Number(item.quantity);if(!Number.isInteger(quantity)||quantity<1||quantity>99)throw apiError('Invalid saved quantity.',400);const out={productId,quantity};for(const key of ['sku','color','size']){const value=kind==='wishlist'?'':String(item[key]||'');if(value.length>100)throw apiError('Invalid product option.',400);out[key]=value}return out});
 return [...new Map(result.map(x=>[JSON.stringify([x.productId,x.sku,x.color,x.size]),x])).values()].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
export async function reminderCustomer(req){const token=req.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];if(!token)throw apiError('Sign in to manage reminders.',401);let user;try{user=await verifyIdToken(token)}catch{throw apiError('Sign in again to manage reminders.',401)}if(!user.email||user.email_verified!==true)throw apiError('Verify your email address before using email reminders.',403);return {...user,email:String(user.email).trim().toLowerCase()}}
export function reminderMail(record,items,pref,id){
 const market=Object.hasOwn(MARKETS,record.market)?record.market:'za',base='https://drixelsa.co.za',destination=record.kind==='bag'?'cart':'wishlist',url=`${base}/${market}/${destination}?restore=reminder`;
 const unsubscribe=`https://drixel-api.drixelsa.workers.dev/api/reminder-preferences?id=${id}&token=${pref.token}`;
 const heading=record.kind==='bag'?'Still thinking it over?':'Your saved favourites';
 return {category:'shopping-reminder',to:[pref.email],subject:record.kind==='bag'?'Drixel SA — your saved bag':'Drixel SA — revisit your wishlist',headers:{'List-Unsubscribe':`<${unsubscribe}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'},html:`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><body style="margin:0;background:#f4f4f1;color:#111;font:15px/1.7 Arial,sans-serif"><table role="presentation" style="width:100%;max-width:600px;margin:24px auto;background:#fff"><tr><td style="padding:28px"><p style="font-size:28px;letter-spacing:4px;font-weight:bold">DRIXEL</p><h1>${heading}</h1><p>You asked us to remind you about these items in your ${record.kind==='bag'?'bag':'wishlist'}. This is a saved selection, not a placed order.</p>${productEmailRows(items)}<p>Prices shown in ZAR. Availability, current prices and delivery are confirmed at checkout. These items are not reserved.</p><p><a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:14px 22px;text-decoration:none">Revisit your ${record.kind==='bag'?'bag':'wishlist'}</a></p><p>Sign in to the same Drixel account to restore your saved selection on another device.</p><p style="font-size:12px">At most one shopping reminder per week. <a href="${esc(unsubscribe)}">Stop bag and wishlist reminders</a>.</p></td></tr></table></body></html>`};
}
export function createReminderService({db=getFirestore(),authenticate=reminderCustomer,send=sendMail,now=Date.now,rateLimit=consumeRateLimit}={}){
 const prefRef=id=>db.doc('shopping_preferences/'+id),savedRef=(id,kind)=>db.doc('shopping_reminders/'+id+'_'+kind);
 async function hydrate(record){
  const products=await Promise.all((record.items||[]).map(async item=>{const s=await db.doc('products/'+item.productId).get(),p=s.data();if(!p||p.active===false||!(p.availableMarkets||['za']).includes(record.market))return null;const variants=p.variants||[],v=variants.find(v=>v.sku===item.sku);
   if(record.kind==='bag'&&variants.length&&!v)return null;const stock=record.kind==='wishlist'&&variants.length?variants.reduce((n,v)=>n+Number(v.stock??v.quantity??0),0):Number(v?.stock??v?.quantity??p.stock??p.quantity??0);if(stock<item.quantity)return null;const price=Number(v?.price!=null&&v.price!==''?v.price:p.price);if(!Number.isFinite(price)||price<0)return null;
   return {...item,id:item.productId,name:String(p.name||p.title||'Drixel product').slice(0,180),image:safeEmailUrl(p.colorImages?.find(x=>x.color===(v?.color||item.color))?.frontImage||p.image||p.frontImage||p.images?.[0]),price,urlCode:p.urlCode||item.productId,color:v?.color||item.color,size:v?.size||item.size};
  }));return products.filter(Boolean);
 }
 async function suppressed(email){const [blocked,sub]=await Promise.all([db.doc('email_suppressions/'+hash(email)).get(),db.doc('subscribers/'+hash(email)).get()]);return blocked.exists||sub.data()?.status==='unsubscribed'||sub.data()?.suppressed===true}
 async function status(user,id){const p=(await prefRef(id).get()).data(),settings=preferences(p,user.email),saved={};for(const kind of ['bag','wishlist']){const record=(await savedRef(id,kind).get()).data();if(settings[kind]&&record?.email===user.email)saved[kind]={items:await hydrate(record),market:record.market}}return {success:true,preferences:settings,saved}}
 async function api(req,res){const user=await authenticate(req),id=hash(user.uid);await rateLimit(db,{identity:user.uid,bucket:'shopping-reminders',limit:90,windowMs:3600000});const {action,kind}=req.body||{};
  if(action==='status')return res.json(await status(user,id));
  if(!['sync','preference'].includes(action)||!kindValid(kind))throw apiError('Invalid reminder action.',400);
  const enabling=action==='preference'&&req.body.enabled===true,disabling=action==='preference'&&req.body.enabled===false;
  if(action==='preference'&&!enabling&&!disabling)throw apiError('Choose a reminder preference.',400);
  if(enabling&&req.body.consent!==REMINDER_CONSENT)throw apiError('Confirm that you want email reminders.',400);
  if(enabling&&await suppressed(user.email))throw apiError('Email reminders are blocked by your existing unsubscribe or delivery preferences. Contact customer care if you want to change them.',409);
  const market=String(req.body.market||'za');if(!Object.hasOwn(MARKETS,market))throw apiError('Invalid market.',400);
  const items=disabling?[]:normaliseSavedItems(req.body.items,kind),fingerprint=hash(JSON.stringify({market,items})),time=now();
  await db.runTransaction(async tx=>{const pr=prefRef(id),rr=savedRef(id,kind),ps=await tx.get(pr),rs=await tx.get(rr),p=ps.data()||{},old=rs.data()||{},allowed=preferences(p,user.email);
   if(action==='sync'&&!allowed[kind])throw apiError('Enable reminders before saving a selection.',409);
   if(disabling){tx.set(pr,{...p,...allowed,[kind]:false,email:user.email,updatedAt:time});tx.set(rr,{kind,uid:user.uid,email:user.email,items:[],status:'disabled',nextAt:NEVER,version:randomUUID(),updatedAt:time});return}
   if(enabling)tx.set(pr,{...p,...allowed,[kind]:true,email:user.email,token:p.email===user.email&&p.token?p.token:randomBytes(32).toString('hex'),consent:REMINDER_CONSENT,consentedAt:time,updatedAt:time});
   if(old.fingerprint===fingerprint&&old.email===user.email&&old.status!=='disabled')return;
   tx.set(rr,{uid:user.uid,email:user.email,kind,market,items,fingerprint,version:randomUUID(),status:items.length?'pending':'empty',updatedAt:time,nextAt:items.length?time+(kind==='bag'?DAY:7*DAY):NEVER});
  });return res.json({success:true});
 }
 async function unsubscribe(req,res){const id=String(req.query.id||''),token=String(req.query.token||'');if(!/^[a-f0-9]{64}$/.test(id)||!/^[a-f0-9]{64}$/.test(token))throw apiError('Invalid preference link.',400);const pr=prefRef(id),p=(await pr.get()).data();if(!p||p.token!==token)throw apiError('Preference link not found.',404);
  res.set('Content-Type','text/html; charset=utf-8').set('Cache-Control','no-store').set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");
  if(req.method==='POST')await db.runTransaction(async tx=>{const fresh=(await tx.get(pr)).data();if(fresh?.token!==token)throw apiError('Preference link expired.',404);tx.set(pr,{...fresh,bag:false,wishlist:false,updatedAt:now()});for(const kind of ['bag','wishlist'])tx.set(savedRef(id,kind),{status:'disabled',items:[],nextAt:NEVER,updatedAt:now()},{merge:true})});
  return res.send('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Reminder preferences | Drixel</title><body style="font:17px Arial;background:#f4f4f1;color:#111;padding:32px"><main style="max-width:480px;margin:auto"><h1>DRIXEL</h1>'+(req.method==='POST'?'<h2>Reminders stopped</h2><p>You will no longer receive bag or wishlist reminders. Essential order emails are unchanged.</p>':'<h2>Your inbox. Your choice.</h2><p>Stop bag and wishlist reminder emails.</p><form method="post"><button style="padding:16px;background:#111;color:#fff">Stop reminders</button></form>')+'</main></body></html>');
 }
 async function finish(ref,version,patch){await db.runTransaction(async tx=>{const s=await tx.get(ref);if(s.data()?.version===version)tx.update(ref,patch)})}
 async function tick(){const due=await db.collection('shopping_reminders').where('nextAt','<=',now()).orderBy('nextAt').limit(1).get(),snap=due.docs[0];if(!snap)return false;const record=snap.data(),ref=snap.ref,id=hash(record.uid||'');
  if(record.status==='sending'){await finish(ref,record.version,{status:'needs_review',nextAt:NEVER,lastError:'Interrupted send. Review email provider logs before retrying.'});throw Error('Reminder send needs review')}
  if(record.status!=='pending'){await finish(ref,record.version,{nextAt:NEVER});return false}
  const p=(await prefRef(id).get()).data();if(!preferences(p,record.email)[record.kind]||await suppressed(record.email)){await finish(ref,record.version,{status:'skipped',nextAt:NEVER,items:[],reason:'Email preference'});return false}
  // Check every matching order, including pending payment, so a checkout is never chased as an abandoned bag.
  const orders=await db.collection('orders').where('customer.uid','==',record.uid).get(),bought=new Set(orders.docs.map(s=>s.data()).filter(o=>stamp(o.createdAt)>=record.updatedAt&&o.status!=='cancelled'&&o.fulfillmentStatus!=='cancelled'&&o.paymentStatus!=='refunded').flatMap(o=>(o.items||[]).map(x=>String(x.productId))));
  const items=(await hydrate(record)).filter(x=>!bought.has(x.productId));if(!items.length||record.kind==='bag'&&bought.size&&record.items.some(x=>bought.has(x.productId))){await finish(ref,record.version,{status:'skipped',nextAt:NEVER,items:[],reason:'Ordered or unavailable'});return false}
  let claimed=false,priorAttempt=0;const time=now();await db.runTransaction(async tx=>{const s=await tx.get(ref),ps=await tx.get(prefRef(id)),current=s.data(),pref=ps.data();if(current?.version!==record.version||current.status!=='pending'||!preferences(pref,record.email)[record.kind])return;if(pref.lastAttemptAt&&pref.lastAttemptAt+7*DAY>time){tx.update(ref,{nextAt:pref.lastAttemptAt+7*DAY});return}priorAttempt=pref.lastAttemptAt||0;tx.update(ref,{status:'sending',firstAttemptAt:time,nextAt:time+15*60000});tx.update(prefRef(id),{lastAttemptAt:time});claimed=true});if(!claimed)return false;
  try{const latest=(await prefRef(id).get()).data(),current=(await ref.get()).data();if(!preferences(latest,record.email)[record.kind]||current?.version!==record.version||await suppressed(record.email)){await finish(ref,record.version,{status:'skipped',nextAt:NEVER});return false}const providerId=await send(reminderMail(record,items,latest,id),'shopping-reminder/'+hash(ref.id+'/'+record.version));await finish(ref,record.version,{status:'sent',nextAt:NEVER,sentAt:now(),providerId});return true}
  catch(e){await finish(ref,record.version,{status:e.deferred?'pending':'needs_review',nextAt:e.deferred?now()+3600000:NEVER,lastError:e.deferred?'Email allowance reached; waiting.':'Email acceptance uncertain. Review provider logs before retrying.'});if(e.deferred)await db.runTransaction(async tx=>{const s=await tx.get(prefRef(id));if(s.data()?.lastAttemptAt===time)tx.update(prefRef(id),{lastAttemptAt:priorAttempt})});else throw e;return false}
 }
 return {api,unsubscribe,tick,hydrate};
}
export const shoppingReminderApi=(req,res)=>createReminderService().api(req,res);
export const shoppingReminderUnsubscribe=(req,res)=>createReminderService().unsubscribe(req,res);
export const tickShoppingReminders=()=>createReminderService().tick();
