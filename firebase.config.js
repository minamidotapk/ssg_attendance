import { initializeApp } from "firebase/app";
import { getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAWzeBqMPgY9--W-HJTxHp-7q702yquUao",
  authDomain: "ssg-2025-2026.firebaseapp.com",
  projectId: "ssg-2025-2026",
  storageBucket: "ssg-2025-2026.firebasestorage.app",
  messagingSenderId: "1093767602312",
  appId: "1:1093767602312:web:99b7ac05d346e1cd3a7f3d",
  measurementId: "G-5M7SCY2D90"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { app, auth, analytics };