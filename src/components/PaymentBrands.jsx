import React,{useEffect,useState} from 'react';
import {apiUrl} from '../utils/api.js';
import './PaymentBrands.css';
const methods=[
 ['payfast','Payfast'],['yoco','Yoco'],['visa','Visa'],['mastercard','Mastercard'],['amex','American Express'],
 ['apple-pay','Apple Pay'],['google-pay','Google Pay'],['snapscan','SnapScan']
];
const labels=Object.fromEntries(methods);
export function PaymentBrandMarks({brands=[]}){
 const visible=brands.filter(id=>labels[id]);
 if(!visible.length)return null;
 return <span className="dx-payment-choice-brands" aria-label={'Accepted payment methods: '+visible.map(id=>labels[id]).join(', ')}>{visible.map(id=><img key={id} src={'/assets/payments/'+id+'.png'} alt={labels[id]} title={labels[id]} loading="lazy" width="54" height="24"/>)}</span>;
}
export default function PaymentBrands({market='za'}){
 const [config,setConfig]=useState(null);
 useEffect(()=>{const controller=new AbortController();fetch(apiUrl('/api/payments/config'),{signal:controller.signal}).then(r=>r.ok?r.json():null).then(setConfig).catch(()=>{});return()=>controller.abort();},[]);
 if(!config||market!=='za')return null;
 const cardWallets=(config.payfast?.enabled&&config.payfast.mode==='live')||(config.yoco?.enabled&&config.yoco.mode==='live');
 const enabled=methods.filter(([id])=>{
   if(id==='payfast')return config.payfast?.enabled&&config.payfast.mode==='live';
   if(id==='yoco')return config.yoco?.enabled&&config.yoco.mode==='live';
   if(['visa','mastercard','amex','apple-pay','google-pay'].includes(id))return cardWallets;
   if(id==='snapscan')return config.snapscan?.enabled;
   return false;
 });
 if(!enabled.length)return null;
 return <div className="dx-payment-brands" aria-label={'Accepted payment methods: '+enabled.map(([,label])=>label).join(', ')}><div className="dx-payment-brand-list">{enabled.map(([id,label])=><img key={id} src={'/assets/payments/'+id+'.png'} alt={label} title={label} loading="lazy" width="72" height="32"/>)}</div></div>;
}
