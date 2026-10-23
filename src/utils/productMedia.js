export function productImages(product={},color='') {
 const rows=Array.isArray(product.colorImages)?product.colorImages:[];
 const chosen=color||product.mainColor;
 const row=rows.find(x=>String(x.color||'').toLowerCase()===String(chosen||'').toLowerCase());
 const source=row||product;
 // Explicit views supersede the legacy image list, which may contain replaced designs.
 const gallery=Array.isArray(source.galleryImages)?source.galleryImages:source.frontImage||source.backImage?[]:(source.images||[]);
 if(product.showBackView===false){
  const front=source.frontImage||source.image||source.images?.[0];
  return typeof front==='string'&&front.trim()?[front.trim()]:[];
 }
 const list=color&&rows.length&&!row?[]:[source.frontImage||source.image,source.backImage,...gallery];
 return [...new Set(list.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))];
}
export function hasBackView(product={},color=''){
 if(product.showBackView===false)return false;
 const rows=Array.isArray(product.colorImages)?product.colorImages:[];
 const chosen=color||product.mainColor;
 const row=rows.find(x=>String(x.color||'').toLowerCase()===String(chosen||'').toLowerCase());
 if(color&&rows.length&&!row)return false;
 const source=row||product;
 // Existing legacy photo lists can still contain a separate back view.
 return Boolean(source.backImage||(!source.frontImage&&source.image&&source.images?.length));
}
export function productPrice(product={},variant){
 const override=variant?.price;
 return Number(override!==''&&override!=null?override:product.price);
}
