import {initializeApp,getApps} from 'firebase/app';
import {getAuth,connectAuthEmulator} from 'firebase/auth';
const firebaseConfig={apiKey:'AIzaSyA4_Ejkc3Of0T8fCj1QqkNN78-2xJ882F0',authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN||'drixel-sa.firebaseapp.com',projectId:'drixel-sa',storageBucket:'drixel-sa.firebasestorage.app',messagingSenderId:'620600264300',appId:'1:620600264300:web:525de2d55cc1ae6269fa49',measurementId:'G-RTRKFY9NPW'};
export const app=getApps()[0]||initializeApp(firebaseConfig);
export const auth=getAuth(app);

if(import.meta.env.DEV&&import.meta.env.VITE_USE_FIREBASE_EMULATORS==='true'&&!globalThis.__drixelAuthEmulator){connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});globalThis.__drixelAuthEmulator=true;}
