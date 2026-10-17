import {productImages,productPrice} from './productMedia.js';
import {productPath} from './urls.js';
export function variantRows(p){return Array.isArray(p.variants)&&p.variants.length?p.variants:[p];}
export function variantUrl(p,v,origin='https://drixelsa.co.za',market='za'){return origin+productPath(p,market)+(v!==p&&v.sku?'?sku='+encodeURIComponent(v.sku):'');}
export function productSchema(p,{origin='https://drixelsa.co.za',market='za',currency='ZAR',rate=1,offers=true}={}){
 const base={'@context':'https://schema.org',name:p.name||p.title,description:p.description||'',brand:{'@type':'Brand',name:'Drixel'},url:origin+productPath(p,market)};
 const items=variantRows(p).map(v=>{const price=productPrice(p,v),image=productImages(p,v.color).map(x=>new URL(x,origin).href),item={'@type':'Product',name:[base.name,v!==p?v.color:'',v!==p?v.size:''].filter(Boolean).join(' · '),image,sku:v.sku||p.sku||p.id,...(v.color?{color:v.color}:{}),...(v.size?{size:v.size}:{}),brand:base.brand,url:variantUrl(p,v,origin,market)};
  if(offers&&Number.isFinite(price)&&price>=0&&Number.isFinite(rate))item.offers={'@type':'Offer',priceCurrency:currency,price:Number((price*rate).toFixed(2)),availability:'https://schema.org/'+(p.active!==false&&(!p.availableMarkets?.length||p.availableMarkets.includes(market))&&Number(v.stock??v.quantity??0)>0?'InStock':'OutOfStock'),url:item.url};return item;});
 return items.length===1?{...base,...items[0]}:{...base,'@type':'ProductGroup',productGroupID:p.id||p.urlCode,variesBy:[...(items.some(v=>v.color)?['https://schema.org/color']:[]),...(items.some(v=>v.size)?['https://schema.org/size']:[])],hasVariant:items};
}
export function merchantFeed(catalogue,origin='https://drixelsa.co.za'){
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])),issues=[],entries=[],seen=new Set();
 for(const p of catalogue){if(p.active===false||p.availableMarkets?.length&&!p.availableMarkets.includes('za'))continue;
 for(const v of variantRows(p)){const id=String(p.id)+'-'+String(v.sku||p.sku||'default'),price=productPrice(p,v),image=productImages(p,v.color)[0];
 if(!image||!Number.isFinite(price)||price<=0||seen.has(id)||(v!==p&&!v.sku)){issues.push({productId:p.id,sku:v.sku||'',issue:'Check image, positive price and unique variant SKU.'});continue}seen.add(id);
 const fields={id,title:[p.name||p.title,v!==p?v.color:'',v!==p?v.size:''].filter(Boolean).join(' · '),description:p.description||p.name||p.title,link:variantUrl(p,v,origin),image_link:new URL(image,origin).href,availability:Number(v.stock??v.quantity??0)>0?'in_stock':'out_of_stock',price:price.toFixed(2)+' ZAR',brand:'Drixel',...(v!==p?{item_group_id:p.id}:{}),...(v.color?{color:v.color}:{}),...(v.size?{size:v.size}:{}),...(v.gtin?{gtin:v.gtin}:{}),...(['new','refurbished','used'].includes(v.condition||p.condition)?{condition:v.condition||p.condition}:{}),...(['male','female','unisex'].includes(v.gender||p.gender)?{gender:v.gender||p.gender}:{}),...(['newborn','infant','toddler','kids','adult'].includes(v.ageGroup||p.ageGroup)?{age_group:v.ageGroup||p.ageGroup}:{})};
 entries.push('<item>'+Object.entries(fields).map(([k,value])=>`<g:${k}>${escape(value)}</g:${k}>`).join('')+'</item>');}}
 return {xml:`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Drixel SA products</title><link>${escape(origin)}</link><description>South African catalogue in ZAR</description>${entries.join('')}</channel></rss>`,issues,count:entries.length};
}
