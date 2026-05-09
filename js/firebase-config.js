/**
 * @file firebase-config.js
 * @description Firebase SDK initialization for AURA.
 * Uses the compat CDN (equivalent to the modular imports from Firebase Console).
 * 
 * Modular equivalents (for reference):
 *   import { initializeApp } from "firebase/app";
 *   import { getAnalytics } from "firebase/analytics";
 *   import { getFirestore } from "firebase/firestore";
 */

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC_Jyl5J_G5yLLtOTSi1zQXiq2JqQ4NU1k",
  authDomain: "aura-prueba.firebaseapp.com",
  projectId: "aura-prueba",
  storageBucket: "aura-prueba.firebasestorage.app",
  messagingSenderId: "229718782604",
  appId: "1:229718782604:web:5482d48a907d3524f2c1a9",
  measurementId: "G-ECWTWDYKEG"
};

// Initialize Firebase  (compat CDN equivalents of initializeApp / getAnalytics / getFirestore)
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const db  = firebase.firestore();

// Expose instances globally so store.js and other modules can use them
window.firebaseApp = app;
window.firebaseDB  = db;
window.firebaseAnalytics = analytics;
window.firebaseConfig = firebaseConfig;

console.log("%c✦ AURA: Firebase initialized — App, Analytics & Firestore ready.", "color: #b59b6d; font-weight: bold;");
