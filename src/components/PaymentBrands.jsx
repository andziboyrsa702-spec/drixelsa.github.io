import React,{useEffect,useState} from 'react';
import {apiUrl} from '../utils/api.js';
import './PaymentBrands.css';
const providers=[['payfast','Payfast'],['yoco','Yoco'],['snapscan','SnapScan']];
export default function PaymentBrands({config,market='za',includeTest=false}){
 const [publicConfig,setPublicConfig]=useState(null);
 useEffect(()=>{if(config!==undefined)return;const controller=new AbortController();fetch(apiUrl('/api/payments/config'),{signal:controller.signal}).then(r=>r.ok?r.json():null).then(setPublicConfig).catch(()=>{});return()=>controller.abort();},[config]);
 const available=config===undefined?publicConfig:config;
 const brands=market==='za'?providers.filter(([key])=>available?.[key]?.enabled&&(includeTest||!['test','sandbox'].includes(available[key].mode))):[];
 if(!brands.length&&!available?.bank?.enabled)return null;
 return <div className="dx-payment-brands" aria-label="Accepted payment providers"><p>Payment options</p><div className="dx-payment-brand-list">{brands.map(([key,label])=><span className="dx-payment-brand" key={key}><img src={'/assets/payments/'+key+'.png'} alt={label} width="120" height="40"/>{['test','sandbox'].includes(available[key].mode)&&<small>Test mode</small>}</span>)}{available?.bank?.enabled&&<span className="dx-payment-brand dx-payment-eft">Bank transfer · EFT</span>}</div></div>;
}
