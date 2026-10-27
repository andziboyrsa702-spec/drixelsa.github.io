import React,{useEffect,useState}from'react';
import{useNavigate,useParams,Link}from'react-router-dom';
import{signInWithCustomToken,updateEmail,updateProfile}from'firebase/auth';
import{doc,setDoc,serverTimestamp}from'firebase/firestore';
import{auth,db}from'../config/firebase-react.js';
import{finishDrixelIdLogin}from'../utils/drixelId.js';
import Seo from'../components/Seo.jsx';

export default function DrixelIdCallback(){
 const{market='za'}=useParams(),navigate=useNavigate(),[message,setMessage]=useState('Finishing your Drixel sign-in…'),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;(async()=>{
  try{
   const{bridge,returnTo}=await finishDrixelIdLogin();
   const result=await signInWithCustomToken(auth,bridge.firebase_custom_token);
   const email=String(bridge.account?.email||'').trim(),name=String(bridge.account?.display_name||'').trim();
   if(email&&!result.user.email)await updateEmail(result.user,email);
   if(name&&result.user.displayName!==name)await updateProfile(result.user,{displayName:name});
   await setDoc(doc(db,'users',result.user.uid),{uid:result.user.uid,email:email||result.user.email||'',name:name||result.user.displayName||'',drixelAccountId:bridge.account?.id||'',drixelApplication:bridge.application?.slug||'drixel-sa-store',authProvider:'drixel-id',lastLogin:serverTimestamp()},{merge:true});
   if(active)navigate(returnTo,{replace:true});
  }catch(error){if(active){setFailed(true);setMessage(error instanceof Error?error.message:'Drixel ID sign-in could not be completed.')}}
 })();return()=>{active=false}},[navigate]);
 return <main className="auth-shell"><Seo title="Drixel ID | Drixel" noindex/><section className="auth-brand"><Link className="auth-wordmark" to={`/${market}`}>DRIXEL</Link><div><p>DRIXEL ID</p><h1>One account.<br/>Across Drixel.</h1><span>Your identity is being verified securely.</span></div></section><section className="auth-card"><h2>{failed?'Sign-in needs attention':'Signing you in'}</h2><p role={failed?'alert':'status'}>{message}</p>{failed&&<Link className="auth-primary" to={`/${market}/member/login`}>Return to sign in</Link>}</section></main>;
}
