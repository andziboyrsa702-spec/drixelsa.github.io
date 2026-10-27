import {readFile,writeFile} from 'node:fs/promises';

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

async function liveCatalogue(){
  const products=[];
  let pageToken='';
  do{
    const url=new URL('https://firestore.googleapis.com/v1/projects/drixel-sa/databases/(default)/documents/products');
    url.searchParams.set('pageSize','300');
    if(pageToken)url.searchParams.set('pageToken',pageToken);
    const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error(`Catalogue snapshot failed: HTTP ${response.status}`);
    const payload=await response.json();
    for(const document of payload.documents||[]){
      const data=Object.fromEntries(Object.entries(document.fields||{}).map(([key,value])=>[key,decode(value)]));
      products.push({...data,id:document.name.split('/').pop(),seoUpdatedAt:document.updateTime});
    }
    pageToken=payload.nextPageToken||'';
  }while(pageToken);
  return products;
}

let products;
if(process.env.PUBLIC_CATALOGUE_FILE){
  const parsed=JSON.parse(await readFile(process.env.PUBLIC_CATALOGUE_FILE,'utf8'));
  products=Array.isArray(parsed)?parsed:parsed?.products;
}else if(process.env.BUILD_LIVE_CATALOGUE==='true'){
  products=await liveCatalogue();
}else{
  console.log('Catalogue snapshot skipped: no build-time catalogue source configured.');
  process.exit(0);
}

if(!Array.isArray(products))throw new Error('Catalogue snapshot source must contain a product array.');
products=products.filter(product=>product?.active!==false);
await writeFile('dist/catalogue.json',JSON.stringify({generatedAt:new Date().toISOString(),products}));
console.log(`Published storefront catalogue snapshot with ${products.length} active products.`);
