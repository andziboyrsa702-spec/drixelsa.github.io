const CACHE_KEY='drixel_catalogue_cache_v2';
const TIMEOUT_MS=8000;
const FIRESTORE_PRODUCTS='https://firestore.googleapis.com/v1/projects/drixel-sa/databases/(default)/documents/products';
const available=p=>p.active!==false;

const decode=value=>{
  if(!value||typeof value!=='object')return null;
  if('stringValue'in value)return value.stringValue;
  if('booleanValue'in value)return value.booleanValue;
  if('integerValue'in value)return Number(value.integerValue);
  if('doubleValue'in value)return Number(value.doubleValue);
  if('timestampValue'in value)return value.timestampValue;
  if('nullValue'in value)return null;
  if('arrayValue'in value)return (value.arrayValue.values||[]).map(decode);
  if('mapValue'in value)return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([key,item])=>[key,decode(item)]));
  return null;
};

function readCache(){
  try{
    const raw=localStorage.getItem(CACHE_KEY);
    if(!raw)return[];
    const parsed=JSON.parse(raw);
    return Array.isArray(parsed?.products)?parsed.products:Array.isArray(parsed)?parsed:[];
  }catch{return[];}
}

function writeCache(list){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),products:list}));}catch{}
}

async function fetchCatalogue(){
  const list=[];
  let pageToken='';
  do{
    const url=new URL(FIRESTORE_PRODUCTS);
    url.searchParams.set('pageSize','300');
    if(pageToken)url.searchParams.set('pageToken',pageToken);
    const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(TIMEOUT_MS)});
    if(!response.ok)throw new Error('Catalogue unavailable.');
    const payload=await response.json();
    for(const document of payload.documents||[]){
      const data=Object.fromEntries(Object.entries(document.fields||{}).map(([key,value])=>[key,decode(value)]));
      list.push({...data,id:document.name.split('/').pop()});
    }
    pageToken=payload.nextPageToken||'';
  }while(pageToken);
  if(list.length)writeCache(list);
  return list;
}

let cataloguePromise;
async function catalogue(){
  if(!cataloguePromise){
    cataloguePromise=fetchCatalogue().catch(error=>{
      cataloguePromise=null;
      const cached=readCache();
      if(cached.length)return cached;
      throw error;
    });
  }
  return cataloguePromise;
}

export async function products(market='za'){
  const list=await catalogue();
  return list.filter(product=>available(product,market));
}

export async function productById(id,market='za'){
  const list=await products(market);
  const product=list.find(item=>item.id===id);
  if(!product)throw new Error('Product not found.');
  return product;
}

export async function productByCode(code,market='za'){
  const normalized=decodeURIComponent(code||'');
  const list=await products(market);
  const product=list.find(item=>item.id===normalized||item.urlCode===normalized);
  if(!product)throw new Error('Product not found.');
  return product;
}
