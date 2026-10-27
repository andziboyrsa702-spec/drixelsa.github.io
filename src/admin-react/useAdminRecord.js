import {useEffect, useState} from 'react';
import {doc, onSnapshot} from 'firebase/firestore';
import {db} from '../config/firebase-react.js';
export default function useAdminRecord(name,id) {
 const [state,setState]=useState({data:null,loading:true,error:''}),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let active=true;setState({data:null,loading:true,error:''});
  const stop=onSnapshot(doc(db,name,id),snapshot=>{if(active)setState({data:snapshot.exists()?{...snapshot.data(),id:snapshot.id}:null,loading:false,error:''});},error=>{if(active)setState({data:null,loading:false,error:error.message});});
  return()=>{active=false;stop();};
 },[name,id,attempt]);
 return {...state,retry:()=>setAttempt(value=>value+1)};
}
