// Transform only unsigned, versioned Cloudinary originals. Other hosts and signed assets stay intact.
export function imageAtWidth(src,width){
 try{const u=new URL(src);if(u.protocol==='https:'&&u.hostname==='res.cloudinary.com'&&/\/image\/upload\/v\d+\//.test(u.pathname)){
  u.pathname=u.pathname.replace('/image/upload/',`/image/upload/f_auto,q_auto,c_limit,w_${width}/`);return u.href;
 }}catch{}return src;
}
export function responsiveImage(src){return imageAtWidth(src,480)===src?{}:{srcSet:[480,800,1200].map(w=>`${imageAtWidth(src,w)} ${w}w`).join(', '),sizes:'(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 600px'};}
