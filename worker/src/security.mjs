import {createHash} from 'node:crypto';
export const securityHeaders={
 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer', 'X-Frame-Options':'DENY',
 'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
 'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
 'Strict-Transport-Security':'max-age=31536000'
};
export function apiError(message,status){return Object.assign(new Error(message),{status});}
export async function consumeRateLimit(db,{identity,bucket,limit,windowMs,now=Date.now()}){
 const key=createHash('sha256').update(bucket+':'+identity).digest('hex'),ref=db.doc('security_limits/'+key);
 let rejected=false,retryAfter=0;
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref),old=snap.data()||{},resetAt=Number(old.resetAt)||0,active=resetAt>now;
  const count=active?Number(old.count)||0:0;
  if(count>=limit){rejected=true;retryAfter=Math.ceil((resetAt-now)/1000);return;}
  tx.set(ref,{count:count+1,resetAt:active?resetAt:now+windowMs,expiresAt:new Date(now+windowMs*2)});
 });
 if(rejected)throw Object.assign(apiError('Too many requests. Please try again later.',429),{retryAfter});
}
export function recentAdminProof(user,policy,now=Date.now()){
 if(!policy?.enabled)return true;
 const verified=Number(user.drixel_admin_verified_at);
 return user.drixel_admin_key_version===policy.version&&Number.isFinite(verified)&&verified<=now/1000&&verified>now/1000-900;
}
