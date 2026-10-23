# DRIXEL Studio implementation status — M1 foundation (23 October 2026)

The new `src/studio/Room.ts` module creates a **physical metre-scale room** in WebGL and is mounted from `VirtualStore.jsx`. It includes a joined floor, walls, ceiling, skirting, wall-mounted clothing rail, shoe shelves, bag cubbies, cap pegboard and soft dynamic lights. The camera waypoint moves now finish in about 1.35 seconds using a deterministic eased interpolation. This is the **M1 structural foundation**, not the final visual target.

`scripts/blender/create_drixel_studio.py` is the editable Blender authoring source. Use Blender 4.x:
```sh
blender -b --python scripts/blender/create_drixel_studio.py
```
It writes `build/studio/drixel_room.blend` and `build/studio/drixel_room.glb` locally. **Those binary assets have not been generated or shipped in this repository yet.** Rendering currently uses the TypeScript geometry, not a loaded lightmapped GLB.

### Required next production gates
1. Open the Blender scene, adjust fixture spacing and camera compositions to the reference, bake Cycle AO/lightmaps and export compressed geometry/textures. WebGL runtime needs to consume the GLB.
2. Replace white-matte product photographs with reviewed RGBA cutout WebP. Avoid automatic removal of white lettering/white garment fabric. Generate catalogue-to-asset manifest and audit duplicate product identities.
3. Implement one correct hanger model per item, alpha silhouettes, wall shadow maps and pre-recorded 4–8 angle turns where genuine assets exist.
4. Migrate renderer into R3F/drei and use GSAP for station camera poses with tested 1.2–1.5s transitions. This is not yet done.
5. Verify Chrome, Firefox, Safari, iOS, Android; test cart variant round-trip and mobile Lighthouse ≥70; capture desktop/mobile screenshots and screen recording.
6. Release **only after** CI, visual acceptance and shopping checks are green. Do not claim photorealism based on the geometry-only foundation.

---
# DRIXEL Virtual Store — implementation and asset contract

## Architecture / current scope

- React storefront page: `src/react-pages/VirtualStore.jsx`; live catalogue via `useCatalogue(market)`.
- 3D renderer: existing Three.js scene (`ShowroomScene`), with merchandised rails and station fixtures.
- HTML overlay: floating collection navigator, cart badge and responsive in-scene product card.
- Cart integration: existing `CartContext.add` using productId + selected SKU, size and colour; checkout independently verifies price and stock.
- Routes: `/:market/studio`, optional query parameters `station` and `product`; canonical product pages continue to exist.
- Existing code is JavaScript/JSX and raw Three.js, **not yet** the requested TypeScript + React Three Fiber/drei + GSAP architecture. Do not claim those libraries are installed.
- Current implementation uses transparent-cutout simulation of ordinary catalog images. It cannot create unseen side angles; the camera's slight lateral movement does not represent genuine 3D geometry.

## Design-team asset specifications

1. **Cutout source**: photograph physical product head-on in consistent lighting, at least 1600x2000 pixels (recommended 2000x2500); product occupies 75–90% of canvas. Preserve authentic silhouette, hems, sleeves, fabric folds, print and branding.
2. **Alpha**: provide lossless RGBA PNG as the master and optimized **transparent WebP** at 512/1024/1600 px wide. Do not flatten onto white, erase white garments or white DRIXEL graphics, or replace existing customer-facing photos. Alpha edge feathering ~1–2 px; no visible white halo.
3. **Angle pack**: `front`, `front-left-45`, `left`, `back-left-45`, `back`, `back-right-45`, `right`, `front-right-45`. Only publish an angle when captured/rendered from the actual garment; otherwise enable front/back only. Never synthesize false side details from one flat photo.
4. **Naming**: `public/studio-assets/<sku>/<colour-slug>/<angle>-1024.webp`; for example `public/studio-assets/DRX001/black/front-1024.webp`. Include an asset manifest mapping **product ID and variant SKU** to ordered available angles.
5. **Lighting**: neutral 5000–5600K, soft frontal key, subtle edge lift, consistent exposure/white balance across angles, same center/scale and camera focal length. Real hanger photos should have an independent transparent hanger layer (avoid duplicating computer-generated wire hangers).
6. **Accessories**: caps on transparent background with front, side and back as available; bags front/side/back with straps intact; shoe profiles only for actually listed shoes.
7. **Performance**: primary 512/1024px cutouts generally target <150–300 KB each when quality allows, lazy-load other stations, preload only adjacent product angles. Verify alpha, compression, and legibility of small brand logos manually.

## Station component breakdown target

- `Scene`: floors/walls/light/shadows; one persistent room
- `Station`: physical fixture type based on product category (clothing rail, cap pegboard, bag cubby, shoe shelf)
- `ProductPlane`: transparent photo texture, individual focus/sway/alpha and shadow
- `CameraRig`: current human-eye-height easing; future GSAP 1.2-second transitions
- `NavPill`: dynamic categories, Store overview
- `ProductCard`: overlay size/colour, stock check, add to cart and cart link
- `CartBadge`: live `useCart().count`

## Required verification before claiming acceptance

- Browser screenshot compare against user reference at overview, clothing focus, detail and station switches
- Real product + valid SKU/size/colour creates one correctly normalized cart item and persists across refresh; checkout verifies price/stock
- Desktop Chrome/Firefox, Safari macOS and iOS devices; pointer drag and touch swipes; keyboard Arrow/Enter/Escape
- No loading/error-screen flashes or 404 on direct refresh
- Lighthouse mobile performance >=70 with 3D scene active; record device and audit output
- New R3F/drei, GSAP and TypeScript dependencies require an updated lockfile and passing npm ci before replacing existing renderer

Do not ship fake angle rotation or claim measured FPS/Lighthouse outcomes without device-level testing.
