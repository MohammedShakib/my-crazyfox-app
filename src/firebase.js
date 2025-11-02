// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// (From your screenshot image_35cfc2.png)
const firebaseConfig = {
  apiKey: "AIzaSyCHfkhukHkz9rH1V0ynkuDMFS2cIVr7DMs",
  authDomain: "crazyfox-f7e51.firebaseapp.com",
  projectId: "crazyfox-f7e51",
  storageBucket: "crazyfox-f7e51.appspot.com",
  messagingSenderId: "410354785507",
  appId: "1:410354785507:web:666c2b15b40aef4f7179d6",
  measurementId: "G-6SG4DR7N53"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
export default app;
