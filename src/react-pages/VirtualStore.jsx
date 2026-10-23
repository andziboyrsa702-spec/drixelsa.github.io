import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
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
const RAIL_Y=3.05;
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
 const kind=fixtureKind(p),base={clothing:-5.5,caps:0,bags:5.3,shoes:10.2}[kind];
 // Display index counts only this department, so unrelated categories never
 // displace garments or stack items on top of one another.
 const local=products.slice(0,index).filter(item=>fixtureKind(item)===kind).length;
 const slot=local%5,section=Math.floor(local/5);
 return {kind,x:base+(slot-2)*1.18,z:-1.45+section*0.08};
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
  const focusRef=useRef({x:-5.5,z:4.7});
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
    scene.background = new THREE.Color(0xf9f8f5);
    scene.fog = new THREE.Fog(0xf9f8f5, 18, 46);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
    camera.position.set(-5.5, 1.85, 4.7);
    camera.lookAt(-5.5, 1.9, -1.5);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xa9a39a, 2.75));
    const key = new THREE.DirectionalLight(0xffffff, 2.15);
    key.position.set(-3.5, 7, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xf6f2e9, 1.35);
    fill.position.set(5, 4, 1);
    scene.add(fill);
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    key.castShadow=true;key.shadow.mapSize.set(1024,1024);
    key.shadow.camera.left=-16;key.shadow.camera.right=16;key.shadow.camera.top=12;key.shadow.camera.bottom=-12;
    const ceiling=new THREE.Mesh(new THREE.PlaneGeometry(32,20),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}));
    ceiling.rotation.x=Math.PI/2;ceiling.position.set(0,6.6,2);scene.add(ceiling);
    const galleryLight=new THREE.SpotLight(0xfff5e8,75,24,Math.PI/3,0.6,1);
    galleryLight.position.set(0,6,4);scene.add(galleryLight);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(100, 30), new THREE.MeshStandardMaterial({ color: 0xf8f7f3, roughness: 0.99 }));
    wall.position.set(0, 5, -2.5);
    scene.add(wall);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0xeceae5, roughness: 0.91, metalness: 0 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.06;
    scene.add(floor);floor.receiveShadow=true;
    const sideWall=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:0xeeece7,roughness:1}));
    sideWall.rotation.y=-Math.PI/2;sideWall.position.set(13,5,3);scene.add(sideWall);
    
    // Fine floor lines and the brushed-metal Drixel clothing rail define the room without borrowing another brand's set.


    const railGroup = new THREE.Group();
    scene.add(railGroup);
    const railMaterial = new THREE.MeshStandardMaterial({ color: 0x77736d, metalness: 0.78, roughness: 0.28 });
    const addCylinder = (radius, height, x, y, z, rotation = null) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), railMaterial);
      mesh.position.set(x, y, z);
      if (rotation) mesh.rotation.set(...rotation);
      railGroup.add(mesh);
      return mesh;
    };
    addCylinder(0.022,10.4,-5.5,RAIL_Y,-1.36,[0,0,Math.PI/2]);
    const shelfMaterial=new THREE.MeshStandardMaterial({color:0xd1c1ab,roughness:0.76});
    for(const bay of [0,5.3,10.2])for(const height of [1.15,2.35,3.55]){
      const slab=new THREE.Mesh(new THREE.BoxGeometry(bay===10.2?3.3:4.6,0.10,0.82),shelfMaterial);
      slab.position.set(bay,height,-1.88);slab.castShadow=true;slab.receiveShadow=true;scene.add(slab);
    }

    // Wall-mounted rail stays open and unobtrusive.
    
    
    
    const logoMaterial = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, depthWrite: false });
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), logoMaterial);
    logo.position.set(-3.55, 4.65, -2.42);
    scene.add(logo);
    new THREE.TextureLoader().load('/favicon.svg', texture => {
      if (sceneRef.current?.scene !== scene) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      logoMaterial.map = texture;
      logoMaterial.needsUpdate = true;
      renderRef.current?.();
    }, undefined, () => renderRef.current?.());


    const items = new THREE.Group();
    scene.add(items);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const render = () => renderer.render(scene, camera);
    renderRef.current = render;
    sceneRef.current = { scene, items, camera, renderer };
    let frame = 0;
    const animate = () => {
      const target=focusRef.current;
      const delta=target.x-camera.position.x;
      camera.position.x+=delta*0.055;
      camera.position.z+=(target.z-camera.position.z)*0.055;
      camera.position.y=1.75;
      camera.lookAt(target.x,1.9,-1.5);
      const cameraDelta=target.z-camera.position.z;
      if (Math.abs(delta) > 0.003 || Math.abs(cameraDelta)>0.004) {
        render();
        frame = window.requestAnimationFrame(animate);
      } else {
        render();
        frame = 0;
      }
    };
    animateRef.current = () => { if (!frame) frame = window.requestAnimationFrame(animate); };
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
    const pointerDown = event => { mount.setPointerCapture?.(event.pointerId); mount.dataset.startX = String(event.clientX); mount.dataset.startY = String(event.clientY); };
    const pointerUp = event => {
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
      observer.disconnect();
      mount.removeEventListener('pointerdown', pointerDown);
      mount.removeEventListener('pointerup', pointerUp);
      document.removeEventListener('visibilitychange', onVisibility);
      disposeGroup(items);
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
    const start = 0;
    const end = products.length-1;
    const loader = new THREE.TextureLoader();
    for (let index = start; index <= end; index += 1) {
      const product = products[index];
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
    focusRef.current={x:place.x,z:activeIndex===0?4.7:4.0};
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
