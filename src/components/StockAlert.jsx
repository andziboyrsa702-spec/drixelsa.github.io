import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import {customerService} from '../services/customerService.js';
import {variantRows} from '../utils/productSchema.js';
export default function StockAlert({product,market}){
 const user=useAuth(),options=variantRows(product).filter(v=>Number(v.stock??v.quantity??0)<=0),[sku,setSku]=useState(options[0]?.sku||''),[watches,setWatches]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false);
 const load=()=>customerService('/api/customer/stock-alerts',{action:'status',productId:product.id}).then(d=>{if(!Array.isArray(d.watches))throw Error('Stock alerts are temporarily unavailable.');setWatches(d.watches)});
 useEffect(()=>{setWatches([]);if(user&&options.length&&market==='za')load().catch(e=>setMessage(e.message))},[user?.uid,product.id,market]);
 if(!options.length||market!=='za')return null;const watching=watches.some(x=>x.sku===sku);
 async function submit(e){e.preventDefault();setBusy(true);setMessage('');try{await customerService('/api/customer/stock-alerts',{action:watching?'cancel':'watch',productId:product.id,sku,consent:'stock-alerts-v1'});await load();setMessage(watching?'Alert cancelled.':'We will email you once if this option returns within 30 days.')}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 return <section className="dx-service-panel"><h3>Waiting for your size?</h3>{!user?<p><Link to={'/'+market+'/member/login'}>Sign in</Link> to request a stock alert.</p>:<form onSubmit={submit}><label>Sold-out option<select value={sku} onChange={e=>{setSku(e.target.value);setConsent(false);setMessage('')}}>{options.map((v,i)=><option key={v.sku||i} value={v.sku||''}>{[v.color,v.size].filter(Boolean).join(' · ')||'This product'}</option>)}</select></label>{!watching&&<label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Email my verified account address once when this option is back. Alerts expire after 30 days; unsubscribe anytime.</label>}<button disabled={busy||!watching&&!consent}>{busy?'Saving…':watching?'Cancel stock alert':'Notify me'}</button></form>}{message&&<p role="status">{message}</p>}</section>;
}
