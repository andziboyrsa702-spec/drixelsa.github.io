import React,{useState} from 'react';
import {startRegistration,startAuthentication,browserSupportsWebAuthn} from '@simplewebauthn/browser';
import {signInWithCustomToken,signOut} from 'firebase/auth';
import {auth} from '../config/firebase-react.js';
import {apiUrl} from '../utils/api.js';
export async function adminSecurityRequest(path,body,user=auth.currentUser){
 const response=await fetch(apiUrl('/api/admin/security/'+path),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await user.getIdToken()},body:JSON.stringify(body||{})});
 let data;try{data=await response.json()}catch{throw Error('Administrator security service is unavailable.')}
 if(!response.ok)throw Object.assign(Error(data.message||'Administrator verification failed.'),{status:response.status});return data;
}
export default function AdminDeviceVerification({enrolled,onVerified}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[codes,setCodes]=useState([]),[token,setToken]=useState(''),[recovery,setRecovery]=useState(false),[code,setCode]=useState('');
 async function finish(customToken){
  if(!customToken)throw Error('The security service did not return a verified session. Try again.');
  const result=await signInWithCustomToken(auth,customToken);
  // Firebase may replace the User object while React still holds the previous one.
  const currentUser=result.user;
  await currentUser.getIdToken();
  const status=await adminSecurityRequest('status',{},currentUser);
  if(!status.verified)throw Error('Your device was verified, but the administrator session was not confirmed. Sign out, sign in again and retry.');
  onVerified();
 }
 async function verify(){if(busy)return;setBusy(true);setError('');try{
  if(recovery){const result=await adminSecurityRequest('recover',{code});await finish(result.customToken);return;}
  if(!browserSupportsWebAuthn())throw Error('This browser does not support passkeys. Use a current browser on your phone or computer.');
  const kind=enrolled?'authenticate':'register',options=await adminSecurityRequest('options',{kind}),credential=enrolled?await startAuthentication({optionsJSON:options.optionsJSON}):await startRegistration({optionsJSON:options.optionsJSON});
  const result=await adminSecurityRequest('verify',{kind,challengeId:options.challengeId,credential});
  if(result.recoveryCodes?.length){setCodes(result.recoveryCodes);setToken(result.customToken);}else await finish(result.customToken);
 }catch(e){setError(e.name==='NotAllowedError'?'Device verification was cancelled or timed out. Try again.':e.message)}finally{setBusy(false)}}
 return <div className="admin-gate admin-device-gate"><strong>DRIXEL</strong><h1>{codes.length?'Save your recovery codes':enrolled?'Verify your security device':'Protect your administrator account'}</h1>
 {codes.length?<><p>Keep these codes somewhere private. Each code works once if you lose your passkey. They will not be shown again.</p><button onClick={async()=>{try{await navigator.clipboard.writeText(codes.join("\n"));setError("Recovery codes copied. Save them privately.")}catch{setError("Select and copy the codes manually.")}}}>Copy recovery codes</button><div className="admin-recovery-codes">{codes.map(x=><code key={x}>{x}</code>)}</div><button disabled={busy} onClick={async()=>{setBusy(true);try{await finish(token)}catch(e){setError(e.message)}finally{setBusy(false)}}}>I saved my codes — continue</button></>:<><p>{enrolled?'Confirm with your device to access the dashboard.':'Register a passkey after signing in. Your device may use Face ID, Windows Hello, a fingerprint or its PIN. Drixel does not receive a face photo.'}</p>{recovery&&<label>One-time recovery code<input autoComplete="off" value={code} onChange={e=>setCode(e.target.value)} /></label>}<button disabled={busy} onClick={verify}>{busy?'Verifying…':recovery?'Use recovery code':enrolled?'Verify passkey':'Register passkey'}</button>{enrolled&&<button disabled={busy} onClick={()=>{setRecovery(!recovery);setError('')}}>{recovery?'Use my passkey':'I lost my device'}</button>}</>}
 {error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={()=>signOut(auth)}>Sign out</button></div>;
}
