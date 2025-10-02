import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDnilarzFeinGmd_su6c6NO79DZkBs1Nc4",
  authDomain: "deco2850-bubbles.firebaseapp.com",
  projectId: "deco2850-bubbles",
  storageBucket: "deco2850-bubbles.firebasestorage.app",
  messagingSenderId: "449076073698",
  appId: "1:449076073698:web:be69221ad95da18203fabb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };