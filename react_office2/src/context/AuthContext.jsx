import { useState, useEffect } from 'react';
import {
  AuthContext, ADMIN_USER, DEFAULT_CREDENTIALS, STORAGE_KEY,
  AUTHORIZED_DATABASE_USERS, getRegisteredUsers, saveRegisteredUser,
  resolveUserProfile,
} from '../utils/auth';
import {
  isFirebaseConfigured,
  loginWithFirebaseGoogle,
  loginWithFirebaseEmail,
  logoutFromFirebase,
  resetFirebasePassword,
  subscribeToAuthChanges,
  formatFirebaseAuthError,
  getFirebaseConfig,
  saveFirebaseConfig,
} from '../utils/firebase';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('snappaisa_executive_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [firebaseActive, setFirebaseActive] = useState(() => isFirebaseConfigured());

  // Keep firebaseActive updated
  const refreshFirebaseStatus = () => {
    setFirebaseActive(isFirebaseConfigured());
  };

  // Sync session state to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [user]);

  // Check if an email is authorized in pre-defined database or company domain
  const isPredefinedOrAuthorized = (email) => {
    if (!email) return false;
    const clean = email.toLowerCase().trim();
    if (clean.endsWith('@fastpaisa.com')) return true;
    const authorizedList = getRegisteredUsers();
    return authorizedList.some((u) => (u.email || '').toLowerCase().trim() === clean);
  };

  // Subscribe to real Firebase Auth changes
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    try {
      const unsubscribe = subscribeToAuthChanges(async (fbUser) => {
        if (fbUser) {
          // Verify user is authorized
          const email = fbUser.email || '';
          if (isPredefinedOrAuthorized(email)) {
            const profile = resolveUserProfile(fbUser);
            setUser((prev) => {
              if (prev?.email === profile.email) return prev;
              return profile;
            });
          } else {
            // Unregistered user attempted login
            await logoutFromFirebase();
            setUser(null);
            setAuthError(`Access Denied: Account (${email}) is not in the pre-defined authorized list.`);
          }
        }
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    } catch (err) {
      console.warn('Firebase auth subscription error:', err);
    }
  }, [firebaseActive]);

  /**
   * Unified Login: Only with Pre-Defined Credentials
   */
  const login = async (idOrEmail, password, remember = true) => {
    setIsAuthenticating(true);
    setAuthError('');

    const cleanId = String(idOrEmail || '').trim();
    const cleanPass = String(password || '').trim();

    // 1. If Firebase is active and input looks like an email, try Firebase first
    if (isFirebaseConfigured() && cleanId.includes('@')) {
      try {
        const fbUser = await loginWithFirebaseEmail(cleanId, cleanPass);
        
        // Strict pre-defined verification
        if (!isPredefinedOrAuthorized(fbUser.email)) {
          await logoutFromFirebase();
          const err = `Access Denied: Account (${fbUser.email}) is not in the pre-defined authorized list.`;
          setAuthError(err);
          setIsAuthenticating(false);
          return { success: false, error: err };
        }

        const resolved = resolveUserProfile(fbUser);
        setUser(resolved);
        setIsAuthenticating(false);
        return { success: true, user: resolved, authProvider: 'firebase' };
      } catch (fbErr) {
        // Fallback check against offline pre-defined administrative accounts
        const localMatch = AUTHORIZED_DATABASE_USERS.find(
          (acc) => acc.email.toLowerCase() === cleanId.toLowerCase() && acc.password === cleanPass
        );

        if (localMatch) {
          const authenticatedUser = {
            ...localMatch,
            lastLogin: new Date().toISOString(),
            remember,
            authProvider: 'local_bypass',
          };
          setUser(authenticatedUser);
          setIsAuthenticating(false);
          return { success: true, user: authenticatedUser, authProvider: 'local' };
        }

        const friendly = formatFirebaseAuthError(fbErr);
        setAuthError(friendly);
        setIsAuthenticating(false);
        return { success: false, error: friendly };
      }
    }

    // 2. Local / Pre-defined Authorized Database verification
    await new Promise((resolve) => setTimeout(resolve, 350));
    const cleanLowerId = cleanId.toLowerCase();

    const matchedAccount = AUTHORIZED_DATABASE_USERS.find(
      (acc) =>
        acc.email.toLowerCase() === cleanLowerId ||
        acc.username.toLowerCase() === cleanLowerId ||
        acc.id.toLowerCase() === cleanLowerId
    );

    if (!matchedAccount) {
      setIsAuthenticating(false);
      const error = 'Access Denied: Unregistered ID or Email. Only pre-defined accounts can log in.';
      setAuthError(error);
      return { success: false, error };
    }

    if (matchedAccount.password !== cleanPass) {
      setIsAuthenticating(false);
      const error = 'Access Denied: Incorrect password for this pre-defined account.';
      setAuthError(error);
      return { success: false, error };
    }

    // Local account granted
    const authenticatedUser = {
      ...matchedAccount,
      lastLogin: new Date().toISOString(),
      remember,
      authProvider: 'local',
    };

    setUser(authenticatedUser);
    setIsAuthenticating(false);
    return { success: true, user: authenticatedUser, authProvider: 'local' };
  };

  /**
   * Google Sign-In: Only Pre-Defined Accounts Allowed
   */
  const loginWithGoogle = async (fallbackProfile = null) => {
    setIsAuthenticating(true);
    setAuthError('');

    // If Firebase is active, launch Firebase Google popup
    if (isFirebaseConfigured() && !fallbackProfile) {
      try {
        const fbUser = await loginWithFirebaseGoogle();
        
        // Strict pre-defined verification
        if (!isPredefinedOrAuthorized(fbUser.email)) {
          await logoutFromFirebase();
          const err = `Access Denied: The Google account (${fbUser.email}) is not authorized.`;
          setAuthError(err);
          setIsAuthenticating(false);
          return { success: false, error: err };
        }

        const profile = resolveUserProfile(fbUser);
        setUser(profile);
        setIsAuthenticating(false);
        return { success: true, user: profile, authProvider: 'firebase_google' };
      } catch (err) {
        if (err.code === 'auth/popup-closed-by-user') {
          setIsAuthenticating(false);
          return { success: false, error: 'Sign-in cancelled (popup closed).' };
        }
        const friendly = formatFirebaseAuthError(err);
        setAuthError(friendly);
        setIsAuthenticating(false);
        return { success: false, error: friendly };
      }
    }

    // Fallback: Selected profile from pre-defined list
    if (!fallbackProfile || !fallbackProfile.email) {
      setIsAuthenticating(false);
      const error = 'Please select a pre-defined authorized profile.';
      setAuthError(error);
      return { success: false, error };
    }

    const cleanEmail = fallbackProfile.email.trim().toLowerCase();
    if (!isPredefinedOrAuthorized(cleanEmail)) {
      setIsAuthenticating(false);
      const error = `Access Denied: (${cleanEmail}) is not a pre-defined authorized account.`;
      setAuthError(error);
      return { success: false, error };
    }

    const matched = AUTHORIZED_DATABASE_USERS.find(
      (u) => u.email.toLowerCase() === cleanEmail
    ) || fallbackProfile;

    const userPayload = {
      ...matched,
      lastLogin: new Date().toISOString(),
      authProvider: 'google',
    };

    setUser(userPayload);
    setIsAuthenticating(false);
    return { success: true, user: userPayload };
  };

  /**
   * Phone Number and OTP Login (Pre-Defined Central Head only)
   */
  const loginWithOTP = async (phone, otp, remember = true) => {
    setIsAuthenticating(true);
    setAuthError('');

    await new Promise((resolve) => setTimeout(resolve, 500));

    const cleanPhone = phone.replace(/\D/g, '');
    const cleanOTP = otp.trim();

    if (
      (cleanPhone === DEFAULT_CREDENTIALS.phone || cleanPhone.endsWith(DEFAULT_CREDENTIALS.phone.slice(-10))) &&
      cleanOTP === DEFAULT_CREDENTIALS.otp
    ) {
      const authenticatedUser = {
        ...ADMIN_USER,
        phone: `+91 ${cleanPhone.slice(-10)}`,
        lastLogin: new Date().toISOString(),
        remember,
        authProvider: 'phone_otp',
      };
      setUser(authenticatedUser);
      setIsAuthenticating(false);
      return { success: true, user: authenticatedUser };
    }

    setIsAuthenticating(false);
    const error = cleanOTP !== DEFAULT_CREDENTIALS.otp
      ? 'Invalid Security OTP. Default code is 123456.'
      : 'Unregistered mobile number for Central Head terminal access.';
    setAuthError(error);
    return { success: false, error };
  };

  /**
   * 1-Click Central Head Login
   */
  const quickAdminLogin = async () => {
    setIsAuthenticating(true);
    setAuthError('');
    await new Promise((resolve) => setTimeout(resolve, 300));
    setUser(ADMIN_USER);
    setIsAuthenticating(false);
    return { success: true, user: ADMIN_USER };
  };

  /**
   * Password Reset
   */
  const sendPasswordReset = async (email) => {
    if (!isFirebaseConfigured()) {
      return { success: false, error: 'Password reset requires Firebase to be configured.' };
    }
    try {
      await resetFirebasePassword(email);
      return { success: true };
    } catch (err) {
      const friendly = formatFirebaseAuthError(err);
      return { success: false, error: friendly };
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      if (isFirebaseConfigured()) {
        await logoutFromFirebase();
      }
    } catch (err) {
      console.warn('Firebase logout warning:', err);
    }
    setUser(null);
    setAuthError('');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAuthenticating,
        authError,
        setAuthError,
        isFirebaseActive: isFirebaseConfigured(),
        firebaseConfig: getFirebaseConfig(),
        saveFirebaseConfig: (cfg) => {
          const res = saveFirebaseConfig(cfg);
          refreshFirebaseStatus();
          return res;
        },
        login,
        loginWithOTP,
        loginWithGoogle,
        quickAdminLogin,
        sendPasswordReset,
        logout,
        registeredUsers: getRegisteredUsers(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
