const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {fixture,modules}=require('./admin.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),context=await browser.newContext(),data=structuredClone(fixture);
 data.products[0].variants[0].stock=0;data.orders[0].customer.uid='admin1';
 let watching=false,cases=[],events=[],requests=[];
 await context.route('**/*',route=>{
  const u=new URL(route.request().url()),m=u.pathname.match(/firebase_(app|auth|firestore)\.js$/);
  if(m)return route.fulfill({contentType:'application/javascript',body:modules[m[1]].replace(JSON.stringify(fixture),JSON.stringify(data)).replace("uid:'admin1'","uid:'admin1',emailVerified:true")});
  if(u.pathname==='/catalogue.json')return route.fulfill({contentType:'application/json',body:JSON.stringify(data.products)});
  const b=()=>route.request().postDataJSON();
  if(u.pathname==='/api/admin/security/authenticator/status')return route.fulfill({json:{available:true,verified:true,enrolled:true,expiresAt:Date.now()+900000}});
  if(u.pathname==='/api/customer/stock-alerts'){const x=b();if(x.action==='watch')watching=true;if(x.action==='cancel')watching=false;requests.push(x);return route.fulfill({json:{success:true,watches:watching?[{sku:'TEE-BLK-M'}]:[]}})}
  if(u.pathname==='/api/customer/returns'||u.pathname==='/api/admin/returns'){const x=b();requests.push(x);if(x.action==='create')cases=[{id:'case',orderId:'order1',orderNumber:'DRX-1001',status:'requested',type:x.type,reason:x.reason,items:data.orders[0].items,history:[{status:'requested',message:'Request received'}]}];if(x.action==='update'){cases[0].status=x.status;cases[0].history.push({status:x.status,message:x.message})}return route.fulfill({json:{success:true,cases}})}
  if(u.pathname==='/api/analytics/event'){events.push(b());return route.fulfill({json:{success:true}})}
  if(u.pathname==='/api/admin/analytics')return route.fulfill({json:{success:true,days:[{day:'2026-10-13',product_view:3,bag_add:1}]}});
  if(u.pathname==='/api/customer/reminders')return route.fulfill({json:{success:true,preferences:{}}});
  if(u.pathname==='/api/delivery')return route.fulfill({json:{markets:data.settings.find(x=>x.id==='markets').markets}});
  if(u.pathname.startsWith('/api/'))return route.fulfill({json:{rate:1}});
  if(u.pathname.endsWith('.png'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"/>'});
  if(u.hostname==='127.0.0.1')return route.continue();
  return route.fulfill({body:''});
 });
 const page=await context.newPage(),errors=[];
 page.setDefaultTimeout(90000);page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message)});
 await page.goto('http://127.0.0.1:5173/za/help');
 await page.getByRole('heading',{name:'How can we help?'}).waitFor();
 await page.getByRole('searchbox',{name:'Search guides'}).fill('cancel');
 await page.getByRole('link',{name:/How to request cancellation/}).click();
 await page.getByRole('heading',{name:'Before dispatch',exact:true}).waitFor();
 assert.match(await page.locator('main').innerText(),/does not automatically cancel/);
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
 await page.goto('http://127.0.0.1:5173/za/t/tee/tee?sku=TEE-BLK-M');
 await page.getByRole('heading',{name:'Waiting for your size?'}).waitFor();
 assert.equal(await page.locator('.dx-view-front').getAttribute('loading'),'eager');
 assert.equal(await page.locator('.dx-view-front').getAttribute('fetchpriority'),'high');
 assert.equal(events.length,0);
 await page.getByLabel(/Email my verified account address once/).check();
 await page.getByRole('button',{name:'Notify me',exact:true}).click();
 await page.getByRole('button',{name:'Cancel stock alert'}).waitFor();assert(watching);
 await page.getByRole('button',{name:'Cancel stock alert'}).click();
 await page.getByRole('button',{name:'Notify me',exact:true}).waitFor();assert(!watching);
 await page.getByLabel(/Share shopping activity counts/).check();
 await page.waitForFunction(()=>localStorage.getItem('drixel_analytics')==='yes');
 await page.waitForTimeout(300);assert(events.some(e=>e.event==='product_view'));
 await page.getByLabel(/Share shopping activity counts/).uncheck();const before=events.length;
 await page.goto('http://127.0.0.1:5173/za/member/orders/order1');
 await page.getByRole('heading',{name:'Returns & exchanges'}).waitFor();
 await page.getByLabel(/Return quantity for/).fill('1');
 await page.getByRole('button',{name:'Submit request',exact:true}).click();
 await page.getByText('Request received',{exact:false}).waitFor();
 assert.equal(requests.find(x=>x.action==='create').items[0].quantity,1);assert.equal(events.length,before);
 await page.goto('http://127.0.0.1:5173/za/admin/returns');
 await page.getByLabel('Next step').selectOption('approved');
 await page.getByLabel('Update sent to customer').fill('Please contact care to arrange collection.');
 await page.getByRole('button',{name:'Save and notify customer'}).click();
 await page.waitForFunction(()=>document.body.innerText.includes('Please contact care to arrange collection.'));
 assert.equal(cases[0].status,'approved');
 await page.goto('http://127.0.0.1:5173/za/admin/analytics/overview');
 await page.getByRole('heading',{name:'Shopping journey · last 30 days'}).waitFor();
 assert.deepEqual(errors,[]);await browser.close();
 console.log('Customer services browser: help search, responsive guides, product priority, stock opt-in/cancel, analytics consent, return submission and admin update passed.');
})().catch(e=>{console.error(e);process.exit(1)});
