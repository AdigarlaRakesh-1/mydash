import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAWTPDAm_dnjq3AtgCgaktnTUP1LmXxFu0",
  authDomain: "mydash-sync.firebaseapp.com",
  projectId: "mydash-sync",
  storageBucket: "mydash-sync.firebasestorage.app",
  messagingSenderId: "51931691249",
  appId: "1:51931691249:web:4e44477e5d77f870e21150",
  measurementId: "G-HCW6868EN4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Google Provider
const googleProvider = new GoogleAuthProvider();

// Global Auth State Helper
window.firebaseAuthLoaded = new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
        window.currentUser = user;
        window.db = db;
        resolve(user);
    });
});

export { 
    db, 
    auth, 
    signInWithPopup,
    GoogleAuthProvider,
    googleProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
};
