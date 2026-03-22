import { initializeApp } from "firebase/app";
import { getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

/** Non-empty string or undefined (empty Vercel env values count as missing). */
function env(name) {
  const v = process.env[name];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

const firebaseConfig = {
  apiKey: env("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: env("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: env("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: env("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: env("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: env("NEXT_PUBLIC_FIREBASE_APP_ID"),
  ...(env("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID")
    ? { measurementId: env("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID") }
    : {}),
};

const REQUIRED_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const missingKeys = REQUIRED_KEYS.filter((k) => !firebaseConfig[k]);
const useBuildPlaceholders = missingKeys.length === REQUIRED_KEYS.length;
const hasPartialConfig = missingKeys.length > 0 && !useBuildPlaceholders;

let config = firebaseConfig;

if (useBuildPlaceholders) {
  config = {
    apiKey: "build-placeholder",
    authDomain: "build-placeholder.firebaseapp.com",
    projectId: "build-placeholder",
    storageBucket: "build-placeholder.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:0000000000000000000000",
  };
  if (typeof console !== "undefined") {
    console.warn(
      "[firebase] No NEXT_PUBLIC_FIREBASE_* — using placeholders for build/SSR. Set all client keys in Vercel and redeploy.",
    );
  }
} else if (hasPartialConfig) {
  const names = {
    apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY",
    authDomain: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    storageBucket: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    messagingSenderId: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    appId: "NEXT_PUBLIC_FIREBASE_APP_ID",
  };
  const missingNames = missingKeys.map((k) => names[k]).join(", ");
  throw new Error(
    `Incomplete Firebase client env. Set every variable (names are case-sensitive: NEXT not NEXt): ${missingNames}. Redeploy after saving.`,
  );
}

const app = getApps().length ? getApp() : initializeApp(config);
const auth = getAuth(app);

let analytics;
if (typeof window !== "undefined" && config.measurementId && !useBuildPlaceholders) {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("[firebase] Analytics disabled:", e);
  }
}

export { app, auth, analytics };
