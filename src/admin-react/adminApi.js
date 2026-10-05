import {auth} from '../config/firebase-react.js';
async function call(path,body){
 const user=auth.currentUser;
 if(!user)throw new Error('Administrator session expired. Sign in again.');
 const token=await user.getIdToken(),controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:controller.signal});
  const text=await response.text();let data={};
  try{data=text?JSON.parse(text):{};}catch{if(response.ok)throw new Error('The admin service returned an invalid response.');}
  if(!response.ok||data.success===false){
   const fallback=response.status===401?'Administrator session expired. Sign in again.':response.status===403?'This account does not have permission for that action.':response.status>=500?'The admin service is unavailable. Check the Firebase Functions emulator or deployed service.':'Admin action failed.';
   throw new Error(data.message||fallback);
  }
  if(data.success!==true)throw new Error('The admin service did not confirm this action.');
  return data;
 }catch(error){
  if(error.name==='AbortError')throw new Error('The admin action timed out. Check the record before trying again.');
  if(error instanceof TypeError)throw new Error('Cannot connect to the admin service. Check your connection and Firebase Functions.');
  throw error;
 }finally{clearTimeout(timeout);}
}
export const orderAction=(orderId,action)=>call('/api/admin/order-action',{orderId,action});
export const adjustInventory=(productId,sku,delta,reason)=>call('/api/admin/inventory-adjust',{productId,sku,delta,reason});
