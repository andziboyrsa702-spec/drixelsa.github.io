import {getFirestore,connectFirestoreEmulator} from 'firebase/firestore';
import {app,auth} from './firebase-auth.js';
export {app,auth};
export const db=getFirestore(app);
if(import.meta.env.DEV&&import.meta.env.VITE_USE_FIREBASE_EMULATORS==='true'&&!globalThis.__drixelFirestoreEmulator){connectFirestoreEmulator(db,'127.0.0.1',8080);globalThis.__drixelFirestoreEmulator=true;}
