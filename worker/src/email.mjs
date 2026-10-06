import {createHash} from 'node:crypto';
import {getFirestore} from './firestore.mjs';
export async function reserveEmailQuota(key,count,{db=getFirestore(),now=Date.now()}={}){
 const date=new Date(now).toISOString().slice(0,10),month=date.slice(0,7),hash=createHash('sha256').update(key).digest('hex');
 return db.runTransaction(async tx=>{const ref=db.doc('email_quota_keys/'+hash),dayRef=db.doc('email_quota/day_'+date),monthRef=db.doc('email_quota/month_'+month),old=await tx.get(ref),day=await tx.get(dayRef),monthly=await tx.get(monthRef);if(old.exists)return;
 if((day.data()?.count||0)+count>100||(monthly.data()?.count||0)+count>3000)throw Object.assign(Error('Free email allowance reached. Sending will resume when the allowance resets.'),{deferred:true,status:429});
 tx.set(ref,{count,date});tx.set(dayRef,{count:(day.data()?.count||0)+count});tx.set(monthRef,{count:(monthly.data()?.count||0)+count});});
}
export async function sendMail(job,key){await reserveEmailQuota(key,job.to.length+(job.cc?.length||0));const r=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:process.env.MAIL_FROM,to:job.to,cc:job.cc,subject:job.subject,html:job.html})});const data=await r.json().catch(()=>({}));if(!r.ok||!data.id){const name=/^[a-z_]{1,80}$/.test(data.name||'')?data.name:'unconfirmed';throw Object.assign(Error('Resend did not accept this email (HTTP '+r.status+', '+name+'). Check Resend logs and sender domain verification before retrying.'),{status:502});}return data.id;}
