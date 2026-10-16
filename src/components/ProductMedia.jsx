import {imageAtWidth,responsiveImage} from '../utils/responsiveImage.js';
import React,{useState} from 'react';
import {productImages} from '../utils/productMedia.js';
export default function ProductMedia({product,color='',priority=false}){
 const images=productImages(product,color);
 return <Views key={JSON.stringify([product.id,color,...images])} images={images} name={product.name||product.title||'Product'} priority={priority}/>;
}
function Views({images,name,priority}){
 const [back,setBack]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 const canFlip=Boolean(images[1])&&!failed;
 return <><div className={'dx-product-media'+(canFlip?' dx-double-view':'')+(back&&ready?' dx-show-back':'')}
 onPointerEnter={e=>{if(e.pointerType!=='touch')setBack(true)}} onPointerLeave={()=>setBack(false)}
 onPointerDown={e=>{if(e.pointerType==='touch')setBack(true)}} onPointerUp={e=>{if(e.pointerType==='touch')setBack(false)}} onPointerCancel={()=>setBack(false)}>
 {images[0]?<img key={images[0]} className="dx-view-front" loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async" {...responsiveImage(images[0])} src={imageAtWidth(images[0],1200)} alt={name+' — front view'}/>:<span className="dx-image-placeholder">Image coming soon</span>}
 {canFlip&&<img key={images[1]} className={'dx-view-back'+(ready?' dx-back-ready':'')} loading={priority?'eager':'lazy'} decoding="async" {...responsiveImage(images[1])} src={imageAtWidth(images[1],1200)} onLoad={()=>setReady(true)} onError={()=>{setFailed(true);setBack(false)}} alt={name+' — back view'}/>}
 </div>{priority&&canFlip&&<div className="dx-photo-controls" aria-label="Product photo view"><button type="button" aria-pressed={!back} onClick={()=>setBack(false)}>Front view</button><button type="button" aria-pressed={back} onClick={()=>setBack(true)}>Back view</button></div>}</>;
}
