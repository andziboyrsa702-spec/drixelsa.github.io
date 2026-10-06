import React from 'react';
import {productImages} from '../utils/productMedia.js';
export default function ProductMedia({product}){
 const images=productImages(product),name=product.name||product.title||'Product';
 return <div className={'dx-product-media'+(images[1]?' dx-double-view':'')}>{images[0]?<img className="dx-view-front" loading="lazy" decoding="async" src={images[0]} alt={name+' — front view'}/>:<span className="dx-image-placeholder">Image coming soon</span>}{images[1]&&<img className="dx-view-back" loading="lazy" decoding="async" src={images[1]} alt={name+' — back view'}/>}</div>;
}
