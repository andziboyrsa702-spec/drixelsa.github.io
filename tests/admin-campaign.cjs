const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('functions/index.js','utf8');
const start=source.indexOf('exports.sendCampaign ='),end=source.indexOf('\n\nfunction newsletterDocId',start);
function service({providerFails=false}={}){
 const campaign={subject:'Drixel launch',html:'<p>Campaign</p>',status:'draft'};
 let sends=0,tail=Promise.resolve();
 const ref={get:async()=>({exists:true,data:()=>({...campaign})}),update:async patch=>Object.assign(campaign,patch)};
 const db={collection:name=>name==='email_campaigns'?{doc:()=>ref}:{get:async()=>({forEach:cb=>[{id:'sub1',email:'one@example.com',status:'active'},{id:'sub2',email:'one@example.com',status:'active'},{id:'sub3',email:'two@example.com',status:'active'},{id:'sub4',email:'skip@example.com',status:'unsubscribed'}].forEach(row=>cb({id:row.id,data:()=>row}))})},runTransaction:fn=>{const next=tail.then(()=>fn({get:r=>r.get(),update:(r,p)=>r.update(p)}));tail=next.catch(()=>{});return next}};
 const context={exports:{},functions:{runWith:()=>({https:{onRequest:fn=>fn}})},admin:{firestore:()=>db},FieldValue:{serverTimestamp:()=>({seconds:1})},requireAdmin:async req=>{if(!req.authorized){const error=new Error('Administrator access required.');error.status=403;throw error;}},isValidEmail:value=>typeof value==='string'&&value.includes('@'),publicBaseUrl:()=> 'https://drixelsa.co.za',process:{env:{RESEND_API_KEY:'test-placeholder'}},console:{error:()=>{}},Resend:class{constructor(){this.emails={send:async()=>{sends++;await new Promise(resolve=>setTimeout(resolve,5));return providerFails?{data:null,error:{message:'Rejected'}}:{data:{id:'mail-'+sends},error:null};}}}}};
 vm.runInNewContext(source.slice(start,end),context);
 const request=async authorized=>{const response={statusCode:200,set(){return this},status(code){this.statusCode=code;return this},json(body){this.body=body;return this}};await context.exports.sendCampaign({method:'POST',authorized,body:{campaignId:'campaign1'}},response);return response};
 return {request,campaign,sends:()=>sends};
}
test('campaign send claims prevent duplicate concurrent delivery',async()=>{
 const app=service(),responses=await Promise.all([app.request(true),app.request(true)]);
 assert.deepEqual(responses.map(r=>r.statusCode).sort(),[200,409]);assert.equal(app.sends(),2);assert.equal(app.campaign.acceptedCount,2);assert.equal(app.campaign.status,'sent');assert.equal(app.campaign.deliveredCount,undefined);
});
test('provider errors count as failures even when the SDK promise resolves',async()=>{
 const app=service({providerFails:true}),response=await app.request(true);
 assert.equal(response.body.sent,0);assert.equal(response.body.failed,2);assert.equal(app.campaign.status,'failed');
});
test('unauthorized users cannot send campaigns',async()=>{
 const app=service(),response=await app.request(false);assert.equal(response.statusCode,403);assert.equal(app.sends(),0);
});
test('email assets are absolute public URLs and unsafe link schemes are removed',async()=>{
 const {emailHtml}=await import('../src/admin-react/marketingTemplates.js');
 const html=emailHtml({imageUrl:'/assets/campaigns/campaign-01.jpeg',headline:'A <new> drop',body:'Hello',ctaLabel:'Open',ctaUrl:'javascript:alert(1)'});
 assert.match(html,/https:\/\/drixelsa.co.za\/assets\/campaigns\/campaign-01.jpeg/);assert.match(html,/&lt;new&gt;/);assert.doesNotMatch(html,/javascript:/);assert.match(html,/@media\(max-width:480px\)/);
});

test('frontend access matches verified owner and claim-based administrator rules',async()=>{
 const {hasAdminAccess}=await import('../src/admin-react/adminAccess.js');
 assert.equal(hasAdminAccess({admin:true}),true);
 assert.equal(hasAdminAccess({role:'admin'}),true);
 assert.equal(hasAdminAccess({email:'drixelsa@gmail.com',email_verified:true}),true);
 assert.equal(hasAdminAccess({email:'drixelsa@gmail.com',email_verified:false}),false);
 assert.equal(hasAdminAccess({email:'customer@example.com',email_verified:true}),false);
 assert.equal(hasAdminAccess({admin:'true'}),false);
});

test('admin login returns to root or deep links within the selected market',async()=>{
 const {loginDestination}=await import('../src/utils/loginDestination.js');
 assert.equal(loginDestination('za','/za/admin'),'/za/admin');
 assert.equal(loginDestination('us','/us/admin/orders?filter=paid'),'/us/admin/orders?filter=paid');
 assert.equal(loginDestination('za','admin'),'/za/admin/dashboard');
 assert.equal(loginDestination('za','https://outside.example/za/admin'),'/za/member/profile');
 assert.equal(loginDestination('za','/za/admin/../../member/profile'),'/za/member/profile');
});
