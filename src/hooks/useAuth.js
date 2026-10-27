import {useEffect,useState} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {auth} from '../config/firebase-auth.js';

export default function useAuth(){
  const [user,setUser]=useState(undefined);

  useEffect(()=>{
    let active=true;
    const apply=value=>{if(active)setUser(value)};

    const unsubscribe=onAuthStateChanged(
      auth,
      apply,
      ()=>apply(null),
    );

    const fallback=()=>{
      if(!active)return;
      setUser(current=>current===undefined?(auth.currentUser||null):current);
    };

    const timeout=setTimeout(fallback,8000);
    if(typeof auth.authStateReady==='function'){
      auth.authStateReady().then(fallback).catch(()=>{});
    }

    return()=>{
      active=false;
      clearTimeout(timeout);
      unsubscribe();
    };
  },[]);

  return user;
}
