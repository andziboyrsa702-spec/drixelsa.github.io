import {randomUUID, createSign} from 'node:crypto';
const b64=v=>Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url');
let tokenCache;
export async function accessToken(){
 const account=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT||'{}');
 if(account.project_id!==process.env.FIREBASE_PROJECT_ID||!account.private_key||!account.client_email)throw Error('Firebase service account is missing or belongs to another project.');
 if(tokenCache?.email===account.client_email&&tokenCache.until>Date.now())return tokenCache.token;
 const now=Math.floor(Date.now()/1000),payload=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:account.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const signature=createSign('RSA-SHA256').update(payload).sign(account.private_key).toString('base64url');
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:payload+'.'+signature}),signal:AbortSignal.timeout(15000)}),data=await r.json();
 if(!r.ok||!data.access_token)throw Error('Firebase service account authentication failed.');
 tokenCache={email:account.client_email,token:data.access_token,until:Date.now()+(data.expires_in-120)*1000};return data.access_token;
}
export const FieldValue={serverTimestamp:()=>({__op:'timestamp'}),increment:n=>({__op:'increment',n})};
export function encode(v){if(v===null)return {nullValue:null};if(v instanceof Date)return {timestampValue:v.toISOString()};if(Array.isArray(v))return {arrayValue:{values:v.map(encode)}};switch(typeof v){case 'string':return {stringValue:v};case 'boolean':return {booleanValue:v};case 'number':if(!Number.isFinite(v))throw Error('Invalid number');return Number.isSafeInteger(v)?{integerValue:String(v)}:{doubleValue:v};case 'object':return {mapValue:{fields:Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined).map(([k,x])=>[k,encode(x)]))}};throw Error('Unsupported Firestore value');}}
export function decode(v){if('nullValue'in v)return null;if('stringValue'in v)return v.stringValue;if('booleanValue'in v)return v.booleanValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return v.doubleValue;if('timestampValue'in v){const date=new Date(v.timestampValue);return {toDate:()=>date,toMillis:()=>date.getTime(),seconds:date.getTime()/1000,toJSON:()=>date.toISOString()};}if(v.arrayValue)return (v.arrayValue.values||[]).map(decode);if(v.mapValue)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,decode(x)]));return v;}
export function write(ref,data,mode){
 const fields={},transforms=[],mask=[];
 for(const [k,v]of Object.entries(data)){if(v===undefined)continue;mask.push(k);if(v?.__op==='timestamp')transforms.push({fieldPath:k,setToServerValue:'REQUEST_TIME'});else if(v?.__op==='increment')transforms.push({fieldPath:k,increment:encode(v.n)});else fields[k]=encode(v);}
 const w={update:{name:ref.name,fields}};
 if(mode!=='replace')w.updateMask={fieldPaths:mask.filter(k=>!transforms.some(t=>t.fieldPath===k))};
 if(transforms.length)w.updateTransforms=transforms;
 if(mode==='update')w.currentDocument={exists:true};if(mode==='create')w.currentDocument={exists:false};return w;
}
export class Firestore{
 constructor({request=fetch,token=accessToken,project=process.env.FIREBASE_PROJECT_ID}={}){this.request=(...args)=>request(...args);this.token=token;this.root=`projects/${project}/databases/(default)/documents`;}
 async rpc(suffix,body,method='POST'){const r=await this.request('https://firestore.googleapis.com/v1/'+this.root+suffix,{method,headers:{Authorization:'Bearer '+await this.token(),'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});const data=await r.json();if(!r.ok){const detail=data.error||(Array.isArray(data)?data.find(item=>item?.error)?.error:null);const code=detail?.status||'UNKNOWN';console.error('Firestore request rejected',JSON.stringify({status:r.status,code,operation:suffix.startsWith(':')?suffix:'document'}));const e=Object.assign(Error(detail?.message||'Firestore request failed (HTTP '+r.status+', '+code+')'),{code,status:r.status});throw e;}return data;}
 doc(path){return new Ref(this,path);}collection(path){return new Query(this,path);}
 snap(doc,path){const ref=this.doc(path||doc.name.split('/documents/')[1]);return {id:ref.id,ref,exists:Boolean(doc?.name),data:()=>doc?.name?Object.fromEntries(Object.entries(doc.fields||{}).map(([k,v])=>[k,decode(v)])):undefined};}
 async get(ref,transaction){try{if(transaction){const rows=await this.rpc(':batchGet',{documents:[ref.name],transaction});const row=rows.find(r=>r.found||r.missing);if(!row)throw Error('Firestore returned no document result.');return this.snap(row.found||{},ref.path);}const d=await this.rpc('/'+ref.path,undefined,'GET');return this.snap(d,ref.path);}catch(e){if(e.code==='NOT_FOUND')return this.snap({},ref.path);throw e;}}
 async commit(writes,transaction){return this.rpc(':commit',{writes,...(transaction?{transaction}:{})});}
 async bulkSet(rows){for(let i=0;i<rows.length;i+=400)await this.commit(rows.slice(i,i+400).map(({ref,data})=>write(ref,data,'replace')));}
 async runTransaction(fn){for(let attempt=0;attempt<3;attempt++){const {transaction}=await this.rpc(':beginTransaction',{options:{readWrite:{}}});const writes=[];let writing=false;const tx={get:ref=>{if(writing)throw Error('All transaction reads must precede writes.');return ref instanceof Query?ref.get(transaction):this.get(ref,transaction);},set:(r,d,o)=>{writing=true;writes.push(write(r,d,o?.merge?'merge':'replace'));},update:(r,d)=>{writing=true;writes.push(write(r,d,'update'));},create:(r,d)=>{writing=true;writes.push(write(r,d,'create'));}};try{const result=await fn(tx);await this.commit(writes,transaction);return result;}catch(e){await this.rpc(':rollback',{transaction}).catch(()=>{});if(e.code!=='ABORTED'||attempt===2)throw e;}}}
}
class Ref{constructor(db,path){if(!path||path.split('/').length%2||path.split('/').some(x=>!x))throw Error('Invalid document path');this.db=db;this.path=path;this.id=path.split('/').at(-1);this.name=db.root+'/'+path;}get(){return this.db.get(this);}set(d,o){return this.db.commit([write(this,d,o?.merge?'merge':'replace')]);}update(d){return this.db.commit([write(this,d,'update')]);}create(d){return this.db.commit([write(this,d,'create')]);}}
class Query{
 constructor(db,path,filters=[],orders=[],cap=1001){this.db=db;this.path=path;this.filters=filters;this.orders=orders;this.cap=cap;}
 doc(id=randomUUID()){if(typeof id!=='string'||id.includes('/')||!id)throw Error('Invalid document ID');return this.db.doc(this.path+'/'+id);}async add(d){const r=this.doc();await r.create(d);return r;}
 where(field,op,value){return new Query(this.db,this.path,[...this.filters,{fieldFilter:{field:{fieldPath:field},op:{'==':'EQUAL','<=':'LESS_THAN_OR_EQUAL','<':'LESS_THAN','>':'GREATER_THAN','>=':'GREATER_THAN_OR_EQUAL'}[op],value:encode(value)}}],this.orders,this.cap);}
 orderBy(field,direction='asc'){return new Query(this.db,this.path,this.filters,[...this.orders,{field:{fieldPath:field},direction:direction==='desc'?'DESCENDING':'ASCENDING'}],this.cap);}limit(n){return new Query(this.db,this.path,this.filters,this.orders,n);}
 async get(transaction){const structuredQuery={from:[{collectionId:this.path}],limit:this.cap,...(this.filters.length?{where:this.filters.length===1?this.filters[0]:{compositeFilter:{op:'AND',filters:this.filters}}}:{}),...(this.orders.length?{orderBy:this.orders}:{})};const rows=await this.db.rpc(':runQuery',{structuredQuery,...(transaction?{transaction}:{})});const docs=rows.filter(x=>x.document).map(x=>this.db.snap(x.document));if(docs.length===1001&&this.cap===1001)throw Object.assign(Error('Free backend supports up to 1,000 records per audience. Narrow your data before sending.'),{status:413});return {docs,empty:!docs.length,size:docs.length};}
}
let instance;export const getFirestore=()=>instance||=new Firestore();
