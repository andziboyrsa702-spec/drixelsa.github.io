import AdminDeviceVerification,{adminSecurityRequest} from "./AdminDeviceVerification.jsx";
import {signOut} from "firebase/auth";
import {auth} from "../config/firebase-react.js";
import React, {useEffect, useState} from 'react';
import {Link, Navigate, useLocation, useParams} from 'react-router-dom';
import {hasAdminAccess} from './adminAccess.js';
import useAuth from '../hooks/useAuth.js';
export default function AdminGuard({children}) {
  const user = useAuth(), {market = 'za'} = useParams(), location = useLocation();
  const [attempt, setAttempt] = useState(0);
  const [verificationError,setVerificationError]=useState('');
  const [state, setState] = useState({uid: null, loading: true, allowed: false, error: ''});
  useEffect(() => {
    let live = true;
    if (!user) {setState({uid:null,loading:user===undefined,allowed:false,error:''});return;}
    setState({uid:user.uid,loading:true,allowed:false,error:''});
    const timeout = setTimeout(() => {
      if (live) setState({uid:user.uid,loading:false,allowed:false,error:'Administrator access verification timed out. Check your connection and try again.'});
      live = false;
    }, 15000);
    const currentUser=auth.currentUser?.uid===user.uid?auth.currentUser:user;
    currentUser.getIdTokenResult().then(async result => {
      if (!live) return;
      const allowed = hasAdminAccess(result.claims);
      let security=null;if(allowed){security=await adminSecurityRequest('status',{},currentUser);if(!live)return;if(security.available!==true)throw Error('Administrator device verification is unavailable. Check the deployed security configuration and retry.');}
      setState({uid:user.uid,loading:false,allowed,security,error:allowed?'':'This account has not been granted Drixel administrator access.'});
      clearTimeout(timeout);
    }).catch(error => {
      if (live) setState({uid:user.uid,loading:false,allowed:false,error:error.message||'Administrator access could not be verified.'});
      clearTimeout(timeout);
    });
    return () => {live=false;clearTimeout(timeout);};
  }, [user, attempt]);
  useEffect(()=>{
    if(!user)return;
    let lastActivity=Date.now();const touch=()=>{lastActivity=Date.now()};
    const events=['pointerdown','keydown','touchstart'];events.forEach(e=>window.addEventListener(e,touch,{passive:true}));
    const timer=setInterval(()=>{if(Date.now()-lastActivity>=15*60*1000)signOut(auth).catch(()=>{});},60000);
    return()=>{clearInterval(timer);events.forEach(e=>window.removeEventListener(e,touch));};
  },[user?.uid]);
  useEffect(()=>{
    if(!state.security?.verified)return;
    const timer=setTimeout(()=>setAttempt(value=>value+1),Math.max(1,state.security.expiresAt-Date.now()));
    return()=>clearTimeout(timer);
  },[state.security?.verified,state.security?.expiresAt]);
  if (user === null) return <Navigate to={`/${market}/member/login?next=${encodeURIComponent(location.pathname+location.search)}`} replace/>;
  if (user === undefined || state.loading || state.uid !== user.uid) return <div className="admin-gate" role="status"><strong>DRIXEL</strong><span>Verifying administrator access…</span></div>;
  if (!state.allowed) return <div className="admin-gate admin-access-denied" role="alert"><strong>DRIXEL</strong><span>{state.error}</span><small>{user.email}</small>
    <button onClick={() => setAttempt(value => value+1)}>Check access again</button><Link to={`/${market}/member/profile`}>Return to account</Link></div>;
  if(state.security?.available&&!state.security.verified)return <AdminDeviceVerification enrolled={state.security.enrolled} sessionError={verificationError} onFailure={setVerificationError} onVerified={()=>{setVerificationError('');setAttempt(value=>value+1)}}/>;
  return children;
}
