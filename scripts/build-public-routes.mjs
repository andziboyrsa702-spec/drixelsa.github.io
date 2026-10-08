import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {MARKETS} from '../src/i18n/markets.js';
import {productPath} from '../src/utils/urls.js';
const origin=(process.env.VITE_SITE_URL||'https://drixelsa.co.za').replace(/\/$/,''),html=await readFile('dist/index.html','utf8');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
let catalogue=[];
if(process.env.PUBLIC_CATALOGUE_FILE){catalogue=JSON.parse(await readFile(process.env.PUBLIC_CATALOGUE_FILE,'utf8'));}
else if(process.env.BUILD_LIVE_CATALOGUE==='true'){
 let next='';do{const url=new URL('https://firestore.googleapis.com/v1/projects/drixel-sa/databases/(default)/documents/products');url.searchParams.set('pageSize','300');if(next)url.searchParams.set('pageToken',next);const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Public catalogue snapshot failed: HTTP '+response.status);const data=await response.json();const decode=v=>'stringValue'in v?v.stringValue:'booleanValue'in v?v.booleanValue:'integerValue'in v?Number(v.integerValue):'doubleValue'in v?v.doubleValue:null;catalogue.push(...(data.documents||[]).map(d=>({id:d.name.split('/').pop(),...Object.fromEntries(Object.entries(d.fields||{}).map(([key,value])=>[key,decode(value)]))})));next=data.nextPageToken||'';}while(next);
}
const pages=new Map(),add=(path,title,noindex=false,description='Drixel South African streetwear.')=>pages.set(path,{title,noindex,description});
for(const market of Object.keys(MARKETS)){
 add('/'+market,'Drixel '+MARKETS[market].country+' | Streetwear');
 for(const category of ['new-featured','tees','hoodies','sweaters','accessories'])add(`/${market}/w/${category}`,category.replace(/-/g,' ')+' | Drixel');
 for(const [path,title] of Object.entries({'about':'About Drixel','contact':'Contact Drixel','size-guide':'Size guide','community':'Drixel community','feedback':'Report a concern','customize':'Custom apparel — Coming soon','help/terms-of-use':'Terms and conditions','help/returns-policy':'Returns and refunds','help/shipping-policy':'Shipping policy','help/privacy-policy':'Privacy policy'}))add(`/${market}/${path}`,title+' | Drixel');
 for(const path of ['cart','checkout','wishlist','search','member/login','member/profile','member/orders','admin','admin/dashboard'])add(`/${market}/${path}`,path.startsWith('admin')?'Store management | Drixel':path==='cart'?'Your bag | Drixel':path==='checkout'?'Checkout | Drixel':'My account | Drixel',true);
 for(const p of catalogue.filter(p=>p.active!==false))add(productPath(p,market),(p.name||p.title||'Product')+' | Drixel',false,p.seoDescription||p.description||'Drixel streetwear.');
}
for(const [path,page] of pages){if(!/^\/[a-z0-9%/_-]+$/i.test(path))throw Error('Unsafe public route');const dir='dist'+path;await mkdir(dir,{recursive:true});const head=`<link rel="canonical" href="${escape(origin+path)}"><meta name="robots" content="${page.noindex?'noindex,nofollow':'index,follow'}">`;await writeFile(dir+'/index.html',html.replace(/<title>.*?<\/title>/,'<title>'+escape(page.title)+'</title>').replace(/<meta name="description"[^>]*>/,'<meta name="description" content="'+escape(page.description)+'">').replace('</head>',head+'</head>'));}
const urls=[...pages].filter(([,p])=>!p.noindex).map(([path])=>`<url><loc>${escape(origin+path)}</loc></url>`).join('');await writeFile('dist/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls+'</urlset>');await writeFile('dist/robots.txt','User-agent: *\nAllow: /\nSitemap: '+origin+'/sitemap.xml\n');await writeFile('dist/404.html',html);console.log(`Built ${pages.size} route entries and a sitemap covering ${catalogue.filter(p=>p.active!==false).length} active products.`);
