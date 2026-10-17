import {accessToken} from './firestore.mjs';
import {adminUser} from './auth.mjs';
export const queueIndex={queryScope:'COLLECTION',fields:[{fieldPath:'status',order:'ASCENDING'},{fieldPath:'dueAt',order:'ASCENDING'}]};
export async function ensureQueueIndex({request=(...args)=>globalThis.fetch(...args),token=accessToken,project=process.env.FIREBASE_PROJECT_ID,repair=false}={}){
 const url='https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(project)+'/databases/(default)/collectionGroups/campaign_jobs/indexes',headers={Authorization:'Bearer '+await token(),'Content-Type':'application/json'};
 const list=await request(url,{headers,signal:AbortSignal.timeout(20000)}),data=await list.json().catch(()=>({}));
 if(!list.ok)throw Object.assign(Error(list.status===403?'The Firebase service account cannot manage indexes. Run npx firebase deploy --only firestore:indexes --project drixel-sa from the project folder.':'Could not read Firestore indexes. Check Firebase configuration.'),{status:503});
 const found=(data.indexes||[]).find(i=>i.queryScope==='COLLECTION'&&JSON.stringify((i.fields||[]).filter(f=>f.fieldPath!=='__name__'))===JSON.stringify(queueIndex.fields));
 if(found)return {state:found.state,ready:found.state==='READY',message:found.state==='READY'?'Campaign queue index is ready. Pending campaigns can run on the next scheduler tick.':'Campaign queue index is '+found.state+'. Wait for Firebase to finish building it.'};
 if(!repair)return {state:'MISSING',ready:false,message:'The campaign queue index is missing. Choose Create queue index.'};
 const result=await request(url,{method:'POST',headers,body:JSON.stringify(queueIndex),signal:AbortSignal.timeout(20000)});
 if(!result.ok&&result.status!==409)throw Object.assign(Error(result.status===403?'Index creation permission is missing. Deploy firestore:indexes using Firebase CLI.':'Firestore could not create the queue index. Check Firebase console.'),{status:503});
 return {state:'BUILDING',ready:false,message:'Queue index creation requested. It can take several minutes. Check again before expecting campaign delivery.'};
}
export async function campaignIndex(req,res){await adminUser(req);if(req.body?.repair!==undefined&&typeof req.body.repair!=='boolean')return res.status(400).json({success:false,message:'Invalid repair option.'});return res.json({success:true,...await ensureQueueIndex({repair:req.body?.repair===true})});}
