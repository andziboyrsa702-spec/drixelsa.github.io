import {useEffect,useState} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {auth} from '../config/firebase-auth.js';

export default function useAuth(){
  const [user,setUser]=useState(undefined);

  useEffect(()=>{
    let active=true;
    let settled=false;

    const settle=(value)=>{
      if(!active||settled)return;
      settled=true;
      setUser(value);
    };

    const unsubscribe=onAuthStateChanged(
      auth,
      value=>settle(value),
      ()=>settle(null),
    );

    // Firebase normally resolves immediately from local persistence. If the
    // browser/storage layer stalls, never leave the storefront in a permanent
    // "Loading account" state; recover to the normal sign-in flow instead.
    const timeout=setTimeout(()=>settle(auth.currentUser||null),8000);

    if(typeof auth.authStateReady==='function'){
      auth.authStateReady()
        .then(()=>settle(auth.currentUser||null))
        .catch(()=>settle(auth.currentUser||null));
    }

    return()=>{
      active=false;
      clearTimeout(timeout);
      unsubscribe();
    };
  },[]);

  return user;
}
