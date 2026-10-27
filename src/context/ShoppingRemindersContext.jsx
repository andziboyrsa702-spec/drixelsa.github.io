import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {auth} from '../config/firebase-auth.js';
import useAuth from '../hooks/useAuth.js';
import {useCart} from './CartContext.jsx';
import {useWishlist} from './WishlistContext.jsx';
import {useMarket} from './MarketContext.jsx';
import {apiUrl} from '../utils/api.js';
const Context=createContext();
const ownerKey=kind=>'drixel_reminder_owner_'+kind;
const owner=kind=>{try{return localStorage.getItem(ownerKey(kind))}catch{return null}};
const bind=(kind,uid)=>{try{localStorage.setItem(ownerKey(kind),uid)}catch{}};
const serialise=(items,kind)=>items.map(x=>({productId:String(x.productId||x.id),sku:kind==='bag'?x.sku||'':'',color:kind==='bag'?x.color||'':'',size:kind==='bag'?x.size||'':'',quantity:kind==='bag'?x.quantity:1}));
export function ShoppingRemindersProvider({children}){
 const location=useLocation(),recover=new URLSearchParams(location.search).get('restore')==='reminder',user=useAuth(),cart=useCart(),wishlist=useWishlist(),{market}=useMarket(),[state,setState]=useState({loading:true,preferences:{}}),[restored,setRestored]=useState(false),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),last=useRef({});
 const uid=user?.uid;
 async function call(body,signal){const current=auth.currentUser;if(!current||current.uid!==uid)throw Error('Sign in again to manage reminders.');const token=await current.getIdToken();if(auth.currentUser?.uid!==uid)throw Error('Your account changed. Please try again.');const r=await fetch(apiUrl('/api/customer/reminders'),{method:'POST',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)}),data=await r.json();if(!r.ok||!data.success)throw Error(data.message||'Reminder preferences could not be saved.');return data}
 useEffect(()=>{const controller=new AbortController();last.current={};setRestored(false);setMessage('');setState({loading:!!user,preferences:{}});if(!user||!user.emailVerified){setState({loading:false,preferences:{}});return()=>controller.abort()}call({action:'status'},controller.signal).then(data=>{if(!controller.signal.aborted)setState({...data,loading:false})}).catch(e=>{if(!controller.signal.aborted)setState({loading:false,preferences:{},error:e.message})});return()=>controller.abort()},[uid,user?.email,user?.emailVerified]);
 const bagItems=JSON.stringify(serialise(cart.items,'bag')),wishItems=JSON.stringify(serialise(wishlist.items,'wishlist'));
 useEffect(()=>{if(!uid||!user.emailVerified||state.loading||recover&&!restored)return;const controller=new AbortController(),timer=setTimeout(async()=>{for(const [kind,encoded] of [['bag',bagItems],['wishlist',wishItems]]){const signature=market+encoded;if(!state.preferences[kind]||owner(kind)!==uid||last.current[kind]===signature)continue;try{await call({action:'sync',kind,market,items:JSON.parse(encoded)},controller.signal);if(!controller.signal.aborted)last.current[kind]=signature}catch(e){if(!controller.signal.aborted)setMessage(e.message)}}},800);return()=>{clearTimeout(timer);controller.abort()}},[uid,market,bagItems,wishItems,recover,restored,state.loading,state.preferences.bag,state.preferences.wishlist]);
 async function change(kind,enabled){if(busy)return;setBusy(kind);setMessage('');try{await call({action:'preference',kind,enabled,consent:'shopping-reminders-v1',market,items:JSON.parse(kind==='bag'?bagItems:wishItems)});if(auth.currentUser?.uid!==uid)return;bind(kind,enabled?uid:'');last.current[kind]=market+(kind==='bag'?bagItems:wishItems);setState(s=>({...s,preferences:{...s.preferences,[kind]:enabled}}));setMessage(enabled?'Reminder enabled for this saved selection.':'Reminder stopped.')}catch(e){setMessage(e.message)}finally{setBusy('')}}
 async function restore(kind){if(busy)return;setBusy(kind);setMessage('');try{const data=await call({action:'status'}),saved=data.saved?.[kind];if(auth.currentUser?.uid!==uid)return;if(!saved?.items?.length)throw Error('No available saved items remain. They may have been ordered or removed.');if(saved.market!==market)throw Error('Switch to the '+saved.market.toUpperCase()+' store to restore this selection.');bind(kind,uid);if(kind==='bag')cart.restore(saved.items);else wishlist.restore(saved.items);setState(s=>({...s,...data}));setRestored(true);setMessage('Saved selection restored. Check current prices and delivery at checkout.')}catch(e){setMessage(e.message)}finally{setBusy('')}}
 return <Context.Provider value={{user,state,busy,message,change,restore,bound:kind=>owner(kind)===uid}}>{children}</Context.Provider>
}
export const useShoppingReminders=()=>useContext(Context);
