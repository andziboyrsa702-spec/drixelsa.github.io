const {test,before,after}=require('node:test');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {ref,uploadBytes,getBytes,deleteObject}=require('firebase/storage');
const fs=require('node:fs');let env;
const upload=(ctx,path,type='image/png',bytes=new Uint8Array([1,2]))=>uploadBytes(ref(ctx.storage(),path),bytes,{contentType:type});
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-drixel',storage:{rules:fs.readFileSync('storage.rules','utf8')}});await env.withSecurityRulesDisabled(ctx=>upload(ctx,'admin-media/admin/existing.png'));});after(async()=>{await env?.cleanup()});
test('existing published media remains readable',async()=>{await assertSucceeds(getBytes(ref(env.unauthenticatedContext().storage(),'admin-media/admin/existing.png')));});
test('direct uploads are denied for anonymous, customer and administrator sessions',async()=>{for(const context of [env.unauthenticatedContext(),env.authenticatedContext('customer'),env.authenticatedContext('admin',{admin:true,drixel_admin_method:'totp',drixel_admin_key_version:'v1',drixel_admin_verified_at:Math.floor(Date.now()/1000)})])await assertFails(upload(context,'admin-media/admin/new.png'));});
test('an administrator token cannot overwrite or delete published files through the legacy client path',async()=>{const admin=env.authenticatedContext('admin',{admin:true,drixel_admin_verified_at:Math.floor(Date.now()/1000)});await assertFails(upload(admin,'admin-media/admin/existing.png'));await assertFails(deleteObject(ref(admin.storage(),'admin-media/admin/existing.png')));await assertSucceeds(getBytes(ref(admin.storage(),'admin-media/admin/existing.png')));});
