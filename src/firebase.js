import { initializeApp } from 'firebase/app';
import { getFirestore, collection, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "deco2850-bubbles.firebaseapp.com",
  projectId: "deco2850-bubbles",
  storageBucket: "deco2850-bubbles.firebasestorage.app",
  messagingSenderId: "449076073698",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export commonly used collections and utilities
export const bubblesCollection = collection(db, 'bubbles');
export { db, Timestamp };