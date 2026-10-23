import * as THREE from 'three';

export type Waypoint='store'|'hoodies'|'tees'|'sweaters';
export const WALK_TARGETS:Record<Waypoint,{position:[number,number,number];look:[number,number,number]}>={
 store:{position:[0,1.65,3.85],look:[0,1.8,-4.6]},
 hoodies:{position:[-4.2,1.65,0.9],look:[-5.3,1.65,-3.9]},
 tees:{position:[0.9,1.65,0.9],look:[1.15,1.55,-3.9]},
 sweaters:{position:[4.5,1.65,0.9],look:[5.1,1.7,-3.9]}
};
export const COLLIDERS=[
 // Central merchandise island, back-plinth and point-of-sale counter.
 {x:0,z:0.1,w:2.6,d:1.2},
 {x:0,z:-3.75,w:3.3,d:1.1},
 {x:5.45,z:3.15,w:1.8,d:1.1},
 {x:-4.5,z:-1.4,w:1.7,d:0.95}
];
export const walkingAllowed=(x:number,z:number)=>{
 if(Math.abs(x)>7.45||Math.abs(z)>4.35)return false;
 return !COLLIDERS.some(o=>Math.abs(x-o.x)<o.w/2+0.28&&Math.abs(z-o.z)<o.d/2+0.28);
};
export class WalkController{
 camera:THREE.PerspectiveCamera;
 yaw=0;pitch=0;targetYaw=0;targetPitch=0;
 keys=new Set<string>(); joystick={x:0,y:0};
 walkVelocity=new THREE.Vector2(); auto: null|{start:number;duration:number;from:THREE.Vector3;to:THREE.Vector3;fromYaw:number;toYaw:number}=null;
 held=false;startX=0;startY=0;moved=false;enabled=true;onChange?:()=>void;
 constructor(camera:THREE.PerspectiveCamera){this.camera=camera;this.setLookAt(new THREE.Vector3(...WALK_TARGETS.store.look));}
 setLookAt(to:THREE.Vector3){
  const dir=to.clone().sub(this.camera.position).normalize();
  this.yaw=Math.atan2(-dir.x,-dir.z);this.pitch=Math.asin(THREE.MathUtils.clamp(dir.y,-1,1));
  this.targetYaw=this.yaw;this.targetPitch=this.pitch;
 }
 pointerDown(x:number,y:number){this.held=true;this.startX=x;this.startY=y;this.moved=false}
 pointerMove(x:number,y:number){
  if(!this.held||!this.enabled)return;
  const dx=x-this.startX,dy=y-this.startY;
  if(Math.abs(dx)+Math.abs(dy)>2){this.moved=true;this.auto=null}
  this.startX=x;this.startY=y;
  this.targetYaw-=dx*0.004;this.targetPitch=THREE.MathUtils.clamp(this.targetPitch-dy*0.003,-Math.PI/3,Math.PI/3);
 }
 pointerUp(){const clicked=!this.moved;this.held=false;return clicked}
 key(code:string,down:boolean){if(down)this.keys.add(code.toLowerCase());else this.keys.delete(code.toLowerCase());if(down)this.auto=null}
 wheel(delta:number){const distance=THREE.MathUtils.clamp(delta,-110,110)/110*0.48;
  this.tryMove(-Math.sin(this.yaw)*distance,-Math.cos(this.yaw)*distance);
 }
 tryMove(dx:number,dz:number){
  const x=this.camera.position.x+dx,z=this.camera.position.z+dz;
  if(walkingAllowed(x,this.camera.position.z))this.camera.position.x=x;
  if(walkingAllowed(this.camera.position.x,z))this.camera.position.z=z;
 }
 goTo(name:Waypoint,now=performance.now()){
  const dest=WALK_TARGETS[name];if(!dest)return;
  const from=this.camera.position.clone(),to=new THREE.Vector3(...dest.position);
  const face=new THREE.Vector3(...dest.look).sub(to);
  const destYaw=Math.atan2(-face.x,-face.z);
  const delta=Math.atan2(Math.sin(destYaw-this.yaw),Math.cos(destYaw-this.yaw));
  this.auto={start:now,duration:1450,from,to,fromYaw:this.yaw,toYaw:this.yaw+delta};
  this.keys.clear();this.joystick={x:0,y:0};
 }
 update(dt:number,now:number){
  if(!this.enabled)return;
  if(this.auto){
   const t=THREE.MathUtils.clamp((now-this.auto.start)/this.auto.duration,0,1),e=t*t*(3-2*t);
   const next=this.auto.from.clone().lerp(this.auto.to,e);
   if(walkingAllowed(next.x,next.z)){this.camera.position.x=next.x;this.camera.position.z=next.z}
   this.targetYaw=THREE.MathUtils.lerp(this.auto.fromYaw,this.auto.toYaw,e);
   this.targetPitch=0;
   if(t>=1)this.auto=null;
  }else{
   const ahead=Number(this.keys.has('keyw')||this.keys.has('arrowup'))-Number(this.keys.has('keys')||this.keys.has('arrowdown'))-this.joystick.y;
   const strafe=Number(this.keys.has('keyd')||this.keys.has('arrowright'))-Number(this.keys.has('keya')||this.keys.has('arrowleft'))+this.joystick.x;
   const target=new THREE.Vector2(strafe,ahead);if(target.length()>1)target.normalize();
   this.walkVelocity.lerp(target,1-Math.exp(-dt*9));
   const speed=1.8*Math.min(dt,.05);
   const dx=(-Math.sin(this.yaw)*this.walkVelocity.y+Math.cos(this.yaw)*this.walkVelocity.x)*speed;
   const dz=(-Math.cos(this.yaw)*this.walkVelocity.y-Math.sin(this.yaw)*this.walkVelocity.x)*speed;
   this.tryMove(dx,dz);
  }
  const damp=1-Math.exp(-dt*12);
  this.yaw=THREE.MathUtils.lerp(this.yaw,this.targetYaw,damp);
  this.pitch=THREE.MathUtils.lerp(this.pitch,this.targetPitch,damp);
  this.camera.rotation.order='YXZ';
  this.camera.rotation.y=this.yaw;
  this.camera.rotation.x=this.pitch;
  this.camera.position.y=1.65;
  this.onChange?.();
 }
}
