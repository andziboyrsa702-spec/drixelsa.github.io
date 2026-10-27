import {createHmac,timingSafeEqual} from 'node:crypto';
/**
 * Ozow One API rollout preparation.
 * The checkout MUST remain disabled until authenticated transaction verification
 * and an idempotent paid-order settlement handler have been implemented and tested.
 * Never expose merchant secrets, private keys or client tokens to the browser.
 */
export const ozowBase=mode=>mode==='live'?'https://one.ozow.com/v1':'https://stagingone.ozow.com/v1';
export function ozowReadiness(env=process.env){
 const mode=env.OZOW_MODE==='live'?'live':'staging';
 const credentialsReady=Boolean(env.OZOW_CLIENT_ID&&env.OZOW_CLIENT_SECRET&&env.OZOW_SITE_CODE&&env.OZOW_WEBHOOK_SECRET);
 return {enabled:false,mode,credentialsReady:false};
}
export function validOzowRedirect(value){
 let url;try{url=new URL(value)}catch{return false}
 return url.protocol==='https:'&&!url.username&&!url.password&&(url.hostname==='ozow.com'||url.hostname.endsWith('.ozow.com'));
}
export function ozowPaymentRequest(order,siteCode,origin){
 if(!order||order.paymentStatus!=='pending'||order.paymentMethod!=='ozow'||order.currency!=='ZAR')throw Error('Order is not eligible for Ozow.');
 const amount=Number(order.total);
 if(!Number.isFinite(amount)||amount<=0||!Number.isSafeInteger(Math.round(amount*100)))throw Error('Invalid payment amount.');
 const code=String(order.orderNumber||'').replace(/[^A-Za-z0-9]/g,'').slice(0,32);
 if(!code||!order.id)throw Error('Missing order reference.');
 const base=new URL(origin);if(base.protocol!=='https:')throw Error('Store origin must use HTTPS.');
 return {siteCode,amount:{currency:'ZAR',value:Number(amount.toFixed(2))},merchantReference:order.id,beneficiaryReference:code,expireAt:new Date(Date.now()+30*60*1000).toISOString(),returnUrl:base.origin+'/za/order-confirmation/'+encodeURIComponent(order.orderNumber)};
}


const error=(message,status=503)=>{throw Object.assign(Error(message),{status})};
export async function ozowAccessToken(env=process.env,request=fetch){
 const clientId=env.OZOW_CLIENT_ID,clientSecret=env.OZOW_CLIENT_SECRET;
 if(!clientId||!clientSecret)error('Ozow credentials have not been configured.');
 const response=await request(ozowBase(env.OZOW_MODE)+'/token',{
  method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,scope:'payments',grant_type:'client_credentials'}),
  signal:AbortSignal.timeout(15000)
 });
 if(!response.ok)error('Ozow authentication could not be completed.');
 const data=await response.json();
 if(typeof data.access_token!=='string'||!data.access_token)error('Ozow did not issue an access token.');
 return data.access_token;
}
export async function ozowCreatePayment(order,{env=process.env,request=fetch}={}){
 if(env.OZOW_CHECKOUT_IMPLEMENTED!=='true')error('Ozow checkout is not enabled yet.');
 const origin=env.STORE_URL||'https://drixelsa.co.za';
 const body=ozowPaymentRequest(order,env.OZOW_SITE_CODE,origin);
 const bearer=await ozowAccessToken(env,request);
 const response=await request(ozowBase(env.OZOW_MODE)+'/payments',{
  method:'POST',
  headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json','Idempotency-Key':'drixel-ozow-'+order.id},
  body:JSON.stringify(body),signal:AbortSignal.timeout(18000)
 });
 if(!response.ok)error('Ozow could not start the payment. Your shopping bag is saved.');
 const payment=await response.json();
 // A successful payment-request response is NOT proof of a successful transaction.
 const href=payment?.requiredActionOptions?.find(x=>x.action==='redirect')?.uri||payment?.redirectUrl;
 if(!validOzowRedirect(href))error('Ozow returned an untrusted redirect destination.',502);
 if(typeof payment.id!=='string'||!payment.id)error('Ozow payment reference missing.',502);
 return {paymentId:payment.id,redirectUrl:href,paymentStatus:'pending'};
}

export async function ozowGetPayment(paymentId,{env=process.env,request=fetch}={}){
 if(!/^[a-zA-Z0-9_-]{1,150}$/.test(paymentId||''))error('Invalid Ozow payment reference.',400);
 const token=await ozowAccessToken(env,request);
 const response=await request(ozowBase(env.OZOW_MODE)+'/payments/'+encodeURIComponent(paymentId),{
  method:'GET',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)
 });
 if(!response.ok)error('Ozow payment status could not be verified.',503);
 const detail=await response.json();
 if(detail?.id!==paymentId)error('Ozow returned a different payment reference.',502);
 // Verification is an independent provider lookup, not the browser return URL.
 return detail;
}
export function ozowPaymentMatchesOrder(detail,order){
 if(!detail||!order||detail.id!==order.ozowPaymentId||detail.merchantReference!==order.id)return false;
 if(detail.siteCode!==order.ozowSiteCode||detail.amount?.currency!=='ZAR')return false;
 return Number.isFinite(Number(detail.amount.value))&&Math.round(Number(detail.amount.value)*100)===Math.round(Number(order.total)*100);
}

export function verifyOzowWebhook(headers,raw,secret,now=Date.now()){
 const id=headers['svix-id'],stamp=headers['svix-timestamp'],signature=headers['svix-signature'];
 if(!id||!new RegExp('^[0-9]{10}$').test(String(stamp||''))||Math.abs(now/1000-Number(stamp))>300||!/^whsec_[a-zA-Z0-9+/=_-]+$/.test(secret||''))return false;
 if(typeof signature!=='string'||!signature)return false;
 const key=Buffer.from(secret.slice(6),'base64');
 if(key.length<16)return false;
 const value=Buffer.isBuffer(raw)?raw:Buffer.from(raw);
 const digest=createHmac('sha256',key).update(id+'.'+stamp+'.').update(value).digest();
 return signature.split(' ').some(item=>{
  const [version,encoded]=item.split(',');
  if(version!=='v1'||!encoded)return false;
  const received=Buffer.from(encoded,'base64');
  return received.length===digest.length&&timingSafeEqual(received,digest);
 });
}
