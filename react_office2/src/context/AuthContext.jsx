import { useState, useEffect } from 'react';
import {
  AuthContext, ADMIN_USER, DEFAULT_CREDENTIALS, STORAGE_KEY,
  AUTHORIZED_DATABASE_USERS, getRegisteredUsers,
} from '../utils/auth';

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

  // Sync state to localStorage
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

  /**
   * Strictly verify credentials against pre-trained / pre-defined database
   */
  const login = async (idOrEmail, password, remember = true) => {
    setIsAuthenticating(true);
    setAuthError('');

    await new Promise((resolve) => setTimeout(resolve, 500));

    const cleanId = String(idOrEmail || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    // STRICT CHECK: ONLY MATCH AGAINST PRE-DEFINED DATABASE
    const matchedAccount = AUTHORIZED_DATABASE_USERS.find(
      (acc) =>
        acc.email.toLowerCase() === cleanId ||
        acc.username.toLowerCase() === cleanId ||
        acc.id.toLowerCase() === cleanId
    );

    if (!matchedAccount) {
      setIsAuthenticating(false);
      const error = 'Access Denied: ID / Email is not registered in the authorized database.';
      setAuthError(error);
      return { success: false, error };
    }

    if (matchedAccount.password !== cleanPass) {
      setIsAuthenticating(false);
      const error = 'Access Denied: Incorrect password for this authorized account.';
      setAuthError(error);
      return { success: false, error };
    }

    // Success: Login granted
    const authenticatedUser = {
      ...matchedAccount,
      lastLogin: new Date().toISOString(),
      remember,
    };

    setUser(authenticatedUser);
    setIsAuthenticating(false);
    return { success: true, user: authenticatedUser };
  };

  /**
   * Phone Number and OTP Login (FinTech Standard)
   */
  const loginWithOTP = async (phone, otp, remember = true) => {
    setIsAuthenticating(true);
    setAuthError('');

    await new Promise((resolve) => setTimeout(resolve, 600));

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
    await new Promise((resolve) => setTimeout(resolve, 350));
    setUser(ADMIN_USER);
    setIsAuthenticating(false);
    return { success: true, user: ADMIN_USER };
  };

  /**
   * Real Google Sign-In / Sign-Up ("Log Up")
   */
  const loginWithGoogle = async (googleProfile) => {
    setIsAuthenticating(true);
    setAuthError('');

    if (!googleProfile || !googleProfile.email) {
      setIsAuthenticating(false);
      const error = 'No Google account data received. Please select an active Google account.';
      setAuthError(error);
      return { success: false, error };
    }

    const cleanEmail = googleProfile.email.trim().toLowerCase();
    const cleanName = googleProfile.name?.trim() || cleanEmail.split('@')[0];
    const picture = googleProfile.picture || '';

    // Register or update user in persistent user database
    const userPayload = {
      id: googleProfile.sub || `usr_google_${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      picture: picture,
      avatar: cleanName.slice(0, 2).toUpperCase(),
      role: 'Super Admin',
      roleLabel: '👑 Google SSO Executive',
      department: 'Collections Leadership Desk',
      organization: 'Fast Paisa Technologies',
      authProvider: 'google',
    };

    const { isFirstTime, user: savedUser } = saveRegisteredUser(userPayload);

    setUser(savedUser);
    setIsAuthenticating(false);
    return { success: true, user: savedUser, isFirstTime };
  };

  /**
   * Executive Sign-Up ("Log Up")
   */
  const signup = async (fullName, email) => {
    setIsAuthenticating(true);
    setAuthError('');
    await new Promise((resolve) => setTimeout(resolve, 500));

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim() || cleanEmail.split('@')[0];

    const newUserPayload = {
      id: `usr_${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      avatar: cleanName.slice(0, 2).toUpperCase(),
      role: 'Super Admin',
      roleLabel: '👑 Executive User',
      department: 'Executive Leadership Desk',
      organization: 'Fast Paisa Technologies',
      authProvider: 'email',
    };

    const { isFirstTime, user: savedUser } = saveRegisteredUser(newUserPayload);

    setUser(savedUser);
    setIsAuthenticating(false);
    return { success: true, user: savedUser, isFirstTime };
  };

  /**
   * Logout
   */
  const logout = () => {
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
        login,
        signup,
        loginWithOTP,
        loginWithGoogle,
        quickAdminLogin,
        logout,
        registeredUsers: getRegisteredUsers(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
