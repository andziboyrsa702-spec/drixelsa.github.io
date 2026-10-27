import {useEffect,useState} from 'react';
import {doc,onSnapshot} from 'firebase/firestore';
import {db} from '../config/firebase-react.js';
export default function useUserProfile(user){const [profile,setProfile]=useState({});useEffect(()=>{setProfile({});if(!user?.uid)return;return onSnapshot(doc(db,'users',user.uid),s=>setProfile(s.data()||{}),()=>setProfile({}));},[user?.uid]);return {...user,...profile};}
