import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('Microsoft completion coalesces a request, rejects revisits and accepts a new challenge',async()=>{
 const storage=new Map();let finishes=0;
 const context=vm.createContext({Date,JSON,Error,Number,sessionStorage:{getItem:k=>storage.get(k)||null,removeItem:k=>storage.delete(k)},PublicClientApplication:class{async initialize(){}async handleRedirectPromise(){return {idToken:'signed-proof',state:JSON.parse(storage.get('drixel-microsoft-request')).challengeId}}},adminSecurityRequest:async()=>{finishes++;await new Promise(resolve=>setImmediate(resolve));return {customToken:'new-token-'+finishes}}});
 const source=(await readFile(new URL('../src/utils/microsoftApproval.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export ','');vm.runInContext(source,context);
 const setup=id=>storage.set('drixel-microsoft-request',JSON.stringify({uid:'owner',challengeId:id,startedAt:Date.now(),clientId:'client',authority:'https://example.test',redirectUri:'https://example.test/return'}));
 setup('first');const result=await Promise.all([context.completeMicrosoftApproval({uid:'owner'}),context.completeMicrosoftApproval({uid:'owner'})]);assert.equal(finishes,1);assert.equal(result[0].customToken,result[1].customToken);
 await assert.rejects(context.completeMicrosoftApproval({uid:'owner'}),/expired/);
 setup('second');assert.equal((await context.completeMicrosoftApproval({uid:'owner'})).customToken,'new-token-2');assert.equal(finishes,2);
 setup('third');await assert.rejects(context.completeMicrosoftApproval({uid:'other'}),/another account/);assert.equal(finishes,2);
});
