import * as THREE from 'three';

/** DRIXEL studio shell. All dimensions are metres. Independent of React UI. */
export const ROOM={width:14,depth:8,height:4.2};
export const STATIONS={
  store:{position:[0,1.7,6.5],look:[0,1.65,-2],fov:38},
  clothing:{position:[0,1.6,2.5],look:[0,1.6,-3.72],fov:36},
  shoes:{position:[-4.8,1.55,1.5],look:[-6.7,1.5,-1.8],fov:36},
  bags:{position:[4.3,1.55,1.7],look:[5.5,1.45,-2],fov:36},
  caps:{position:[4.8,1.6,2.2],look:[6.55,1.8,-0.5],fov:36}
} as const;
const mat=(color:number,roughness=0.9,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const cream=mat(0xf3efe7,0.97),side=mat(0xf5f1eb,0.96),concrete=mat(0xdad8d4,0.74),
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
 addBox(group,w,0.12,0.14,0,h-0.06,-d/2,cream,false); // ceiling cove
 addBox(group,w,0.16,d,0,h+0.08,0,side,false);
 addBox(group,w,h,0.16,0,h/2,-d/2,cream,false);
 addBox(group,0.16,h,d,-w/2,h/2,0,side,false);
 addBox(group,0.16,h,d,w/2,h/2,0,side,false);
 addBox(group,w,0.12,0.09,0,0.06,-d/2+0.12,woodDark,false);
 for(const x of [-w/2+0.12,w/2-0.12])addBox(group,0.1,0.12,d,x,0.06,0,woodDark,false);
 // Clothing: one real long metal rail with shallow wall brackets.
 const railY=2.53,backZ=-3.22;
 rod(group,6.2,0.022,0,railY,backZ);
 for(const x of [-2.88,0,2.88]){
   rod(group,0.55,0.024,x,railY,backZ-0.28,'z');
   addBox(group,0.18,0.2,0.04,x,railY,-d/2+0.19,steel,false);
 }
 // Shoe shelving, 3 x 3 alcove ledges.
 for(let row=0;row<3;row++)for(let column=0;column<3;column++)
   addBox(group,0.9,0.075,0.67,-5.5+column*1.13,0.85+row*0.92,-3.24,wood);
 // Bags: 3x2 cubbies, complete with side walls and back panel.
 const bx=4.75,bz=-3.42,unitW=3.25,unitH=2.48;
 addBox(group,unitW,unitH,0.08,bx,1.6,-3.78,woodDark);
 for(const x of [bx-unitW/2,bx-unitW/6,bx+unitW/6,bx+unitW/2])
   addBox(group,0.075,unitH,0.85,x,1.6,bz,wood);
 for(const y of [0.36,1.58,2.8])addBox(group,unitW,0.075,0.85,bx,y,bz,wood);
 // Caps: real perforated pegboard and wall pegs.
 addBox(group,1.9,2.15,0.09,6.02,2.1,-1.05,wood);
 for(let y=0;y<6;y++)for(let x=0;x<5;x++){
   const hole=new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.016,0.014,8),woodDark);
   hole.rotation.x=Math.PI/2;hole.position.set(5.30+x*0.35,1.32+y*0.3,-0.98);group.add(hole);
 }
 for(const x of [5.4,6.05,6.65])for(const y of [1.6,2.55])rod(group,0.21,0.02,x,y,-0.86,'z');
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
