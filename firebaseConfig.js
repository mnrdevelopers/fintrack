// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkDCfaM8MeOmjHPDSSjEmshvfF-IoWJHI",
  authDomain: "writer-mahesh.firebaseapp.com",
  projectId: "writer-mahesh",
  storageBucket: "writer-mahesh.firebasestorage.app",
  messagingSenderId: "1092870107175",
  appId: "1:1092870107175:web:b1494e539c6dca8b729e02",
  measurementId: "G-N86451D5QJ"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
  .catch((err) => {
      console.log('Firebase persistence error: ', err);
  });
