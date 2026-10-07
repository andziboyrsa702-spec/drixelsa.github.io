import ProductMedia from '../components/ProductMedia.jsx';
import {productImages,productPrice} from '../utils/productMedia.js';
import {productOptions,selectedVariant,optionStock} from '../utils/productOptions.js';
import React,{useEffect,useState} from 'react';
import {useParams,useNavigate} from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import {productByCode} from '../services/catalogue-react.js';
import {useCart} from '../context/CartContext.jsx';
import {productPath,routesFor} from '../utils/urls.js';
import {useMarket} from '../context/MarketContext.jsx';
import Seo from '../components/Seo.jsx';
import {useWishlist} from '../context/WishlistContext.jsx';
export default function Product(){
 const {market,money}=useMarket(),routes=routesFor(market),{productCode}=useParams(),nav=useNavigate(),cart=useCart(),wishlist=useWishlist();
 const [p,setP]=useState(),[size,setSize]=useState(''),[color,setColor]=useState(''),[addError,setAddError]=useState('');
 useEffect(()=>{let live=true;setP(undefined);setSize('');setColor('');setAddError('');productByCode(productCode,market).then(x=>{if(!live)return;setP(x);const canonical=productPath(x,market);if(location.pathname!==canonical)nav(canonical,{replace:true})}).catch(()=>{if(live)nav(`/${market}/404`,{replace:true})});return()=>{live=false}},[productCode,market,nav]);
 if(!p)return <Layout><div className="dx-empty">Loading product…</div></Layout>;
 const {variants,colors,sizes}=productOptions(p,color),variant=selectedVariant(p,size,color),needsColor=colors.length>0,needsSize=productOptions(p).sizes.length>0;
 const incomplete=(needsColor&&!color)||(needsSize&&!size),sold=variants.length?(!incomplete&&(!variant||optionStock(p,variant)<=0)):optionStock(p)<=0;
 const add=()=>{if(incomplete||sold)return;const added=cart.add({productId:p.id,name:p.name||p.title,image:productImages(p,color)[0],price:productPrice(p,variant),sku:variant?.sku||p.sku||'',size:variant?.size||size,color:variant?.color||color});if(!added){setAddError('This product could not be added. Please reload the product or contact us.');return;}setAddError('');nav(routes.cart)};
 return <Layout><Seo title={(p.name||p.title||'Product')+' | Drixel'} description={p.seoDescription||p.description||'Drixel product.'} product={p}/><main className="dx-pdp"><div className="dx-pdp-images"><ProductMedia product={p} color={color}/><p className="dx-product-view-hint">Hover for the back view. On touch screens, view the back photo below.</p>{productImages(p,color).slice(1).map((x,i)=><img key={color+'-'+i} src={x} alt={(p.name||p.title)+' — '+(color||p.mainColor||'')+(i===0?' back view':' detail view')}/>)}</div><section className="dx-pdp-info"><p>{p.category}</p><h1>{p.name||p.title}</h1><div className="dx-pdp-price">{money(productPrice(p,variant))}</div><p className="dx-pdp-description">{p.description}</p>{needsColor&&<fieldset className="dx-variant-field"><legend>Colour{color?' · '+color:' · Choose a colour'}</legend><div className="dx-options">{colors.map(x=>{const unavailable=variants.length&&!variants.some(v=>v.color===x&&optionStock(p,v)>0);return <button type="button" disabled={unavailable} aria-pressed={color===x} className={color===x?'active':''} onClick={()=>{setColor(x);if(variants.length&&!variants.some(v=>v.color===x&&v.size===size&&optionStock(p,v)>0))setSize('')}} key={x}>{x}{unavailable?' · Sold out':''}</button>})}</div></fieldset>}{needsSize&&<fieldset className="dx-variant-field"><legend>Size{size?' · '+size:' · Choose a size'}</legend><div className="dx-options">{sizes.map(x=>{const unavailable=variants.length&&!variants.some(v=>(!color||v.color===color)&&v.size===x&&optionStock(p,v)>0);return <button type="button" disabled={unavailable} aria-pressed={size===x} className={size===x?'active':''} onClick={()=>setSize(x)} key={x}>{x}{unavailable?' · Sold out':''}</button>})}</div></fieldset>}{incomplete&&<p role="status">Choose {needsColor&&!color&&needsSize&&!size?'a colour and size':needsColor&&!color?'a colour':'a size'} before adding to your bag.</p>}<button className="dx-wishlist" onClick={()=>wishlist.toggle(p)}>{wishlist.has(p.id)?'Saved':'Save to wishlist'}</button>{addError&&<p className="dx-error" role="alert">{addError}</p>}<button className="dx-add" onClick={add} disabled={incomplete||sold}>{sold?'Sold out':'Add to bag'}</button></section></main></Layout>
}
