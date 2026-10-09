import {pageMetadata,cleanPath,alternates} from '../utils/seoMetadata.js';
import {productImages} from '../utils/productMedia.js';
import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {MARKETS} from '../i18n/markets.js';
import {useMarket} from '../context/MarketContext.jsx';
const origin=(import.meta.env.VITE_SITE_URL||'https://drixelsa.co.za').replace(/\/$/,'');
export default function Seo({title='Drixel',description='Drixel streetwear.',noindex=false,product=null}){
 const loc=useLocation(),{info,rate,pricingReady}=useMarket();
 useEffect(()=>{
  const routeMeta=!noindex&&!product?pageMetadata(loc.pathname):null;
  title=routeMeta?.title||title;description=routeMeta?.description||description;
  document.title=title;
  document.querySelectorAll('[data-drixel-static-schema]').forEach(x=>x.remove());
  const meta=(key,value,property=false)=>{const selector=property?'property':'name';let tag=document.head.querySelector(`meta[${selector}="${key}"]`);if(!tag){tag=document.createElement('meta');tag.setAttribute(selector,key);document.head.appendChild(tag);}tag.content=value;};
  let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}canonical.href=origin+cleanPath(loc.pathname);
  const publicHost=new URL(origin).hostname.replace(/^www\./,'');meta('robots',noindex||![publicHost,'www.'+publicHost].includes(location.hostname)?'noindex,nofollow':'index,follow,max-image-preview:large');meta('description',description);meta('og:title',title,true);meta('og:description',description,true);meta('og:url',canonical.href,true);meta('og:type',product?'product':'website',true);
  document.querySelectorAll('link[data-drixel-hreflang]').forEach(x=>x.remove());
  if(!noindex)for(const item of alternates(loc.pathname,origin)){const link=document.createElement('link');link.rel='alternate';link.hreflang=item.lang;link.href=item.url;link.dataset.drixelHreflang='1';document.head.appendChild(link);}
  document.getElementById('drixel-page-schema')?.remove();
  if(!noindex){const script=document.createElement('script');script.id='drixel-page-schema';script.type='application/ld+json';script.text=JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':origin+'/#organization',name:'Drixel SA',url:origin+'/za'},{'@type':'WebSite','@id':origin+'/#website',name:'Drixel SA',alternateName:'Drixel',url:origin+'/',publisher:{'@id':origin+'/#organization'}},...(loc.pathname.split('/').filter(Boolean).length>1?[{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Drixel',item:origin+'/'+loc.pathname.split('/')[1]},{'@type':'ListItem',position:2,name:product?.name||title.split(' | ')[0],item:canonical.href}]}]:[])]});document.head.appendChild(script);}
  document.getElementById('drixel-product-schema')?.remove();
  if(product){const images=productImages(product).filter(Boolean).flatMap(x=>{try{return [new URL(x,origin).href]}catch{return []}});if(images[0])meta('og:image',images[0],true);const variants=Array.isArray(product.variants)?product.variants:[],inStock=product.active!==false&&(variants.length?variants.some(v=>Number(v.stock??v.quantity??0)>0):Number(product.stock??product.quantity??0)>0),schema={'@context':'https://schema.org','@type':'Product',name:product.name||product.title,description:product.description||'',image:[...new Set(images)],sku:product.urlCode||product.sku||product.id};
   if(pricingReady&&Number.isFinite(rate))schema.offers={'@type':'Offer',priceCurrency:info.currency,price:Number((Number(product.price||0)*rate).toFixed(2)),availability:inStock?'https://schema.org/InStock':'https://schema.org/OutOfStock',url:canonical.href};
   const script=document.createElement('script');script.id='drixel-product-schema';script.type='application/ld+json';script.text=JSON.stringify(schema);document.head.appendChild(script);
  }else document.querySelector('meta[property="og:image"]')?.remove();
  return ()=>{document.getElementById('drixel-product-schema')?.remove();document.getElementById('drixel-page-schema')?.remove();};
 },[loc.pathname,title,description,noindex,product,info.currency,rate,pricingReady]);
 return null;
}
