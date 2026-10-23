import {auth} from '../config/firebase-react.js';
import {apiUrl} from '../utils/api.js';
export async function customerService(path,body){
 const user=auth.currentUser;if(!user)throw Error('Sign in to continue.');
 const token=await user.getIdToken(),response=await fetch(apiUrl(path),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 const data=await response.json();if(!response.ok||data.success!==true)throw Error(data.message||'Request could not be completed. Please try again.');return data;
}
