import{loginDestination}from"../utils/loginDestination.js";
import{beginDrixelIdLogin,drixelIdConfigured}from"../utils/drixelId.js";
import Seo from"../components/Seo.jsx";
import React,{useState}from"react";
import{useSearchParams,useParams,Link}from"react-router-dom";

export default function Auth(){
 const{market="za"}=useParams(),[params]=useSearchParams();
 const initialMode=params.get("mode")==="register"?"register":"login";
 const[mode,setMode]=useState(initialMode),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const next=loginDestination(market,params.get("next"));
 const configured=drixelIdConfigured();
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
   <div className="auth-id-security">
    <span className="auth-id-lock" aria-hidden="true">●</span>
    <p><strong>Secure sign-in</strong><br/>Authentication is protected with OAuth 2.0 Authorization Code + PKCE. Drixel SA never receives your password.</p>
   </div>
   <p className="auth-legal">By continuing, you agree to the Drixel terms and privacy policies for the service you are accessing.</p>
  </section>
 </main>
}
