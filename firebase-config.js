// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkDCfaM8MeOmjHPDSSjEmshvfF-IoWJHI",
  authDomain: "writer-mahesh.firebaseapp.com",
  projectId: "writer-mahesh",
  storageBucket: "writer-mahesh.firebasestorage.app",
  messagingSenderId: "1092870107175",
  appId: "1:1092870107175:web:886b621fc9edf35b729e02",
  measurementId: "G-F2RS4TFYPS"
};

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
