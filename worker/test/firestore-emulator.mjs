import assert from 'node:assert/strict';
import {Firestore,FieldValue} from '../src/firestore.mjs';
const host=process.env.FIRESTORE_EMULATOR_HOST;if(!host)throw Error('This test requires an isolated Firestore emulator.');
const db=new Firestore({project:'demo-drixel',token:async()=>'owner',request:(url,options)=>fetch(url.replace('https://firestore.googleapis.com','http://'+host),options)});
const ref=db.doc('worker_test/stock');await ref.set({stock:1,variants:[{sku:'S',stock:1}],updatedAt:FieldValue.serverTimestamp()});
const reserve=()=>db.runTransaction(async tx=>{const snap=await tx.get(ref);if(snap.data().stock<1)throw Error('sold out');tx.update(ref,{stock:0,count:FieldValue.increment(1)});});
const results=await Promise.allSettled([reserve(),reserve()]);for(const result of results)if(result.status==='rejected')console.log('Reservation result:',result.reason.message,result.reason.code);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const final=await ref.get();assert.equal(final.data().stock,0);assert.equal(final.data().count,1);assert.equal(final.data().variants[0].sku,'S');assert.ok(final.data().updatedAt.toMillis()>0);
await db.bulkSet([{ref:db.doc('worker_test/job1'),data:{status:'pending',dueAt:1}},{ref:db.doc('worker_test/job2'),data:{status:'pending',dueAt:2}}]);const jobs=await db.collection('worker_test').where('status','==','pending').where('dueAt','<=',2).orderBy('dueAt').limit(1).get();assert.equal(jobs.docs[0].id,'job1');
assert.equal((await db.doc('worker_test/missing').get()).exists,false);console.log('Worker Firestore REST integration passed: atomic concurrent reservation, server timestamps, increments, bulk writes, query and missing documents.');
