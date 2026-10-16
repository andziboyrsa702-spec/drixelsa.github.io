export function productImages(product={},color='') {
 const rows=Array.isArray(product.colorImages)?product.colorImages:[];
 const chosen=color||product.mainColor;
 const row=rows.find(x=>String(x.color||'').toLowerCase()===String(chosen||'').toLowerCase());
 const source=row||product;
 // Explicit views supersede the legacy image list, which may contain replaced designs.
 const gallery=Array.isArray(source.galleryImages)?source.galleryImages:source.frontImage||source.backImage?[]:(source.images||[]);
 const list=color&&rows.length&&!row?[]:[source.frontImage||source.image,source.backImage,...gallery];
 return [...new Set(list.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))];
}
export function productPrice(product={},variant){
 const override=variant?.price;
 return Number(override!==''&&override!=null?override:product.price);
}
