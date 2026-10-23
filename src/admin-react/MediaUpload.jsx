import React,{useRef,useState} from 'react';
import {addDoc,collection,serverTimestamp} from 'firebase/firestore';
import {auth,db} from '../config/firebase-react.js';
import {apiUrl} from '../utils/api.js';
export default function MediaUpload({label='Upload media',accept='image/jpeg,image/png,image/webp,video/mp4,video/webm',onUploaded,disabled=false,purpose='studio'}){
 const input=useRef(),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState('');
 async function upload(event){
  const file=event.target.files?.[0];if(!file)return;setError('');
  const image=['image/jpeg','image/png','image/webp'].includes(file.type),video=['video/mp4','video/webm'].includes(file.type);
  if((!image&&!video)||(!accept.includes('video')&&video)||(!accept.includes('image')&&image)){setError('Choose a JPEG, PNG, WebP image or MP4/WebM video supported by this field.');event.target.value='';return;}
  if(file.size>(image?10:100)*1024*1024){setError(image?'Images must be 10 MB or smaller.':'Videos must be 100 MB or smaller.');event.target.value='';return;}
  setBusy(true);setProgress(0);
  try{
   if(!auth.currentUser)throw Error('Sign in as an administrator before uploading.');
   const token=await auth.currentUser.getIdToken(),response=await fetch(apiUrl('/api/media/sign'),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({type:file.type,size:file.size})});
   const signed=await response.json().catch(()=>({}));if(!response.ok||!signed.signature)throw Error(signed.message||'The upload API is unavailable. Complete the Cloudflare setup.');
   const form=new FormData();form.append('file',file);form.append('api_key',signed.apiKey);form.append('signature',signed.signature);Object.entries(signed.params).forEach(([key,value])=>form.append(key,String(value)));
   const result=await new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('POST','https://api.cloudinary.com/v1_1/'+encodeURIComponent(signed.cloudName)+'/'+signed.resourceType+'/upload');xhr.timeout=180000;xhr.upload.onprogress=e=>{if(e.lengthComputable)setProgress(Math.round(e.loaded/e.total*100));};xhr.onerror=()=>reject(Error('Check your internet connection.'));xhr.ontimeout=()=>reject(Error('Upload timed out.'));xhr.onload=()=>{let data;try{data=JSON.parse(xhr.responseText);}catch{return reject(Error('Invalid upload response.'));}if(xhr.status<200||xhr.status>=300||!data.secure_url)return reject(Error(data.error?.message||'Cloudinary rejected the upload.'));resolve(data);};xhr.send(form);});
   const url=result.secure_url,path=result.public_id;
   try{await addDoc(collection(db,'media_assets'),{url,path,name:file.name,type:file.type,size:file.size,purpose,provider:'cloudinary',assetId:result.asset_id||'',uploadedBy:auth.currentUser.uid,createdAt:serverTimestamp()});}catch{setError('Upload finished, but the media library record could not be saved. Keep the URL in this editor.');}
   onUploaded?.({url,path,name:file.name,type:file.type});
  }catch(e){setError('Upload failed. '+(e.message||'Check your connection.'));}finally{setBusy(false);event.target.value='';}
 }
 return <div className="ra-upload"><input ref={input} tabIndex={-1} type="file" accept={accept} aria-label={label+' file'} onChange={upload} disabled={busy||disabled} className="ra-file-input"/><button type="button" disabled={busy||disabled} onClick={()=>input.current?.click()}>{busy?'Uploading '+progress+'%…':label}</button><span>{accept.includes('video')?'Images up to 10 MB · videos up to 100 MB':'JPEG, PNG or WebP · up to 10 MB'}</span>{busy&&<progress value={progress} max="100" aria-label="Upload progress"/>}{error&&<p role="alert">{error}</p>}</div>;
}
