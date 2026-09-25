import { createContext, useContext } from 'react';

export const STORAGE_KEY = 'fastpaisa_executive_auth';
export const USERS_DB_KEY = 'fastpaisa_user_database';
export const DEFAULT_GOOGLE_CLIENT_ID = '862494048793-ime5l8ac6p31h852q8li1gcithkjekfa.apps.googleusercontent.com';

export function getGoogleClientId() {
  try {
    return localStorage.getItem('fastpaisa_google_client_id') || DEFAULT_GOOGLE_CLIENT_ID;
  } catch {
    return DEFAULT_GOOGLE_CLIENT_ID;
  }
}

export function setGoogleClientId(id) {
  try {
    localStorage.setItem('fastpaisa_google_client_id', id.trim());
  } catch {
    // Ignore storage errors
  }
}

export const ADMIN_USER = {
  id: 'usr_admin_ch01',
  name: 'Central Head',
  title: 'Director of Credit & Collections',
  email: 'admin@fastpaisa.com',
  phone: '+91 98765 43210',
  role: 'Super Admin',
  roleLabel: '👑 Central Head / Super Admin',
  department: 'Executive Leadership Desk',
  organization: 'Fast Paisa Technologies Pvt Ltd',
  avatar: 'CH',
  lastLogin: new Date().toISOString(),
};

// Default authorized credentials for Central Head
export const DEFAULT_CREDENTIALS = {
  email: 'admin@fastpaisa.com',
  password: 'admin123',
  phone: '9876543210',
  otp: '123456',
};

/**
 * Pre-defined Authorized Database Accounts
 * Used for pre-mapped roles and emergency administrative access
 */
export const AUTHORIZED_DATABASE_USERS = [
  {
    id: 'usr_admin',
    username: 'admin',
    email: 'admin@fastpaisa.com',
    password: 'admin123',
    phone: '9876543210',
    otp: '123456',
    name: 'Central Head',
    title: 'Director of Credit & Collections',
    role: 'Super Admin',
    roleLabel: '👑 Central Head / Super Admin',
    department: 'Executive Leadership Desk',
    organization: 'Fast Paisa Technologies Pvt Ltd',
    avatar: 'CH',
  },
  {
    id: 'usr_vishu',
    username: 'vishu',
    email: 'vishuswami683@gmail.com',
    password: 'admin123',
    phone: '9876543211',
    otp: '123456',
    name: 'Vishu Swami',
    title: 'Collections Leadership Executive',
    role: 'Super Admin',
    roleLabel: '👑 Collections Executive',
    department: 'Executive Leadership Desk',
    organization: 'Fast Paisa Technologies',
    avatar: 'VS',
  },
  {
    id: 'usr_operations',
    username: 'operations',
    email: 'operations@fastpaisa.com',
    password: 'fastpaisa2026',
    phone: '9876543212',
    otp: '123456',
    name: 'Operations Head',
    title: 'Head of Operations',
    role: 'Operations Head',
    roleLabel: '💼 Operations Desk',
    department: 'Collections Operations',
    organization: 'Fast Paisa Technologies',
    avatar: 'OH',
  },
];

/**
 * Retrieve all registered users from local cache + built-in defaults
 */
export function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with built-in accounts so defaults are never lost
        const emails = new Set(parsed.map(u => (u.email || '').toLowerCase()));
        const merged = [...parsed];
        for (const builtin of AUTHORIZED_DATABASE_USERS) {
          if (!emails.has(builtin.email.toLowerCase())) {
            merged.push(builtin);
          }
        }
        return merged;
      }
    }
  } catch (err) {
    console.warn('Error reading registered users:', err);
  }
  return AUTHORIZED_DATABASE_USERS;
}

/**
 * Save or update a registered user in local database
 */
export function saveRegisteredUser(userData) {
  try {
    const users = getRegisteredUsers();
    const cleanEmail = (userData.email || '').toLowerCase().trim();
    const existingIndex = users.findIndex(u => (u.email || '').toLowerCase().trim() === cleanEmail);

    let finalUser;
    let isFirstTime = false;

    if (existingIndex >= 0) {
      finalUser = {
        ...users[existingIndex],
        ...userData,
        lastLogin: new Date().toISOString(),
      };
      users[existingIndex] = finalUser;
    } else {
      isFirstTime = true;
      finalUser = {
        id: userData.id || `usr_${Date.now()}`,
        name: userData.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        avatar: userData.avatar || (userData.name || cleanEmail).slice(0, 2).toUpperCase(),
        role: userData.role || 'Super Admin',
        roleLabel: userData.roleLabel || '👑 Executive User',
        department: userData.department || 'Collections Leadership Desk',
        organization: userData.organization || 'Fast Paisa Technologies',
        ...userData,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      users.push(finalUser);
    }

    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    return { isFirstTime, user: finalUser };
  } catch (err) {
    console.warn('Error saving registered user:', err);
    return { isFirstTime: false, user: userData };
  }
}

/**
 * Resolve user profile & role from email
 */
export function resolveUserProfile(firebaseUser) {
  if (!firebaseUser) return null;

  const email = (firebaseUser.email || '').toLowerCase().trim();
  const displayName = firebaseUser.displayName || email.split('@')[0] || 'Executive User';
  const photoURL = firebaseUser.photoURL || '';

  // Check if known in pre-defined users
  const known = AUTHORIZED_DATABASE_USERS.find(
    u => u.email.toLowerCase() === email
  );

  const baseUser = {
    id: firebaseUser.uid || known?.id || `usr_${Date.now()}`,
    name: displayName || known?.name,
    email: email,
    picture: photoURL || known?.picture,
    avatar: (displayName || 'EX').slice(0, 2).toUpperCase(),
    role: known?.role || 'Super Admin',
    roleLabel: known?.roleLabel || '👑 Verified Executive',
    department: known?.department || 'Executive Leadership Desk',
    organization: known?.organization || 'Fast Paisa Technologies',
    authProvider: firebaseUser.providerData?.[0]?.providerId || 'firebase',
    lastLogin: new Date().toISOString(),
  };

  const { user } = saveRegisteredUser(baseUser);
  return user;
}

export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
