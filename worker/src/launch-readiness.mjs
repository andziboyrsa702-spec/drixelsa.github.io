import {adminUser} from './auth.mjs';
import {getFirestore} from './firestore.mjs';
export function createLaunchReadiness({identity=adminUser,database=getFirestore,environment=()=>process.env,request=fetch,now=Date.now}={}){return async function(req,res){
 await identity(req);
 const env=environment(),checks=[];
 const add=(name,ready,detail)=>checks.push({name,status:ready?'ready':'needs_attention',detail});
 add('Email credentials',Boolean(env.RESEND_API_KEY),'Provider credentials are required for sending.');
 add('Delivery webhooks',Boolean(env.RESEND_WEBHOOK_SECRET),'Delivery tracking requires a signed provider webhook.');
 add('Campaign links',Boolean(env.PUBLIC_SITE_URL),'Unsubscribe and campaign links need the public API URL.');
 add('Payment configuration',env.CARD_PAYMENTS_ENABLED!=='true'||env.YOCO_MODE==='live','Enabled customer card payments must use live mode.');
 const db=database(),store=(await db.doc('settings/store').get()).data()||{},policy=(await db.doc('security_config/admin').get()).data();
 const missing=['legalName','legalStatus','physicalAddress','serviceAddress','informationOfficer'].filter(k=>!String(store[k]||'').trim());
 add('Seller disclosures',!missing.length,missing.length?'Complete: '+missing.join(', '):'Required seller fields are populated. Accuracy must still be confirmed.');
 add('Admin protection',policy?.passkeysRequired!==false,'Device verification is required by default.');
 for(const [id,name] of [['orderMail','Order emails'],['campaignWorker','Campaign scheduler']]){const h=(await db.doc('operations_health/'+id).get()).data(),last=Number(h?.lastFinishedAt?.toMillis?.()||h?.lastFinishedAt)||0;add(name,h?.status==='ok'&&last>now()-15*60000,h?.status==='failed'?'Queue failed. Check Service Health and Worker logs.':last?'Last completed: '+new Date(last).toISOString():'No completed run recorded.');}
 const today=new Date(now()).toISOString().slice(0,10),day=(await db.doc('email_quota/day_'+today).get()).data(),month=(await db.doc('email_quota/month_'+today.slice(0,7)).get()).data();add('Email allowance',Number(day?.count||0)<100&&Number(month?.count||0)<3000,`Reserved today: ${Number(day?.count||0)}/100; this month: ${Number(month?.count||0)}/3000. The current free-plan queue pauses at these limits.`);
 if(env.RESEND_API_KEY){try{const response=await request('https://api.resend.com/domains',{headers:{Authorization:'Bearer '+env.RESEND_API_KEY},signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Domain check returned HTTP '+response.status);const result=await response.json(),sender=String(env.MAIL_FROM||'').match(/@([^>\s]+)/)?.[1]?.toLowerCase(),domain=(result.data||[]).find(d=>d.name?.toLowerCase()===sender);add('Sending domain',domain?.status==='verified',domain?'Provider reports '+domain.status:'The configured sender domain was not found in this provider account.');}catch{checks.push({name:'Sending domain',status:'unverified',detail:'The provider domain check is unavailable or the API key lacks domain-read permission. Verify the domain in Resend.'});}}
 return res.json({success:true,checks,checkedAt:now(),notice:'These checks do not prove inbox delivery or successful live payments.'});
};}
export const launchReadiness=createLaunchReadiness();
