const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const product={id:'tee',urlCode:'tee',name:'Drixel Premium Heavyweight Streetwear Tee',category:'tees',price:250,image:'/assets/mock.png',images:['/assets/mock.png'],sizes:['S','M','L'],colors:['Black'],active:true,stock:10};
const user={uid:'layout-user',email:'buyer@example.com',displayName:'Layout Buyer',emailVerified:true,getIdToken:async()=> 'layout-token',getIdTokenResult:async()=>({claims:{admin:true}})};
const order={id:'order1',orderNumber:'DRX-123',status:'pending',paymentStatus:'pending',total:570,items:[{...product,quantity:2,lineTotal:500}],shippingAddress:{address:'10 Main Road',city:'Cape Town',province:'Western Cape'}};
const quote={items:order.items,subtotal:500,shipping:70,total:570};
const snap=(id,data)=>({id,exists:()=>Boolean(data),data:()=>data});
const modules={
 app:'export const getApps=()=>[];export const initializeApp=()=>({});',
 auth:`const user={...${JSON.stringify(user)},getIdToken:async()=> 'layout-token',getIdTokenResult:async()=>({claims:{admin:true}})};export const getAuth=()=>({currentUser:user});export const onAuthStateChanged=(a,cb)=>{cb(user);return()=>{}};export class GoogleAuthProvider{};export const createUserWithEmailAndPassword=async()=>({user});export const signInWithEmailAndPassword=createUserWithEmailAndPassword;export const signInWithPopup=createUserWithEmailAndPassword;export const signOut=async()=>{};export const updateProfile=async()=>{};export const sendPasswordResetEmail=async()=>{};`,
 firestore:`const product=${JSON.stringify(product)},order=${JSON.stringify(order)};const snap=${snap.toString()};const data=ref=>ref.name==='products'?product:ref.name==='orders'?order:ref.name==='users'?{name:'Layout Buyer',defaultAddress:{firstName:'Layout',lastName:'Buyer'}}:null;const result=ref=>{const docs=['products','orders'].includes(ref.name)?[snap(ref.name==='products'?'tee':'order1',data(ref))]:[];return {docs,empty:!docs.length,size:docs.length,forEach:cb=>docs.forEach(cb)}};export const getFirestore=()=>({});export const collection=(db,name)=>({name});export const doc=(db,name,id)=>({name,id});export const getDoc=async ref=>snap(ref.id,data(ref));export const getDocs=async ref=>result(ref);export const query=(ref,...args)=>ref;export const where=()=>({});export const limit=()=>({});export const onSnapshot=(ref,cb)=>{cb(ref.id?snap(ref.id,data(ref)):result(ref));return()=>{}};export const addDoc=async()=>({id:'mock'});export const updateDoc=async()=>{};export const deleteDoc=async()=>{};export const setDoc=async()=>{};export const serverTimestamp=()=>null;`
};
const paths=['/za','/za/checkout','/za/cart','/za/w/new-featured','/za/t/drixel-tee/tee','/za/about','/za/contact','/za/search','/za/wishlist','/za/member/login','/za/member/profile','/za/member/orders','/za/member/orders/order1','/za/order-confirmation/DRX-123','/za/help/shipping-policy','/za/help/returns-policy','/za/help/privacy-policy','/za/help/terms-of-use'];
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH,args:['--no-sandbox']}:{})});
 const context=await browser.newContext();
 await context.addInitScript(p=>{localStorage.setItem('drixel_cart',JSON.stringify([{...p,productId:'tee',quantity:2,size:'M',color:'Black'}]));localStorage.setItem('drixel_market','za');},product);
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  const firebase=u.pathname.match(/firebase_(app|auth|firestore)\.js$/);
  if(firebase)return route.fulfill({contentType:'application/javascript',body:modules[firebase[1]]});
  if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:JSON.stringify(u.pathname.includes('checkout-quote')?quote:u.pathname.includes('exchange-rates')?{rate:1}:{} )});
  if(/\.(png|jpg|jpeg)$/i.test(u.pathname))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#ddd"/></svg>'});
  if(u.pathname.endsWith('.mp4'))return route.fulfill({body:''});
  if(u.hostname==='127.0.0.1')return route.continue();
  return route.fulfill({body:''});
 });
 const page=await context.newPage(),errors=[],issues=[];
 page.on('console',m=>{if(m.type()==='error')console.error('BROWSER',m.text())});page.on('requestfailed',r=>console.error('REQUEST FAILED',r.url(),r.failure()));
 page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message)});
 for(const width of [320,390,768,1024,1362,1440]){
  await page.setViewportSize({width,height:900});
  for(const path of paths){
   await page.goto('http://127.0.0.1:5173'+path);
   await page.waitForSelector('main');
   if(path==='/za/checkout')await page.waitForSelector('.dx-checkout-grid');
   if(path.includes('/t/'))await page.waitForSelector('.dx-pdp-info');
   const problems=await page.evaluate(()=>{
    const intersects=(a,b)=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return Math.min(x.right,y.right)-Math.max(x.left,y.left)>2&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>2};
    const problems=[];
    for(const selector of ['.dx-header','.dx-checkout','.dx-checkout-grid','.dx-fields','.dx-header-actions','.dx-main-nav','.dx-coupon']){
     for(const parent of document.querySelectorAll(selector)){
      const children=[...parent.children].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(e).visibility==='visible'});
      for(let i=0;i<children.length;i++)for(let j=i+1;j<children.length;j++)if(intersects(children[i],children[j]))problems.push(selector+' siblings overlap');
     }
    }
    const hero=document.querySelector('.react-hero-copy');if(hero){const r=hero.getBoundingClientRect();if(r.left<18||r.right>innerWidth-18)problems.push('Hero copy lacks side gutters');}
    const checkout=document.querySelector('main.dx-checkout');if(checkout&&getComputedStyle(checkout).display!=='block')problems.push('Checkout inherited button display');
    if(document.documentElement.scrollWidth>innerWidth+2)problems.push('Page overflows horizontally: '+[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+2}).map(e=>e.className||e.tagName).slice(0,12).join(','));
    return problems;
   });
   if(problems.length)issues.push({width,path,problems});
   if(process.env.SCREENSHOT_DIR&&['/za','/za/checkout'].includes(path)&&[390,1362].includes(width))await page.screenshot({path:process.env.SCREENSHOT_DIR+'/react-'+(path==='/za'?'home':'checkout')+'-'+width+'.png',fullPage:true});
  }
 }
 console.log(JSON.stringify({routes:paths.length,widths:6,issues,errors}));await browser.close();assert.deepEqual(errors,[]);assert.deepEqual(issues,[]);
})().catch(e=>{console.error(e);process.exit(1)});
