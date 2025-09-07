// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvGG6llfnliIgjQsYLjuF4rocMRqoYeVM",
  authDomain: "streckenliste-jagd.firebaseapp.com",
  projectId: "streckenliste-jagd",
  storageBucket: "streckenliste-jagd.firebasestorage.app",
  messagingSenderId: "980254797017",
  appId: "1:980254797017:web:a9f21e1f502cbfbd54a2c8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { db };
