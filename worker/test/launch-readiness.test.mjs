import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLaunchReadiness} from '../src/launch-readiness.mjs';
const now=1800000000000;
const database=records=>()=>({doc:path=>({get:async()=>({data:()=>records[path]})})});
test('readiness denies unauthorized requests before accessing services',async()=>{
 const handler=createLaunchReadiness({identity:async()=>{throw Error('Forbidden')},database:()=>{throw Error('Must not read')}});await assert.rejects(()=>handler({},{}),/Forbidden/);
});
test('missing business data and failed queues remain incomplete; credentials are never returned',async()=>{
 const handler=createLaunchReadiness({identity:async()=>({}),database:database({'operations_health/campaignWorker':{status:'failed',lastFinishedAt:now}}),environment:()=>({RESEND_API_KEY:'private-secret',MAIL_FROM:'Drixel <hello@sales.drixelsa.co.za>'}),request:async()=>new Response(JSON.stringify({data:[{name:'sales.drixelsa.co.za',status:'verified'}]})),now:()=>now});let result;await handler({}, {json:data=>result=data});assert.equal(result.checks.find(c=>c.name==='Seller disclosures').status,'needs_attention');assert.equal(result.checks.find(c=>c.name==='Campaign scheduler').status,'needs_attention');assert.equal(result.checks.find(c=>c.name==='Sending domain').status,'ready');assert.ok(!JSON.stringify(result).includes('private-secret'));
});
test('provider errors stay unverified and never become delivery success',async()=>{
 const handler=createLaunchReadiness({identity:async()=>({}),database:database({}),environment:()=>({RESEND_API_KEY:'key'}),request:async()=>new Response('{}',{status:403}),now:()=>now});let result;await handler({}, {json:data=>result=data});assert.equal(result.checks.find(c=>c.name==='Sending domain').status,'unverified');assert.match(result.notice,/do not prove inbox/);
});
