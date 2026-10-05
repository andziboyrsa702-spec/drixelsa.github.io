import {initializeApp,getApps} from 'firebase/app';
import {getAuth,connectAuthEmulator} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator} from 'firebase/firestore';
const firebaseConfig={apiKey:'AIzaSyA4_Ejkc3Of0T8fCj1QqkNN78-2xJ882F0',authDomain:'drixel-sa.firebaseapp.com',projectId:'drixel-sa',storageBucket:'drixel-sa.firebasestorage.app',messagingSenderId:'620600264300',appId:'1:620600264300:web:525de2d55cc1ae6269fa49',measurementId:'G-RTRKFY9NPW'};
export const app=getApps()[0]||initializeApp(firebaseConfig);
export const auth=getAuth(app);
export const db=getFirestore(app);
// Opt in explicitly so local Functions and browser records use the same store.
// Production builds always use the deployed Firebase services.
if(import.meta.env.DEV&&import.meta.env.VITE_USE_FIREBASE_EMULATORS==='true'){
 const connected=globalThis.__drixelEmulatedApps||(globalThis.__drixelEmulatedApps=new WeakSet());
 if(!connected.has(app)){
  connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  connectFirestoreEmulator(db,'127.0.0.1',8080);
  connected.add(app);
 }
}
