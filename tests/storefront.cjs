const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const product={id:'tee',_firestoreId:'tee',name:'Drixel Tee',description:'Cotton tee',price:100,category:'tees',image:'/favicon-32x32.png',images:['/favicon-32x32.png'],sizes:['M'],colors:[{name:'Black',code:'#111111'}],stock:5,status:'active',featured:true};
const snapshot=`const data=${JSON.stringify(product)}; const snap={id:'tee',exists:()=>true,data:()=>data};`;
const modules={
 'firebase-app.js':'export const initializeApp=()=>({});',
 'firebase-auth.js':`const user={uid:'alice',email:'alice@example.com',emailVerified:true,displayName:'Alice',getIdToken:async()=> 'test-token',getIdTokenResult:async()=>({claims:{}})};const current=()=>window.__guest?null:user;export const getAuth=()=>({get currentUser(){return current()}});export const onAuthStateChanged=(a,cb)=>{setTimeout(()=>cb(current()),0);return ()=>{}};export const createUserWithEmailAndPassword=async()=>({user});export const signInWithEmailAndPassword=createUserWithEmailAndPassword;export const signOut=async()=>{};export const sendPasswordResetEmail=async()=>{};export class GoogleAuthProvider{};export class OAuthProvider{addScope(){}};export const signInWithPopup=createUserWithEmailAndPassword;export const linkWithPopup=createUserWithEmailAndPassword;`,
 'firebase-firestore.js':`${snapshot} export const getFirestore=()=>({});export const collection=(db,name)=>({name});export const doc=(db,name,id)=>({name,id});export const getDoc=async ref=>({id:ref.id,exists:()=>false,data:()=>({})});export const getDocs=async ref=>ref.name==='products'?{empty:false,docs:[snap],forEach:cb=>cb(snap)}:{empty:true,docs:[],forEach:()=>{}};export const setDoc=async()=>{};export const updateDoc=async()=>{};export const deleteDoc=async()=>{};export const addDoc=async()=>({id:'new'});export const query=(ref,...args)=>ref;export const where=()=>({});export const orderBy=()=>({});export const onSnapshot=()=>()=>{};export const serverTimestamp=()=>null;`,
 'firebase-analytics.js':'export const getAnalytics=()=>({});',
 'firebase-functions.js':`export const getFunctions=()=>({});export const httpsCallable=(f,name)=>async data=>{window.__calls.push({name,data});if(name==='getCheckoutConfig')return {data:{yocoEnabled:false,deliveryFee:70,freeDeliveryThreshold:1000}};if(name==='quoteCheckout') return {data:{items:[{...${JSON.stringify(product)},quantity:1,size:'M',color:'Black'}],total:170,totalCents:17000,shipping:70,discount:0}};if(name==='createOrder')return {data:{id:'order123',orderNumber:'DRX-123',total:170,paymentMethod:data.paymentMethod,paymentStatus:'pending',status:'pending'}};if(name==='getOrder')return {data:{id:'order123',orderNumber:'DRX-123',total:170,shipping:70,paymentMethod:'bank',paymentStatus:'pending',status:'pending'}};if(name==='subscribeNewsletter')return {data:{message:'Check your inbox to confirm.'}};return {data:{success:true}};};`
};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH,args:['--no-sandbox']} : {})});
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 await context.addInitScript(p=>{window.__calls=[];if(!localStorage.getItem('drixel_cart')) {localStorage.setItem('drixel_cart',JSON.stringify([{...p,productId:'tee',size:'M',color:'Black',quantity:1}]));localStorage.setItem('drixel_cart_is_guest','true');}},product);
 await context.route('**/*',async route=>{const url=new URL(route.request().url()); if(/\.(png|jpg|jpeg|ico)$/i.test(url.pathname)) return route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64')});if(/\.mp4$/i.test(url.pathname))return route.fulfill({status:200,body:''});if(url.hostname==='127.0.0.1')return route.continue();const module=modules[url.pathname.split('/').pop()];return route.fulfill({status:200,contentType:module?'application/javascript':'text/plain',body:module || ''});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR:',e.message)});
 await page.goto('http://127.0.0.1:8765/checkout.html');
 await page.waitForFunction(()=>window.firebaseAuthInitialized===true);
 const values={firstName:'Alice',lastName:'Buyer',email:'alice@example.com',phone:'0123456789',address:'10 Main Road',city:'Cape Town',postalCode:'7700'};
 for(const [id,value] of Object.entries(values))await page.locator('#'+id).fill(value);
 await page.locator('#province').selectOption({label:'Western Cape'});
 await page.locator('#cookieConsent').evaluate(el=>el.remove());
 await page.locator('.btn-place-order').click();
 await page.waitForFunction(()=>document.getElementById('checkoutFeedback').textContent.includes('Review your confirmed total'));
 assert.equal(await page.locator('#payYoco').isDisabled(),true);
 assert.equal(await page.locator('#newsletterSubscription').isChecked(),false);
 assert.equal(await page.locator('#cardNumber').count(),0);
 await page.screenshot({path:process.env.SCREENSHOT_DIR ? process.env.SCREENSHOT_DIR+'/checkout-desktop.png' : '/tmp/checkout-desktop.png',fullPage:true});
 await page.locator('.btn-place-order').click();await page.waitForURL('**/orderConfirmation.html?order=order123',{waitUntil:'domcontentloaded',timeout:10000}).catch(async error=>{console.error('CHECKOUT DIAGNOSTIC',await page.evaluate(()=>({url:location.href,feedback:document.getElementById('checkoutFeedback')?.textContent,calls:window.__calls})));throw error;});
 await page.waitForFunction(()=>document.getElementById('confirmationMessage').textContent.includes('awaiting payment'));
 assert(!(await page.locator('#confirmationMessage').innerText()).includes('Payment verified'));
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:process.env.SCREENSHOT_DIR ? process.env.SCREENSHOT_DIR+'/order-mobile.png' : '/tmp/order-mobile.png',fullPage:true});
 const guest=await context.newPage();guest.on('pageerror',e=>errors.push(e.message));await guest.addInitScript(()=>{window.__guest=true;});await guest.goto('http://127.0.0.1:8765/cart.html');await guest.waitForFunction(()=>window.firebaseAuthInitialized===true);assert(guest.url().endsWith('/cart.html'));
 await guest.goto('http://127.0.0.1:8765/index.html');await guest.waitForFunction(()=>window.firebaseAuthInitialized===true);
 assert(await guest.locator('h2').allTextContents().then(a=>a.findIndex(s=>s.includes('Featured Streetwear'))<a.findIndex(s=>s.includes('Seasonal Campaigns'))));
 const newsletter=guest.locator('#newsletterEmailInput');await newsletter.fill('subscriber@example.com');await guest.locator('#newsletterForm button').click();await guest.waitForFunction(()=>document.getElementById('newsletterMessage').textContent.includes('Check your inbox'));
 await guest.goto('http://127.0.0.1:8765/product.html?id=tee');await guest.waitForFunction(()=>window.PRODUCTS_DATA?.some(p=>p.id==='tee'));
 console.log(JSON.stringify({errors,checkout:'review then confirm',payment:'pending until verified',guestCart:true,newsletter:true}));
 await browser.close();assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exit(1)});
