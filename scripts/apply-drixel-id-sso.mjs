import fs from'node:fs';
const replaceOnce=(text,needle,replacement,label)=>{const i=text.indexOf(needle);if(i<0)throw Error('Missing '+label);return text.slice(0,i)+replacement+text.slice(i+needle.length)};

// App route
{
 const path='src/app/App.jsx';let text=fs.readFileSync(path,'utf8');
 text=replaceOnce(text,'const Auth = lazy(() => import("../react-pages/Auth.jsx"));','const Auth = lazy(() => import("../react-pages/Auth.jsx"));\nconst DrixelIdCallback = lazy(() => import("../react-pages/DrixelIdCallback.jsx"));','Auth lazy import');
 text=replaceOnce(text,'<Route path="/:market/member/login" element={<MarketRoute><Auth /></MarketRoute>} />','<Route path="/:market/member/drixel-callback" element={<MarketRoute><DrixelIdCallback /></MarketRoute>} /><Route path="/:market/member/login" element={<MarketRoute><Auth /></MarketRoute>} />','member login route');
 fs.writeFileSync(path,text);
}

// Customer sign-in page
{
 const path='src/react-pages/Auth.jsx';let text=fs.readFileSync(path,'utf8');
 text=replaceOnce(text,'import{loginDestination}from"../utils/loginDestination.js";','import{loginDestination}from"../utils/loginDestination.js";\nimport{beginDrixelIdLogin,drixelIdConfigured}from"../utils/drixelId.js";','Drixel ID import');
 const google='<div className="auth-divider"><span>or</span></div><button className="auth-google" onClick={async()=>{try{const result=await signInWithPopup(auth,new GoogleAuthProvider());await setDoc(doc(db,"users",result.user.uid),{email:result.user.email,name:result.user.displayName||"",providerPhotoURL:result.user.photoURL||"",lastLogin:serverTimestamp()},{merge:true});nav(next)}catch{setMsg("Google sign-in could not be completed.")}}}>Continue with Google</button>';
 const replacement='<div className="auth-divider"><span>or</span></div>{drixelIdConfigured()&&<><button className="auth-drixel" type="button" disabled={busy} onClick={async()=>{if(busy)return;setBusy(true);setMsg("");try{await beginDrixelIdLogin({market,returnTo:next})}catch(error){setMsg(error instanceof Error?error.message:"Drixel ID sign-in could not be started.");setBusy(false)}}}>Continue with Drixel ID</button><p className="auth-sso-note">One Drixel account across Drixel SA and connected Drixel services.</p></>}<button className="auth-google" onClick={async()=>{try{const result=await signInWithPopup(auth,new GoogleAuthProvider());await setDoc(doc(db,"users",result.user.uid),{email:result.user.email,name:result.user.displayName||"",providerPhotoURL:result.user.photoURL||"",lastLogin:serverTimestamp()},{merge:true});nav(next)}catch{setMsg("Google sign-in could not be completed.")}}}>Continue with Google</button>';
 text=replaceOnce(text,google,replacement,'Google sign-in block');
 fs.writeFileSync(path,text);
}

// Styling for the Drixel-owned identity action.
{
 const path='src/styles/auth.css';let text=fs.readFileSync(path,'utf8');
 text=text.replace('.auth-primary,.auth-google{width:100%;border:1px solid #050505;border-radius:999px;padding:15px;font-weight:800;cursor:pointer}', '.auth-primary,.auth-google,.auth-drixel{width:100%;border:1px solid #050505;border-radius:999px;padding:15px;font-weight:800;cursor:pointer}');
 text=text.replace('.auth-google{background:#fff;color:#050505}', '.auth-google{background:#fff;color:#050505}.auth-drixel{background:#050505;color:#fff;margin-bottom:10px}.auth-drixel:disabled{opacity:.55;cursor:default}.auth-sso-note{margin:0 0 18px;color:#777;font-size:10px;line-height:1.5;text-align:center}');
 fs.writeFileSync(path,text);
}

// Worker route
{
 const path='worker/src/worker.mjs';let text=fs.readFileSync(path,'utf8');
 text=replaceOnce(text,"import {deliveryInformation} from './delivery.mjs';","import {deliveryInformation} from './delivery.mjs';\nimport {drixelIdExchange} from './drixel-id.mjs';",'worker Drixel ID import');
 text=replaceOnce(text,"(url.pathname==='/api/customer/reminders'?shoppingReminderApi:url.pathname==='/api/reminder-preferences'?shoppingReminderUnsubscribe:url.pathname==='/api/delivery'?deliveryInformation:","(url.pathname==='/api/customer/reminders'?shoppingReminderApi:url.pathname==='/api/reminder-preferences'?shoppingReminderUnsubscribe:url.pathname==='/api/auth/drixel/exchange'?drixelIdExchange:url.pathname==='/api/delivery'?deliveryInformation:",'worker route chain');
 text=replaceOnce(text,"if(['/api/admin/launch-readiness'", "if(url.pathname==='/api/auth/drixel/exchange'){const identity=createHash('sha256').update(req.get('cf-connecting-ip')||'local').digest('hex');await consumeRateLimit(getFirestore(),{identity,bucket:'drixel-id-exchange',limit:30,windowMs:60000});}\n   if(['/api/admin/launch-readiness'",'Drixel ID rate limit');
 fs.writeFileSync(path,text);
}

// Public client configuration docs.
{
 const path='.env.example';let text=fs.readFileSync(path,'utf8');
 text+='\n# Drixel ID first-party SSO (public SPA values; never add a client secret).\nVITE_DRIXEL_ID_ISSUER=https://dev-4pc3eomoyq8oy6o4.us.auth0.com/\nVITE_DRIXEL_ID_AUTHORIZATION_ENDPOINT=https://dev-4pc3eomoyq8oy6o4.us.auth0.com/authorize\nVITE_DRIXEL_ID_TOKEN_ENDPOINT=https://dev-4pc3eomoyq8oy6o4.us.auth0.com/oauth/token\nVITE_DRIXEL_ID_AUDIENCE=https://api.drixel-platform\nVITE_DRIXEL_ID_CLIENT_ID=\n';
 fs.writeFileSync(path,text);
}

// Worker server-to-server platform endpoint (not a secret).
{
 const path='worker/wrangler.jsonc';let text=fs.readFileSync(path,'utf8');
 text=replaceOnce(text,'"STORE_URL": "https://drixelsa.co.za",','"STORE_URL": "https://drixelsa.co.za",\n    "DRIXEL_PLATFORM_API_URL": "https://drixel-platform-api-staging.onrender.com",','worker platform URL');
 fs.writeFileSync(path,text);
}

// Build-time public Drixel ID settings. Only the client ID must be supplied as a repository variable after the Auth0 app is created.
{
 const path='.github/workflows/react-v3-build.yml';let text=fs.readFileSync(path,'utf8');
 text=replaceOnce(text,"          VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL || 'https://drixel-api.drixelsa.workers.dev' }}","          VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL || 'https://drixel-api.drixelsa.workers.dev' }}\n          VITE_DRIXEL_ID_ISSUER: ${{ vars.VITE_DRIXEL_ID_ISSUER || 'https://dev-4pc3eomoyq8oy6o4.us.auth0.com/' }}\n          VITE_DRIXEL_ID_AUTHORIZATION_ENDPOINT: ${{ vars.VITE_DRIXEL_ID_AUTHORIZATION_ENDPOINT || 'https://dev-4pc3eomoyq8oy6o4.us.auth0.com/authorize' }}\n          VITE_DRIXEL_ID_TOKEN_ENDPOINT: ${{ vars.VITE_DRIXEL_ID_TOKEN_ENDPOINT || 'https://dev-4pc3eomoyq8oy6o4.us.auth0.com/oauth/token' }}\n          VITE_DRIXEL_ID_AUDIENCE: ${{ vars.VITE_DRIXEL_ID_AUDIENCE || 'https://api.drixel-platform' }}\n          VITE_DRIXEL_ID_CLIENT_ID: ${{ vars.VITE_DRIXEL_ID_CLIENT_ID || '' }}",'build Drixel ID variables');
 fs.writeFileSync(path,text);
}

console.log('Drixel SA first-party SSO integration applied.');
