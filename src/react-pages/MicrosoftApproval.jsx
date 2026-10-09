import React,{useEffect,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {signInWithCustomToken} from 'firebase/auth';
import {auth} from '../config/firebase-react.js';
import useAuth from '../hooks/useAuth.js';
import Seo from '../components/Seo.jsx';
import {completeMicrosoftApproval} from '../utils/microsoftApproval.js';
import {adminSecurityRequest} from '../admin-react/AdminDeviceVerification.jsx';
export default function MicrosoftApproval(){const user=useAuth(),navigate=useNavigate(),[error,setError]=useState('');useEffect(()=>{if(user===undefined)return;if(!user){setError('Sign in to your Drixel account before approving Microsoft sign-in.');return;}let live=true;completeMicrosoftApproval(user).then(async result=>{const verified=await signInWithCustomToken(auth,result.customToken);const status=await adminSecurityRequest('authenticator/status',{},verified.user);if(!status.verified)throw Error('Your administrator session was not confirmed. Start again.');if(live)navigate('/za/admin',{replace:true});}).catch(e=>{history.replaceState(null,'',location.pathname);if(live)setError(e.message||'Microsoft approval failed. Start again.');});return()=>{live=false};},[user?.uid,navigate]);return <main className="admin-gate"><Seo title="Microsoft approval | Drixel" noindex/><strong>DRIXEL</strong><h1>Microsoft approval</h1>{error?<><p role="alert">{error}</p><Link to="/za/admin">Return to admin sign-in</Link></>:<p role="status">Confirming your Microsoft approval…</p>}</main>;}
