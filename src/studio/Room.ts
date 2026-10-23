import * as THREE from 'three';

/** DRIXEL studio shell. All dimensions are metres. Independent of React UI. */
export const ROOM={width:16,depth:10,height:4.4};
export const STATIONS={
  store:{position:[0,1.65,3.85],look:[0,1.8,-4.6],fov:64},
  clothing:{position:[0,1.6,2.5],look:[0,1.6,-3.72],fov:36},
  shoes:{position:[-4.8,1.55,1.5],look:[-6.7,1.5,-1.8],fov:36},
  bags:{position:[4.3,1.55,1.7],look:[5.5,1.45,-2],fov:36},
  caps:{position:[4.8,1.6,2.2],look:[6.55,1.8,-0.5],fov:36}
} as const;
const mat=(color:number,roughness=0.9,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const cream=mat(0xf3efe7,0.94),side=mat(0xfcfaf6,0.94),concrete=mat(0xdfded9,0.57,0.07),
 wood=mat(0xc0a98d,0.73),woodDark=mat(0xa58c72,0.81),steel=mat(0x77746f,0.33,0.75);
const addBox=(g:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material,shadow=true)=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
 mesh.position.set(x,y,z);mesh.castShadow=shadow;mesh.receiveShadow=true;g.add(mesh);return mesh;
};
function rod(g:THREE.Group,length:number,radius:number,x:number,y:number,z:number,axis:'x'|'y'|'z'='x'){
 const o=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,16),steel);
 if(axis==='x')o.rotation.z=Math.PI/2;
 if(axis==='z')o.rotation.x=Math.PI/2;
 o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;
}
/** Real architectural geometry: room corners are connected; not billboard backdrops. */
export function buildDrixelRoom(){
 const group=new THREE.Group();group.name='DRIXEL_STUDIO_ROOM';
 const {width:w,depth:d,height:h}=ROOM;
 addBox(group,w,0.16,d,0,-0.08,0,concrete,false);
 // Soft architectural contact darkening from premultiplied radial texture.
 // This is a runtime approximation until actual Blender lightmaps are baked.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=256;shadowCanvas.height=256;
 const shadowCtx=shadowCanvas.getContext('2d');
 const grad=shadowCtx.createRadialGradient(128,128,4,128,128,125);
 grad.addColorStop(0,'rgba(75,66,56,0.17)');grad.addColorStop(1,'rgba(75,66,56,0)');
 shadowCtx.fillStyle=grad;shadowCtx.fillRect(0,0,256,256);
 const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
 const shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 for(const [x,z,sx,sz] of [[0,-4.75,15,.7],[-7.7,0,.7,9],[7.7,0,.7,9],[1.05,.45,2.4,1.6],[-4.5,-1.4,3.2,1.45]]){
  const shade=new THREE.Mesh(new THREE.PlaneGeometry(sx,sz),shadowMaterial.clone());
  shade.rotation.x=-Math.PI/2;shade.position.set(x,0.009,z);group.add(shade);
 }
 addBox(group,w,0.12,0.14,0,h-0.06,-d/2,cream,false); // ceiling cove
 addBox(group,w,0.16,d,0,h+0.08,0,side,false);
 addBox(group,w,h,0.16,0,h/2,-d/2,cream,false);
 addBox(group,0.16,h,d,-w/2,h/2,0,side,false);
 addBox(group,0.16,h,d,w/2,h/2,0,side,false);
 addBox(group,w,0.12,0.09,0,0.06,-d/2+0.12,woodDark,false);
 for(const x of [-w/2+0.12,w/2-0.12])addBox(group,0.1,0.12,d,x,0.06,0,woodDark,false);
 // Three separate departments surround a walkable central island.
 // HOODIES at left: wall rail, gondola and neatly folded stock on a table.
 for(const y of [2.38]){
  rod(group,5.1,0.023,-4.7,y,-4.36);
  for(const x of [-6.9,-2.5])rod(group,0.55,0.025,x,y,-4.64,'z');
 }
 const boxMat=wood;
 addBox(group,2.7,0.095,1.05,-4.5,0.98,-1.45,boxMat);
 for(const x of [-5.65,-3.35])addBox(group,0.10,0.95,0.1,x,0.49,-1.45,steel);
 rod(group,2.0,0.022,-4.5,1.65,-1.45);
 for(const x of [-5.4,-3.6]){
  rod(group,1.6,0.025,x,0.9,-1.45,'y');
 }
 // T-SHIRTS at center-right: wall shelves and garment rail plus central island.
 for(const y of [1.1,1.75,2.4])addBox(group,4.2,0.075,0.60,1.2,y,-4.55,wood);
 rod(group,4.3,0.022,1.1,3.03,-4.33);
 addBox(group,2.0,0.11,1.3,1.05,0.9,0.45,wood);
 for(const x of [0.2,1.9])for(const z of [-0.03,0.95])addBox(group,0.09,0.9,0.09,x,0.45,z,steel);
 // SWEATERS at right: 4 columns x 3 rows physical cubby grid.
 const bx=5.45,bz=-4.47;
 addBox(group,3.6,2.6,0.085,bx,1.85,-4.88,woodDark);
 for(let i=0;i<=4;i++)addBox(group,0.07,2.55,0.80,bx-1.8+i*0.9,1.85,bz,wood);
 for(let i=0;i<=3;i++)addBox(group,3.6,0.07,0.80,bx,0.58+i*0.85,bz,wood);
 for(const x of [4.45,5.45,6.45])rod(group,0.2,0.02,x,3.55,-4.54,'z');
 addBox(group,1.85,0.13,0.60,5.35,0.55,1.6,wood);
 // Feature badge is above the central collection, no purposeless plinth block.
 // Cash-wrap with subtle brand-bag staging near entrance.
 addBox(group,1.8,1.0,0.92,5.7,0.5,3.45,woodDark);
 // Retail styling: real world-scale props and an understated staffed counter.
 const rug=new THREE.Mesh(new THREE.PlaneGeometry(3.15,2.3),new THREE.MeshStandardMaterial({color:0xb7a89b,roughness:1,side:THREE.DoubleSide}));
 rug.rotation.x=-Math.PI/2;rug.position.set(1.0,0.012,0.45);rug.receiveShadow=true;group.add(rug);
 // Counter has a separate stone top, recessed toe kick and a real POS terminal.
 addBox(group,1.94,0.075,1.00,5.7,1.04,3.45,mat(0xe8e5df,0.38));
 addBox(group,1.6,0.17,0.06,5.7,0.12,3.945,steel,false);
 addBox(group,0.32,0.065,0.25,5.35,1.13,3.27,mat(0x323638,.5));
 const terminal=addBox(group,0.24,0.28,0.035,5.35,1.29,3.23,mat(0x1c2428,.28));
 terminal.rotation.x=-0.35;
 const signMaterial=new THREE.MeshStandardMaterial({color:0xede8e0,roughness:0.83});
 addBox(group,0.78,0.32,0.035,6.07,1.29,3.24,signMaterial);
 // Original freestanding shopping bag, behind the register.
 const bag=addBox(group,0.28,0.31,0.12,6.32,1.245,3.4,mat(0x292724,.92));
 const handles=new THREE.Mesh(new THREE.TorusGeometry(.075,.009,6,24,Math.PI),steel);
 handles.position.set(6.32,1.41,3.46);group.add(handles);
 // Human mannequin silhouette: placeholder only. Replace with licensed, rigged
 // realistic 3D staff model before calling this a photorealistic cashier.
 const staff=new THREE.Group();staff.name='CASHIER_PLACEHOLDER';
 staff.position.set(5.75,0,2.76);
 const skin=mat(0x987259,0.92),uniform=mat(0x292724,0.96);
 const staffPart=(name: string,geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number)=>{
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;staff.add(mesh);return mesh;
 };
 staffPart('staff torso',new THREE.CapsuleGeometry(.23,.55,4,12),uniform,0,1.14,0);
 staffPart('staff head',new THREE.SphereGeometry(.15,16,12),skin,0,1.73,0);
 staffPart('staff hair',new THREE.SphereGeometry(.153,16,8,0,Math.PI*2,0,1.2),mat(0x1a1715),0,1.78,0);
 for(const dx of [-.17,.17]){
  const arm=staffPart('staff arm',new THREE.CapsuleGeometry(.067,.47,4,9),uniform,dx*1.9,1.13,0);
  arm.rotation.z=dx>0?.16:-.16;
 }
 for(const dx of [-.1,.1])staffPart('staff leg',new THREE.CapsuleGeometry(.094,.55,4,9),mat(0x33312f),dx,.44,0);
 group.add(staff);
 // A restrained plant and stool, used as believable scale cues.
 const foliage=mat(0x49634b,1),pot=mat(0xb5a394,.94);
 const makePlant=(x:number,z:number)=>{
  const planter=new THREE.Mesh(new THREE.CylinderGeometry(.21,.17,.38,12),pot);
  planter.position.set(x,.19,z);planter.castShadow=true;group.add(planter);
  rod(group,.9,.018,x,.76,z,'y');
  for(let i=0;i<8;i++){
   const a=i*Math.PI*2/8,y=.53+(i%3)*.16;
   const leaf=new THREE.Mesh(new THREE.SphereGeometry(.22,10,7),foliage);
   leaf.scale.set(.47,.88,.33);leaf.position.set(x+Math.cos(a)*.18,y,z+Math.sin(a)*.18);
   leaf.rotation.z=a;group.add(leaf);
  }
 };
 makePlant(-6.8,3.4);makePlant(6.85,-2.8);
 addBox(group,.44,.08,.42,-2.55,.5,2.5,wood);
 for(const x of [-2.72,-2.38])for(const z of [2.34,2.66])addBox(group,.037,.45,.037,x,.23,z,steel);
 // Folded merchandise stacks: actual low-height cloth-shaped volumes rather
 // than hanging photographs pasted to furniture.
 const folded=[mat(0x2a292a,1),mat(0xdbccba,1),mat(0x8c7283,1),mat(0xc49d9b,1)];
 for(const [x,y,z,count] of [[-4.5,1.06,-1.45,3],[1.0,1.01,.43,4],[5.35,.66,1.6,3]]){
  for(let i=0;i<count;i++){
   const fabric=folded[i%folded.length];
   const layer=addBox(group,.48,.075,.34,x,y+i*.078,z,fabric);
   layer.geometry.translate(0,0,0);
  }
 }
 // Entrance mirror; shallow framed glass on side wall.
 const mirror=new THREE.Mesh(new THREE.PlaneGeometry(0.9,2.0),new THREE.MeshStandardMaterial({
  color:0xf0f0ee,metalness:0.82,roughness:0.11
 }));
 mirror.rotation.y=Math.PI/2;mirror.position.set(-w/2+0.16,1.4,3.25);group.add(mirror);
 // Soft track fixtures attached to ceiling, moved in front of the brand wall.
 for(const x of [-5,0,5]){
  rod(group,2.3,0.03,x,h-0.17,0.5);
  for(const z of [-0.4,0.5,1.4]){
   const fixture=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,0.17,12),steel);
   fixture.position.set(x,h-0.31,z);group.add(fixture);
  }
 }
 // DRIXEL wordmark and department signs sit on physical mounting plates.
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#161616';ctx.textAlign='center';ctx.font='800 155px Arial';
 ctx.fillText('DRIXEL',512,168);ctx.font='30px Arial';ctx.fillText('F O R M   F O L L O W S   F E E L I N G',512,225);
 const logo=new THREE.CanvasTexture(canvas);logo.colorSpace=THREE.SRGBColorSpace;
 const logoSign=new THREE.Mesh(new THREE.PlaneGeometry(3.05,.77),new THREE.MeshBasicMaterial({map:logo,transparent:true,depthWrite:false}));
 addBox(group,3.28,.86,.055,0,3.20,-4.87,cream);
 logoSign.position.set(0,3.20,-4.83);group.add(logoSign);
 for(const [name,x] of [['HOODIES',-4.7],['T-SHIRTS',1.25],['SWEATERS',5.5]]){
  const c=document.createElement('canvas');c.width=512;c.height=128;
  const q=c.getContext('2d');q.fillStyle='#24211f';q.font='700 53px Arial';q.textAlign='center';q.fillText(name,256,76);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.0,.5),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));
  addBox(group,2.13,.55,.075,x,3.75,-4.84,woodDark);
  sign.position.set(x,3.75,-4.78);group.add(sign);
 }
 const hemi=new THREE.HemisphereLight(0xffffff,0xcac2b5,2.0);group.add(hemi);
 const sunlight=new THREE.DirectionalLight(0xfff7eb,2.1);sunlight.position.set(-2,3.95,3.5);
 sunlight.castShadow=true;sunlight.shadow.mapSize.set(1024,1024);
 sunlight.shadow.camera.left=-8;sunlight.shadow.camera.right=8;
 sunlight.shadow.camera.top=7;sunlight.shadow.camera.bottom=-7;
 sunlight.shadow.bias=-0.0002;sunlight.shadow.normalBias=0.02;group.add(sunlight);
 return group;
}
export function disposeDrixelRoom(g:THREE.Object3D){
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
 g.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))materials.add(m)}});
 geometries.forEach(v=>v.dispose());materials.forEach(v=>v.dispose());
}
