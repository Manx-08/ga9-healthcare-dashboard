// ============================================================
// Firebase connection config
// ============================================================
// Replace the placeholder values below with YOUR project's web config.
//
// HOW TO GET THESE VALUES:
// 1. Go to console.firebase.google.com -> open your project
// 2. Click the gear icon (top left) -> Project settings
// 3. Scroll down to "Your apps" -> if no web app exists yet,
//    click the </> (web) icon to register one (nickname: "ga9-dashboard")
// 4. Firebase will show you a config object exactly like the shape below --
//    copy each value into the matching field here.
// ============================================================

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db };

//import { initializeApp } from "firebase/app";


//const firebaseConfig = {
  //apiKey: "AIzaSyAqlQoFphkb-X0iqcM-4XFlOis0hTlhfKM",
  //authDomain: "healthcare-iot-monitoring-sys.firebaseapp.com",
  //projectId: "healthcare-iot-monitoring-sys",
  //storageBucket: "healthcare-iot-monitoring-sys.firebasestorage.app",
  //messagingSenderId: "290606890348",
  //appId: "1:290606890348:web:0483179e04fa3549124749",
  //measurementId: "G-3301S12DT6"
//};

//const app = initializeApp(firebaseConfig);

//const db = getFirestore(app);

//export { db }
