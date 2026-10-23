import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildDrixelRoom,disposeDrixelRoom,STATIONS} from '../studio/Room.ts';
import Layout from '../components/Layout.jsx';
import Seo from '../components/Seo.jsx';
import useCatalogue from '../hooks/useCatalogue.js';
import { useMarket } from '../context/MarketContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { productImages, productPrice, hasBackView } from '../utils/productMedia.js';
import { productOptions, selectedVariant, optionStock } from '../utils/productOptions.js';
import { productPath } from '../utils/urls.js';
import { imageAtWidth } from '../utils/responsiveImage.js';

const SPACING = 1.82;
const RAIL_Y=2.53;
const DISPLAY_HEIGHT=1.97;
// Edge-connected matte removal only. Interior whites (including white fabric
// and DRIXEL printing) are never flood-filled.
function cleanGarmentTexture(texture){
 const src=texture.image,w=src?.naturalWidth||src?.width,h=src?.naturalHeight||src?.height;
 if(!w||!h)return texture;
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)return texture;
 try {
  ctx.drawImage(src,0,0,w,h);
  const pixels=ctx.getImageData(0,0,w,h),data=pixels.data;
  const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
  const background=i=>{const k=i*4;const r=data[k],g=data[k+1],b=data[k+2];return data[k+3]<12||(Math.min(r,g,b)>223&&Math.max(r,g,b)-Math.min(r,g,b)<19)};
  const add=i=>{if(!seen[i]&&background(i)){seen[i]=1;queue[tail++]=i}};
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}
  for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
  while(head<tail){
    const i=queue[head++],k=i*4;
    data[k+3]=0; // Only background connected to an image edge is removed.
    const x=i%w,y=(i/w)|0;
    if(x>0)add(i-1);if(x<w-1)add(i+1);if(y>0)add(i-w);if(y<h-1)add(i+w);
  }
  ctx.putImageData(pixels,0,0);
  const result=new THREE.CanvasTexture(canvas);
  result.colorSpace=THREE.SRGBColorSpace;
  result.premultiplyAlpha=true;
  return result;
 }catch{return texture} // Cross-origin images may not allow pixel access.
}

const fixtureKind=p=>/cap|hat|beanie/i.test([p?.category,p?.name].join(' '))?'caps':/bag|tote|backpack/i.test([p?.category,p?.name].join(' '))?'bags':/shoe|sneaker/i.test([p?.category,p?.name].join(' '))?'shoes':'clothing';
const fixturePosition=(p,index,products=[])=>{
 const kind=fixtureKind(p),base={clothing:0,caps:5.8,bags:4.75,shoes:-5.5}[kind];
 // Display index counts only this department, so unrelated categories never
 // displace garments or stack items on top of one another.
 const local=products.slice(0,index).filter(item=>fixtureKind(item)===kind).length;
 const capacity=kind==='clothing'?8:6,slot=local%capacity;
 return {kind,x:base+(slot-(capacity-1)/2)*(kind==='clothing'?0.78:0.36),z:kind==='caps'?-0.85:-3.12};
};
const categoryLabel = value => String(value || 'Collection').replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const productName = product => product?.name || product?.title || 'Drixel original';

function makeRule(parent, points, color = 0xaaa69e, opacity = 0.75) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(point => new THREE.Vector3(...point)));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const line = new THREE.Line(geometry, material);
  parent.add(line);
  return line;
}

function disposeGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    child.traverse?.(object => {
      object.geometry?.dispose?.();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach(material => {
        material.map?.dispose?.();
        material.dispose?.();
      });
    });
  }
}

function ShowroomScene({ products, activeIndex, imageFor, onSelect, onWebglError }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const renderRef = useRef(null);
  const targetXRef = useRef(0);
  const cameraTargetRef=useRef(0);
  const focusRef=useRef({x:0,z:6.5});
  const onSelectRef = useRef(onSelect);
  const animateRef = useRef(null);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    } catch {
      onWebglError(true);
      return undefined;
    }
    onWebglError(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xf9f8f5, 1);
    renderer.domElement.className = 'dx-virtual-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.touchAction = 'pan-y';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3efe7);
    scene.fog = new THREE.Fog(0xf3efe7, 14, 30);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
    camera.position.set(...STATIONS.store.position);
    camera.lookAt(...STATIONS.store.look);

    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.0;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const room=buildDrixelRoom();
    scene.add(room);
    const items = new THREE.Group();
    scene.add(items);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const render = () => renderer.render(scene, camera);
    renderRef.current = render;
    sceneRef.current = { scene, items, camera, renderer };
    // Debug-only orbit lets designers inspect the entire volumetric interior.
    const orbitDebug=new URLSearchParams(location.search).get('studioDebug')==='1';
    let orbit=null,orbitFrame=0;
    if(orbitDebug){
      orbit=new OrbitControls(camera,renderer.domElement);
      camera.position.set(0,2.4,4.2);
      orbit.target.set(0,1.8,-1.5);
      orbit.enableDamping=true;orbit.dampingFactor=0.08;
      orbit.minDistance=1.2;orbit.maxDistance=12;
      orbit.update();
      const inspect=()=>{orbit.update();render();orbitFrame=requestAnimationFrame(inspect)};
      orbitFrame=requestAnimationFrame(inspect);
    }
    let frame=0;
    let tweenStart=0;
    const from=new THREE.Vector3(),to=new THREE.Vector3();
    const lookFrom=new THREE.Vector3(),lookTo=new THREE.Vector3();
    const currentLook=new THREE.Vector3(...STATIONS.store.look);
    const animate=(now)=>{
      const progress=Math.min(1,(now-tweenStart)/1350);
      const eased=progress<0.5?4*progress*progress*progress:1-Math.pow(-2*progress+2,3)/2;
      camera.position.lerpVectors(from,to,eased);
      currentLook.lerpVectors(lookFrom,lookTo,eased);
      camera.lookAt(currentLook);
      render();
      if(progress<1)frame=window.requestAnimationFrame(animate);
      else frame=0;
    };
    animateRef.current=()=>{
      if(orbitDebug)return;
      if(frame)window.cancelAnimationFrame(frame);
      from.copy(camera.position);
      lookFrom.copy(currentLook);
      const target=focusRef.current;
      to.set(target.x,1.70,target.z);
      lookTo.set(target.x,1.60,target.lookZ??-3.6);
      tweenStart=performance.now();
      frame=window.requestAnimationFrame(animate);
    };
    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov=width<600?55:49;
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    const pointerDown = event => { if(orbitDebug)return; mount.setPointerCapture?.(event.pointerId); mount.dataset.startX = String(event.clientX); mount.dataset.startY = String(event.clientY); };
    const pointerUp = event => {
      if(orbitDebug)return;
      const startX = Number(mount.dataset.startX || event.clientX);
      const startY = Number(mount.dataset.startY || event.clientY);
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) {
        const current = Number(mount.dataset.activeIndex || 0);
        onSelectRef.current(Math.max(0, Math.min(products.length - 1, current + (dx < 0 ? 1 : -1))));
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(items.children, true).find(intersection => Number.isInteger(intersection.object.userData.productIndex));
      if (hit) onSelectRef.current(hit.object.userData.productIndex);
    };
    mount.addEventListener('pointerdown', pointerDown);
    mount.addEventListener('pointerup', pointerUp);

    const onVisibility = () => { if (document.visibilityState === 'visible') render(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(orbitFrame);
      orbit?.dispose();
      observer.disconnect();
      mount.removeEventListener('pointerdown', pointerDown);
      mount.removeEventListener('pointerup', pointerUp);
      document.removeEventListener('visibilitychange', onVisibility);
      disposeGroup(items);
      disposeDrixelRoom(room);
      scene.traverse(object => {
        if (object.parent !== items) {
          object.geometry?.dispose?.();
          const mats = Array.isArray(object.material) ? object.material : [object.material];
          mats.filter(Boolean).forEach(material => { material.map?.dispose?.(); material.dispose?.(); });
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      renderRef.current = null;
      animateRef.current = null;
    };
  }, [onWebglError, products.length]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    const { items } = state;
    state.textureGeneration = (state.textureGeneration || 0) + 1;
    const textureGeneration = state.textureGeneration;
    disposeGroup(items);
    const focusedKind=fixtureKind(products[activeIndex]||products[0]);
    const focusedRank=products.slice(0,activeIndex).filter(p=>fixtureKind(p)===focusedKind).length;
    const activePage=Math.floor(focusedRank/(focusedKind==='clothing'?8:6));
    const loader=new THREE.TextureLoader();
    const departmentSeen={clothing:0,caps:0,bags:0,shoes:0};
    for(let index=0;index<products.length;index+=1){
      const product=products[index],kind=fixtureKind(product);
      const rank=departmentSeen[kind]++;
      const capacity=kind==='clothing'?8:6;
      const page=Math.floor(rank/capacity);
      // Never stack successive pages of catalogue items in the same rail slots.
      if(page!==(kind===focusedKind?activePage:0))continue;
      const entry = new THREE.Group();
      const placement=fixturePosition(product,index,products);
      entry.position.set(placement.x,0,placement.z+(index===activeIndex?0.25:0));
      entry.scale.setScalar(index === activeIndex ? 1.01 : 0.91);
      entry.userData.productIndex = index;
      // The garment hangs freely in the room. Source photographs are cut out on the GPU
      // (white/light studio backgrounds become transparent), not placed inside picture frames.
      const url = imageFor(product, index === activeIndex);
      if (url) {
        loader.load(imageAtWidth(url, 900), texture => {
          if (sceneRef.current !== state || state.textureGeneration !== textureGeneration) { texture.dispose(); return; }
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.premultiplyAlpha=true;
          const alphaTexture=cleanGarmentTexture(texture);
          texture.anisotropy = Math.min(state.renderer.capabilities.getMaxAnisotropy(), 4);
          const source = texture.image;
          const ratio = source?.naturalWidth && source?.naturalHeight ? source.naturalWidth/source.naturalHeight : 0.77;
          const imageHeight=placement.kind==='clothing'?DISPLAY_HEIGHT:placement.kind==='bags'?1.15:0.70, imageWidth=Math.min(placement.kind==='clothing'?1.62:1.12,imageHeight*ratio);
          const garmentMaterial=new THREE.MeshBasicMaterial({
            map:alphaTexture,transparent:true,depthWrite:false,side:THREE.DoubleSide,
            opacity:index===activeIndex?1:0.72,alphaTest:0.015,toneMapped:false
          });
          const plane=new THREE.PlaneGeometry(imageWidth,imageHeight);
          plane.translate(0,-imageHeight/2,0); // Top-center pivot: no vertical mismatch.
          const garment=new THREE.Mesh(plane,garmentMaterial);
          garment.position.set(0,placement.kind==='clothing'?RAIL_Y-0.27:placement.kind==='bags'?2.75:3.08,0.10);
          garment.userData.productIndex=index;
          entry.add(garment);
          renderRef.current?.();
        }, undefined, () => renderRef.current?.());
      }
      if(placement.kind==='clothing'){
        // Exactly one joined hanger silhouette, one integrated hook.
        // The triangle's lower bar touches the top edge of the garment.
        makeRule(entry,[
          [0,RAIL_Y-0.01,0.01],[0.07,RAIL_Y-0.12,0.01],
          [0.02,RAIL_Y-0.23,0.01],[-0.43,RAIL_Y-0.27,0.01],
          [0.43,RAIL_Y-0.27,0.01],[0.02,RAIL_Y-0.23,0.01]
        ],0x817b70,0.75);
      }
      // A soft contact shadow, separated from the alpha garment photo.
      const shadowCanvas=document.createElement('canvas');shadowCanvas.width=64;shadowCanvas.height=64;
      const sc=shadowCanvas.getContext('2d');
      const radial=sc.createRadialGradient(32,32,1,32,32,31);
      radial.addColorStop(0,'rgba(40,35,29,.20)');radial.addColorStop(1,'rgba(40,35,29,0)');
      sc.fillStyle=radial;sc.fillRect(0,0,64,64);
      const shadowMap=new THREE.CanvasTexture(shadowCanvas);
      const contact=new THREE.Mesh(new THREE.PlaneGeometry(1.4,0.65),
        new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,opacity:index===activeIndex?1:0.65}));
      contact.rotation.x=-Math.PI/2;contact.position.set(0,0.004,0.15);
      entry.add(contact);
      items.add(entry);
    }
    const place=fixturePosition(products[activeIndex]||products[0],activeIndex,products);
    focusRef.current={x:place.x,z:activeIndex===0?6.5:3.2,lookZ:place.kind==='caps'?-0.9:-3.6};
    const mount = mountRef.current;
    if (mount) mount.dataset.activeIndex = String(activeIndex);
    animateRef.current?.();
    renderRef.current?.();
  }, [products, activeIndex, imageFor]);

  return <div className="dx-virtual-stage" ref={mountRef} aria-hidden="true" />;
}

export default function VirtualStore() {
  const { market, money } = useMarket();
  const cart = useCart();
  const { list, loading, error, retry } = useCatalogue(market);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [backView, setBackView] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const [notice, setNotice] = useState('');
  const [detailOpen,setDetailOpen]=useState(false);
  const [added,setAdded]=useState(false);
  const detailRef=useRef(null);
  const deepLinkApplied=useRef(false);
  const noticeTimer = useRef(null);
  const categories = useMemo(() => [...new Map(list.map(product => String(product.category || '').trim()).filter(Boolean).map(name=>[name.toLowerCase(),name])).values()].sort((a, b) => a.localeCompare(b)), [list]);
  const visibleProducts = useMemo(() => list.filter(product => {
    const categoryMatches = category === 'all' || String(product.category || '').toLowerCase() === category.toLowerCase();
    const words = [product.name, product.title, product.category, product.description].join(' ').toLowerCase();
    return categoryMatches && words.includes(query.trim().toLowerCase());
  }), [list, category, query]);
  const safeIndex = Math.min(activeIndex, Math.max(visibleProducts.length - 1, 0));
  const product = visibleProducts[safeIndex];
  const options = useMemo(() => productOptions(product || {}, color), [product, color]);
  const variant = useMemo(() => selectedVariant(product || {}, size, color), [product, size, color]);
  const colorOptions = productOptions(product || {}).colors;
  const allSizes = productOptions(product || {}).sizes;
  const missingOptions = Boolean((options.colors.length && !color) || (allSizes.length && !size));
  const stock = product ? optionStock(product, variant) : 0;
  const sku = variant?.sku || product?.sku || '';
  const inBag = product ? cart.items.filter(item => item.productId === product.id && item.sku === sku && item.size === (variant?.size || size) && item.color === (variant?.color || color)).reduce((total, item) => total + item.quantity, 0) : 0;
  const unavailable = !product || Boolean(options.variants.length && !variant) || stock <= inBag;
  const deliveryUnavailable = Boolean(product?.availableMarkets?.length && !product.availableMarkets.includes(market));
  const selectedImages = useMemo(() => productImages(product || {}, color), [product, color]);
  const canShowBack = product ? hasBackView(product, color) && selectedImages.length > 1 : false;
  const shownImage = canShowBack && backView ? selectedImages[1] : selectedImages[0];
  const imageFor = useCallback((item, isSelected) => {
    const imgs = productImages(item || {}, isSelected ? color : '');
    return isSelected && backView && hasBackView(item || {}, color) ? imgs[1] || imgs[0] : imgs[0];
  }, [color, backView]);

  useEffect(() => { setActiveIndex(0); setColor(''); setSize(''); setBackView(false);setDetailOpen(false); }, [category, query, market]);
  useEffect(()=>{
    if(deepLinkApplied.current||loading||!list.length)return;
    deepLinkApplied.current=true;
    const params=new URLSearchParams(window.location.search);
    const station=params.get('station'),handle=params.get('product');
    const match=categories.find(x=>x.toLowerCase()===String(station||'').toLowerCase());
    if(match)setCategory(match);
    const chosen=list.findIndex(x=>[x.id,x.sku,x.slug,x.urlCode].some(v=>String(v||'')===handle));
    if(chosen>=0){
      const selected=list[chosen];setCategory(selected.category||'all');
      const same=list.filter(x=>String(x.category||'').toLowerCase()===String(selected.category||'').toLowerCase());
      setActiveIndex(Math.max(0,same.findIndex(x=>x.id===selected.id)));
      setDetailOpen(true);
    }
  },[list,loading,categories]);
  useEffect(()=>{if(detailOpen)detailRef.current?.focus()},[detailOpen,product?.id]);
  useEffect(()=>{
    const onKey=event=>{
      if(event.target?.closest?.('input,textarea,select'))return;
      if(event.key==='Escape')setDetailOpen(false);
      else if(event.key==='ArrowLeft'){event.preventDefault();move(-1)}
      else if(event.key==='ArrowRight'){event.preventDefault();move(1)}
      else if(event.key==='Enter'&&!detailOpen){event.preventDefault();setDetailOpen(true)}
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  });
  useEffect(() => { setSize(''); setBackView(false); }, [color]);
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const chooseProduct = useCallback(index => {
    setActiveIndex(Math.max(0, Math.min(visibleProducts.length - 1, index)));
    setColor(''); setSize(''); setBackView(false); setNotice('');setAdded(false);
  }, [visibleProducts.length]);
  const move = direction => chooseProduct(safeIndex + direction);
  const addToBag = () => {
    if (!product || missingOptions || unavailable || deliveryUnavailable) return;
    const ok = cart.add({ productId: product.id, name: productName(product), image: shownImage, price: productPrice(product, variant), sku, size: variant?.size || size, color: variant?.color || color });
    if (!ok) { setNotice('This item could not be added. Open the product page and check its options.'); return; }
    setNotice(`${productName(product)} added to your bag`);
    setAdded(true);
    window.setTimeout(()=>setAdded(false),2000);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3600);
  };

  return <Layout><Seo title="Drixel Studio — Explore the collection" description="Step inside the Drixel Studio. Explore original Drixel pieces, see product views, choose a size and add items to your bag." /><main className="dx-virtual-page">
    <header className="dx-virtual-heading"><div><p className="dx-virtual-kicker"><span className="dx-studio-mark" aria-hidden="true">D</span> DRIXEL STUDIO · SPATIAL SHOPPING</p><h1>See it<br/><em>in a new space.</em></h1><p className="dx-virtual-intro">Move through the collection. Get a closer look. Find the piece that feels like you.</p></div><div className="dx-virtual-count"><strong>{visibleProducts.length.toString().padStart(2, '0')}</strong><span>ORIGINAL<br/>PIECES</span></div></header>
    <section className="dx-virtual-tools" aria-label="Explore the collection"><div className="dx-virtual-categories" role="group" aria-label="Filter by category"><button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>All pieces <span>{list.length}</span></button>{categories.map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{categoryLabel(item)} <span>{list.filter(p => String(p.category || '').toLowerCase() === item.toLowerCase()).length}</span></button>)}</div><label className="dx-virtual-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Find a piece" value={query} onChange={event => setQuery(event.target.value)} aria-label="Search products" /></label></section>
    {loading && <p className="dx-virtual-status" role="status">Opening the studio…</p>}{error && <div className="dx-virtual-error" role="alert">{error} <button type="button" onClick={retry}>Try again</button></div>}
    {!loading && !error && visibleProducts.length === 0 && <div className="dx-virtual-empty"><span>01 / 00</span><h2>No pieces here yet.</h2><p>Try another category or search.</p><button type="button" onClick={() => {setCategory('all');setQuery('');}}>View all pieces</button></div>}
    {product && <>
      <section className="dx-virtual-gallery" aria-label="Interactive Drixel product showroom">
        <div className="dx-virtual-scene-top"><span><i/> LIVE COLLECTION</span><span>{String(safeIndex + 1).padStart(2, '0')} — {String(visibleProducts.length).padStart(2, '0')}</span></div>
        {!webglError ? <ShowroomScene products={visibleProducts} activeIndex={safeIndex} imageFor={imageFor} onSelect={chooseProduct} onWebglError={setWebglError}/> : <div className="dx-virtual-fallback"><img src={shownImage} alt={`${productName(product)} in the Drixel studio`} /></div>}
        <div className="dx-virtual-cart-badge"><Link to={`/${market}/cart`} aria-label={`Shopping bag, ${cart.count} items`}>Bag <strong>{cart.count}</strong></Link></div>
        <button className="dx-virtual-focus" type="button" onClick={()=>setDetailOpen(true)} aria-label={`View ${productName(product)} details`}>{productName(product)} <span>{money(productPrice(product,variant))} · View details ↗</span></button>
        <div className="dx-virtual-brand" aria-hidden="true"><span>DRIXEL</span><small>FORM FOLLOWS FEELING</small></div>
        <nav className="dx-virtual-floating-nav" aria-label="Showroom collections">
          <button type="button" aria-pressed={category==='all'} onClick={()=>setCategory('all')}>Store</button>
          {categories.map(item=><button type="button" key={item} aria-pressed={category===item} onClick={()=>setCategory(item)}>{categoryLabel(item)}</button>)}
        </nav>
        {detailOpen&&<div className="dx-studio-detail-scrim" onClick={()=>setDetailOpen(false)} />}
        {detailOpen&&<aside className="dx-studio-detail-card" role="dialog" aria-modal="true" aria-label={`Shop ${productName(product)}`} tabIndex={-1} ref={detailRef}>
          <button className="dx-studio-detail-close" type="button" onClick={()=>setDetailOpen(false)} aria-label="Close product details">×</button>
          <p>{categoryLabel(product.category)} · DRIXEL</p>
          {shownImage&&<img src={shownImage} alt={productName(product)} />}
          <h2>{productName(product)}</h2><strong>{money(productPrice(product,variant))}</strong>
          {canShowBack&&<div className="dx-studio-views"><button type="button" onClick={()=>setBackView(false)} aria-pressed={!backView}>Front</button><button type="button" onClick={()=>setBackView(true)} aria-pressed={backView}>Back</button></div>}
          {colorOptions.length>0&&<fieldset><legend>Colour</legend><div>{colorOptions.map(value=><button type="button" key={value} aria-pressed={color===value} onClick={()=>setColor(value)}>{value}</button>)}</div></fieldset>}
          {allSizes.length>0&&<fieldset><legend>Size</legend><div>{options.sizes.map(value=><button type="button" key={value} aria-pressed={size===value} disabled={options.variants.length>0&&!options.variants.some(v=>(!color||v.color===color)&&v.size===value&&optionStock(product,v)>0)} onClick={()=>setSize(value)}>{value}</button>)}</div></fieldset>}
          <button className="dx-studio-cart-action" type="button" disabled={missingOptions||unavailable||deliveryUnavailable} onClick={addToBag}>{added?'Added to cart ✓':missingOptions?'Choose your options':unavailable?'Out of stock':'Add to cart'}</button>
          {added&&<Link to={`/${market}/cart`}>View cart →</Link>}
          <p>{safeIndex+1} of {visibleProducts.length} · drag or pick a view to turn</p>
          <Link to={productPath(product,market)}>View full product page →</Link>
        </aside>}
        <div className="dx-virtual-controls"><span>DRAG TO MOVE</span><div><button type="button" aria-label="Previous product" disabled={safeIndex === 0} onClick={() => move(-1)}>←</button><button type="button" aria-label="Next product" disabled={safeIndex >= visibleProducts.length - 1} onClick={() => move(1)}>→</button></div><span>{String(safeIndex + 1).padStart(2, '0')} / {String(visibleProducts.length).padStart(2, '0')}</span></div>
      </section>
      <section className="dx-virtual-product" aria-live="polite"><div className="dx-virtual-product-image">{shownImage ? <img src={shownImage} alt={`${productName(product)} ${backView ? 'back view' : 'front view'}`} loading="eager" /> : <div className="dx-virtual-no-image" aria-label="No product image available">DRIXEL</div>}{canShowBack && <div className="dx-view-toggle" aria-label="Product view"><button type="button" aria-pressed={!backView} onClick={() => setBackView(false)}>Front</button><button type="button" aria-pressed={backView} onClick={() => setBackView(true)}>Back</button></div>}</div><div className="dx-virtual-product-info"><p className="dx-virtual-product-category">{categoryLabel(product.category)} <span>·</span> {product.sku || product.urlCode || product.id}</p><h2>{productName(product)}</h2><p className="dx-virtual-price">{money(productPrice(product, variant))}</p><p className="dx-virtual-description">{product.description || 'A Drixel original, designed for everyday movement and made to be worn your way.'}</p>
        {colorOptions.length > 0 && <fieldset className="dx-virtual-options"><legend>Colour{color ? `: ${color}` : ''}</legend><div>{colorOptions.map(item => <button key={item} type="button" aria-pressed={color === item} disabled={options.variants.length > 0 && !options.variants.some(v => v.color === item && optionStock(product, v) > 0)} onClick={() => setColor(item)}>{item}</button>)}</div></fieldset>}
        {allSizes.length > 0 && <fieldset className="dx-virtual-options"><legend>Size{size ? `: ${size}` : ''}</legend><div>{options.sizes.map(item => <button key={item} type="button" aria-pressed={size === item} disabled={options.variants.length > 0 && !options.variants.some(v => (!color || v.color === color) && v.size === item && optionStock(product, v) > 0)} onClick={() => setSize(item)}>{item}</button>)}</div></fieldset>}
        <button className="dx-virtual-add" type="button" disabled={missingOptions || unavailable || deliveryUnavailable} onClick={addToBag}>{deliveryUnavailable ? 'Unavailable in your region' : missingOptions ? 'Choose your options' : unavailable ? 'Currently unavailable' : 'Add to bag'} <span>↗</span></button>
        <div className="dx-virtual-links"><Link to={productPath(product, market)}>Product details <span>↗</span></Link><Link to={`/${market}/cart`}>Your bag ({cart.count}) <span>↗</span></Link></div>
        {notice && <p className="dx-virtual-notice" role="status">{notice}</p>}
      </div></section>
      <nav className="dx-virtual-index" aria-label="Products in this view"><span className="dx-virtual-index-heading">IN THIS SPACE</span>{visibleProducts.map((item, index) => <button key={item.id} type="button" aria-current={index === safeIndex ? 'true' : undefined} onClick={() => chooseProduct(index)}><span>{String(index + 1).padStart(2, '0')}</span><span>{productName(item)}</span><span>{money(item.price)}</span></button>)}</nav>
    </>}
  </main></Layout>;
}
