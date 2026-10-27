import{loginDestination}from"../utils/loginDestination.js";
import{beginDrixelIdLogin,drixelIdConfigured}from"../utils/drixelId.js";
import Seo from"../components/Seo.jsx";
import {GoogleAuthProvider,signInWithPopup,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,updateProfile} from "firebase/auth";
import {doc,setDoc,serverTimestamp} from "firebase/firestore";
import {auth,db} from "../config/firebase-react.js";
import React,{useState}from"react";
import{useSearchParams,useParams,Link,useNavigate}from"react-router-dom";

export default function Auth(){
 const{market="za"}=useParams(),[params]=useSearchParams(),navigate=useNavigate();
 const initialMode=params.get("mode")==="register"?"register":"login";
 const[mode,setMode]=useState(initialMode),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const next=loginDestination(market,params.get("next"));
 const configured=drixelIdConfigured();
 async function completeFirebaseLogin(user,created=false){
  // Preserve existing Firebase identity and Firestore data; never reset roles or orders.
  await setDoc(doc(db,"users",user.uid),{
   uid:user.uid,email:user.email||"",name:user.displayName||user.email?.split("@")[0]||"",
   lastLogin:serverTimestamp(),...(created?{createdAt:serverTimestamp()}:{}),
  },{merge:true});
  navigate(next,{replace:true});
 }
 async function withFirebase(task){
  if(busy)return;
  setBusy(true);setMsg("");
  try{const result=await task();await completeFirebaseLogin(result.user,mode==="register"&&result.operationType==="create")}
  catch(error){
   const code=String(error?.code||"");
   if(code==="auth/popup-closed-by-user"||code==="auth/cancelled-popup-request")return;
   setMsg(code==="auth/account-exists-with-different-credential"?"This email already has an account using another sign-in method. Sign in with that method first.":code==="auth/invalid-credential"?"Incorrect email or password.":code==="auth/email-already-in-use"?"This email is already registered. Please sign in.":code==="auth/popup-blocked"?"Your browser blocked the Google sign-in window. Allow popups and try again.":error?.message||"Sign-in could not be completed.");
  }finally{setBusy(false)}
 }
 const googleLogin=()=>withFirebase(()=>signInWithPopup(auth,new GoogleAuthProvider()));
 const emailLogin=async event=>{
  event.preventDefault();if(busy)return;
  const data=new FormData(event.currentTarget),email=String(data.get("firebase-email")||"").trim(),password=String(data.get("firebase-password")||"");
  const name=String(data.get("firebase-name")||"").trim();
  if(mode==="register"&&password.length<8){setMsg("Use a password of at least 8 characters.");return}
  await withFirebase(async()=>{
   const result=mode==="register"?await createUserWithEmailAndPassword(auth,email,password):await signInWithEmailAndPassword(auth,email,password);
   if(mode==="register"&&name)await updateProfile(result.user,{displayName:name});
   return {...result,operationType:mode==="register"?"create":"login"};
  });
 };
 const resetPassword=async()=>{
  const email=document.querySelector('[name="firebase-email"]')?.value?.trim();
  if(!email){setMsg("Enter your email address in the email and password section first.");return}
  if(busy)return;setBusy(true);setMsg("");
  try{await sendPasswordResetEmail(auth,email);setMsg("If the address has an account, check your inbox for password reset instructions.")}
  catch{setMsg("Could not request password reset. Please try again.")}
  finally{setBusy(false)}
 };
 async function continueWithDrixel(e){
  e.preventDefault();
  if(busy||!configured)return;
  const form=new FormData(e.currentTarget),email=String(form.get("email")||"").trim();
  setBusy(true);setMsg("");
  try{await beginDrixelIdLogin({market,returnTo:next,mode,email})}
  catch(error){setMsg(error instanceof Error?error.message:"Drixel ID could not start securely.");setBusy(false)}
 }
 return <main className="auth-shell auth-id-shell">
  <Seo title={mode==="register"?"Create Drixel ID | Drixel":"Drixel ID | Sign in"} noindex/>
  <section className="auth-brand auth-id-brand">
   <Link className="auth-wordmark" to={`/${market}`}>DRIXEL</Link>
   <div className="auth-id-brandcopy">
    <p>DRIXEL ID</p>
    <h1>One account.<br/>Across Drixel.</h1>
    <span>Use one secure identity for Drixel SA and connected Drixel services. Your password is handled by our identity provider and is never stored in the storefront.</span>
   </div>
   <div className="auth-id-brandfoot"><span>DRIXEL LABS INC</span><Link className="auth-shop" to={`/${market}/w/new-featured`}>Return to store →</Link></div>
  </section>
  <section className="auth-card auth-id-card">
   <div className="auth-id-eyebrow">DRIXEL ID</div>
   <div className="auth-tabs auth-id-tabs">
    <button type="button" className={mode==="login"?"active":""} onClick={()=>{setMode("login");setMsg("")}}>Sign in</button>
    <button type="button" className={mode==="register"?"active":""} onClick={()=>{setMode("register");setMsg("")}}>Create account</button>
   </div>
   <div className="auth-id-heading">
    <h2>{mode==="register"?"Create your Drixel ID":"Welcome back"}</h2>
    <p>{mode==="register"?"Start with one account for Drixel SA and future connected Drixel services.":"Continue securely with your Drixel ID."}</p>
   </div>
   {msg&&<div className="auth-message" role="status">{msg}</div>}
   {!configured&&<div className="auth-message" role="status">Drixel ID is temporarily unavailable on this store.</div>}
   <form className="auth-id-form" onSubmit={continueWithDrixel}>
    <label>Email address<input name="email" autoComplete="email" type="email" inputMode="email" placeholder="name@example.com"/></label>
    <button className="auth-primary auth-id-primary" disabled={busy||!configured}>{busy?"Opening Drixel ID…":mode==="register"?"Create Drixel ID":"Continue"}</button>
   </form>
   <div className="auth-id-security" style={{marginTop:20,marginBottom:12}}>
    <p><strong>Or use your existing DRIXEL SA account</strong></p>
   </div>
   <button type="button" className="auth-primary" style={{width:"100%",background:"#fff",color:"#141414",border:"1px solid #b9b9b9",display:"flex",alignItems:"center",justifyContent:"center",gap:12}} onClick={googleLogin} disabled={busy}>
    <span aria-hidden="true" style={{fontWeight:800,color:"#4285f4",fontSize:21}}>G</span> Continue with Google
   </button>
   <form onSubmit={emailLogin} className="auth-id-form" style={{marginTop:16}}>
    {mode==="register"&&<label>Full name<input name="firebase-name" autoComplete="name" required/></label>}
    <label>Email for existing account<input name="firebase-email" type="email" autoComplete="email" required/></label>
    <label>Password<input name="firebase-password" type="password" autoComplete={mode==="register"?"new-password":"current-password"} required/></label>
    <button className="auth-primary" disabled={busy} type="submit">{mode==="register"?"Create account with email":"Sign in with email"}</button>
   </form>
   {mode==="login"&&<button type="button" disabled={busy} onClick={resetPassword} style={{border:0,background:"transparent",textDecoration:"underline",cursor:"pointer",padding:"12px 0"}}>Forgot password?</button>}
   <div className="auth-id-security">
    <span className="auth-id-lock" aria-hidden="true">●</span>
    <p><strong>Secure sign-in</strong><br/>Authentication is protected with OAuth 2.0 Authorization Code + PKCE. Drixel SA never receives your password.</p>
   </div>
   <p className="auth-legal">By continuing, you agree to the Drixel terms and privacy policies for the service you are accessing.</p>
  </section>
 </main>
}
