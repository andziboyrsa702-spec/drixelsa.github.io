const CACHE_KEY='drixel_catalogue_cache_v3';
const TIMEOUT_MS=8000;
const SNAPSHOT_URL='/catalogue.json';
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

async function fetchJson(url,timeout=TIMEOUT_MS){
  const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(timeout),cache:'no-store'});
  if(!response.ok)throw new Error(`Catalogue unavailable (${response.status}).`);
  return response.json();
}

async function fetchSnapshot(){
  const payload=await fetchJson(SNAPSHOT_URL,4000);
  const list=Array.isArray(payload)?payload:payload?.products;
  if(!Array.isArray(list))throw new Error('Catalogue snapshot is invalid.');
  return list.filter(available);
}

async function fetchLiveCatalogue(){
  const list=[];
  let pageToken='';
  do{
    const url=new URL(FIRESTORE_PRODUCTS);
    url.searchParams.set('pageSize','300');
    if(pageToken)url.searchParams.set('pageToken',pageToken);
    const payload=await fetchJson(url);
    for(const document of payload.documents||[]){
      const data=Object.fromEntries(Object.entries(document.fields||{}).map(([key,value])=>[key,decode(value)]));
      list.push({...data,id:document.name.split('/').pop()});
    }
    pageToken=payload.nextPageToken||'';
  }while(pageToken);
  return list.filter(available);
}

let cataloguePromise;
function refreshInBackground(){
  fetchLiveCatalogue().then(list=>{
    if(!list.length)return;
    writeCache(list);
    cataloguePromise=Promise.resolve(list);
  }).catch(()=>{});
}

async function loadCatalogue(){
  try{
    const snapshot=await fetchSnapshot();
    writeCache(snapshot);
    refreshInBackground();
    return snapshot;
  }catch(snapshotError){
    const cached=readCache();
    if(cached.length){
      refreshInBackground();
      return cached;
    }
    try{
      const live=await fetchLiveCatalogue();
      writeCache(live);
      return live;
    }catch{
      throw snapshotError;
    }
  }
}

async function catalogue(){
  if(!cataloguePromise){
    cataloguePromise=loadCatalogue().catch(error=>{
      cataloguePromise=null;
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
