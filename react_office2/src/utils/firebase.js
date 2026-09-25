import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';

const FIREBASE_STORAGE_CONFIG_KEY = 'fastpaisa_firebase_config';

/**
 * Retrieve current Firebase configuration
 * Checks localStorage first (for UI-configured keys), then Vite environment variables
 */
export function getFirebaseConfig() {
  try {
    const saved = localStorage.getItem(FIREBASE_STORAGE_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.apiKey && parsed?.projectId) {
        return { ...parsed, source: 'localStorage' };
      }
    }
  } catch (err) {
    console.warn('Error reading saved Firebase config:', err);
  }

  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return { ...envConfig, source: 'env' };
  }

  return { ...envConfig, source: 'none' };
}

/**
 * Save Firebase configuration to localStorage (so users can paste credentials directly in UI)
 */
export function saveFirebaseConfig(config) {
  try {
    if (!config || !config.apiKey) {
      localStorage.removeItem(FIREBASE_STORAGE_CONFIG_KEY);
      // Reset cached instances
      firebaseAppInstance = null;
      firebaseAuthInstance = null;
      return { success: true };
    }
    const cleanConfig = {
      apiKey: config.apiKey?.trim() || '',
      authDomain: config.authDomain?.trim() || '',
      projectId: config.projectId?.trim() || '',
      storageBucket: config.storageBucket?.trim() || '',
      messagingSenderId: config.messagingSenderId?.trim() || '',
      appId: config.appId?.trim() || '',
      measurementId: config.measurementId?.trim() || '',
    };
    localStorage.setItem(FIREBASE_STORAGE_CONFIG_KEY, JSON.stringify(cleanConfig));
    // Reset cached instances
    firebaseAppInstance = null;
    firebaseAuthInstance = null;
    return { success: true, config: cleanConfig };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Check if valid Firebase credentials are provided
 */
export function isFirebaseConfigured() {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId);
}

/**
 * Initialize or get existing Firebase App instance
 */
let firebaseAppInstance = null;
let firebaseAuthInstance = null;

export function getFirebaseApp() {
  const config = getFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    return null;
  }

  try {
    if (getApps().length > 0) {
      firebaseAppInstance = getApp();
    } else {
      firebaseAppInstance = initializeApp(config);
    }
    return firebaseAppInstance;
  } catch (err) {
    console.error('Failed to initialize Firebase App:', err);
    return null;
  }
}

/**
 * Get or initialize Firebase Auth instance
 */
export function getFirebaseAuth() {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!firebaseAuthInstance) {
    firebaseAuthInstance = getAuth(app);
  }
  return firebaseAuthInstance;
}

/**
 * Google Auth Provider
 */
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Sign In with Google Popup
 */
export async function loginWithFirebaseGoogle() {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase is not configured. Please add your Firebase configuration.');
  }
  const result = await signInWithPopup(auth, googleAuthProvider);
  return result.user;
}

/**
 * Sign In with Email and Password
 */
export async function loginWithFirebaseEmail(email, password) {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase is not configured. Please add your Firebase configuration.');
  }
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
}

/**
 * Sign Up with Email and Password
 */
export async function signupWithFirebaseEmail(email, password, displayName = '') {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase is not configured. Please add your Firebase configuration.');
  }
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName && result.user) {
    await updateProfile(result.user, { displayName });
  }
  return result.user;
}

/**
 * Sign Out from Firebase
 */
export async function logoutFromFirebase() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
}

/**
 * Send Password Reset Email
 */
export async function resetFirebasePassword(email) {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase is not configured.');
  }
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Subscribe to Auth State Changes
 */
export function subscribeToAuthChanges(callback) {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Map Firebase error codes to clean, human-readable messages
 */
export function formatFirebaseAuthError(error) {
  if (!error) return 'An unknown error occurred.';
  const code = error.code || '';
  const message = error.message || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please log in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/invalid-email':
      return 'The email address format is invalid. Please enter a valid email.';
    case 'auth/user-disabled':
      return 'This user account has been disabled by administrators.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing the sign-in.';
    case 'auth/popup-blocked':
      return 'Google sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in your Firebase Console (Authentication > Sign-in method).';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Access temporarily blocked due to multiple failed attempts. Please try again in a few moments.';
    case 'auth/requires-recent-login':
      return 'This action requires you to log in again.';
    default:
      return message || 'Authentication failed. Please try again.';
  }
}
