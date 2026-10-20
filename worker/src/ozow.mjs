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
 const code=String(order.orderNumber||'').replace(/[^A-Za-z0-9-]/g,'').slice(0,32);
 if(!code||!order.id)throw Error('Missing order reference.');
 const base=new URL(origin);if(base.protocol!=='https:')throw Error('Store origin must use HTTPS.');
 return {siteCode,amount:{currency:'ZAR',value:Number(amount.toFixed(2))},merchantReference:order.id,beneficiaryReference:code,expireAt:new Date(Date.now()+30*60*1000).toISOString(),returnUrl:base.origin+'/za/order-confirmation/'+encodeURIComponent(order.orderNumber)};
}
