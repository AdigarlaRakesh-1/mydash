import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
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
const googleProvider = new GoogleAuthProvider();

// Global Auth State Helper
window.firebaseAuthLoaded = new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
        // If we have an anonymous user from the previous implementation, 
        // sign them out to force the new Login screen.
        if (user && user.isAnonymous) {
            console.log("Stale anonymous session detected. Signing out...");
            await signOut(auth);
            window.currentUser = null;
            resolve(null);
            return;
        }

        window.currentUser = user;
        window.db = db;
        resolve(user);
    });
});

export { 
    db, 
    auth, 
    googleProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged
};
