import React,{useEffect,useRef}from"react";import{useLocation,useNavigate}from"react-router-dom";import useAuth from"../hooks/useAuth.js";

export default function AdminAccessGesture(){
  const user=useAuth(),nav=useNavigate(),loc=useLocation(),admin=useRef(false),lastA=useRef(0),touch=useRef(null);
  useEffect(()=>{let live=true;if(!user){admin.current=false;return}user.getIdTokenResult().then(r=>{if(live)admin.current=r.claims.admin===true||r.claims.role==="admin"}).catch(()=>{admin.current=false});return()=>{live=false}},[user]);
  useEffect(()=>{if(loc.pathname.includes("/admin"))return;const market=(loc.pathname.split("/")[1]||"za");const open=()=>admin.current&&nav(`/${market}/admin/dashboard`);
    const key=e=>{if(!admin.current||!e.ctrlKey||e.key.toLowerCase()!=="a")return;const now=Date.now();if(now-lastA.current<700){e.preventDefault();lastA.current=0;open()}else lastA.current=now};
    const start=e=>{if(!admin.current||e.touches.length!==2){touch.current=null;return}touch.current={y:(e.touches[0].clientY+e.touches[1].clientY)/2,t:Date.now()}};
    const move=e=>{if(!touch.current||e.touches.length!==2)return;const y=(e.touches[0].clientY+e.touches[1].clientY)/2;if(Math.abs(y-touch.current.y)>90&&Date.now()-touch.current.t<1400){touch.current=null;open()}};
    window.addEventListener("keydown",key);window.addEventListener("touchstart",start,{passive:true});window.addEventListener("touchmove",move,{passive:true});
    return()=>{window.removeEventListener("keydown",key);window.removeEventListener("touchstart",start);window.removeEventListener("touchmove",move)}
  },[loc.pathname,nav]);
  return null;
}