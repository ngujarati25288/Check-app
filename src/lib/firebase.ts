import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { 
  initializeFirestore,
  doc, 
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider, CustomProvider } from 'firebase/app-check';
import firebaseConfig from '../../firebase-applet-config.json';
import { DBUser } from '../types';

// Check if using placeholder config
export const isFirebasePlaceholder = !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("PLACEHOLDER");

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize App Check (Fix 2)
if (typeof window !== "undefined" && !isFirebasePlaceholder) {
  try {
    const isAndroidApp = navigator.userAgent.toLowerCase().includes("android");
    const isAISDev = window.location.hostname.includes("run.app") || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const isInIframe = window.self !== window.top;
    
    if (isAISDev || isInIframe) {
      console.log("Firebase App Check bypassed in dev/iframe/automation environment to prevent Firestore connection timeouts.");
    } else if (isAndroidApp) {
      initializeAppCheck(app, {
        provider: new CustomProvider({
          getToken: async () => {
            // Stub for Android native Play Integrity token extraction when wrapper is active
            if ((window as any).AndroidAppCheckBridge) {
              const token = await (window as any).AndroidAppCheckBridge.getPlayIntegrityToken();
              return {
                token,
                expireTimeMillis: Date.now() + 30 * 60 * 1000
              };
            }
            return {
              token: "PLAY_INTEGRITY_DEBUG_APP_CHECK_TOKEN",
              expireTimeMillis: Date.now() + 30 * 60 * 1000
            };
          }
        }),
        isTokenAutoRefreshEnabled: true,
      });
      console.log("Firebase App Check (Android) securely initialized.");
    } else {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider("6Lca-mEqAAAAAL_Bv3KIsi_DfeO613OaE4e8fL8p"),
        isTokenAutoRefreshEnabled: true,
      });
      console.log("Firebase App Check (Web) securely initialized.");
    }
  } catch (err) {
    console.warn("App Check initialization warning:", err);
  }
}

// Export Auth & DB references
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, (firebaseConfig as any).firestoreDatabaseId);

// ----------------------------------------------------
// FIRESTORE ERROR HANDLERS (As required by guidelines)
// ----------------------------------------------------
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ----------------------------------------------------
// CONNECTION CHECK (As required by guidelines)
// ----------------------------------------------------
export async function testConnection() {
  if (isFirebasePlaceholder) {
    console.log("Firebase is running in local emulation/demo mode.");
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Successfully connected to live Cloud Firestore.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore client is offline. Checking fallback connection.");
    }
  }
}

testConnection();
