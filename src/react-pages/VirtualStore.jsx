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

const SPACING = 2.45;
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
    renderer.setClearColor(0x151515, 1);
    renderer.domElement.className = 'dx-virtual-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.touchAction = 'pan-y';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x151515);
    scene.fog = new THREE.Fog(0x151515, 12, 32);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
    camera.position.set(0, 2.35, 10.6);
    camera.lookAt(0, 1.65, 0);

    scene.add(new THREE.HemisphereLight(0xe8e7e2, 0x343331, 2.1));
    const key = new THREE.DirectionalLight(0xfff7eb, 3.0);
    key.position.set(-3.5, 7, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd9e6dc, 1.15);
    fill.position.set(5, 4, 1);
    scene.add(fill);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(100, 30), new THREE.MeshStandardMaterial({ color: 0x20201f, roughness: 0.95 }));
    wall.position.set(0, 5, -2.5);
    scene.add(wall);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x292826, roughness: 0.72, metalness: 0.08 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.06;
    scene.add(floor);
    // Fine floor lines and the brushed-metal Drixel clothing rail define the room without borrowing another brand's set.
    for (let x = -20; x <= 20; x += 2) makeRule(scene, [[x, 0, 1], [x, 0, -18]], 0x514e49, 0.17);
    const railGroup = new THREE.Group();
    scene.add(railGroup);
    const railMaterial = new THREE.MeshStandardMaterial({ color: 0xb5b0a6, metalness: 0.78, roughness: 0.28 });
    const addCylinder = (radius, height, x, y, z, rotation = null) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), railMaterial);
      mesh.position.set(x, y, z);
      if (rotation) mesh.rotation.set(...rotation);
      railGroup.add(mesh);
      return mesh;
    };
    addCylinder(0.035, 8, 0, 3.32, -0.18, [0, 0, Math.PI / 2]);
    addCylinder(0.032, 2.7, -3.55, 2.0, -0.18);
    addCylinder(0.032, 2.7, 3.55, 2.0, -0.18);
    addCylinder(0.05, 1.6, -3.55, 0.12, -0.18, [0, 0, Math.PI / 2]);
    addCylinder(0.05, 1.6, 3.55, 0.12, -0.18, [0, 0, Math.PI / 2]);
    const logo = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.72, 0.08), new THREE.MeshStandardMaterial({ color: 0xd8ff4a, roughness: 0.42 }));
    logo.position.set(-4.12, 3.3, -0.12);
    scene.add(logo);
    makeRule(scene, [[-3.85, 3.32, -0.1], [-3.55, 3.32, -0.1]], 0xd8ff4a, 1);

    const items = new THREE.Group();
    scene.add(items);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const render = () => renderer.render(scene, camera);
    renderRef.current = render;
    sceneRef.current = { scene, items, camera, renderer };
    let frame = 0;
    const animate = () => {
      const delta = targetXRef.current - items.position.x;
      if (Math.abs(delta) > 0.003) {
        items.position.x += delta * 0.12;
        render();
        frame = window.requestAnimationFrame(animate);
      } else {
        items.position.x = targetXRef.current;
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
      camera.position.z = width < 600 ? 12.6 : 10.6;
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    const pointerDown = event => { mount.dataset.startX = String(event.clientX); mount.dataset.startY = String(event.clientY); };
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
          mats.filter(Boolean).forEach(material => material.dispose?.());
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
    const start = Math.max(0, activeIndex - 2);
    const end = Math.min(products.length - 1, activeIndex + 2);
    const loader = new THREE.TextureLoader();
    for (let index = start; index <= end; index += 1) {
      const product = products[index];
      const entry = new THREE.Group();
      entry.position.set(index * SPACING, 0, index === activeIndex ? 0.2 : 0);
      entry.scale.setScalar(index === activeIndex ? 1 : 0.82);
      entry.userData.productIndex = index;
      // Each panel is a real product photograph from the live catalogue, mounted on a subtle studio frame.
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.46, 1.86, 0.08), new THREE.MeshStandardMaterial({ color: index === activeIndex ? 0x474740 : 0x333330, roughness: 0.7 }));
      frame.position.set(0, 1.58, 0.18);
      frame.userData.productIndex = index;
      entry.add(frame);
      const board = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 1.72), new THREE.MeshBasicMaterial({ color: 0xf4f3ef }));
      board.position.set(0, 1.58, 0.228);
      board.userData.productIndex = index;
      entry.add(board);
      const url = imageFor(product, index === activeIndex);
      if (url) {
        loader.load(imageAtWidth(url, 640), texture => {
          if (sceneRef.current !== state || state.textureGeneration !== textureGeneration) { texture.dispose(); return; }
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = Math.min(state.renderer.capabilities.getMaxAnisotropy(), 4);
          const imageMaterial = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
          const source = texture.image;
          const ratio = source?.naturalWidth && source?.naturalHeight ? source.naturalWidth / source.naturalHeight : 0.77;
          const frameRatio = 1.32 / 1.72;
          const imageWidth = ratio > frameRatio ? 1.32 : 1.72 * ratio;
          const imageHeight = ratio > frameRatio ? 1.32 / ratio : 1.72;
          const image = new THREE.Mesh(new THREE.PlaneGeometry(imageWidth, imageHeight), imageMaterial);
          image.position.set(0, 1.58, 0.24);
          image.userData.productIndex = index;
          entry.add(image);
          renderRef.current?.();
        }, undefined, () => renderRef.current?.());
      }
      makeRule(entry, [[0, 3.25, -0.05], [-0.23, 3.03, -0.05], [0, 2.87, -0.05], [0.23, 3.03, -0.05], [0, 3.25, -0.05]], 0xc9c2b8, 0.9);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 18, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0xc8c0b3, metalness: 0.68, roughness: 0.32 }));
      hook.position.set(0, 3.32, -0.05);
      hook.rotation.z = Math.PI * 0.8;
      entry.add(hook);
      makeRule(entry, [[0, 2.88, -0.04], [0, 2.55, -0.04]], 0xbcb5aa, 0.7);
      items.add(entry);
    }
    targetXRef.current = -activeIndex * SPACING;
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
  const noticeTimer = useRef(null);
  const categories = useMemo(() => [...new Set(list.map(product => String(product.category || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [list]);
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

  useEffect(() => { setActiveIndex(0); setColor(''); setSize(''); setBackView(false); }, [category, query, market]);
  useEffect(() => { setSize(''); setBackView(false); }, [color]);
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const chooseProduct = useCallback(index => {
    setActiveIndex(Math.max(0, Math.min(visibleProducts.length - 1, index)));
    setColor(''); setSize(''); setBackView(false); setNotice('');
  }, [visibleProducts.length]);
  const move = direction => chooseProduct(safeIndex + direction);
  const addToBag = () => {
    if (!product || missingOptions || unavailable || deliveryUnavailable) return;
    const ok = cart.add({ productId: product.id, name: productName(product), image: shownImage, price: productPrice(product, variant), sku, size: variant?.size || size, color: variant?.color || color });
    if (!ok) { setNotice('This item could not be added. Open the product page and check its options.'); return; }
    setNotice(`${productName(product)} added to your bag`);
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
        <div className="dx-virtual-scene-top"><span><i/> LIVE COLLECTION</span><span>01 — {String(visibleProducts.length).padStart(2, '0')}</span></div>
        {!webglError ? <ShowroomScene products={visibleProducts} activeIndex={safeIndex} imageFor={imageFor} onSelect={chooseProduct} onWebglError={setWebglError}/> : <div className="dx-virtual-fallback"><img src={shownImage} alt={`${productName(product)} in the Drixel studio`} /></div>}
        <div className="dx-virtual-brand" aria-hidden="true"><span>DRIXEL</span><small>FORM FOLLOWS FEELING</small></div>
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
