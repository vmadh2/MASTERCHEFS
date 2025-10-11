// src/main.js

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// --- FIREBASE IMPORTS: Added getApps and getApp ---
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, collection, Timestamp } from 'firebase/firestore'

// --- CONFIGURATION ---
// These keys are read from the .env file you created (must be VITE_ prefixed)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// --- INITIALIZATION FIX ---
// Check if an app is already initialized. If not, initialize it.
const firebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

const db = getFirestore(firebaseApp)

// --- EXPORTS ---
export const bubblesCollection = collection(db, 'bubbles')
export { Timestamp }


const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
