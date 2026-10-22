import test from 'node:test';
import assert from 'node:assert/strict';
import {ozowReadiness,ozowBase,validOzowRedirect,ozowPaymentRequest,ozowAccessToken,ozowCreatePayment,ozowGetPayment,ozowPaymentMatchesOrder} from '../src/ozow.mjs';
test('Ozow is never advertised as enabled before payment verification is implemented',()=>{assert.equal(ozowReadiness({OZOW_MODE:'live',OZOW_CLIENT_ID:'a',OZOW_CLIENT_SECRET:'b',OZOW_SITE_CODE:'c',OZOW_WEBHOOK_SECRET:'d',OZOW_ENABLED:'true'}).enabled,false)});
test('Ozow URLs cannot redirect a customer to unrelated providers',()=>{assert.equal(validOzowRedirect('https://pay.ozow.com/secure'),true);assert.equal(validOzowRedirect('https://ozow.com.evil.test'),false);assert.equal(validOzowRedirect('http://pay.ozow.com'),false)});
test('payment request uses ZAR, server-owned reference and safe return URL',()=>{const p=ozowPaymentRequest({id:'order1',orderNumber:'DRX-123',paymentStatus:'pending',paymentMethod:'ozow',currency:'ZAR',total:320},'SITE','https://drixelsa.co.za');assert.equal(p.amount.currency,'ZAR');assert.equal(p.merchantReference,'order1');assert.ok(p.returnUrl.startsWith('https://drixelsa.co.za/'))});

test('Ozow OAuth sends client credentials only to the server endpoint',async()=>{
 let seen;const request=async(url,opts)=>{seen={url,opts};return {ok:true,json:async()=>({access_token:'token-test'})}};
 const token=await ozowAccessToken({OZOW_MODE:'staging',OZOW_CLIENT_ID:'client',OZOW_CLIENT_SECRET:'secret'},request);
 assert.equal(token,'token-test');assert.equal(seen.url,'https://stagingone.ozow.com/v1/token');
 assert.equal(new URLSearchParams(seen.opts.body).get('client_secret'),'secret');
});
test('Ozow cannot initiate any payment without explicit backend readiness',async()=>{
 await assert.rejects(ozowCreatePayment({id:'id1',orderNumber:'DRX-1',paymentStatus:'pending',paymentMethod:'ozow',currency:'ZAR',total:99.99},{env:{OZOW_MODE:'live',OZOW_SITE_CODE:'SITE'}}),/not enabled/);
});
test('Ozow validates redirect destination and never accepts a payment result as proof',async()=>{
 const order={id:'id1',orderNumber:'DRX-1',paymentStatus:'pending',paymentMethod:'ozow',currency:'ZAR',total:99.99};
 const env={OZOW_CHECKOUT_IMPLEMENTED:'true',OZOW_MODE:'staging',OZOW_CLIENT_ID:'client',OZOW_CLIENT_SECRET:'secret',OZOW_SITE_CODE:'SITE'};
 const calls=[];const request=async(url,opts)=>{calls.push({url,opts});if(url.endsWith('/token'))return {ok:true,json:async()=>({access_token:'short-lived'})};return {ok:true,json:async()=>({id:'payment1',requiredActionOptions:[{action:'redirect',uri:'https://pay.ozow.com/abc'}],status:'Created'})}};
 const result=await ozowCreatePayment(order,{env,request});
 assert.equal(result.paymentStatus,'pending');assert.equal(result.redirectUrl,'https://pay.ozow.com/abc');
 assert.equal(calls[1].opts.headers['Idempotency-Key'],'drixel-ozow-id1');
 const requestBad=async(url)=>url.endsWith('/token')?{ok:true,json:async()=>({access_token:'token'})}:{ok:true,json:async()=>({id:'payment2',redirectUrl:'https://ozow.com.evil.test'})};
 await assert.rejects(ozowCreatePayment(order,{env,request:requestBad}),/untrusted/);
});

test('provider lookup verifies the exact Ozow payment id and does not trust redirects',async()=>{
 const env={OZOW_MODE:'live',OZOW_CLIENT_ID:'client',OZOW_CLIENT_SECRET:'secret'};
 const request=async(url)=>url.endsWith('/token')?{ok:true,json:async()=>({access_token:'token'})}:{ok:true,json:async()=>({id:'payment_123',merchantReference:'ord-1',siteCode:'SITE',amount:{currency:'ZAR',value:99.99},status:'created'})};
 const detail=await ozowGetPayment('payment_123',{env,request});
 assert.equal(detail.status,'created');
 const order={id:'ord-1',ozowPaymentId:'payment_123',ozowSiteCode:'SITE',total:99.99};
 assert.equal(ozowPaymentMatchesOrder(detail,order),true);
 assert.equal(ozowPaymentMatchesOrder({...detail,amount:{currency:'ZAR',value:100}},order),false);
 assert.equal(ozowPaymentMatchesOrder({...detail,merchantReference:'someone-else'},order),false);
 assert.equal(ozowPaymentMatchesOrder({...detail,siteCode:'OTHER'},order),false);
 await assert.rejects(ozowGetPayment('../bad',{env,request}),/Invalid/);
 await assert.rejects(ozowGetPayment('other',{env,request}),/different payment reference/);
});
