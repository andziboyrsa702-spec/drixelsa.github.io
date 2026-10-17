const fs=require('node:fs');
const product={id:'tee',_firestoreId:'tee',name:'Drixel Tee',description:'Cotton tee',price:100,category:'tees',image:'/favicon-32x32.png',images:['/favicon-32x32.png'],sizes:['M'],colors:[{name:'Black',code:'#111111'}],stock:5,status:'active',featured:true};
const snapshot=`const data=${JSON.stringify(product)}; const snap={id:'tee',exists:()=>true,data:()=>data}; const snaps=window.__layoutAudit ? [snap,...Array.from({length:40},(_,i)=>({id:String(i+1),exists:()=>true,data:()=>({...data,id:i+1,category:['tees','hoodies','sweaters','beanies'][i%4],name:'Drixel Premium Heavyweight Streetwear '+(i+1)})}))] : [snap];`;
const modules={
 'firebase-app.js':'export const initializeApp=()=>({});',
 'firebase-auth.js':`const user={uid:'alice',email:'alice@example.com',emailVerified:true,displayName:'Alice',getIdToken:async()=> 'test-token',getIdTokenResult:async()=>({claims:{}})};const current=()=>window.__guest?null:user;export const getAuth=()=>({get currentUser(){return current()}});export const onAuthStateChanged=(a,cb)=>{setTimeout(()=>cb(current()),0);return ()=>{}};export const createUserWithEmailAndPassword=async()=>({user});export const signInWithEmailAndPassword=createUserWithEmailAndPassword;export const signOut=async()=>{};export const sendPasswordResetEmail=async()=>{};export class GoogleAuthProvider{};export class OAuthProvider{addScope(){}};export const signInWithPopup=createUserWithEmailAndPassword;export const linkWithPopup=createUserWithEmailAndPassword;`,
 'firebase-firestore.js':`${snapshot} export const getFirestore=()=>({});export const collection=(db,name)=>({name});export const doc=(db,name,id)=>({name,id});export const getDoc=async ref=>({id:ref.id,exists:()=>false,data:()=>({})});export const getDocs=async ref=>ref.name==='products'?{empty:false,docs:snaps,forEach:cb=>snaps.forEach(cb)}:{empty:true,docs:[],forEach:()=>{}};export const setDoc=async()=>{};export const updateDoc=async()=>{};export const deleteDoc=async()=>{};export const addDoc=async()=>({id:'new'});export const query=(ref,...args)=>ref;export const where=()=>({});export const orderBy=()=>({});export const onSnapshot=()=>()=>{};export const serverTimestamp=()=>null;`,
 'firebase-analytics.js':'export const getAnalytics=()=>({});',
 'firebase-functions.js':`export const getFunctions=()=>({});export const httpsCallable=(f,name)=>async data=>{window.__calls.push({name,data});if(name==='getCheckoutConfig')return {data:{yocoEnabled:false,deliveryFee:70,freeDeliveryThreshold:1000}};if(name==='quoteCheckout') return {data:{items:[{...${JSON.stringify(product)},quantity:1,size:'M',color:'Black'}],total:170,totalCents:17000,shipping:70,discount:0}};if(name==='createOrder')return {data:{id:'order123',orderNumber:'DRX-123',total:170,paymentMethod:data.paymentMethod,paymentStatus:'pending',status:'pending'}};if(name==='getOrder')return {data:{id:'order123',orderNumber:'DRX-123',total:170,shipping:70,paymentMethod:'bank',paymentStatus:'pending',status:'pending'}};if(name==='subscribeNewsletter')return {data:{message:'Check your inbox to confirm.'}};return {data:{success:true}};};`
};

async function mockStorefront(context) {
 await context.addInitScript(p=>{window.__calls=[];if(!localStorage.getItem('drixel_cart')) {localStorage.setItem('drixel_cart',JSON.stringify([{...p,productId:'tee',size:'M',color:'Black',quantity:1}]));localStorage.setItem('drixel_cart_is_guest','true');}},product);
 await context.route('**/*',async route=>{const url=new URL(route.request().url());
 // Optional local copies of the production fonts for visual review without CDN access.
 const fonts=process.env.FONT_FIXTURE_DIR;
 if(fonts && url.hostname==='fonts.googleapis.com') {
  const css=[['inter','Inter',[400,500,600,700]],['space','Space Grotesk',[500,700]]].flatMap(([dir,family,weights])=>weights.map(weight=>`@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};src:url('https://font-fixture.test/${dir}/${dir==='space'?'space-grotesk':'inter'}-latin-${weight}-normal.woff2') format('woff2');}`)).join('');
  return route.fulfill({contentType:'text/css',body:css});
 }
 if(fonts && url.hostname==='font-fixture.test') {
  const [dir,file]=url.pathname.slice(1).split('/');
  return route.fulfill({contentType:'font/woff2',body:fs.readFileSync(`${fonts}/${dir}/package/files/${file}`)});
 }
 if(fonts && url.hostname==='cdnjs.cloudflare.com' && url.pathname.includes('/font-awesome/')) {
  const file=url.pathname.split('/').pop(),isFont=file.endsWith('.woff2');
  return route.fulfill({contentType:isFont?'font/woff2':'text/css',body:fs.readFileSync(`${fonts}/icons/package/${isFont?'webfonts':'css'}/${file}`)});
 }
 if(/\.(png|jpg|jpeg|ico)$/i.test(url.pathname)) return route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64')});if(/\.mp4$/i.test(url.pathname))return route.fulfill({status:200,body:''});if(url.hostname==='127.0.0.1')return route.continue();const module=modules[url.pathname.split('/').pop()];return route.fulfill({status:200,contentType:module?'application/javascript':'text/plain',body:module || ''});});
}
module.exports={product,mockStorefront};
