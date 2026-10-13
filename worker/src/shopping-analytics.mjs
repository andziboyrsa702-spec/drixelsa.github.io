import {getFirestore} from './firestore.mjs';
import {adminUser} from './auth.mjs';
import {apiError,consumeRateLimit} from './security.mjs';
import {reminderId as hash} from './shopping-reminders.mjs';
export const FUNNEL_EVENTS=['product_view','bag_add','checkout_start','order_created','checkout_problem'];
export function createAnalyticsService({db=getFirestore(),admin=adminUser,rateLimit=consumeRateLimit,now=Date.now}={}){
 async function event(req,res){const b=req.body||{};if(b.consent!=='shopping-analytics-v1'||!FUNNEL_EVENTS.includes(b.event)||!/^[a-f0-9-]{36}$/i.test(b.session||''))throw apiError('Invalid analytics event.',400);if(req.get('Sec-GPC')==='1'||req.get('DNT')==='1')return res.json({success:true});const day=new Date(now()).toISOString().slice(0,10);await rateLimit(db,{identity:hash((req.get('cf-connecting-ip')||'unknown')+day),bucket:'funnel',limit:100,windowMs:3600000});
  const ref=db.doc('analytics_sessions/'+hash(day+'/'+b.session)),aggregate=db.doc('analytics_daily/'+day);await db.runTransaction(async tx=>{const previous=(await tx.get(ref)).data()||{},counts=(await tx.get(aggregate)).data()||{};if(previous[b.event])return;tx.set(ref,{...previous,[b.event]:true,day});tx.set(aggregate,{...counts,day,[b.event]:Number(counts[b.event]||0)+1})});return res.json({success:true});
 }
 async function report(req,res){await admin(req);const days=Array.from({length:30},(_,i)=>new Date(now()-i*86400000).toISOString().slice(0,10)),rows=await Promise.all(days.map(day=>db.doc('analytics_daily/'+day).get()));return res.json({success:true,days:rows.map((s,i)=>({day:days[i],...s.data()}))})}
 return {event,report};
}
export const shoppingEvent=(req,res)=>createAnalyticsService().event(req,res);
export const shoppingReport=(req,res)=>createAnalyticsService().report(req,res);
