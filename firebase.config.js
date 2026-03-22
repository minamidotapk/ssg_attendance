import { initializeApp } from "firebase/app";
import { getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

/**
 * Prerender and `next build` evaluate this module without `.env` unless vars are set on the host
 * (e.g. Vercel). Use placeholders so the build can finish; real auth still requires env at runtime.
 */
const hasFirebaseEnv = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

const firebaseConfig = hasFirebaseEnv
  ? {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      ...(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
        ? { measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID }
        : {}),
    }
  : {
      apiKey: "build-placeholder",
      authDomain: "build-placeholder.firebaseapp.com",
      projectId: "build-placeholder",
      storageBucket: "build-placeholder.appspot.com",
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:0000000000000000000000",
    };

if (!hasFirebaseEnv && typeof console !== "undefined") {
  console.warn(
    "[firebase] NEXT_PUBLIC_FIREBASE_* not set — using build placeholders. Set env for a working app (see .env.example).",
  );
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { app, auth, analytics };
