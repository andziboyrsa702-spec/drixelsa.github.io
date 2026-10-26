import{collection,getDocs,doc,getDoc,query,where,limit}from"firebase/firestore";
import{db}from"../config/firebase-react.js";

const CACHE_KEY='drixel_catalogue_cache_v1';
const TIMEOUT_MS=8000;
const available=p=>p.active!==false;

function withTimeout(promise,ms=TIMEOUT_MS){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('Catalogue request timed out.')),ms))
  ]);
}

function readCache(){
  try{
    const raw=localStorage.getItem(CACHE_KEY);
    if(!raw)return[];
    const parsed=JSON.parse(raw);
    return Array.isArray(parsed)?parsed:[];
  }catch{return[];}
}

function writeCache(list){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(list));}catch{}
}

export async function products(market="za"){
  try{
    const s=await withTimeout(getDocs(collection(db,"products")));
    const list=s.docs.map(x=>({...x.data(),id:x.id})).filter(x=>available(x,market));
    writeCache(list);
    return list;
  }catch(error){
    const cached=readCache().filter(x=>available(x,market));
    if(cached.length)return cached;
    throw error;
  }
}

export async function productById(id,market="za"){
  try{
    const s=await withTimeout(getDoc(doc(db,"products",id)));
    if(!s.exists()||!available(s.data(),market))throw new Error("Product not found.");
    return{...s.data(),id:s.id};
  }catch(error){
    const cached=readCache().find(p=>p.id===id&&available(p,market));
    if(cached)return cached;
    throw error;
  }
}

export async function productByCode(code,market="za"){
  const normalized=decodeURIComponent(code||"");
  try{
    for(const field of["urlCode"]){
      const s=await withTimeout(getDocs(query(collection(db,"products"),where(field,"==",normalized),limit(1))));
      if(!s.empty){
        const d=s.docs[0];
        if(available(d.data(),market))return{...d.data(),id:d.id};
      }
    }
    const direct=await withTimeout(getDoc(doc(db,"products",normalized)));
    if(direct.exists()&&available(direct.data(),market))return{...direct.data(),id:direct.id};
  }catch(error){
    const cached=readCache().find(p=>(p.urlCode===normalized||p.id===normalized)&&available(p,market));
    if(cached)return cached;
    throw error;
  }
  const all=await products(market),match=all.find(p=>p.id===normalized||p.urlCode===normalized);
  if(!match)throw new Error("Product not found.");
  return match;
}
