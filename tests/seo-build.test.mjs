import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {MARKETS} from '../src/i18n/markets.js';
test('generated pages and sitemaps expose public content without leaking private routes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'drixel-seo-'));
 try{
 await mkdir(join(dir,'dist'));
 await writeFile(join(dir,'dist/index.html'),'<!doctype html><html lang="en"><head><title>Drixel</title><meta name="description" content="Store"></head><body><div id="root"></div></body></html>');
 const fixture=join(dir,'catalogue.json');await writeFile(fixture,JSON.stringify([{id:'tee-1',name:'Black & White Tee',description:'Cotton </script> tee',category:'tees',active:true,image:'https://example.com/front.jpg?a=1&b=2',images:['https://example.com/back.jpg'],seoUpdatedAt:'2026-01-01T00:00:00Z'},{id:'hidden',name:'Unpublished',active:false}]));
 execFileSync(process.execPath,[resolve('scripts/build-public-routes.mjs')],{cwd:dir,env:{...process.env,PUBLIC_CATALOGUE_FILE:fixture,BUILD_LIVE_CATALOGUE:'false'}});
 const index=await readFile(join(dir,'dist/sitemap.xml'),'utf8');assert.equal((index.match(/<sitemap>/g)||[]).length,Object.keys(MARKETS).length);
 const sitemap=await readFile(join(dir,'dist/sitemap-za-1.xml'),'utf8');assert.match(sitemap,/black-white-tee\/tee-1/);assert.match(sitemap,/image:image/);assert.match(sitemap,/&amp;b=2/);assert.doesNotMatch(sitemap,/admin|member|checkout|hidden|wishlist|\/search/);
 const page=await readFile(join(dir,'dist/za/t/black-white-tee/tee-1/index.html'),'utf8');assert.match(page,/<h1>Black &amp; White Tee<\/h1>/);assert.equal((page.match(/rel="canonical"/g)||[]).length,1);assert.match(page,/hreflang="x-default"/);assert.doesNotMatch(page,/hreflang="en-EU"/);
 const schemas=[...page.matchAll(/type="application\/ld\+json">(.*?)<\/script>/g)].map(x=>JSON.parse(x[1]));assert(schemas.some(x=>x['@type']==='Product'&&x.image.length===2));assert(schemas.some(x=>x['@type']==='BreadcrumbList'));
 for(const path of ['za/admin','za/member/profile','za/member/microsoft-approval'])assert.match(await readFile(join(dir,'dist',path,'index.html'),'utf8'),/noindex,nofollow/);
 assert.match(await readFile(join(dir,'dist/404.html'),'utf8'),/noindex,nofollow/);
 assert.match(await readFile(join(dir,'dist/za/w/tees/index.html'),'utf8'),/href="\/za\/t\/black-white-tee\/tee-1"/);
 assert.match(await readFile(join(dir,'dist/sitemap.html'),'utf8'),/Explore Drixel/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
