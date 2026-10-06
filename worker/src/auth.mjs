import {getFirestore} from "./firestore.mjs";
import {recentAdminProof,apiError} from "./security.mjs";
import {createPublicKey,verify} from 'node:crypto';
let certs,expires=0;
export async function verifyIdToken(token,{request=fetch,project=process.env.FIREBASE_PROJECT_ID,now=Date.now()}={}){
 if(typeof token!=='string'||token.length>12000)throw Error('Invalid token');
 const parts=token.split('.');if(parts.length!==3)throw Error('Invalid token');
 const header=JSON.parse(Buffer.from(parts[0],'base64url')),claims=JSON.parse(Buffer.from(parts[1],'base64url')),seconds=now/1000;
 if(header.alg!=='RS256'||!header.kid||claims.aud!==project||claims.iss!==`https://securetoken.google.com/${project}`||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>128||!Number.isFinite(claims.exp)||claims.exp<=seconds||!Number.isFinite(claims.iat)||claims.iat>seconds||!Number.isFinite(claims.auth_time)||claims.auth_time>seconds)throw Error('Invalid token claims');
 if(!certs||expires<now){const r=await request('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Authentication temporarily unavailable');certs=await r.json();expires=now+Math.min(3600,Number(r.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1]||300))*1000;}
 if(!certs[header.kid]||!verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey(certs[header.kid]),Buffer.from(parts[2],'base64url')))throw Error('Invalid token signature');
 return {...claims,uid:claims.sub};
}
export const getAuth=()=>({verifyIdToken});
export async function adminIdentity(req){const token=req.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];if(!token)throw Object.assign(Error('Authentication required.'),{status:401});let user;try{user=await verifyIdToken(token);}catch{throw Object.assign(Error('Invalid authentication token.'),{status:401});}if(!(user.admin===true||user.role==='admin'||user.email_verified===true&&['admin@drixelsa.co.za','drixelsa@gmail.com'].includes(user.email?.toLowerCase())))throw Object.assign(Error('Administrator access required.'),{status:403});return user;}

export async function adminUser(req){const user=await adminIdentity(req),db=getFirestore(),policy=(await db.doc("admin_security/"+user.uid).get()).data(),config=(await db.doc("security_config/admin").get()).data();if(config?.passkeysRequired&&!policy?.enabled||!recentAdminProof(user,policy))throw apiError("Verify your administrator passkey to continue.",403);return user;}
