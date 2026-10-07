import React, {useState,useEffect} from 'react';
import {doc, getDoc, writeBatch, serverTimestamp} from 'firebase/firestore';
import {db} from '../config/firebase-react.js';
import {MARKETS} from '../i18n/markets.js';
import useAdminDocument from './useAdminDocument.js';
import AdminDataState from './AdminDataState.jsx';
const defaults={markets:Object.fromEntries(Object.keys(MARKETS).map(code=>[code,{enabled:true,checkout:code==='za',shippingFee:code==='za'?70:'',freeFrom:code==='za'?1000:''}]))};
export default function MarketSettings() {
 const connection=useAdminDocument('settings','markets',defaults),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const [rates,setRates]=useState({}),[rateError,setRateError]=useState('');
 useEffect(()=>{let live=true;Promise.all(Object.values(MARKETS).filter(m=>m.currency!=='ZAR').map(async m=>{const snap=await getDoc(doc(db,'fx_rates','ZAR_'+m.currency));return [m.currency,{rate:snap.data()?.rate??'',source:snap.data()?.source||'',updatedAt:snap.data()?.updatedAt,verified:false}]})).then(rows=>{if(live)setRates(Object.fromEntries(rows))}).catch(e=>live&&setRateError('Exchange rates could not load: '+e.message));return()=>{live=false}},[]);
 const state=Object.fromEntries(Object.keys(MARKETS).map(code=>[code,{...defaults.markets[code],...connection.data.markets?.[code]}]));
 const patch=(code,key,value)=>connection.setData(current=>({...current,markets:{...current.markets,[code]:{...state[code],[key]:value}}}));
 async function save(event){
  event.preventDefault();if(busy)return;setStatus('');
  const invalid=Object.values(state).some(value=>[value.shippingFee,value.freeFrom].some(n=>n!==''&&n!=null&&(!Number.isFinite(Number(n))||Number(n)<0))||value.checkout&&(!value.enabled||value.shippingFee===''||value.shippingFee==null));
  if(invalid){setStatus('Enter valid non-negative shipping amounts. Checkout requires an enabled market and a shipping fee.');return;}
  if(Object.values(rates).some(r=>r.verified&&(!Number.isFinite(Number(r.rate))||Number(r.rate)<=0||!r.source.trim()))){setStatus('Verified exchange rates need a positive amount and a source.');return;}
  setBusy(true);
  try{const clean=Object.fromEntries(Object.entries(state).map(([code,value])=>[code,{enabled:!!value.enabled,checkout:!!value.checkout,shippingFee:value.shippingFee===''||value.shippingFee==null?null:Number(value.shippingFee),freeFrom:value.freeFrom===''||value.freeFrom==null?null:Number(value.freeFrom)}]));const batch=writeBatch(db);batch.set(doc(db,'settings','markets'),{markets:clean,updatedAt:serverTimestamp()},{merge:true});Object.entries(rates).filter(([,r])=>r.verified).forEach(([currency,r])=>batch.set(doc(db,'fx_rates','ZAR_'+currency),{rate:Number(r.rate),source:r.source.trim(),updatedAt:serverTimestamp()},{merge:true}));await batch.commit();setRates(current=>Object.fromEntries(Object.entries(current).map(([c,r])=>[c,{...r,verified:false}])));setStatus('Market settings and verified rates saved.');}
  catch(error){setStatus('Save failed: '+error.message);}finally{setBusy(false);}
 }
 if(connection.loading||connection.error)return <AdminDataState {...connection}/>;
 return <form className="ra-panel" onSubmit={save}>
  <div className="ra-panel-head"><div><p className="ra-eyebrow">INTERNATIONAL COMMERCE</p><h2>Markets</h2></div><button disabled={busy}>{busy?'Saving…':'Save markets'}</button></div>
  <p>Control storefront availability and checkout by country. Shipping amounts are entered in ZAR and converted using verified exchange rates.</p>
  <div className="market-admin-grid">{Object.entries(MARKETS).map(([code,market])=><article className="market-admin-card" key={code}>
   <header><div><strong>{market.country}</strong><small>/{code} · {market.currency}</small></div><b>{code.toUpperCase()}</b></header>
   <label><input type="checkbox" checked={!!state[code].enabled} onChange={e=>{patch(code,'enabled',e.target.checked);if(!e.target.checked)connection.setData(current=>({...current,markets:{...current.markets,[code]:{...state[code],enabled:false,checkout:false}}}));}}/> Storefront enabled</label>
   <label><input type="checkbox" disabled={!state[code].enabled} checked={!!state[code].checkout} onChange={e=>patch(code,'checkout',e.target.checked)}/> Checkout enabled</label>
   <label>Shipping fee (ZAR)<input type="number" min="0" step=".01" value={state[code].shippingFee??''} onChange={e=>patch(code,'shippingFee',e.target.value)}/></label>
   <label>Free shipping from (ZAR)<input type="number" min="0" step=".01" value={state[code].freeFrom??''} onChange={e=>patch(code,'freeFrom',e.target.value)} placeholder="No threshold"/></label>
   {market.currency!=='ZAR'&&<fieldset><legend>{market.currency} pricing</legend><label>1 ZAR equals ({market.currency})<input type="number" min="0.000001" step="any" value={rates[market.currency]?.rate??''} onChange={e=>setRates(r=>({...r,[market.currency]:{...r[market.currency],rate:e.target.value,verified:false}}))}/></label><label>Rate source<input value={rates[market.currency]?.source||''} onChange={e=>setRates(r=>({...r,[market.currency]:{...r[market.currency],source:e.target.value,verified:false}}))}/></label><label><input type="checkbox" checked={!!rates[market.currency]?.verified} onChange={e=>setRates(r=>({...r,[market.currency]:{...r[market.currency],verified:e.target.checked}}))}/> I checked this rate against its source now</label><small>Verified rates expire after six hours. Missing or expired rates pause international pricing.</small></fieldset>}
  </article>)}</div>{rateError&&<p role="alert">{rateError}</p>}{status&&<p role="status" aria-live="polite">{status}</p>}
 </form>;
}
