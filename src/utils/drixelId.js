import{apiUrl}from'./api.js';

const config={
 issuer:import.meta.env.VITE_DRIXEL_ID_ISSUER,
 authorizationEndpoint:import.meta.env.VITE_DRIXEL_ID_AUTHORIZATION_ENDPOINT,
 tokenEndpoint:import.meta.env.VITE_DRIXEL_ID_TOKEN_ENDPOINT,
 clientId:import.meta.env.VITE_DRIXEL_ID_CLIENT_ID,
 audience:import.meta.env.VITE_DRIXEL_ID_AUDIENCE,
};

export const drixelIdConfigured=()=>Boolean(config.issuer&&config.authorizationEndpoint&&config.clientId&&config.audience);

const base64Url=bytes=>{
 let binary='';bytes.forEach(byte=>{binary+=String.fromCharCode(byte)});
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
};
const randomToken=(size=32)=>{const bytes=new Uint8Array(size);crypto.getRandomValues(bytes);return base64Url(bytes)};
const safeReturnTo=(value,fallback)=>typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')?value:fallback;

export async function beginDrixelIdLogin({market='za',returnTo,mode='login',email=''}){
 if(!drixelIdConfigured())throw Error('Drixel ID sign-in has not been configured for this store.');
 if(!window.isSecureContext)throw Error('Drixel ID requires a secure HTTPS connection.');
 const state=randomToken(),nonce=randomToken(),verifier=randomToken(48);
 const challenge=base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
 const redirectUri=`${location.origin}/${market}/member/drixel-callback`;
 const fallback=`/${market}/member/profile`;
 const transaction={state,nonce,verifier,redirectUri,returnTo:safeReturnTo(returnTo,fallback),createdAt:Date.now()};
 sessionStorage.setItem('drixel-id-transaction',JSON.stringify(transaction));
 const authorization=new URL(config.authorizationEndpoint);
 authorization.searchParams.set('client_id',config.clientId);
 authorization.searchParams.set('response_type','code');
 authorization.searchParams.set('redirect_uri',redirectUri);
 authorization.searchParams.set('scope','openid profile email');
 authorization.searchParams.set('audience',config.audience);
 authorization.searchParams.set('state',state);
 authorization.searchParams.set('nonce',nonce);
 authorization.searchParams.set('code_challenge',challenge);
 authorization.searchParams.set('code_challenge_method','S256');
 if(mode==='register')authorization.searchParams.set('screen_hint','signup');
 const normalizedEmail=String(email||'').trim();
 if(normalizedEmail)authorization.searchParams.set('login_hint',normalizedEmail);
 authorization.searchParams.set('ui_locales','en');
 location.assign(authorization.toString());
}

export async function finishDrixelIdLogin(){
 if(!drixelIdConfigured())throw Error('Drixel ID sign-in has not been configured for this store.');
 let transaction;
 try{transaction=JSON.parse(sessionStorage.getItem('drixel-id-transaction')||'null')}catch{transaction=null}
 sessionStorage.removeItem('drixel-id-transaction');
 if(!transaction||Date.now()-Number(transaction.createdAt||0)>10*60*1000)throw Error('Your Drixel ID sign-in session expired. Start again.');
 const params=new URLSearchParams(location.search),code=params.get('code'),state=params.get('state'),providerError=params.get('error');
 if(providerError)throw Error(params.get('error_description')||'Drixel ID sign-in was cancelled.');
 if(!code||!state||state!==transaction.state)throw Error('Drixel ID could not verify this sign-in request.');
 const bridgeResponse=await fetch(apiUrl('/api/auth/drixel/exchange'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,code_verifier:transaction.verifier,redirect_uri:transaction.redirectUri,nonce:transaction.nonce})});
 const bridge=await bridgeResponse.json().catch(()=>({}));
 if(!bridgeResponse.ok||!bridge.firebase_custom_token)throw Error(bridge.message||'Drixel SA could not create your store session.');
 return {bridge,returnTo:safeReturnTo(transaction.returnTo,'/za/member/profile')};
}
