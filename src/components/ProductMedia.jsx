import {imageAtWidth,responsiveImage} from '../utils/responsiveImage.js';
import React from 'react';
import {productImages} from '../utils/productMedia.js';
export default function ProductMedia({product,color='',priority=false}){
 const images=productImages(product,color),name=product.name||product.title||'Product';
 return <div className={'dx-product-media'+(images[1]?' dx-double-view':'')}>{images[0]?<img className="dx-view-front" loading={priority?"eager":"lazy"} fetchPriority={priority?"high":"auto"} decoding="async" {...responsiveImage(images[0])} src={imageAtWidth(images[0],1200)} alt={name+' — front view'}/>:<span className="dx-image-placeholder">Image coming soon</span>}{images[1]&&<img className="dx-view-back" loading="lazy" decoding="async" {...responsiveImage(images[1])} src={imageAtWidth(images[1],1200)} alt={name+' — back view'}/>}</div>;
}
