export function newProductCode(){return 'drx-'+crypto.randomUUID();}
export const STANDARD_SIZES=['XS','S','M','L','XL','XXL'];
export function fillVariantCodes(variants,productCode){
 const part=x=>String(x||'').trim().toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'');
 const used=new Set(variants.map(v=>String(v.sku||'').trim().toUpperCase()).filter(Boolean));
 return variants.map(v=>{if(String(v.sku||'').trim())return v;const base=[part(productCode),part(v.color),part(v.size)].filter(Boolean).join('-');let sku=base,n=2;while(used.has(sku))sku=base+'-'+n++;used.add(sku);return {...v,sku};});
}
export function replaceProductPhoto(product,key,url){
 const old=key==='frontImage'?[product.frontImage,product.image]:[product.backImage];
 return {...product,[key]:url,...(key==='frontImage'?{image:url}:{}),images:(product.images||[]).filter(x=>!old.includes(x)),...(product.mainColor?{colorImages:(product.colorImages||[]).map(row=>row.color===product.mainColor?{...row,[key]:url}:row)}:{})};
}

export function addStandardVariants(product){
 const existing=product.variants||[];
 const colors=[...new Set([...(product.colors||product.colours||[]),...(product.colorImages||[]).map(r=>r.color),...existing.map(v=>v.color)].filter(Boolean))];
 const variants=[...existing];
 for(const color of colors.length?colors:[''])for(const size of STANDARD_SIZES)if(!variants.some(v=>(v.color||'')===color&&v.size===size))variants.push({size,color,sku:'',stock:0,price:''});
 return fillVariantCodes(variants,product.urlCode||product.id);
}
