import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, setLogLevel } from "firebase/firestore";

// --- Firebase Configuration ---
// Uses environment variables if available, otherwise falls back to hardcoded config
const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAP7QvZ2jsr_-p3IeZ5Gwk1DbicXAavuaQ",
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "macro-f55fd.firebaseapp.com",
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "macro-f55fd",
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "macro-f55fd.firebasestorage.app",
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "442676998372",
        appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:442676998372:web:cbc6f0cf90dbcc628f7cf1",
        measurementId: "G-Q4Y13GXBSD"
    };

// Get app ID from platform or use default
export const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Disable Firestore debug logging to reduce console noise
setLogLevel('silent');
