import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {MARKETS} from '../src/i18n/markets.js';
import {productPath} from '../src/utils/urls.js';
import {productImages} from '../src/utils/productMedia.js';
import {pageMetadata,categories,information,alternates} from '../src/utils/seoMetadata.js';
const origin=(process.env.VITE_SITE_URL||'https://drixelsa.co.za').replace(/\/$/,''),html=await readFile('dist/index.html','utf8');
if(new URL(origin).protocol!=='https:')throw Error('SEO origin must use HTTPS');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const json=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const decode=v=>'stringValue'in v?v.stringValue:'booleanValue'in v?v.booleanValue:'integerValue'in v?Number(v.integerValue):'doubleValue'in v?v.doubleValue:'timestampValue'in v?v.timestampValue:'arrayValue'in v?(v.arrayValue.values||[]).map(decode):'mapValue'in v?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,decode(x)])):null;
let catalogue=[];
if(process.env.PUBLIC_CATALOGUE_FILE)catalogue=JSON.parse(await readFile(process.env.PUBLIC_CATALOGUE_FILE,'utf8'));
else if(process.env.BUILD_LIVE_CATALOGUE==='true'){
 let next='';do{const url=new URL('https://firestore.googleapis.com/v1/projects/drixel-sa/databases/(default)/documents/products');url.searchParams.set('pageSize','300');if(next)url.searchParams.set('pageToken',next);const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Public catalogue snapshot failed: HTTP '+response.status);const data=await response.json();catalogue.push(...(data.documents||[]).map(d=>({...Object.fromEntries(Object.entries(d.fields||{}).map(([key,value])=>[key,decode(value)])),id:d.name.split('/').pop(),seoUpdatedAt:d.updateTime})));next=data.nextPageToken||'';}while(next);
}
catalogue=catalogue.filter(p=>p.active!==false);
const pages=new Map(),add=(path,title,noindex=false,description='Drixel South African streetwear.',product=null)=>pages.set(path,{...(pageMetadata(path)||{title,description}),noindex,product});
for(const market of Object.keys(MARKETS)){
 add('/'+market);
 for(const category of Object.keys(categories))add(`/${market}/w/${category}`);
 for(const path of Object.keys(information))add(`/${market}/${path}`);
 for(const path of ['cart','checkout','wishlist','search','member/login','member/profile','member/orders','admin','admin/dashboard','admin/settings/admins'])add(`/${market}/${path}`,path.startsWith('admin')?'Store management | Drixel':path==='cart'?'Your bag | Drixel':path==='checkout'?'Checkout | Drixel':'My account | Drixel',true);
 for(const p of catalogue)add(productPath(p,market),(p.name||p.title||'Product')+' | Drixel',false,p.seoDescription||p.description||'Explore this Drixel streetwear product, photos and available sizes.',p);
}
add('/za/member/microsoft-approval','Microsoft approval | Drixel',true);
const imageUrls=p=>productImages(p||{}).flatMap(x=>{try{const u=new URL(x,origin);return ['http:','https:'].includes(u.protocol)?[u.href]:[]}catch{return []}});
const link=(path,title)=>`<a href="${escape(path)}">${escape(title)}</a>`;
const navigation=market=>`<nav aria-label="Store">${link('/'+market,'Drixel')} · ${link('/'+market+'/w/new-featured','Shop')} · ${link('/'+market+'/about','About')} · ${link('/'+market+'/contact','Contact')} · ${link('/sitemap.html','All pages')}</nav>`;
const style='<style>body{margin:0;color:#161616;background:#fff;font:16px/1.6 Arial,sans-serif}main,body>header{max-width:1120px;margin:auto;padding:32px 24px}a{color:inherit;text-underline-offset:4px}nav{display:flex;gap:16px;flex-wrap:wrap}h1{font-size:clamp(30px,5vw,56px);line-height:1.1}ul{padding-left:22px}section{padding:24px 0;border-top:1px solid #ddd}.directory{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}img{max-width:320px;width:100%;height:auto}</style>';
function render(path,page){
 const market=path.split('/')[1],url=origin+path,images=imageUrls(page.product);
 let head=`<link rel="canonical" href="${escape(url)}"><meta name="robots" content="${page.noindex?'noindex,nofollow':'index,follow,max-image-preview:large'}"><meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}"><meta property="og:url" content="${escape(url)}"><meta property="og:type" content="${page.product?'product':'website'}"><meta property="og:site_name" content="Drixel SA"><meta name="twitter:card" content="${images.length?'summary_large_image':'summary'}">`;
 if(images.length)head+=`<meta property="og:image" content="${escape(images[0])}">`;
 if(!page.noindex){
  head+=alternates(path,origin).map(x=>`<link data-drixel-hreflang="1" rel="alternate" hreflang="${x.lang}" href="${escape(x.url)}">`).join('');
  const schemas=[{'@context':'https://schema.org','@type':'Organization','@id':origin+'/#organization',name:'Drixel SA',url:origin+'/za'},{'@context':'https://schema.org','@type':'WebSite','@id':origin+'/#website',name:'Drixel SA',alternateName:'Drixel',url:origin+'/',publisher:{'@id':origin+'/#organization'}}];
  if(path!==`/${market}`)schemas.push({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Drixel',item:origin+'/'+market},{'@type':'ListItem',position:2,name:page.product?.name||page.title.split(' | ')[0],item:url}]});
  if(page.product){const p=page.product;schemas.push({'@context':'https://schema.org','@type':'Product',name:p.name||p.title,description:p.description||page.description,image:images,sku:p.urlCode||p.sku||p.id,brand:{'@type':'Brand',name:'Drixel'}});}
  head+=schemas.map(s=>`<script data-drixel-static-schema="1" type="application/ld+json">${json(s)}</script>`).join('');
 }
 let content='';
 if(!page.noindex){const category=path.split('/w/')[1],products=page.product?[]:category?catalogue.filter(p=>category==='new-featured'||String(p.category||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')===category):[];content=`<main>${navigation(market)}<h1>${escape(page.product?.name||page.title.split(' | ')[0])}</h1><p>${escape(page.description)}</p>${images.map((src,i)=>`<img src="${escape(src)}" alt="${escape(page.product.name||page.product.title)}${i?' — additional view':''}">`).join('')}<ul>${products.map(p=>'<li>'+link(productPath(p,market),p.name||p.title)+'</li>').join('')}</ul>${path===`/${market}`?'<ul>'+Object.entries(categories).map(([key,[name]])=>'<li>'+link(`/${market}/w/${key}`,name)+'</li>').join('')+'</ul>':''}<noscript><p>Enable JavaScript to select product options, see current prices and place an order.</p></noscript></main>`;}
 return html.replace(/<title>.*?<\/title>/,'<title>'+escape(page.title)+'</title>').replace(/<meta name="description"[^>]*>/,'<meta name="description" content="'+escape(page.description)+'">').replace('</head>',head+'</head>').replace('<div id="root"></div>','<div id="root">'+content+'</div>');
}
for(const [path,page] of pages){if(!/^\/[a-z0-9%/_-]+$/i.test(path))throw Error('Unsafe public route');await mkdir('dist'+path,{recursive:true});await writeFile('dist'+path+'/index.html',render(path,page));}
const publicPages=[...pages].filter(([,p])=>!p.noindex),mapFiles=[];
for(const market of Object.keys(MARKETS)){
 const entries=publicPages.filter(([p])=>p.startsWith('/'+market+'/')||p==='/'+market);
 for(let offset=0;offset<entries.length;offset+=10000){const filename=`sitemap-${market}-${1+offset/10000}.xml`;mapFiles.push(filename);const urls=entries.slice(offset,offset+10000).map(([path,p])=>{
 const date=p.product?.seoUpdatedAt;const lastmod=typeof date==='string'&&Number.isFinite(Date.parse(date))&&Date.parse(date)<=Date.now()?`<lastmod>${new Date(date).toISOString()}</lastmod>`:'';
 return `<url><loc>${escape(origin+path)}</loc>${lastmod}${imageUrls(p.product).slice(0,1000).map(src=>`<image:image><image:loc>${escape(src)}</image:loc></image:image>`).join('')}</url>`;
 }).join('\n');await writeFile('dist/'+filename,`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>`);}
}
await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${mapFiles.map(f=>`<sitemap><loc>${escape(origin+'/'+f)}</loc></sitemap>`).join('\n')}\n</sitemapindex>`);
await writeFile('dist/sitemap.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>All Pages | Drixel SA</title><meta name="description" content="Explore Drixel collections, products and customer care pages by country."><link rel="canonical" href="${origin}/sitemap.html">${style}</head><body><main><p>DRIXEL / DIRECTORY</p><h1>Explore Drixel.</h1><p>Collections, products and customer care. Choose your country below.</p><p>${link('/za','Back to store')} · ${link('/sitemap.xml','XML sitemap')}</p><div class="directory">${Object.entries(MARKETS).map(([market,info])=>`<section><h2>${escape(info.country)}</h2><ul>${publicPages.filter(([p])=>p==='/'+market||p.startsWith('/'+market+'/')).map(([p,data])=>`<li>${link(p,data.product?.name||data.title.split(' | ')[0])}</li>`).join('')}</ul></section>`).join('')}</div></main></body></html>`);
await writeFile('dist/robots.txt','User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: '+origin+'/sitemap.xml\n');
await writeFile('dist/404.html',html.replace('</head>','<meta name="robots" content="noindex,nofollow"></head>'));
await writeFile('dist/index.html',render('/za',pages.get('/za')));
console.log(`Built ${pages.size} route entries, ${mapFiles.length} sitemaps and a readable directory covering ${catalogue.length} active products.`);
