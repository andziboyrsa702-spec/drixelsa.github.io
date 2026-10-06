'use strict';
const crypto=require('node:crypto');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// Personalised messages are submitted in batches, never exposing the list in To/CC.
// Repeating a transient request uses the exact same body and idempotency key.
async function submitBatch(messages,key,{request=fetch,pause=wait}={}){
 let last;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await request('https://api.resend.com/emails/batch',{method:'POST',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(messages)});
   const data=await response.json().catch(()=>({}));
   if(response.ok){if(!Array.isArray(data.data)||data.data.length!==messages.length||data.data.some(row=>!row.id)){const error=Error('Email provider returned an incomplete result. Check provider logs before resending.');error.unknown=true;throw error;}return data.data;}
   last=Error(String(data.message||`Email provider rejected this batch (${response.status}).`).slice(0,300));
   const transient=response.status===429||response.status>=500;
   if(!transient){last.unknown=false;throw last;}
   last.unknown=response.status>=500;
   if(attempt<2)await pause(Math.min(5000,Math.max(1000,Number(response.headers?.get('retry-after')||0)*1000)));
  }catch(error){last=error;if(error.unknown===false)throw error;if(error.unknown===undefined)error.unknown=true;if(attempt<2)await pause(1000*(attempt+1));}
 }
 throw last;
}
function unsubscribeMarkup(url){return `<div style="max-width:560px;margin:0 auto;padding:24px;text-align:center;color:#666;font:12px/1.7 Arial,sans-serif"><a style="color:#111" href="${url.replace(/&/g,'&amp;')}">Unsubscribe from Drixel updates</a><br>You can leave the list at any time.</div>`;}
exports.submitBatch=submitBatch;
exports.unsubscribeMarkup=unsubscribeMarkup;
exports.deliveryKey=(id,index)=>'campaign/'+crypto.createHash('sha256').update(id).digest('hex')+'/'+index;
exports.pause=wait;
