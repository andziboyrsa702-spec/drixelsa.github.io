import {generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse} from '@simplewebauthn/server';
import {createSign,createHash,randomUUID,randomBytes,timingSafeEqual} from 'node:crypto';
import {getFirestore} from './firestore.mjs';
import {adminIdentity} from './auth.mjs';
import {apiError,consumeRateLimit,recentAdminProof} from './security.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function relyingParty(req,storeUrl=process.env.STORE_URL){
 let url;try{url=new URL(storeUrl)}catch{throw apiError('Store URL is not configured.',503)}
 if(url.protocol!=='https:'||url.username||url.password||url.port)throw apiError('Passkeys require the production HTTPS store.',503);
 if(req.get('Origin')!==url.origin)throw apiError('Open the production store to verify your device.',403);
 return {rpID:url.hostname,origin:url.origin};
}
export function mintAdminToken(user,version,now=Date.now(),method='passkey'){
 const account=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT||'{}');
 if(account.project_id!==process.env.FIREBASE_PROJECT_ID||!account.client_email||!account.private_key)throw apiError('Administrator verification is not configured.',503);
 const seconds=Math.floor(now/1000),b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const input=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:account.client_email,sub:account.client_email,aud:'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',iat:seconds,exp:seconds+300,uid:user.uid,claims:{drixel_admin_method:method,drixel_admin_verified_at:seconds,drixel_admin_key_version:version}});
 return input+'.'+createSign('RSA-SHA256').update(input).sign(account.private_key).toString('base64url');
}
export function createPasskeyHandlers({db=getFirestore,identity=adminIdentity,mint=mintAdminToken,webauthn={generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse},now=Date.now}={}){
 async function context(req){const party=relyingParty(req),user=await identity(req),database=db();await consumeRateLimit(database,{identity:user.uid,bucket:'passkeys',limit:20,windowMs:300000,now:now()});return {party,user,database,ref:database.doc('admin_security/'+user.uid)};}
 async function challenge(database,user,party,kind,value){const id=randomUUID();await database.doc('admin_challenges/'+id).create({uid:user.uid,authTime:user.auth_time,origin:party.origin,kind,challenge:value,expiresAt:now()+300000,used:false});return id;}
 async function consume(database,user,party,id,kind){if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw apiError('Verification request is invalid.',400);let value;await database.runTransaction(async tx=>{const ref=database.doc('admin_challenges/'+id),snap=await tx.get(ref),data=snap.data();if(!data||data.used||data.uid!==user.uid||data.authTime!==user.auth_time||data.origin!==party.origin||data.kind!==kind||data.expiresAt<=now())throw apiError('Verification expired. Start again.',409);value=data.challenge;tx.update(ref,{used:true});});return value;}
 async function status(req,res){const {user,ref}=await context(req),policy=(await ref.get()).data();const config=(await db().doc('security_config/admin').get()).data();return res.json({available:process.env.ADMIN_PASSKEYS_ENABLED?.trim()==='true'||Boolean(policy?.enabled)||config?.passkeysRequired!==false,enrolled:Boolean(policy?.enabled),verified:recentAdminProof(user,policy,now())&&Boolean(policy?.enabled),reason:!policy?.enabled?'not_enrolled':!user.drixel_admin_verified_at?'missing_session_proof':user.drixel_admin_key_version!==policy.version?'security_version_changed':!recentAdminProof(user,policy,now())?'session_expired':'verified',expiresAt:Number(user.drixel_admin_verified_at||0)*1000+900000});}
 async function options(req,res){const {user,party,database,ref}=await context(req),policy=(await ref.get()).data(),kind=req.body.kind;
  if(!['register','authenticate'].includes(kind))throw apiError('Choose a verification action.',400);
  if(kind==='register'){
   if(process.env.ADMIN_PASSKEYS_ENABLED?.trim()!=='true')throw apiError('Passkey enrollment has not been enabled. Complete the security setup first.',503);
   if(now()/1000-user.auth_time>300)throw apiError('Sign in again before registering a security device.',401);
   if(policy?.enabled&&!recentAdminProof(user,policy,now()))throw apiError('Verify an existing passkey before adding a device.',403);
   if((policy?.credentials||[]).length>=5)throw apiError('Five security devices are already registered.',409);
  }else if(!policy?.enabled)throw apiError('Register a security device first.',409);
  if(policy?.totpEnabled)throw apiError('Use your authenticator code for this account.',403);
  const credentials=policy?.credentials||[],optionsJSON=kind==='register'?await webauthn.generateRegistrationOptions({rpName:'Drixel SA Admin',rpID:party.rpID,userName:user.email||user.uid,userDisplayName:user.email||user.uid,userID:new TextEncoder().encode(user.uid),attestationType:'none',supportedAlgorithmIDs:[-7,-257],excludeCredentials:credentials.map(c=>({id:c.id,transports:c.transports})),authenticatorSelection:{residentKey:'preferred',userVerification:'required'}}):await webauthn.generateAuthenticationOptions({rpID:party.rpID,userVerification:'required',allowCredentials:credentials.map(c=>({id:c.id,transports:c.transports}))});
  return res.json({optionsJSON,challengeId:await challenge(database,user,party,kind,optionsJSON.challenge)});
 }
 async function verify(req,res){const {user,party,database,ref}=await context(req),kind=req.body.kind;if(!['register','authenticate'].includes(kind))throw apiError('Choose a verification action.',400);
  const expectedChallenge=await consume(database,user,party,req.body.challengeId,kind),policy=(await ref.get()).data();let result;
  try{result=kind==='register'?await webauthn.verifyRegistrationResponse({response:req.body.credential,expectedChallenge,expectedOrigin:party.origin,expectedRPID:party.rpID,requireUserVerification:true,supportedAlgorithmIDs:[-7,-257]}):await webauthn.verifyAuthenticationResponse({response:req.body.credential,expectedChallenge,expectedOrigin:party.origin,expectedRPID:party.rpID,requireUserVerification:true,credential:(()=>{const c=policy?.credentials?.find(x=>x.id===req.body.credential?.id);if(!c)throw Error('Unknown credential');return {...c,publicKey:Buffer.from(c.publicKey,'base64url')};})()});}catch{throw apiError('Device verification failed. Start again.',403)}
  if(!result.verified)throw apiError('Device verification failed. Start again.',403);
  let version=policy?.version,recoveryCodes=[];
  await database.runTransaction(async tx=>{
   const current=(await tx.get(ref)).data();if(current?.totpEnabled)throw apiError('Use your authenticator code for this account.',403);
   if(kind==='register'){
    if(now()/1000-user.auth_time>300||current?.enabled&&!recentAdminProof(user,current,now()))throw apiError('Sign in and verify your existing device again.',403);
    const c=result.registrationInfo?.credential;if(!c||!result.registrationInfo.userVerified)throw apiError('Device verification is required.',403);
    const credentials=current?.credentials||[];if(credentials.length>=5||credentials.some(x=>x.id===c.id))throw apiError('Device is already registered or the device limit was reached.',409);
    version=randomUUID();if(!current?.enabled)recoveryCodes=Array.from({length:8},()=>randomBytes(16).toString('hex'));
    tx.set(ref,{enabled:true,version,credentials:[...credentials,{id:c.id,publicKey:Buffer.from(c.publicKey).toString('base64url'),counter:c.counter,transports:c.transports||[]}],recoveryHashes:recoveryCodes.length?recoveryCodes.map(hash):current.recoveryHashes||[],updatedAt:now()});
    tx.set(database.doc('security_config/admin'),{passkeysRequired:true,updatedAt:now()});
    tx.set(database.doc('security_events/'+randomUUID()),{actor:user.uid,action:'passkey_registered',at:now()});
   }else{
    if(!current?.enabled||current.version!==policy?.version)throw apiError('Security settings changed. Start again.',409);
    const credential=current.credentials.find(x=>x.id===req.body.credential.id),original=policy.credentials.find(x=>x.id===req.body.credential.id);
    if(!credential||credential.counter!==original.counter)throw apiError('Device verification was superseded. Start again.',409);
    version=current.version;tx.set(database.doc('security_events/'+randomUUID()),{actor:user.uid,action:'passkey_verified',at:now()});tx.update(ref,{credentials:current.credentials.map(c=>c.id===credential.id?{...c,counter:result.authenticationInfo.newCounter}:c),lastVerifiedAt:now()});
   }
  });
  return res.json({verified:true,customToken:await mint(user,version,now()),recoveryCodes});
 }
 async function recover(req,res){const {user,database,ref}=await context(req);if(now()/1000-user.auth_time>300)throw apiError('Sign in again before using a recovery code.',401);const code=String(req.body.code||'').trim();if(!/^[a-f0-9]{32}$/.test(code))throw apiError('Recovery code is invalid.',403);const supplied=Buffer.from(hash(code),'hex');let version;
  await database.runTransaction(async tx=>{const policy=(await tx.get(ref)).data(),values=policy?.recoveryHashes||[],index=values.findIndex(x=>typeof x==='string'&&x.length===64&&timingSafeEqual(Buffer.from(x,'hex'),supplied));if(policy?.totpEnabled||!policy?.enabled||index<0)throw apiError('Recovery code is invalid.',403);version=randomUUID();tx.set(database.doc('security_events/'+randomUUID()),{actor:user.uid,action:'recovery_code_used',at:now()});tx.update(ref,{version,recoveryHashes:values.filter((_,i)=>i!==index),lastRecoveryAt:now()});});
  return res.json({verified:true,customToken:await mint(user,version,now()),recoveryCodes:[]});
 }
 return {status,options,verify,recover};
}
export const passkeyHandlers=createPasskeyHandlers();
