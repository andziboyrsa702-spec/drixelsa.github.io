const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const long='Drixel Premium Heavyweight Streetwear Collection';
const fixture={
 products:[{id:'tee',name:long,urlCode:'tee',category:'tees',price:250,image:'/assets/mock.png',images:['/assets/mock.png'],active:true,availableMarkets:['za'],variants:[{sku:'TEE-BLK-M',color:'Black',size:'M',stock:3,price:''},{sku:'TEE-WHT-L',color:'White',size:'L',stock:14,price:280}]}],
 orders:[{id:'order1',orderNumber:'DRX-1001',customer:{uid:'customer1',firstName:'Layout',lastName:'Customer',email:'customer-with-long-address@example.com',phone:'0610000000',address:'10 Main Road',city:'Cape Town',province:'Western Cape',postalCode:'7700'},paymentMethod:'bank',paymentStatus:'paid',fulfillmentStatus:'packed',status:'packed',total:570,subtotal:500,shipping:70,inventoryStatus:'reserved',createdAt:{seconds:1791220000},items:[{productId:'tee',name:long,sku:'TEE-BLK-M',quantity:2,price:250,lineTotal:500}]},{id:'order2',orderNumber:'DRX-1002',customer:{uid:'customer1',firstName:'Layout',email:'customer-with-long-address@example.com'},paymentMethod:'bank',paymentStatus:'pending',status:'pending',total:320,createdAt:{seconds:1791230000},items:[]}],
 users:[{id:'customer1',name:'Layout Customer',email:'customer-with-long-address@example.com',phone:'0610000000'}],
 subscribers:[{id:'subscriber1',email:'customer-with-long-address@example.com',status:'active',source:'website'}],
 returns:[{id:'return1',orderId:'order1',orderNumber:'DRX-1001',reason:'Size exchange requested',status:'requested',customer:{email:'customer-with-long-address@example.com'}}],
 banners:[{id:'banner1',title:'NEW SEASON. NEW ENERGY.',subtitle:long,imageUrl:'/assets/mock.png',active:true,theme:'dark',placement:'home'}],
 coupons:[{id:'coupon1',code:'DRIXEL10',type:'percent',value:10,minSpend:200,active:true}],
 collections:[{id:'collection1',name:long,active:true}],
 audit_logs:[{id:'audit1',action:'inventory.adjust',resource:'products/tee',actor:'admin-with-long-address@example.com',createdAt:{seconds:1791220000}}],
 email_campaigns:[{id:'campaign1',name:'Launch campaign',subject:'The new season is here',status:'draft',headline:'THE DROP.',body:long,imageUrl:'/assets/mock.png',createdAt:{seconds:1791220000}}],
 settings:[{id:'store',brandName:'Drixel',supportEmail:'support@example.com'},{id:'storefront',heroTitle:'YOUR STREETS.\nYOUR RULES.'},{id:'markets',markets:{za:{enabled:true,checkout:true,shippingFee:70,freeFrom:1000}}}]
};
const modules={app:'export const getApps=()=>[];export const initializeApp=()=>({});',
 auth:`let user;const listeners=[];const makeUser=()=>({uid:'admin1',email:'admin-with-long-address@example.com',getIdToken:async()=>localStorage.getItem('admin-auth')==='denied'?'denied-token':'token',getIdTokenResult:async()=>({claims:{admin:localStorage.getItem('admin-auth')!=='denied'}})});user=localStorage.getItem('admin-auth')==='signed-out'?null:makeUser();const auth={get currentUser(){return user}};export const connectAuthEmulator=()=>{};export const getAuth=()=>auth;export const onAuthStateChanged=(auth,cb)=>{listeners.push(cb);queueMicrotask(()=>cb(user));return()=>{const i=listeners.indexOf(cb);if(i>=0)listeners.splice(i,1)}};export class GoogleAuthProvider{};export const signInWithEmailAndPassword=async()=>{user=makeUser();listeners.forEach(cb=>cb(user));return{user}};export const createUserWithEmailAndPassword=signInWithEmailAndPassword;export const signInWithCustomToken=async()=>({user});export const signInWithPopup=signInWithEmailAndPassword;export const signOut=async()=>{user=null;listeners.forEach(cb=>cb(null))};export const updateProfile=async()=>{};export const sendPasswordResetEmail=async()=>{};export const sendEmailVerification=async()=>{};`,
 firestore:`const fixture=${JSON.stringify(fixture)};window.__adminWrites=[];window.__changeStock=()=>{fixture.products[0].variants[0].stock+=1};const snapshot=(id,data)=>({id,exists:()=>!!data,data:()=>data});const rows=ref=>localStorage.getItem('admin-empty')?[]:(fixture[ref.name]||[]).filter(row=>(ref.filters||[]).every(f=>f.kind!=='where'||String(row[f.field])===String(f.value)));const data=ref=>rows(ref).find(row=>row.id===ref.id);const result=ref=>({docs:rows(ref).map(row=>snapshot(row.id,row)),empty:!rows(ref).length});export const connectFirestoreEmulator=()=>{};export const getFirestore=()=>({});export const collection=(db,name)=>({name});export const doc=(db,name,id)=>db.name?{name:db.name,id:'new-id'}:{name,id};export const getDoc=async ref=>{if(localStorage.getItem('admin-data-error'))throw new Error('Permission denied while reading settings');return snapshot(ref.id,data(ref))};export const getDocs=async ref=>result(ref);export const getDocsFromServer=getDocs;export const query=(ref,...filters)=>({...ref,filters});export const where=(field,op,value)=>({kind:'where',field,value});export const limit=()=>({});export const orderBy=()=>({});export const documentId=()=>"__name__";export const startAfter=()=>({});export const onSnapshot=(ref,cb,error)=>{let active=true;queueMicrotask(()=>{if(!active)return;if(localStorage.getItem('admin-data-error'))error?.({code:'permission-denied',message:'Missing or insufficient permissions.'});else cb(ref.id?snapshot(ref.id,data(ref)):result(ref))});return()=>{active=false}};const write=async(type,ref,payload)=>{if(window.__failWrites)throw new Error('Simulated write failure');window.__adminWrites.push({type,ref,payload});if(type==='add')fixture[ref.name]=[...(fixture[ref.name]||[]),{...payload,id:'new-id'}];return{id:'new-id'}};export const addDoc=(ref,data)=>write('add',ref,data);export const updateDoc=(ref,data)=>write('update',ref,data);export const setDoc=(ref,data)=>write('set',ref,data);export const deleteDoc=ref=>write('delete',ref);export const runTransaction=async(db,fn)=>{const writes=[];await fn({get:getDoc,set:(ref,data)=>writes.push({ref,data})});for(const {ref,data} of writes){await write('set',ref,data);fixture[ref.name]=fixture[ref.name].map(row=>row.id===ref.id?{...row,...data}:row)}};export const writeBatch=()=>{const pending=[];return {set:(ref,data)=>pending.push({type:'set',ref,data}),update:(ref,data)=>pending.push({type:'update',ref,data}),commit:async()=>{for(const x of pending)await write(x.type,x.ref,x.data)}}};export const serverTimestamp=()=>({seconds:1791230000});`
};
const routes=['dashboard','orders','orders/order1','products','products/new','products/tee','inventory','collections','customers','customers/customer1','returns','content/storefront','content/media','marketing/email','marketing/subscribers','marketing/updates','marketing/campaigns','marketing/discounts','analytics/overview','operations/payments','operations/shipping','operations/health','settings/store','settings/markets','settings/audit-log','not-a-page'];
exports.fixture=fixture;exports.modules=modules;
if(require.main===module)(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH,args:['--no-sandbox']}:{})});
 const context=await browser.newContext(),apiCalls=[];
 await context.addInitScript(()=>{if(window===window.top)localStorage.setItem('drixel_market','za')});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url()),match=url.pathname.match(/firebase_(app|auth|firestore)\.js$/);
  if(match)return route.fulfill({contentType:'application/javascript',body:modules[match[1]]});
  if(url.pathname==='/api/admin/security/authenticator/status'&&route.request().headers().authorization==='Bearer denied-token')return route.fulfill({status:403,json:{message:'Administrator access required.'}});if(url.pathname==='/api/admin/security/authenticator/status')return route.fulfill({json:{available:true,verified:true,enrolled:true,expiresAt:Date.now()+900000}});if(url.pathname.startsWith('/api/')){apiCalls.push({path:url.pathname,body:route.request().postDataJSON()});if(url.pathname==='/api/queue-campaign')return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,queued:true,recipientCount:1})});if(url.pathname.includes('/admin/'))return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true})});return route.fulfill({contentType:'application/json',body:JSON.stringify({rate:1})});}
  if(/\.(png|jpg|jpeg)$/i.test(url.pathname))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700"><rect width="600" height="700" fill="#ddd"/></svg>'});
  if(url.hostname==='127.0.0.1')return route.continue();return route.fulfill({body:''});
 });
 const page=await context.newPage(),errors=[],issues=[];
 page.on('pageerror',error=>{errors.push(error.message);console.error('PAGE ERROR',error.message)});page.on('console',message=>{if(message.type()==='error')console.error('CONSOLE',message.text())});
 const goto=async route=>{await page.goto('http://127.0.0.1:5173/za/admin/'+route);await page.waitForSelector('.ra-view').catch(async error=>{console.error('BODY',await page.locator('body').innerText());throw error});await page.waitForFunction(()=>!document.querySelector('.ra-loading-mark'));};
 await goto('products/new');
 for(const width of [320,390,768,1024,1362,1440]){
  await page.setViewportSize({width,height:900});
  assert.deepEqual(await page.locator('.ra-view input:not([type=checkbox]):not([type=file]),.ra-view select').evaluateAll(els=>els.filter(e=>e.getBoundingClientRect().width<70).map(e=>e.getAttribute('aria-label')||e.outerHTML)),[]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
 }

 assert.equal(await page.getByLabel('Size',{exact:true}).count(),6);
 await page.getByLabel('Product category',{exact:true}).selectOption('Hoodies');
 await page.getByLabel('Name suggestions (60 per category)').selectOption({index:1});
 assert.equal(await page.getByLabel('Name',{exact:true}).inputValue(),'DRIXEL Origin Hoodie');
 await page.getByLabel('Description style',{exact:true}).selectOption({index:1});
 await page.getByLabel('Fit suggestions',{exact:true}).selectOption({index:2});
 assert.ok((await page.getByLabel('Description',{exact:true}).inputValue()).includes('Hoodie'));
 assert.equal(await page.getByLabel('Name suggestions (60 per category)').inputValue(),await page.getByLabel('Name',{exact:true}).inputValue());
 assert.equal(await page.getByLabel('Description style').inputValue(),await page.getByLabel('Description',{exact:true}).inputValue());
 assert.equal(await page.getByLabel('Fit suggestions').inputValue(),await page.getByLabel('Fit',{exact:true}).inputValue());
 await page.getByLabel('Fabric & composition suggestions').selectOption({index:2});
 assert.equal(await page.getByLabel('Fabric & composition suggestions').inputValue(),await page.getByLabel('Fabric & composition',{exact:true}).inputValue());
 await page.getByLabel('Care suggestions').selectOption({index:2});
 assert.equal(await page.getByLabel('Care suggestions').inputValue(),await page.getByLabel('Care instructions',{exact:true}).inputValue());
 await page.getByLabel('New colour',{exact:true}).fill('Black');
 await page.getByRole('button',{name:'Add colour',exact:true}).click();
 assert.equal(await page.getByLabel('Size',{exact:true}).count(),6);
 assert.equal(await page.getByLabel('Colour',{exact:true}).first().inputValue(),'Black');
 await page.getByRole('button',{name:'Load charts from saved products'}).click();
 await page.getByLabel('Base price (ZAR)',{exact:true}).fill('450');
 await page.getByRole('button',{name:'Create product',exact:true}).click();
 await page.waitForURL('**/products/new-id');
 for(const width of [390,1366]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);}
 assert.deepEqual(errors,[]);console.log('Product preset selections, automatic colour sizes, save and responsive layout passed');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
