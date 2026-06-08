// firebase.js
import { getDatabase } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { getFirestore }  from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "freshkeep-612df.firebaseapp.com",
  projectId: "freshkeep-612df",
  storageBucket: "freshkeep-612df.firebasestorage.app",
  messagingSenderId: "1047393428520",
  appId: "1:1047393428520:web:ab3933d9d1f33a04b5011d",
  // ADD THIS EXACT LINE BELOW:
  databaseURL: "https://freshkeep-612df-default-rtdb.asia-southeast1.firebasedatabase.app"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
// ── FIXED: Added AsyncStorage persistence ──
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

