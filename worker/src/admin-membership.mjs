import {createHash} from 'node:crypto';
import {apiError} from './security.mjs';
export const ownerEmails=new Set(['admin@drixelsa.co.za','drixelsa@gmail.com']);
export const normalizedEmail=value=>String(value||'').trim().toLowerCase();
export const accessId=email=>createHash('sha256').update(normalizedEmail(email)).digest('hex');
export const isOwner=user=>user.email_verified===true&&ownerEmails.has(normalizedEmail(user.email));
export async function resolveAdminMembership(database,user){
 const email=normalizedEmail(user.email),id=user.drixel_admin_access_id||accessId(email);
 if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw apiError('Administrator access is invalid.',403);
 const ref=database.doc('admin_access/'+id),record=(await ref.get()).data();
 if(record){
  if(record.active!==true||user.email_verified!==true||record.email!==email||record.uid&&record.uid!==user.uid)throw apiError('Administrator access has been removed or is unavailable for this account.',403);
  if(!record.uid){await database.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(!current?.active||current.email!==email||current.uid&&current.uid!==user.uid||current.version!==record.version)throw apiError('Administrator access changed. Sign in again.',403);tx.update(ref,{uid:user.uid,acceptedAt:Date.now()});});}
  if(user.drixel_admin_access_version&&user.drixel_admin_access_version!==record.version)throw apiError('Administrator access changed. Sign out and sign in again.',403);
  return {...user,admin:true,drixel_admin_access_id:id,drixel_admin_access_version:record.version};
 }
 if(user.drixel_admin_access_id||!(isOwner(user)||user.admin===true||user.role==='admin'))throw apiError('Administrator access required.',403);
 return user;
}
