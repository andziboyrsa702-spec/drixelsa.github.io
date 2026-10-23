import React,{useEffect,useState,useRef} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {signInWithCustomToken} from 'firebase/auth';
import {auth} from '../config/firebase-react.js';
import useAuth from '../hooks/useAuth.js';
import Seo from '../components/Seo.jsx';
import {completeMicrosoftApproval} from '../utils/microsoftApproval.js';
import {adminSecurityRequest} from '../admin-react/AdminDeviceVerification.jsx';
export default function MicrosoftApproval(){
 const user=useAuth(),navigate=useNavigate(),[error,setError]=useState(''),exchange=useRef(null);
 useEffect(()=>{
  if(user===undefined)return;
  if(!user){setError('Sign in to your Drixel account before approving Microsoft sign-in.');return;}
  let live=true;
  // A repeated effect must observe the same exchange, not sign in a second time.
  if(!exchange.current)exchange.current=completeMicrosoftApproval(user).then(async result=>{
   if(auth.currentUser?.uid!==user.uid)throw Error('Your signed-in account changed. Start again.');
   if(typeof result.customToken!=='string'||!result.customToken)throw Error('Microsoft approval did not return a verified session. Start again.');
   const verified=await signInWithCustomToken(auth,result.customToken);
   const status=await adminSecurityRequest('authenticator/status',{},verified.user);
   if(status.verified!==true)throw Error('Your administrator session was not confirmed. Start again.');
   return verified.user.uid;
  });
  exchange.current.then(uid=>{
   if(!live)return;
   if(uid!==user.uid||auth.currentUser?.uid!==uid)throw Error('Your signed-in account changed. Start again.');
   navigate('/za/admin',{replace:true});
  }).catch(e=>{
   if(!live)return;
   history.replaceState(null,'',location.pathname);
   setError(e.message||'Microsoft approval failed. Start again.');
  });
  return()=>{live=false};
 },[user?.uid,navigate]);
 return <main className="admin-gate"><Seo title="Microsoft approval | Drixel" noindex/><strong>DRIXEL</strong><h1>Microsoft approval</h1>{error?<><p role="alert">{error}</p><Link to="/za/admin">Return to admin sign-in</Link></>:<p role="status">Confirming your Microsoft approval…</p>}</main>;
}
