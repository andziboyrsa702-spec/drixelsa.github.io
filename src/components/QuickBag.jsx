import React,{useEffect,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {productById} from '../services/catalogue-react.js';
import {useMarket} from '../context/MarketContext.jsx';
import {useCart} from '../context/CartContext.jsx';
import {productOptions,selectedVariant,optionStock} from '../utils/productOptions.js';
import {productImages,productPrice} from '../utils/productMedia.js';
import {productPath} from '../utils/urls.js';
import {imageAtWidth} from '../utils/responsiveImage.js';

export default function QuickBag({productId,onClose}){
 const dialog=useRef(),submitted=useRef(false),[p,setP]=useState(null),[error,setError]=useState(''),[color,setColor]=useState(''),[size,setSize]=useState(''),{market,money}=useMarket(),cart=useCart(),nav=useNavigate();
 useEffect(()=>{const el=dialog.current,previous=document.activeElement;el.showModal();return()=>{el.close();previous?.focus()};},[]);
 useEffect(()=>{let live=true;productById(productId,market).then(x=>{if(live)setP(x)}).catch(()=>{if(live)setError('This product could not be loaded. Please close this window and try again.');});return()=>{live=false}},[productId,market]);
 const options=productOptions(p||{},color),variant=selectedVariant(p||{},size,color),incomplete=Boolean((options.colors.length&&!color)||(productOptions(p||{}).sizes.length&&!size));
 const stock=p?optionStock(p,variant):0,sku=variant?.sku||p?.sku||'',inBag=cart.items.filter(x=>x.productId===productId&&x.sku===sku&&x.size===(variant?.size||size)&&x.color===(variant?.color||color)).reduce((n,x)=>n+x.quantity,0);
 const unavailable=!p||(options.variants.length&&!variant)||stock<=inBag,deliveryUnavailable=p?.availableMarkets?.length&&!p.availableMarkets.includes(market);
 const add=()=>{if(submitted.current||incomplete||unavailable||deliveryUnavailable)return;submitted.current=true;const ok=cart.add({productId:p.id,name:p.name||p.title,image:productImages(p,color)[0],price:productPrice(p,variant),sku,size:variant?.size||size,color:variant?.color||color});if(!ok){submitted.current=false;setError('Unable to add this product. Please open its full details and try again.');return;}onClose();nav(`/${market}/cart`)};
 return <dialog className="dx-quick-dialog" ref={dialog} aria-labelledby="quick-bag-title" onCancel={onClose} onClick={e=>{if(e.target===dialog.current){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose()}}}>
  <header><div><p>QUICK ADD</p><h2 id="quick-bag-title">{p?.name||p?.title||'Choose your product'}</h2></div><button type="button" className="dx-quick-close" aria-label="Close quick add" onClick={onClose}>×</button></header>
  {!p&&!error&&<p role="status">Checking available sizes and colours…</p>}
  {p&&<>
   <div className="dx-quick-summary">{productImages(p,color)[0]&&<img src={imageAtWidth(productImages(p,color)[0],480)} alt={(p.name||p.title)+' — selected colour'}/>}<div><strong>{money(productPrice(p,variant))}</strong><Link to={productPath(p,market)} onClick={onClose}>View full product details</Link></div></div>
   {options.colors.length>0&&<fieldset><legend>Choose colour</legend><div className="dx-options">{options.colors.map(c=><button key={c} type="button" aria-pressed={color===c} className={color===c?'active':''} disabled={options.variants.length>0&&!options.variants.some(v=>v.color===c&&optionStock(p,v)>0)} onClick={()=>{setColor(c);setSize('');setError('')}}>{c}</button>)}</div></fieldset>}
   {productOptions(p).sizes.length>0&&<fieldset><legend>Choose size</legend><div className="dx-options">{options.sizes.map(s=><button key={s} type="button" aria-pressed={size===s} className={size===s?'active':''} disabled={options.variants.length>0&&!options.variants.some(v=>(!color||v.color===color)&&v.size===s&&optionStock(p,v)>0)} onClick={()=>{setSize(s);setError('')}}>{s}</button>)}</div></fieldset>}
   <p role="status">{deliveryUnavailable?'Delivery is unavailable for this product in your country.':incomplete?'Choose the available options to continue.':unavailable?(stock>0?'All available units of this option are already in your bag.':'This option is sold out.'):'Ready to add to your bag.'}</p>
   <button className="dx-add" type="button" aria-label="Add to bag" disabled={incomplete||unavailable||Boolean(deliveryUnavailable)} onClick={add}>Add to bag</button>
  </>}
  {error&&<p role="alert">{error}</p>}
 </dialog>;
}
