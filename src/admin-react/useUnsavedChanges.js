import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useDialog} from '../components/DialogProvider.jsx';
export default function useUnsavedChanges(dirty) {
 const navigate=useNavigate(),dialog=useDialog();
 useEffect(()=>{
  if(!dirty)return;
  let asking=false;
  const warn=event=>{event.preventDefault();event.returnValue='';};
  const follow=async event=>{
   const anchor=event.target.closest?.('a[href]');
   if(!anchor||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||anchor.target==='_blank'||anchor.hasAttribute('download'))return;
   const target=new URL(anchor.href,location.href);
   if(target.origin!==location.origin||target.href===location.href)return;
   event.preventDefault();event.stopPropagation();
   if(asking)return;asking=true;
   const confirmed=await dialog.confirm({title:'Leave unsaved changes?',message:'Your edits have not been saved. Save them before leaving, or discard this edit.',confirmLabel:'Discard changes',danger:true});
   asking=false;if(confirmed)navigate(target.pathname+target.search+target.hash);
  };
  window.addEventListener('beforeunload',warn);document.addEventListener('click',follow,true);
  return()=>{window.removeEventListener('beforeunload',warn);document.removeEventListener('click',follow,true);};
 },[dirty,navigate,dialog]);
}
