import {MARKETS} from '../../src/i18n/markets.js';
const currencies=new Set(Object.values(MARKETS).map(m=>m.currency)),DAY=86400000;
export function createMarketPricing({fetcher=(...args)=>globalThis.fetch(...args),now=Date.now,cache=()=>globalThis.caches?.default}={}){
 const memory=new Map(),pending=new Map();
 async function rateFor(to){const key='https://drixel-api.drixelsa.workers.dev/__fx/ZAR/'+to,store=cache(),current=memory.get(to);if(current&&current.expires>now())return current.data;
  try{const cached=await store?.match(key);if(cached){const d=await cached.json();if(valid(d.rate,d.updatedAt)){memory.set(to,{data:d,expires:now()+3600000});return d}}}catch{}
  if(pending.has(to))return pending.get(to);
  const task=(async()=>{const r=await fetcher('https://api.frankfurter.dev/v2/rate/zar/'+to.toLowerCase(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Exchange-rate provider unavailable');const d=await r.json();if(String(d.base).toUpperCase()!=='ZAR'||String(d.quote).toUpperCase()!==to||!valid(d.rate,d.date))throw Error('Invalid or outdated exchange rate');const value={base:'ZAR',to,rate:Number(d.rate),updatedAt:d.date,source:'Frankfurter',estimate:true};memory.set(to,{data:value,expires:now()+3600000});try{await store?.put(key,new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=3600'}}))}catch{}return value})();pending.set(to,task);try{return await task}finally{pending.delete(to)}
 }
 function valid(rate,date){const time=Date.parse(date);return Number.isFinite(Number(rate))&&Number(rate)>0&&Number.isFinite(time)&&time<=now()+DAY&&now()-time<=7*DAY}
 return {rateFor,market(req,res){const raw=String(req.cloudCountry||'').toUpperCase(),countryCode=/^[A-Z]{2}$/.test(raw)&&!['XX','T1'].includes(raw)?raw:'ZA';return res.set('Cache-Control','private, no-store').json({countryCode,source:countryCode===raw?'ip':'fallback'})},async exchangeRates(req,res){const base=String(req.query.base||'ZAR').toUpperCase(),to=String(req.query.to||'ZAR').toUpperCase();if(base!=='ZAR'||!currencies.has(to))return res.status(400).json({message:'Unsupported currency.'});if(to==='ZAR')return res.json({base,to,rate:1,source:'Drixel',estimate:false});try{return res.set('Cache-Control','public, max-age=3600').json(await rateFor(to))}catch{return res.status(503).json({message:'Current currency conversion is unavailable. Prices are shown in ZAR until rates recover.'})}}};
}
export const marketPricing=createMarketPricing();
