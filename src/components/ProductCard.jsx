import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {useMarket} from '../context/MarketContext.jsx';
import {productPath} from '../utils/urls.js';
import {productImages,hasBackView} from '../utils/productMedia.js';
import {imageAtWidth} from '../utils/responsiveImage.js';
import ProductMedia from './ProductMedia.jsx';
import QuickBag from './QuickBag.jsx';
export default function ProductCard({product:p}){
 const {market,money}=useMarket(),[open,setOpen]=useState(false),images=productImages(p),name=p.name||p.title;
 return <article className="dx-product-card dx-quick-card"><div className="dx-card-photo"><Link to={productPath(p,market)} aria-label={'View '+name}><ProductMedia product={p} catalogue/>{hasBackView(p)&&images[1]&&<><span className="dx-card-view-label"><span className="dx-desktop-view">Front / hover for back</span><span className="dx-touch-view">Back design</span></span><span className="dx-card-inset"><img className="dx-desktop-view" loading="lazy" width="160" height="160" src={imageAtWidth(images[1],480)} alt={name+' — back detail'}/><img className="dx-touch-view" loading="lazy" width="160" height="160" src={imageAtWidth(images[0],480)} alt={name+' — front detail'}/><span className="dx-desktop-view">Back</span><span className="dx-touch-view">Front</span></span></>}</Link><button type="button" className="dx-quick-bag-button" aria-label={'Choose size and colour for '+name} aria-haspopup="dialog" onClick={()=>setOpen(true)}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2M9 14h6M12 11v6"/></svg></button></div><Link to={productPath(p,market)} className="dx-product-copy"><div><h2>{name}</h2><p>{p.category}</p></div><strong>{money(p.price)}</strong></Link>{open&&<QuickBag productId={p.id} onClose={()=>setOpen(false)}/>}</article>;
}
