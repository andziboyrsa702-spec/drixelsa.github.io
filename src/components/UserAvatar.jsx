import React,{useState} from 'react';
export default function UserAvatar({user={},size=36}){
 const raw=user.photoURL??user.photoUrl??user.providerPhotoURL??'',safe=/^https:\/\//i.test(raw)||/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(raw),[failed,setFailed]=useState('');
 const name=user.displayName||user.name||user.email||'User',initials=name.split(/[\s@]+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
 return safe&&failed!==raw?<img className="dx-user-avatar" style={{width:size,height:size}} src={raw} alt={`${name} profile picture`} referrerPolicy="no-referrer" onError={()=>setFailed(raw)}/>:<span className="dx-user-avatar dx-user-initials" style={{width:size,height:size}} role="img" aria-label={`${name} profile picture`}>{initials}</span>;
}
