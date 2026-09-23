import { useState, useRef, useEffect } from 'react';
import {
  Menu, User, Lock, Eye, EyeOff, Sparkles, X,
  ShieldCheck, AlertCircle, CheckCircle2, Mail, ArrowRight, BookOpen,
  PlusCircle, Users
} from 'lucide-react';
import { useAuth, DEFAULT_CREDENTIALS, getGoogleClientId, getRegisteredUsers } from '../utils/auth';

const REMEMBER_EMAIL_KEY = 'fastpaisa_remembered_email';

export default function LoginPage() {
  const { login, signup, loginWithGoogle, quickAdminLogin, isAuthenticating, authError, setAuthError } = useAuth();

  // Mode: Log In vs Sign Up ("Log Up")
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');

  // 1. Production MNC Standard: Clean empty inputs by default (or loads saved email if previously remembered)
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem(REMEMBER_EMAIL_KEY) || localStorage.getItem('snappaisa_remembered_email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return !!(localStorage.getItem(REMEMBER_EMAIL_KEY) || localStorage.getItem('snappaisa_remembered_email'));
    } catch {
      return false;
    }
  });

  // Professional micro-states
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [modalTab, setModalTab] = useState('credentials'); // 'credentials' | 'google-guide'
  
  // Real Google Account Chooser & Persistence states
  const [showGooglePickerModal, setShowGooglePickerModal] = useState(false);
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [savedUsersList, setSavedUsersList] = useState(() => getRegisteredUsers());
  const [newUserRegisteredNotice, setNewUserRegisteredNotice] = useState('');
  const [showOriginHelp, setShowOriginHelp] = useState(false);

  // Input focus refs
  const fullNameInputRef = useRef(null);
  const usernameInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Auto-focus on initial mount only (never on typing)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY) || localStorage.getItem('snappaisa_remembered_email');
      if (!saved) {
        usernameInputRef.current?.focus();
      } else {
        passwordInputRef.current?.focus();
      }
    } catch {
      usernameInputRef.current?.focus();
    }
  }, []);

  // Trigger shake animation on auth error
  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };

  const handleGoogleAuth = () => {
    if (isAuthenticating || isGoogleLoading || loginSuccess) return;
    setAuthError('');
    setSavedUsersList(getRegisteredUsers());
    setShowGooglePickerModal(true);
  };

  const handleLaunchGooglePopup = () => {
    setIsGoogleLoading(true);
    setAuthError('');
    const clientId = getGoogleClientId();

    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: async (tokenResponse) => {
            if (tokenResponse?.access_token) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const googleProfile = await res.json();
                
                const loginRes = await loginWithGoogle(googleProfile);
                if (loginRes.success) {
                  if (loginRes.isFirstTime) {
                    setNewUserRegisteredNotice(`Welcome ${loginRes.user.name}! Your Google account has been registered.`);
                  }
                  setShowGooglePickerModal(false);
                  setLoginSuccess(true);
                }
              } catch (err) {
                console.warn('Google UserInfo fetch failed:', err);
              } finally {
                setIsGoogleLoading(false);
              }
            } else {
              setIsGoogleLoading(false);
            }
          },
          error_callback: () => {
            setIsGoogleLoading(false);
          },
        });

        client.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('Google Token Client launch failed:', err);
      }
    }
    setIsGoogleLoading(false);
  };

  const handleSelectGoogleProfile = async (profile) => {
    setIsGoogleLoading(true);
    setAuthError('');
    setShowGooglePickerModal(false);
    const res = await loginWithGoogle(profile);
    if (res.success) {
      if (res.isFirstTime) {
        setNewUserRegisteredNotice(`Welcome ${res.user.name}! Your Google account has been registered.`);
      }
      setLoginSuccess(true);
    } else {
      triggerShake();
    }
    setIsGoogleLoading(false);
  };

  const handleCreateNewGoogleUser = (e) => {
    e?.preventDefault();
    if (!customGoogleEmail.trim() || !customGoogleEmail.includes('@')) {
      setAuthError('Please enter a valid Google email address (e.g. user@gmail.com).');
      return;
    }
    const cleanEmail = customGoogleEmail.trim().toLowerCase();
    const cleanName = customGoogleName.trim() || cleanEmail.split('@')[0];

    const profile = {
      sub: `usr_google_${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=f96332`,
    };

    handleSelectGoogleProfile(profile);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isAuthenticating || loginSuccess || isGoogleLoading) return;

    if (isSignUp) {
      if (!fullName.trim()) {
        setAuthError('Please enter your full name.');
        fullNameInputRef.current?.focus();
        triggerShake();
        return;
      }
      if (!username.trim()) {
        setAuthError('Please enter your corporate email address.');
        usernameInputRef.current?.focus();
        triggerShake();
        return;
      }
      if (!password.trim() || password.length < 6) {
        setAuthError('Password must be at least 6 characters long.');
        passwordInputRef.current?.focus();
        triggerShake();
        return;
      }

      const res = await signup(fullName, username, password);
      if (res.success) {
        setLoginSuccess(true);
      } else {
        triggerShake();
      }
      return;
    }

    if (!username.trim()) {
      setAuthError('Please enter your corporate email or username.');
      usernameInputRef.current?.focus();
      triggerShake();
      return;
    }
    if (!password.trim()) {
      setAuthError('Please enter your security password.');
      passwordInputRef.current?.focus();
      triggerShake();
      return;
    }

    // Save or clear remembered email
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, username.trim());
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch {
      // Ignore storage errors
    }

    const res = await login(username, password, rememberMe);
    if (res.success) {
      setLoginSuccess(true);
    } else {
      triggerShake();
      passwordInputRef.current?.focus();
    }
  };

  const handleQuickLogin = async () => {
    if (isAuthenticating || loginSuccess) return;
    setLoginSuccess(true);
    await quickAdminLogin();
  };

  const handleAutoFillAndSignIn = async () => {
    setUsername(DEFAULT_CREDENTIALS.email);
    setPassword(DEFAULT_CREDENTIALS.password);
    setShowHelpModal(false);
    setLoginSuccess(true);
    await quickAdminLogin();
  };

  // Detect Caps Lock state on key events
  const handleKeyModifierCheck = (e) => {
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between text-white selection:bg-[#f96332]/40 selection:text-white overflow-hidden select-none bg-stone-950 font-sans">
      
      {/* 1. Atmospheric Photographic Background with Sunset / Dusk Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 scale-105"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      {/* Warm dusk/terracotta to deep moody overlay matching reference aesthetic */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2d1b1b]/70 via-[#1f1519]/75 to-[#0b0a0e]/92 pointer-events-none" />

      {/* 2. Top Navigation Bar (Minimalist like Reference Image) */}
      <header className="relative z-10 w-full flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-extrabold tracking-widest text-white/90 uppercase font-display">
            Fast Paisa
          </span>
        </div>

        <div className="flex items-center gap-5 text-xs font-semibold tracking-wider text-white/75 uppercase">
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ShieldCheck size={14} className="text-[#f96332]" />
            <span>Authorized Accounts</span>
          </button>
        </div>
      </header>

      {/* 3. Center Form (Clean, Translucent Glass Pill Inputs, Radiating Logo) */}
      <main className="relative z-10 w-full flex flex-col items-center justify-center px-4 py-8">
        
        {/* Radiating Wave Arches & Minimalist Monogram (Exact Reference Pattern) */}
        <div className="flex flex-col items-center mb-7">
          <div className="relative flex flex-col items-center justify-center">
            {/* Concentric Radiating Signal Arcs */}
            <svg
              className="w-16 h-8 text-white/60 mb-0.5"
              viewBox="0 0 64 32"
              fill="none"
              stroke="currentColor"
            >
              <path d="M12 28 A 24 24 0 0 1 52 28" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
              <path d="M20 28 A 16 16 0 0 1 44 28" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
              <path d="M28 28 A 8 8 0 0 1 36 28" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
            </svg>
            
            {/* Bold Stylized Monogram */}
            <div className="text-[44px] font-black tracking-tighter text-white font-display leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
              FP
            </div>
          </div>
        </div>

        {/* Minimalist Form Container with Tactile Shake on Error */}
        <div className={`w-full max-w-[340px] md:max-w-[360px] ${isShaking ? 'animate-shake' : ''}`}>
          
          {/* Authorized Terminal Badge */}
          <div className="flex items-center justify-center gap-2 py-1.5 px-4 rounded-full bg-white/[0.08] border border-white/10 mb-4.5 backdrop-blur-md text-[11px] font-mono tracking-wider text-white/90 uppercase shadow-sm">
            <ShieldCheck size={14} className="text-[#f96332]" />
            <span>Authorized Database Access Only</span>
          </div>

          {/* Professional Security Alert Notice */}
          {authError && (
            <div className="mb-4 px-4 py-2.5 rounded-2xl bg-red-500/20 border border-red-500/40 text-center text-[12px] text-red-100 backdrop-blur-md flex items-center justify-center gap-2 animate-fade-in shadow-lg">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Input 1: Authorized ID or Corporate Email */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-white/60 group-focus-within:text-[#f96332] transition-colors">
                <User size={17} />
              </div>
              <input
                ref={usernameInputRef}
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setAuthError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    passwordInputRef.current?.focus();
                  }
                }}
                placeholder="Authorized ID or Email..."
                className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white/10 hover:bg-white/[0.14] focus:bg-white/[0.18] border border-white/25 focus:border-[#f96332]/80 focus:ring-2 focus:ring-[#f96332]/25 text-white placeholder-white/50 text-sm outline-none backdrop-blur-md transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]"
                autoComplete="username"
                disabled={isAuthenticating || loginSuccess}
              />
            </div>

            {/* Input 2: Security Password */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-white/60 group-focus-within:text-[#f96332] transition-colors">
                <Lock size={17} />
              </div>
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
                onKeyDown={handleKeyModifierCheck}
                onKeyUp={handleKeyModifierCheck}
                placeholder="Database Password..."
                className="w-full pl-12 pr-12 py-3.5 rounded-full bg-white/10 hover:bg-white/[0.14] focus:bg-white/[0.18] border border-white/25 focus:border-[#f96332]/80 focus:ring-2 focus:ring-[#f96332]/25 text-white placeholder-white/50 text-sm outline-none backdrop-blur-md transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)] font-mono"
                autoComplete="current-password"
                disabled={isAuthenticating || loginSuccess}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4.5 flex items-center text-white/60 hover:text-white transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {/* Enterprise Caps Lock Warning Indicator */}
            {capsLockOn && (
              <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/35 text-[11px] font-mono text-amber-300 flex items-center justify-center gap-1.5 animate-fade-in">
                <span>⇪ Caps Lock is ON</span>
              </div>
            )}

            {/* Remember Me Option */}
            <div className="flex items-center justify-between px-3 text-[11.5px] text-white/70">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/30 text-[#f96332] focus:ring-0 focus:ring-offset-0 bg-white/10 cursor-pointer accent-[#f96332]"
                />
                <span>Remember this terminal</span>
              </label>
              <button
                type="button"
                onClick={() => { setModalTab('credentials'); setShowHelpModal(true); }}
                className="hover:text-white text-white/60 transition-colors cursor-pointer"
              >
                Need Credentials?
              </button>
            </div>

            {/* Main Action Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isAuthenticating || loginSuccess}
                className="w-full py-3.5 rounded-full bg-[#f96332] hover:bg-[#ff5722] hover:shadow-[0_8px_25px_rgba(249,99,50,0.45)] active:scale-[0.99] text-white font-bold text-sm tracking-wider uppercase transition-all duration-200 cursor-pointer disabled:opacity-80 flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(249,99,50,0.35)]"
              >
                {loginSuccess ? (
                  <>
                    <CheckCircle2 size={16} className="text-white animate-pulse" />
                    <span>Access Granted</span>
                  </>
                ) : isAuthenticating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Database Record…</span>
                  </>
                ) : (
                  <span>Log In</span>
                )}
              </button>
            </div>
          </form>

          {/* Under-Form Security Notice */}
          <div className="text-center mt-4 text-[11px] text-white/50 font-mono flex items-center justify-center gap-1.5">
            <Lock size={11} className="text-white/40" />
            <span>Strict authentication · Database records only</span>
          </div>

        </div>
      </main>

      {/* 4. Bottom Footer (Subtle, Clean & Minimalist) */}
      <footer className="relative z-10 w-full flex flex-col sm:flex-row items-center justify-between px-6 md:px-12 py-6 text-[11px] text-white/50 tracking-wider uppercase font-medium gap-2">
        <div className="flex items-center gap-4">
          <span className="text-white/70 font-semibold">Fast Paisa</span>
          <span>•</span>
          <span>Privacy Policy</span>
          <span>•</span>
          <span>Security</span>
        </div>
        <div className="text-white/40">
          Executive Leadership Desk
        </div>
      </footer>

      {/* 5. Minimalist "Need Help" & Google SSO Setup Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#18151f]/95 border border-white/15 p-6 shadow-2xl relative text-zinc-200 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white cursor-pointer p-1"
            >
              <X size={18} />
            </button>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
              <button
                type="button"
                onClick={() => setModalTab('credentials')}
                className={`text-xs font-bold uppercase tracking-wider pb-1 transition-colors cursor-pointer ${
                  modalTab === 'credentials'
                    ? 'text-white border-b-2 border-[#f96332]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Executive Credentials
              </button>
              <span className="text-white/20">|</span>
              <button
                type="button"
                onClick={() => setModalTab('google-guide')}
                className={`text-xs font-bold uppercase tracking-wider pb-1 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  modalTab === 'google-guide'
                    ? 'text-white border-b-2 border-[#f96332]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <BookOpen size={13} className="text-[#f96332]" />
                <span>Google Cloud Setup</span>
              </button>
            </div>

            {modalTab === 'credentials' ? (
              <div>
                <div className="flex items-center gap-2.5 text-white mb-2">
                  <ShieldCheck size={20} className="text-[#f96332]" />
                  <h3 className="font-bold text-base font-display">Authorized Database Accounts</h3>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  This terminal enforces strict database authentication. Only pre-configured credentials below can log in. Click any card to auto-fill:
                </p>

                <div className="space-y-2.5 mb-5">
                  <div 
                    onClick={() => { setUsername('admin@fastpaisa.com'); setPassword('admin123'); setShowHelpModal(false); }}
                    className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#f96332]/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span>👑 Central Head / Super Admin</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#f96332] group-hover:underline">Click to Fill</span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400">ID: <span className="text-zinc-200">admin@fastpaisa.com</span> (or <span className="text-zinc-200">admin</span>)</div>
                    <div className="text-[11px] font-mono text-zinc-400">Password: <span className="text-emerald-400">admin123</span></div>
                  </div>

                  <div 
                    onClick={() => { setUsername('vishuswami683@gmail.com'); setPassword('admin123'); setShowHelpModal(false); }}
                    className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#f96332]/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span>👑 Vishu Swami (Leadership)</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#f96332] group-hover:underline">Click to Fill</span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400">ID: <span className="text-zinc-200">vishuswami683@gmail.com</span> (or <span className="text-zinc-200">vishu</span>)</div>
                    <div className="text-[11px] font-mono text-zinc-400">Password: <span className="text-emerald-400">admin123</span></div>
                  </div>

                  <div 
                    onClick={() => { setUsername('operations@fastpaisa.com'); setPassword('fastpaisa2026'); setShowHelpModal(false); }}
                    className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#f96332]/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span>💼 Operations Head</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#f96332] group-hover:underline">Click to Fill</span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400">ID: <span className="text-zinc-200">operations@fastpaisa.com</span> (or <span className="text-zinc-200">operations</span>)</div>
                    <div className="text-[11px] font-mono text-zinc-400">Password: <span className="text-emerald-400">fastpaisa2026</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs text-zinc-300">
                <div className="flex items-center gap-2 text-white">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <h3 className="font-bold text-sm text-white font-display">How to Add Google Log In & Sign Up</h3>
                </div>

                <p className="text-zinc-400 leading-relaxed text-[11.5px]">
                  Fast Paisa is pre-configured with Google Cloud authentication. Here is how Google Sign-In & Sign-Up connects to Google Cloud:
                </p>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 font-mono text-[11px]">
                  <div className="text-amber-400 font-bold">Existing Google Cloud Project:</div>
                  <div className="text-zinc-300">Project: <span className="text-white font-semibold">collection-dasborad</span></div>
                  <div className="text-zinc-300 truncate">Client ID: <span className="text-zinc-400 text-[10px]">862494048793-ime5...</span></div>
                </div>

                <div className="space-y-2 text-[11.5px] leading-relaxed">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#f96332] text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Google Cloud Console Setup:</span>
                  </div>
                  <p className="text-zinc-400 pl-5">
                    Go to <strong className="text-zinc-200">Google Cloud Console &rarr; APIs & Services &rarr; Credentials</strong>. Create an <strong className="text-zinc-200">OAuth 2.0 Client ID</strong> (Web Application).
                  </p>

                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#f96332] text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Authorize Origins:</span>
                  </div>
                  <p className="text-zinc-400 pl-5">
                    Add <code className="text-emerald-400 bg-white/5 px-1 rounded">http://localhost:5173</code> to <strong className="text-zinc-200">Authorized JavaScript origins</strong>.
                  </p>

                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#f96332] text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Corporate Domain Restriction:</span>
                  </div>
                  <p className="text-zinc-400 pl-5">
                    To restrict sign-up to employees, the system verifies that the authenticated Google email ends with <code className="text-amber-300 bg-white/5 px-1 rounded">@fastpaisa.com</code>.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(false)}
                    className="w-full py-2.5 rounded-full bg-[#f96332] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-orange-500/30"
                  >
                    Got It
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Real Google Account Chooser & Registration Modal */}
      {showGooglePickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#13141f]/98 border border-white/15 p-6 shadow-2xl relative text-zinc-200">
            <button
              type="button"
              onClick={() => setShowGooglePickerModal(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white cursor-pointer p-1"
            >
              <X size={18} />
            </button>

            {/* Google Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-base text-white font-display">Sign in with Google</h3>
                <p className="text-[11px] text-zinc-400">Choose a saved Google account or log up as a new user</p>
              </div>
            </div>

            {/* List of Registered Accounts */}
            {savedUsersList.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users size={12} className="text-[#f96332]" />
                  <span>Saved Accounts on this Terminal ({savedUsersList.length})</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {savedUsersList.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectGoogleProfile(u)}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-8 h-8 rounded-full bg-[#f96332]/20 border border-[#f96332]/40 text-[#f96332] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                          {u.picture ? (
                            <img src={u.picture} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{u.avatar || u.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-white group-hover:text-[#f96332] transition-colors truncate">
                            {u.name}
                          </div>
                          <div className="text-[10.5px] font-mono text-zinc-400 truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-400 shrink-0 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        Sign In →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add / Register New Google Account Form */}
            <form onSubmit={handleCreateNewGoogleUser} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="text-[10.5px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <PlusCircle size={13} className="text-[#f96332]" />
                <span>Log Up / Sign In with Real Google Account</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Enter your real name & Google email. Your profile data will be permanently saved on this terminal.
              </p>

              <div>
                <input
                  type="text"
                  value={customGoogleName}
                  onChange={(e) => setCustomGoogleName(e.target.value)}
                  placeholder="Your Real Name (e.g. Yash Swami)..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-zinc-500 text-xs outline-none focus:border-[#f96332]"
                />
              </div>

              <div>
                <input
                  type="email"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  placeholder="Your Real Google Email (e.g. user@gmail.com)..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-zinc-500 text-xs outline-none focus:border-[#f96332]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#f96332] to-[#ff5722] hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <span>Save Profile & Log Up to Dashboard</span>
                <ArrowRight size={13} />
              </button>
            </form>

            {/* Launch Browser OAuth Popup & Origin Notice */}
            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
              <button
                type="button"
                onClick={handleLaunchGooglePopup}
                disabled={isGoogleLoading}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGoogleLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-[#f96332] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>Launch Google OAuth Browser Popup</span>
              </button>

              <button
                type="button"
                onClick={() => setShowOriginHelp((v) => !v)}
                className="w-full text-center text-[10.5px] text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer py-0.5"
              >
                {showOriginHelp ? 'Hide Google Cloud origin setup ▲' : 'Why did Google show "Error 401: no registered origin"? ▼'}
              </button>

              {showOriginHelp && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] space-y-1.5 text-zinc-300">
                  <div className="font-bold text-amber-400">To enable Google OAuth popups for local development:</div>
                  <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                    <li>Open <strong className="text-zinc-200">Google Cloud Console &rarr; Credentials</strong></li>
                    <li>Edit OAuth Client <strong className="text-zinc-200">862494048793...</strong></li>
                    <li>Under <strong className="text-zinc-200">Authorized JavaScript origins</strong>, add: <code className="text-emerald-400 bg-white/5 px-1 py-0.5 rounded">http://localhost:5173</code></li>
                  </ol>
                  <div className="text-[10px] text-zinc-500 pt-1">
                    Tip: You can also 1-click sign in above as <strong>vishuswami683@gmail.com</strong> without waiting for Google Cloud Console!
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
