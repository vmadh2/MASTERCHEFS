import { initializeApp } from 'firebase/app';
import { getFirestore, collection, Timestamp } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "deco2850-bubbles.firebaseapp.com",
  projectId: "deco2850-bubbles",
  storageBucket: "deco2850-bubbles.firebasestorage.app",
  messagingSenderId: "449076073698",
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export commonly used collections and utilities
export const bubblesCollection = collection(db, 'bubbles');
export { db, Timestamp };