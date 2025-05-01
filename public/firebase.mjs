// firebase.mjs
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCNgxPx2VcLvmK7z_7yrHy0KiVZrKxbXY8",
    authDomain: "shoppinglist-4d044.firebaseapp.com",
    projectId: "shoppinglist-4d044",
    storageBucket: "shoppinglist-4d044.appspot.com",
    messagingSenderId: "1072625332979",
    appId: "1:1072625332979:web:eee62a4c7af0b26d83e3fc"
};

// console.log("[Firebase] Initializing Firebase app...");
const app = initializeApp(firebaseConfig);
// console.log("[Firebase] App initialized successfully");

// console.log("[Firebase] Getting Firestore instance...");
const db = getFirestore(app);
// console.log("[Firebase] Firestore instance created successfully");

export { db }; 