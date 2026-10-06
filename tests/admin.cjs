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
 auth:`let user;const listeners=[];const makeUser=()=>({uid:'admin1',email:'admin-with-long-address@example.com',getIdToken:async()=> 'token',getIdTokenResult:async()=>({claims:{admin:localStorage.getItem('admin-auth')!=='denied'}})});user=localStorage.getItem('admin-auth')==='signed-out'?null:makeUser();const auth={get currentUser(){return user}};export const connectAuthEmulator=()=>{};export const getAuth=()=>auth;export const onAuthStateChanged=(auth,cb)=>{listeners.push(cb);queueMicrotask(()=>cb(user));return()=>{const i=listeners.indexOf(cb);if(i>=0)listeners.splice(i,1)}};export class GoogleAuthProvider{};export const signInWithEmailAndPassword=async()=>{user=makeUser();listeners.forEach(cb=>cb(user));return{user}};export const createUserWithEmailAndPassword=signInWithEmailAndPassword;export const signInWithCustomToken=async()=>({user});export const signInWithPopup=signInWithEmailAndPassword;export const signOut=async()=>{user=null;listeners.forEach(cb=>cb(null))};export const updateProfile=async()=>{};export const sendPasswordResetEmail=async()=>{};`,
 firestore:`const fixture=${JSON.stringify(fixture)};window.__adminWrites=[];window.__changeStock=()=>{fixture.products[0].variants[0].stock+=1};const snapshot=(id,data)=>({id,exists:()=>!!data,data:()=>data});const rows=ref=>localStorage.getItem('admin-empty')?[]:(fixture[ref.name]||[]).filter(row=>(ref.filters||[]).every(f=>f.kind!=='where'||String(row[f.field])===String(f.value)));const data=ref=>rows(ref).find(row=>row.id===ref.id);const result=ref=>({docs:rows(ref).map(row=>snapshot(row.id,row)),empty:!rows(ref).length});export const connectFirestoreEmulator=()=>{};export const getFirestore=()=>({});export const collection=(db,name)=>({name});export const doc=(db,name,id)=>db.name?{name:db.name,id:'new-id'}:{name,id};export const getDoc=async ref=>{if(localStorage.getItem('admin-data-error'))throw new Error('Permission denied while reading settings');return snapshot(ref.id,data(ref))};export const getDocs=async ref=>result(ref);export const query=(ref,...filters)=>({...ref,filters});export const where=(field,op,value)=>({kind:'where',field,value});export const limit=()=>({});export const onSnapshot=(ref,cb,error)=>{let active=true;queueMicrotask(()=>{if(!active)return;if(localStorage.getItem('admin-data-error'))error?.({code:'permission-denied',message:'Missing or insufficient permissions.'});else cb(ref.id?snapshot(ref.id,data(ref)):result(ref))});return()=>{active=false}};const write=async(type,ref,payload)=>{if(window.__failWrites)throw new Error('Simulated write failure');window.__adminWrites.push({type,ref,payload});if(type==='add')fixture[ref.name]=[...(fixture[ref.name]||[]),{...payload,id:'new-id'}];return{id:'new-id'}};export const addDoc=(ref,data)=>write('add',ref,data);export const updateDoc=(ref,data)=>write('update',ref,data);export const setDoc=(ref,data)=>write('set',ref,data);export const deleteDoc=ref=>write('delete',ref);export const runTransaction=async(db,fn)=>{const writes=[];await fn({get:getDoc,set:(ref,data)=>writes.push({ref,data})});for(const {ref,data} of writes){await write('set',ref,data);fixture[ref.name]=fixture[ref.name].map(row=>row.id===ref.id?{...row,...data}:row)}};export const serverTimestamp=()=>({seconds:1791230000});`
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
  if(url.pathname.startsWith('/api/')){apiCalls.push({path:url.pathname,body:route.request().postDataJSON()});if(url.pathname==='/api/queue-campaign')return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,queued:true,recipientCount:1})});if(url.pathname.includes('/admin/'))return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true})});return route.fulfill({contentType:'application/json',body:JSON.stringify({rate:1})});}
  if(/\.(png|jpg|jpeg)$/i.test(url.pathname))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700"><rect width="600" height="700" fill="#ddd"/></svg>'});
  if(url.hostname==='127.0.0.1')return route.continue();return route.fulfill({body:''});
 });
 const page=await context.newPage(),errors=[],issues=[];
 page.on('pageerror',error=>{errors.push(error.message);console.error('PAGE ERROR',error.message)});page.on('console',message=>{if(message.type()==='error')console.error('CONSOLE',message.text())});
 const goto=async route=>{await page.goto('http://127.0.0.1:5173/za/admin/'+route);await page.waitForSelector('.ra-view').catch(async error=>{console.error('BODY',await page.locator('body').innerText());throw error});await page.waitForFunction(()=>!document.querySelector('.ra-loading-mark'));};
 for(const width of [320,390,768,1024,1362,1440]){
  await page.setViewportSize({width,height:900});
  for(const route of routes){
   await goto(route);
   if(route==='marketing/email'){await page.getByRole('button',{name:'Composer',exact:true}).click();await page.frameLocator('.mk-preview iframe').getByRole('heading',{name:'Built for your city.',exact:true}).waitFor();}
   const found=await page.evaluate(()=>{
    const problems=[];
    if(document.documentElement.scrollWidth>innerWidth+2)problems.push('Horizontal page overflow '+document.documentElement.scrollWidth+' > '+innerWidth);
    for(const selector of ['.ra-order-feed>button','.ra-topbar','.ra-metrics','.ra-ops-strip','.ra-dashboard-grid','.ra-panel-head','.ra-form-two','.ra-variant-row','.ra-studio-grid','.mk-compose-grid','.mk-kpis','.mk-template-grid','.mk-campaign-grid'])for(const parent of document.querySelectorAll(selector)){
     const children=[...parent.children].filter(element=>{const r=element.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(element).visibility!=='hidden'});
     for(let i=0;i<children.length;i++)for(let j=i+1;j<children.length;j++){
      const a=children[i].getBoundingClientRect(),b=children[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)problems.push(selector+' overlaps');
     }
    }
    const inputs=[...document.querySelectorAll('.ra-view input:not([type=checkbox]):not([type=file]),.ra-view select')];
    if(inputs.some(input=>input.getBoundingClientRect().width<70))problems.push('Cramped form control');
    if(!document.querySelector('h1')?.textContent)problems.push('Missing page title');if(document.querySelector('.ra-view')?.textContent.includes('This workspace could not open'))problems.push('Workspace crashed');
    return problems;
   });
   if(found.length)issues.push({width,route,problems:found});
   if(process.env.SCREENSHOT_DIR&&[390,1362].includes(width)&&['dashboard','products/tee','marketing/email'].includes(route))await page.screenshot({path:process.env.SCREENSHOT_DIR+'/admin-'+route.replaceAll('/','-')+'-'+width+'.png',fullPage:true});
  }
 }
 // Mobile navigation must expose the complete menu, trap keyboard focus and close.
 await page.setViewportSize({width:390,height:850});await goto('dashboard');
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.waitForSelector('.ra-sidebar.open');
 assert.equal(await page.locator('.ra-sidebar .ra-nav').count(),21);
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
 await page.keyboard.press('Escape');assert.equal(await page.locator('.ra-sidebar.open').count(),0);
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
 // Invalid variant stock must never silently round or write.
 await goto('products/tee');await page.getByLabel('Stock',{exact:true}).first().fill('-1');
 await page.locator('.ra-product-editor').evaluate(form=>form.noValidate=true);
 await page.getByRole('button',{name:'Save product',exact:true}).click();await page.waitForSelector('.dx-dialog');
 assert.match(await page.locator('.dx-dialog').innerText(),/non-negative whole number/);
 assert.equal(await page.evaluate(()=>window.__adminWrites.length),0);await page.getByRole('button',{name:'Close',exact:true}).click();
 // Successful edit, and explicit feedback when the write fails.
 await page.getByLabel('Stock',{exact:true}).first().fill('4');await page.getByLabel('Name',{exact:true}).fill('Updated Drixel Tee');
 await page.getByRole('button',{name:'Save product',exact:true}).click();await page.waitForSelector('.dx-dialog');
 assert.match(await page.locator('.dx-dialog').innerText(),/Product saved/);assert.equal(await page.evaluate(()=>window.__adminWrites.at(-1).payload.name),'Updated Drixel Tee');
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.evaluate(()=>window.__failWrites=true);
 await page.getByRole('button',{name:'Save product',exact:true}).click();await page.waitForSelector('.dx-dialog');assert.match(await page.locator('.dx-dialog').innerText(),/Simulated write failure/);
 // Stale stock is rejected instead of overwriting a reservation or stocktake.
 await goto('products/tee');await page.getByLabel('Name',{exact:true}).fill('Stale edit');await page.evaluate(()=>window.__changeStock());
 await page.getByRole('button',{name:'Save product',exact:true}).click();await page.waitForSelector('.dx-dialog');assert.match(await page.locator('.dx-dialog').innerText(),/stock or variants changed/);assert.equal(await page.evaluate(()=>window.__adminWrites.length),0);
 await page.getByRole('button',{name:'Close',exact:true}).click();
 // Leaving an unsaved product requires an explicit discard choice.
 await page.getByRole('button',{name:'Back to products',exact:true}).click();await page.waitForSelector('.dx-dialog');await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.match(page.url(),/products\/tee$/);
 await page.getByRole('button',{name:'Back to products',exact:true}).click();await page.waitForSelector('.dx-dialog');await page.getByRole('button',{name:'Discard changes',exact:true}).click();await page.waitForURL('**/admin/products');
 // Sequential inventory prompts must start with a blank reason field.
 await goto('inventory');await page.getByRole('button',{name:'Adjust',exact:true}).first().click();await page.waitForSelector('.dx-dialog');await page.locator('.dx-dialog input').fill('2');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#dx-dialog-title')?.textContent==='Adjustment reason');assert.equal(await page.locator('.dx-dialog input').inputValue(),'');await page.getByRole('button',{name:'Cancel',exact:true}).click();
 // Saving twice and sending a draft must use one campaign record.
 await goto('marketing/email');await page.getByRole('button',{name:'Composer',exact:true}).click();await page.getByLabel('Internal campaign name').fill('Release check');await page.getByLabel('Email subject').fill('Drixel release');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.waitForSelector('.dx-dialog');await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.waitForSelector('.dx-dialog');await page.getByRole('button',{name:'Close',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.__adminWrites.filter(write=>write.type==='add'&&write.ref.name==='email_campaigns').length),1);
 await page.getByRole('button',{name:'Send to 1',exact:true}).click();await page.waitForSelector('.dx-dialog');await page.getByRole('button',{name:'Send campaign',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.dx-dialog-message')?.textContent.includes('queued for 1 recipient'));
 assert.equal(apiCalls.at(-1).body.campaignId,'new-id');assert.equal(await page.evaluate(()=>window.__adminWrites.filter(write=>write.type==='add'&&write.ref.name==='email_campaigns').length),1);
 await page.getByRole('button',{name:'Close',exact:true}).click();
 // Data permission failures must not be reported as an empty store.
 await page.evaluate(()=>localStorage.setItem('admin-data-error','1'));await goto('dashboard');assert.match(await page.locator('.ra-view').innerText(),/Unable to load/);
 await page.evaluate(()=>localStorage.removeItem('admin-data-error'));
 // Empty states, administrator denial and signed-out return path.
 await page.evaluate(()=>localStorage.setItem('admin-empty','1'));await goto('dashboard');assert.match(await page.locator('.ra-view').innerText(),/No orders yet/);await goto('products');assert.match(await page.locator('.ra-view').innerText(),/No products yet/);
 await page.evaluate(()=>{localStorage.removeItem('admin-empty');localStorage.setItem('admin-auth','denied')});await page.reload();await page.waitForSelector('.admin-access-denied');assert.equal(await page.locator('.ra-shell').count(),0);
 await page.evaluate(()=>localStorage.setItem('admin-auth','signed-out'));await page.goto('http://127.0.0.1:5173/za/admin/orders');await page.waitForSelector('.auth-card');assert.match(page.url(),/next=%2Fza%2Fadmin%2Forders/);
 await page.getByLabel('Email',{exact:true}).fill('admin@example.com');await page.getByLabel('Password',{exact:true}).fill('password');await page.evaluate(()=>window.__failWrites=true);await page.locator('form').getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForSelector('.ra-view');assert.match(page.url(),/\/za\/admin\/orders$/);
 console.log(JSON.stringify({routes:routes.length,widths:6,issues,errors,flows:'navigation, product validation/save/failure, concurrent stock changes, unsaved edits, inventory prompts, data errors, empty states, access denial, admin login return'}));
 await browser.close();assert.deepEqual(errors,[]);assert.deepEqual(issues,[]);
})().catch(error=>{console.error(error);process.exit(1)});
