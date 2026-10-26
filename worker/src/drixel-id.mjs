import{createSign}from'node:crypto';

const b64=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
let adminTokenCache;

function serviceAccount(){
 const account=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT||'{}');
 if(account.project_id!==process.env.FIREBASE_PROJECT_ID||!account.private_key||!account.client_email)throw Object.assign(Error('Firebase identity bridge is not configured.'),{status:503});
 return account;
}

async function identityToolkitAccessToken(){
 const account=serviceAccount();
 if(adminTokenCache?.email===account.client_email&&adminTokenCache.until>Date.now())return adminTokenCache.token;
 const now=Math.floor(Date.now()/1000),header=b64({alg:'RS256',typ:'JWT'}),claims=b64({iss:account.client_email,scope:'https://www.googleapis.com/auth/identitytoolkit',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}),unsigned=header+'.'+claims,assertion=unsigned+'.'+createSign('RSA-SHA256').update(unsigned).sign(account.private_key).toString('base64url');
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(15000)}),body=await response.json().catch(()=>({}));
 if(!response.ok||!body.access_token)throw Object.assign(Error('Firebase identity bridge is unavailable.'),{status:503});
 adminTokenCache={email:account.client_email,token:body.access_token,until:Date.now()+(Math.max(300,Number(body.expires_in)||3600)-120)*1000};
 return body.access_token;
}

async function firebaseUidForEmail(email){
 const project=process.env.FIREBASE_PROJECT_ID,token=await identityToolkitAccessToken();
 const response=await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(project)}/accounts:lookup`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({email:[email]}),signal:AbortSignal.timeout(15000)}),body=await response.json().catch(()=>({}));
 if(response.ok)return body.users?.[0]?.localId||'';
 const detail=String(body?.error?.message||'');
 if(response.status===404||detail.includes('EMAIL_NOT_FOUND'))return'';
 throw Object.assign(Error('Existing store account lookup failed.'),{status:503});
}

function firebaseCustomToken(uid,claims={}){
 const account=serviceAccount(),now=Math.floor(Date.now()/1000),header=b64({alg:'RS256',typ:'JWT'}),payload=b64({iss:account.client_email,sub:account.client_email,aud:'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',iat:now,exp:now+3600,uid,claims}),unsigned=header+'.'+payload;
 return unsigned+'.'+createSign('RSA-SHA256').update(unsigned).sign(account.private_key).toString('base64url');
}

export async function drixelIdExchange(req,res){
 const accessToken=req.get('Authorization')?.match(/^Bearer ([A-Za-z0-9._~-]+)$/)?.[1];
 const idToken=typeof req.body?.id_token==='string'?req.body.id_token:'';
 if(!accessToken||!idToken)throw Object.assign(Error('A complete Drixel ID sign-in is required.'),{status:401});
 const platformBase=String(process.env.DRIXEL_PLATFORM_API_URL||'https://drixel-platform-api-staging.onrender.com').replace(/\/$/,'');
 const platformResponse=await fetch(platformBase+'/api/apps/drixel-sa-store/session',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({id_token:idToken}),signal:AbortSignal.timeout(20000)}),session=await platformResponse.json().catch(()=>({}));
 if(!platformResponse.ok)throw Object.assign(Error(session.error||'Drixel ID could not authorize this store session.'),{status:[400,401,403,404,409].includes(platformResponse.status)?platformResponse.status:503});
 const accountId=String(session.account?.id||''),email=String(session.account?.email||'').trim().toLowerCase();
 if(!/^[0-9a-f-]{36}$/i.test(accountId)||!email||email.length>254)throw Object.assign(Error('Drixel ID returned an incomplete account.'),{status:502});
 const existingUid=await firebaseUidForEmail(email),uid=existingUid||`drixel:${accountId}`;
 if(uid.length>128)throw Object.assign(Error('Drixel account identifier is invalid.'),{status:502});
 const customToken=firebaseCustomToken(uid,{drixel_account_id:accountId,drixel_application:'drixel-sa-store'});
 return res.json({firebase_custom_token:customToken,account:{id:accountId,email,display_name:String(session.account?.display_name||'')},application:session.application,roles:Array.isArray(session.roles)?session.roles:[]});
}
