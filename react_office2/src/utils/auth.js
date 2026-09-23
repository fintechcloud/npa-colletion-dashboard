import { createContext, useContext } from 'react';

export const STORAGE_KEY = 'fastpaisa_executive_auth';

export const DEFAULT_GOOGLE_CLIENT_ID = '862494048793-ime5l8ac6p31h852q8li1gcithkjekfa.apps.googleusercontent.com';
export const USERS_DB_KEY = 'fastpaisa_user_database';

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
 * ONLY accounts listed here can log in to the dashboard!
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
 * Get list of all registered users saved in database
 */
export function getRegisteredUsers() {
  return AUTHORIZED_DATABASE_USERS;
}

export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
