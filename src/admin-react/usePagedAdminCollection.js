import {useEffect,useState} from 'react';
import {collection,query,orderBy,documentId,startAfter,limit,onSnapshot} from 'firebase/firestore';
import {db} from '../config/firebase-react.js';
export function usePagedAdminCollection(name,pageSize=50){
 const [cursors,setCursors]=useState([null]),[page,setPage]=useState(0),[attempt,setAttempt]=useState(0),[state,setState]=useState({data:[],loading:true,error:'',next:null});
 useEffect(()=>{setCursors([null]);setPage(0)},[name]);
 useEffect(()=>{let live=true;if(!name){setState({data:[],loading:false,error:'',next:null});return}setState({data:[],loading:true,error:'',next:null});const constraints=[orderBy(documentId()),...(cursors[page]?[startAfter(cursors[page])]:[]),limit(pageSize+1)];const stop=onSnapshot(query(collection(db,name),...constraints),snapshot=>{if(!live)return;const docs=snapshot.docs.slice(0,pageSize);setState({data:docs.map(d=>({...d.data(),id:d.id})),loading:false,error:'',next:snapshot.docs.length>pageSize?docs.at(-1).id:null})},error=>{if(live)setState({data:[],loading:false,error:'Could not load this page. '+error.message,next:null})});return()=>{live=false;stop()}},[name,page,cursors,attempt,pageSize]);
 return {...state,retry:()=>setAttempt(x=>x+1),page:page+1,previous:page>0?()=>setPage(x=>x-1):null,more:state.next?()=>{setCursors(x=>[...x.slice(0,page+1),state.next]);setPage(x=>x+1)}:null};
}
