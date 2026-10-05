// import { useState, useRef, useEffect } from 'react';
// import {
//   User, Lock, Eye, EyeOff, X,
//   ShieldCheck, AlertCircle, CheckCircle2, Mail,
//   Users, Settings, Check, ExternalLink, KeyRound
// } from 'lucide-react';
// import { useAuth, DEFAULT_CREDENTIALS, getRegisteredUsers } from '../utils/auth';
// 
// const REMEMBER_EMAIL_KEY = 'fastpaisa_remembered_email';
// 
// export default function LoginPage() {
//   const {
//     login,
//     loginWithGoogle,
//     quickAdminLogin,
//     sendPasswordReset,
//     isAuthenticating,
//     authError,
//     setAuthError,
//     isFirebaseActive,
//     firebaseConfig,
//     saveFirebaseConfig,
//   } = useAuth();
// 
//   // Mode: 'login' | 'forgot-password'
//   const [isForgotPassword, setIsForgotPassword] = useState(false);
// 
//   // Credentials
//   const [username, setUsername] = useState(() => {
//     try {
//       return localStorage.getItem(REMEMBER_EMAIL_KEY) || localStorage.getItem('snappaisa_remembered_email') || '';
//     } catch {
//       return '';
//     }
//   });
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [rememberMe, setRememberMe] = useState(() => {
//     try {
//       return !!(localStorage.getItem(REMEMBER_EMAIL_KEY) || localStorage.getItem('snappaisa_remembered_email'));
//     } catch {
//       return false;
//     }
//   });
// 
//   // Micro-states
//   const [capsLockOn, setCapsLockOn] = useState(false);
//   const [isShaking, setIsShaking] = useState(false);
//   const [loginSuccess, setLoginSuccess] = useState(false);
//   const [isGoogleLoading, setIsGoogleLoading] = useState(false);
//   const [infoNotice, setInfoNotice] = useState('');
// 
//   // Modals
//   const [showHelpModal, setShowHelpModal] = useState(false);
//   const [showFirebaseModal, setShowFirebaseModal] = useState(false);
//   const [firebaseJsonInput, setFirebaseJsonInput] = useState('');
//   const [firebaseSaveSuccess, setFirebaseSaveSuccess] = useState(false);
// 
//   // Fallback Google Profile Picker (for offline/local authorized accounts)
//   const [showGooglePickerModal, setShowGooglePickerModal] = useState(false);
//   const [savedUsersList, setSavedUsersList] = useState(() => getRegisteredUsers());
// 
//   // Input focus refs
//   const usernameInputRef = useRef(null);
//   const passwordInputRef = useRef(null);
// 
//   // Auto-focus on mount
//   useEffect(() => {
//     try {
//       const saved = localStorage.getItem(REMEMBER_EMAIL_KEY) || localStorage.getItem('snappaisa_remembered_email');
//       if (!saved) {
//         usernameInputRef.current?.focus();
//       } else {
//         passwordInputRef.current?.focus();
//       }
//     } catch {
//       usernameInputRef.current?.focus();
//     }
//   }, [isForgotPassword]);
// 
//   const triggerShake = () => {
//     setIsShaking(true);
//     setTimeout(() => setIsShaking(false), 450);
//   };
// 
//   /**
//    * Google Sign-In with Pre-Defined Credentials
//    */
//   const handleGoogleAuth = async () => {
//     if (isAuthenticating || isGoogleLoading || loginSuccess) return;
//     setAuthError('');
//     setInfoNotice('');
// 
//     if (isFirebaseActive) {
//       setIsGoogleLoading(true);
//       try {
//         const res = await loginWithGoogle();
//         if (res.success) {
//           setLoginSuccess(true);
//         } else if (res.error) {
//           triggerShake();
//         }
//       } catch (err) {
//         triggerShake();
//       } finally {
//         setIsGoogleLoading(false);
//       }
//     } else {
//       // Offline fallback: choose from pre-authorized corporate profiles
//       setSavedUsersList(getRegisteredUsers());
//       setShowGooglePickerModal(true);
//     }
//   };
// 
//   /**
//    * Select Pre-Defined Profile
//    */
//   const handleSelectPredefinedProfile = async (profile) => {
//     setIsGoogleLoading(true);
//     setAuthError('');
//     setShowGooglePickerModal(false);
//     const res = await loginWithGoogle(profile);
//     if (res.success) {
//       setLoginSuccess(true);
//     } else {
//       triggerShake();
//     }
//     setIsGoogleLoading(false);
//   };
// 
//   /**
//    * Form Submit: Login or Password Reset only
//    */
//   const handleSubmit = async (e) => {
//     if (e) e.preventDefault();
//     if (isAuthenticating || loginSuccess || isGoogleLoading) return;
//     setAuthError('');
//     setInfoNotice('');
// 
//     // Forgot Password Flow
//     if (isForgotPassword) {
//       if (!username.trim() || !username.includes('@')) {
//         setAuthError('Please enter your authorized corporate email address.');
//         usernameInputRef.current?.focus();
//         triggerShake();
//         return;
//       }
//       const res = await sendPasswordReset(username);
//       if (res.success) {
//         setInfoNotice(`Password reset instructions sent to ${username}. Please check your inbox.`);
//         setIsForgotPassword(false);
//       } else {
//         setAuthError(res.error || 'Failed to send password reset email.');
//         triggerShake();
//       }
//       return;
//     }
// 
//     // Standard Login Flow
//     if (!username.trim()) {
//       setAuthError('Please enter your authorized email or ID.');
//       usernameInputRef.current?.focus();
//       triggerShake();
//       return;
//     }
//     if (!password.trim()) {
//       setAuthError('Please enter your password.');
//       passwordInputRef.current?.focus();
//       triggerShake();
//       return;
//     }
// 
//     try {
//       if (rememberMe) {
//         localStorage.setItem(REMEMBER_EMAIL_KEY, username.trim());
//       } else {
//         localStorage.removeItem(REMEMBER_EMAIL_KEY);
//       }
//     } catch {
//       // Ignore storage errors
//     }
// 
//     const res = await login(username, password, rememberMe);
//     if (res.success) {
//       setLoginSuccess(true);
//     } else {
//       triggerShake();
//       passwordInputRef.current?.focus();
//     }
//   };
// 
//   /**
//    * Save Firebase Configuration Modal
//    */
//   const handleSaveFirebaseConfig = (e) => {
//     e?.preventDefault();
//     setFirebaseSaveSuccess(false);
// 
//     try {
//       let configObj = null;
//       const trimmed = firebaseJsonInput.trim();
// 
//       if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
//         configObj = JSON.parse(trimmed);
//       } else if (trimmed.includes('const firebaseConfig = {')) {
//         const match = trimmed.match(/\{[\s\S]*\}/);
//         if (match) {
//           const cleaned = match[0]
//             .replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":')
//             .replace(/'/g, '"')
//             .replace(/,\s*\}/g, '}');
//           configObj = JSON.parse(cleaned);
//         }
//       }
// 
//       if (!configObj || !configObj.apiKey) {
//         setAuthError('Invalid Firebase config. Please paste the firebaseConfig object from Firebase Console.');
//         return;
//       }
// 
//       const res = saveFirebaseConfig(configObj);
//       if (res.success) {
//         setFirebaseSaveSuccess(true);
//         setInfoNotice('Firebase project connected successfully!');
//         setTimeout(() => {
//           setShowFirebaseModal(false);
//           setFirebaseSaveSuccess(false);
//         }, 1200);
//       } else {
//         setAuthError(res.error || 'Failed to save Firebase configuration.');
//       }
//     } catch (err) {
//       setAuthError('Error parsing Firebase configuration JSON. Please check formatting.');
//     }
//   };
// 
//   const handleKeyModifierCheck = (e) => {
//     if (e.getModifierState) {
//       setCapsLockOn(e.getModifierState('CapsLock'));
//     }
//   };
// 
//   return (
//     <div className="relative min-h-screen w-full flex flex-col justify-between text-white selection:bg-[#f96332]/40 selection:text-white overflow-hidden select-none bg-stone-950 font-sans">
// 
//       {/* 1. Atmospheric Photographic Background */}
//       <div
//         className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 scale-105"
//         style={{ backgroundImage: "url('/login-bg.jpg')" }}
//       />
//       <div className="absolute inset-0 bg-gradient-to-b from-[#2d1b1b]/70 via-[#1f1519]/75 to-[#0b0a0e]/92 pointer-events-none" />
// 
//       {/* 2. Top Navigation Bar */}
//       <header className="relative z-10 w-full flex items-center justify-between px-6 md:px-12 py-6">
//         <div className="flex items-center gap-3">
//           <span className="text-sm font-extrabold tracking-widest text-white/90 uppercase font-display">
//             Fast Paisa
//           </span>
//           <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-mono tracking-wider">
//             Vasooli CRM
//           </span>
//         </div>
// 
//         <div className="flex items-center gap-4 text-xs font-semibold tracking-wider text-white/75 uppercase">
//           {/* Firebase Connection Status */}
//           <button
//             type="button"
//             onClick={() => setShowFirebaseModal(true)}
//             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer text-[11px] font-mono tracking-normal normal-case ${
//               isFirebaseActive
//                 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
//                 : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
//             }`}
//           >
//             <span className={`w-2 h-2 rounded-full ${isFirebaseActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
//             <span>{isFirebaseActive ? 'Firebase Active' : 'Connect Firebase'}</span>
//             <Settings size={12} className="opacity-70 ml-0.5" />
//           </button>
// 
//           <button
//             type="button"
//             onClick={() => setShowHelpModal(true)}
//             className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
//           >
//             <ShieldCheck size={14} className="text-[#f96332]" />
//             <span className="hidden sm:inline">Authorized Accounts</span>
//           </button>
//         </div>
//       </header>
// 
//       {/* 3. Center Form Card */}
//       <main className="relative z-10 w-full flex flex-col items-center justify-center px-4 py-8">
// 
//         {/* Concentric Signal Arcs & Monogram */}
//         <div className="flex flex-col items-center mb-6">
//           <div className="relative flex flex-col items-center justify-center">
//             <svg
//               className="w-16 h-8 text-white/60 mb-0.5"
//               viewBox="0 0 64 32"
//               fill="none"
//               stroke="currentColor"
//             >
//               <path d="M12 28 A 24 24 0 0 1 52 28" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
//               <path d="M20 28 A 16 16 0 0 1 44 28" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
//               <path d="M28 28 A 8 8 0 0 1 36 28" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
//             </svg>
//             <div className="text-[44px] font-black tracking-tighter text-white font-display leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
//               FP
//             </div>
//           </div>
//         </div>
// 
//         {/* Strictly Log In Card */}
//         <div className={`w-full max-w-[360px] ${isShaking ? 'animate-shake' : ''}`}>
// 
//           {/* Secure Access Badge */}
//           <div className="flex items-center justify-center gap-2 py-1.5 px-4 rounded-full bg-white/[0.08] border border-white/10 mb-4 backdrop-blur-md text-[11px] font-mono tracking-wider text-white/90 uppercase shadow-sm">
//             <KeyRound size={13} className="text-[#f96332]" />
//             <span>Pre-Defined Credentials Access Only</span>
//           </div>
// 
//           {/* Success / Info Message */}
//           {infoNotice && (
//             <div className="mb-4 px-4 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-center text-[12px] text-emerald-100 backdrop-blur-md flex items-center justify-center gap-2 animate-fade-in shadow-lg">
//               <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
//               <span>{infoNotice}</span>
//             </div>
//           )}
// 
//           {/* Error Message */}
//           {authError && (
//             <div className="mb-4 px-4 py-2.5 rounded-2xl bg-red-500/20 border border-red-500/40 text-center text-[12px] text-red-100 backdrop-blur-md flex items-center justify-center gap-2 animate-fade-in shadow-lg">
//               <AlertCircle size={14} className="text-red-400 shrink-0" />
//               <span>{authError}</span>
//             </div>
//           )}
// 
//           {/* 1. Pre-Defined Google Authentication Button */}
//           <div className="mb-4">
//             <button
//               type="button"
//               onClick={handleGoogleAuth}
//               disabled={isAuthenticating || isGoogleLoading || loginSuccess}
//               className="w-full py-3 px-4 rounded-full bg-white/10 hover:bg-white/[0.18] border border-white/25 hover:border-white/40 text-white font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 shadow-sm disabled:opacity-75"
//             >
//               {isGoogleLoading ? (
//                 <div className="w-4 h-4 border-2 border-[#f96332] border-t-transparent rounded-full animate-spin" />
//               ) : (
//                 <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
//                   <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
//                   <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
//                   <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
//                   <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
//                 </svg>
//               )}
//               <span>{isFirebaseActive ? 'Sign In with Authorized Google' : 'Google Sign-In'}</span>
//             </button>
//           </div>
// 
//           {/* Divider */}
//           <div className="relative flex items-center justify-center my-4">
//             <div className="absolute inset-0 flex items-center">
//               <div className="w-full border-t border-white/15" />
//             </div>
//             <div className="relative px-3 bg-[#1d161a] text-[10.5px] uppercase tracking-widest text-white/50 font-mono rounded-full">
//               or enter credentials
//             </div>
//           </div>
// 
//           {/* 2. Main Login Form */}
//           <form onSubmit={handleSubmit} className="space-y-3.5">
// 
//             {/* Email / Authorized ID */}
//             <div className="relative group">
//               <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-white/60 group-focus-within:text-[#f96332] transition-colors">
//                 <Mail size={17} />
//               </div>
//               <input
//                 ref={usernameInputRef}
//                 type="text"
//                 value={username}
//                 onChange={(e) => { setUsername(e.target.value); setAuthError(''); }}
//                 onKeyDown={(e) => {
//                   if (e.key === 'Enter') {
//                     e.preventDefault();
//                     passwordInputRef.current?.focus();
//                   }
//                 }}
//                 placeholder="Authorized Email or ID..."
//                 className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white/10 hover:bg-white/[0.14] focus:bg-white/[0.18] border border-white/25 focus:border-[#f96332]/80 focus:ring-2 focus:ring-[#f96332]/25 text-white placeholder-white/50 text-sm outline-none backdrop-blur-md transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]"
//                 autoComplete="email"
//                 disabled={isAuthenticating || loginSuccess}
//               />
//             </div>
// 
//             {/* Password Field (hidden in forgot-password mode) */}
//             {!isForgotPassword && (
//               <div className="relative group">
//                 <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-white/60 group-focus-within:text-[#f96332] transition-colors">
//                   <Lock size={17} />
//                 </div>
//                 <input
//                   ref={passwordInputRef}
//                   type={showPassword ? 'text' : 'password'}
//                   value={password}
//                   onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
//                   onKeyDown={handleKeyModifierCheck}
//                   onKeyUp={handleKeyModifierCheck}
//                   placeholder="Pre-Defined Password..."
//                   className="w-full pl-12 pr-12 py-3.5 rounded-full bg-white/10 hover:bg-white/[0.14] focus:bg-white/[0.18] border border-white/25 focus:border-[#f96332]/80 focus:ring-2 focus:ring-[#f96332]/25 text-white placeholder-white/50 text-sm outline-none backdrop-blur-md transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)] font-mono"
//                   autoComplete="current-password"
//                   disabled={isAuthenticating || loginSuccess}
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute inset-y-0 right-0 pr-4.5 flex items-center text-white/60 hover:text-white transition-colors cursor-pointer"
//                   title={showPassword ? 'Hide password' : 'Show password'}
//                 >
//                   {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
//                 </button>
//               </div>
//             )}
// 
//             {/* Caps Lock Indicator */}
//             {capsLockOn && (
//               <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/35 text-[11px] font-mono text-amber-300 flex items-center justify-center gap-1.5 animate-fade-in">
//                 <span>⇪ Caps Lock is ON</span>
//               </div>
//             )}
// 
//             {/* Remember Me & Forgot Password */}
//             {!isForgotPassword ? (
//               <div className="flex items-center justify-between px-3 text-[11.5px] text-white/70">
//                 <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors select-none">
//                   <input
//                     type="checkbox"
//                     checked={rememberMe}
//                     onChange={(e) => setRememberMe(e.target.checked)}
//                     className="rounded border-white/30 text-[#f96332] focus:ring-0 focus:ring-offset-0 bg-white/10 cursor-pointer accent-[#f96332]"
//                   />
//                   <span>Remember Me</span>
//                 </label>
//                 <button
//                   type="button"
//                   onClick={() => { setIsForgotPassword(true); setAuthError(''); }}
//                   className="hover:text-white text-white/60 transition-colors cursor-pointer"
//                 >
//                   Forgot Password?
//                 </button>
//               </div>
//             ) : (
//               <div className="text-right px-3 text-[11.5px]">
//                 <button
//                   type="button"
//                   onClick={() => { setIsForgotPassword(false); setAuthError(''); }}
//                   className="text-white/60 hover:text-white transition-colors cursor-pointer"
//                 >
//                   Back to Log In
//                 </button>
//               </div>
//             )}
// 
//             {/* Log In Button */}
//             <div className="pt-1">
//               <button
//                 type="submit"
//                 disabled={isAuthenticating || loginSuccess}
//                 className="w-full py-3.5 rounded-full bg-[#f96332] hover:bg-[#ff5722] hover:shadow-[0_8px_25px_rgba(249,99,50,0.45)] active:scale-[0.99] text-white font-bold text-sm tracking-wider uppercase transition-all duration-200 cursor-pointer disabled:opacity-80 flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(249,99,50,0.35)]"
//               >
//                 {loginSuccess ? (
//                   <>
//                     <CheckCircle2 size={16} className="text-white animate-pulse" />
//                     <span>Access Granted</span>
//                   </>
//                 ) : isAuthenticating ? (
//                   <>
//                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
//                     <span>Verifying Credentials…</span>
//                   </>
//                 ) : isForgotPassword ? (
//                   <span>Send Reset Email</span>
//                 ) : (
//                   <span>Log In</span>
//                 )}
//               </button>
//             </div>
//           </form>
// 
//           {/* Under-Form Security Notice */}
//           <div className="text-center mt-4 text-[11px] text-white/50 font-mono flex items-center justify-center gap-2">
//             <Lock size={11} className="text-white/40" />
//             <span>Strict Pre-Defined Authentication · No Public Registration</span>
//           </div>
// 
//         </div>
//       </main>
// 
//       {/* 4. Bottom Footer */}
//       <footer className="relative z-10 w-full flex flex-col sm:flex-row items-center justify-between px-6 md:px-12 py-5 text-[11px] text-white/50 tracking-wider uppercase font-medium gap-2">
//         <div className="flex items-center gap-4">
//           <span className="text-white/70 font-semibold">Fast Paisa Technologies</span>
//           <span>•</span>
//           <span>Security Protocol v2.5</span>
//         </div>
//         <div className="text-white/40">
//           Executive Leadership Terminal
//         </div>
//       </footer>
// 
//       {/* ========================================================= */}
//       {/* 5. Firebase Configuration Modal                            */}
//       {/* ========================================================= */}
//       {showFirebaseModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
//           <div className="w-full max-w-lg rounded-3xl bg-[#14141f]/98 border border-white/15 p-6 shadow-2xl relative text-zinc-200 max-h-[90vh] overflow-y-auto">
//             <button
//               type="button"
//               onClick={() => { setShowFirebaseModal(false); setFirebaseSaveSuccess(false); }}
//               className="absolute top-5 right-5 text-zinc-400 hover:text-white cursor-pointer p-1"
//             >
//               <X size={18} />
//             </button>
// 
//             <div className="flex items-center gap-3 mb-4">
//               <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
//                 <Settings size={20} />
//               </div>
//               <div>
//                 <h3 className="font-bold text-base text-white font-display">Firebase Project Settings</h3>
//                 <p className="text-[11.5px] text-zinc-400">Connect your Firebase Console project for predefined credentials</p>
//               </div>
//             </div>
// 
//             {/* Current Status */}
//             <div className={`p-3 rounded-2xl mb-4 border flex items-center justify-between ${
//               isFirebaseActive
//                 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
//                 : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
//             }`}>
//               <div className="flex items-center gap-2 text-xs">
//                 <span className={`w-2.5 h-2.5 rounded-full ${isFirebaseActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
//                 <span className="font-semibold">
//                   {isFirebaseActive ? 'Firebase is Connected & Active' : 'Firebase is Not Configured'}
//                 </span>
//               </div>
//               <span className="text-[10px] font-mono opacity-70">
//                 Source: {firebaseConfig?.source || 'none'}
//               </span>
//             </div>
// 
//             {firebaseSaveSuccess && (
//               <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
//                 <Check size={16} className="text-emerald-400" />
//                 <span>Configuration saved! Firebase Authentication is now live.</span>
//               </div>
//             )}
// 
//             {/* Instructions */}
//             <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 mb-4 space-y-2 text-xs text-zinc-300">
//               <div className="font-bold text-white flex items-center justify-between">
//                 <span>Predefined Credentials in Firebase:</span>
//                 <a
//                   href="https://console.firebase.google.com"
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="text-[#f96332] hover:underline flex items-center gap-1 text-[11px]"
//                 >
//                   <span>Firebase Console</span>
//                   <ExternalLink size={11} />
//                 </a>
//               </div>
//               <p className="text-zinc-400 text-[11.5px] leading-relaxed">
//                 Add your authorized staff users in <strong className="text-zinc-200">Firebase Console &gt; Authentication &gt; Users &gt; "Add user"</strong>. Only those predefined accounts will be allowed to log in.
//               </p>
//             </div>
// 
//             {/* Paste JSON Config Form */}
//             <form onSubmit={handleSaveFirebaseConfig} className="space-y-3">
//               <div>
//                 <label className="block text-[11px] font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
//                   Paste Firebase Config Object or JSON:
//                 </label>
//                 <textarea
//                   rows={6}
//                   value={firebaseJsonInput}
//                   onChange={(e) => setFirebaseJsonInput(e.target.value)}
//                   placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "vasooli-123.firebaseapp.com",\n  "projectId": "vasooli-123",\n  "storageBucket": "vasooli-123.appspot.com",\n  "messagingSenderId": "...",\n  "appId": "1:..."\n}`}
//                   className="w-full p-3 rounded-2xl bg-black/40 border border-white/20 text-emerald-300 font-mono text-xs outline-none focus:border-[#f96332] resize-none"
//                 />
//               </div>
// 
//               <div className="flex items-center gap-2">
//                 <button
//                   type="submit"
//                   className="flex-1 py-2.5 rounded-full bg-[#f96332] hover:bg-[#ff5722] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
//                 >
//                   Save & Connect Firebase
//                 </button>
//                 {isFirebaseActive && (
//                   <button
//                     type="button"
//                     onClick={() => {
//                       saveFirebaseConfig(null);
//                       setFirebaseJsonInput('');
//                       setInfoNotice('Firebase configuration cleared.');
//                     }}
//                     className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-zinc-300 text-xs transition-colors cursor-pointer"
//                   >
//                     Reset
//                   </button>
//                 )}
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
// 
//       {/* ========================================================= */}
//       {/* 6. Authorized Accounts / Help Modal                       */}
//       {/* ========================================================= */}
//       {showHelpModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
//           <div className="w-full max-w-md rounded-3xl bg-[#18151f]/95 border border-white/15 p-6 shadow-2xl relative text-zinc-200 max-h-[90vh] overflow-y-auto">
//             <button
//               type="button"
//               onClick={() => setShowHelpModal(false)}
//               className="absolute top-5 right-5 text-zinc-400 hover:text-white cursor-pointer p-1"
//             >
//               <X size={18} />
//             </button>
// 
//             <div className="flex items-center gap-2.5 text-white mb-2">
//               <ShieldCheck size={20} className="text-[#f96332]" />
//               <h3 className="font-bold text-base font-display">Authorized Pre-Defined Accounts</h3>
//             </div>
// 
//             <p className="text-xs text-zinc-400 leading-relaxed mb-4">
//               Click any card to auto-fill credentials for pre-authorized administrative access:
//             </p>
// 
//             <div className="space-y-2.5 mb-5">
//               <div 
//                 onClick={() => {
//                   setUsername('admin@fastpaisa.com');
//                   setPassword('admin123');
//                   setShowHelpModal(false);
//                 }}
//                 className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#f96332]/50 transition-all cursor-pointer group"
//               >
//                 <div className="flex items-center justify-between mb-1">
//                   <div className="font-bold text-white text-xs flex items-center gap-1.5">
//                     <span>👑 Central Head / Super Admin</span>
//                   </div>
//                   <span className="text-[10px] font-mono text-[#f96332] group-hover:underline">Click to Fill</span>
//                 </div>
//                 <div className="text-[11px] font-mono text-zinc-400">ID: <span className="text-zinc-200">admin@fastpaisa.com</span> (or <span className="text-zinc-200">admin</span>)</div>
//                 <div className="text-[11px] font-mono text-zinc-400">Password: <span className="text-emerald-400">admin123</span></div>
//               </div>
// 
//               <div 
//                 onClick={() => {
//                   setUsername('vishuswami683@gmail.com');
//                   setPassword('admin123');
//                   setShowHelpModal(false);
//                 }}
//                 className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#f96332]/50 transition-all cursor-pointer group"
//               >
//                 <div className="flex items-center justify-between mb-1">
//                   <div className="font-bold text-white text-xs flex items-center gap-1.5">
//                     <span>👑 Vishu Swami (Leadership)</span>
//                   </div>
//                   <span className="text-[10px] font-mono text-[#f96332] group-hover:underline">Click to Fill</span>
//                 </div>
//                 <div className="text-[11px] font-mono text-zinc-400">ID: <span className="text-zinc-200">vishuswami683@gmail.com</span> (or <span className="text-zinc-200">vishu</span>)</div>
//                 <div className="text-[11px] font-mono text-zinc-400">Password: <span className="text-emerald-400">admin123</span></div>
//               </div>
// 
//               <div 
//                 onClick={() => {
//                   setUsername('operations@fastpaisa.com');
//                   setPassword('fastpaisa2026');
//                   setShowHelpModal(false);
//                 }}
//                 className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#f96332]/50 transition-all cursor-pointer group"
//               >
//                 <div className="flex items-center justify-between mb-1">
//                   <div className="font-bold text-white text-xs flex items-center gap-1.5">
//                     <span>💼 Operations Head</span>
//                   </div>
//                   <span className="text-[10px] font-mono text-[#f96332] group-hover:underline">Click to Fill</span>
//                 </div>
//                 <div className="text-[11px] font-mono text-zinc-400">ID: <span className="text-zinc-200">operations@fastpaisa.com</span> (or <span className="text-zinc-200">operations</span>)</div>
//                 <div className="text-[11px] font-mono text-zinc-400">Password: <span className="text-emerald-400">fastpaisa2026</span></div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
// 
//       {/* ========================================================= */}
//       {/* 7. Pre-Defined Profile Picker (Offline Fallback)          */}
//       {/* ========================================================= */}
//       {showGooglePickerModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
//           <div className="w-full max-w-md rounded-3xl bg-[#13141f]/98 border border-white/15 p-6 shadow-2xl relative text-zinc-200">
//             <button
//               type="button"
//               onClick={() => setShowGooglePickerModal(false)}
//               className="absolute top-5 right-5 text-zinc-400 hover:text-white cursor-pointer p-1"
//             >
//               <X size={18} />
//             </button>
// 
//             <div className="flex items-center gap-3 mb-4">
//               <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md">
//                 <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
//                   <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
//                   <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
//                   <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
//                   <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
//                 </svg>
//               </div>
//               <div>
//                 <h3 className="font-bold text-base text-white font-display">Pre-Defined Accounts</h3>
//                 <p className="text-[11px] text-zinc-400">Select an authorized executive account</p>
//               </div>
//             </div>
// 
//             {/* List of Pre-Defined Accounts Only */}
//             <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 mb-4">
//               {savedUsersList.map((u) => (
//                 <button
//                   key={u.id}
//                   type="button"
//                   onClick={() => handleSelectPredefinedProfile(u)}
//                   className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 transition-all text-left group cursor-pointer"
//                 >
//                   <div className="flex items-center gap-2.5 truncate">
//                     <div className="w-8 h-8 rounded-full bg-[#f96332]/20 border border-[#f96332]/40 text-[#f96332] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
//                       {u.picture ? (
//                         <img src={u.picture} alt={u.name} className="w-full h-full object-cover" />
//                       ) : (
//                         <span>{u.avatar || u.name.slice(0, 2).toUpperCase()}</span>
//                       )}
//                     </div>
//                     <div className="truncate">
//                       <div className="text-xs font-bold text-white group-hover:text-[#f96332] transition-colors truncate">
//                         {u.name}
//                       </div>
//                       <div className="text-[10.5px] font-mono text-zinc-400 truncate">
//                         {u.email}
//                       </div>
//                     </div>
//                   </div>
//                   <span className="text-[10px] font-semibold text-emerald-400 shrink-0 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
//                     Log In →
//                   </span>
//                 </button>
//               ))}
//             </div>
// 
//             {/* Callout */}
//             <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
//               <span className="text-[11px] text-amber-200">Connect live Firebase project?</span>
//               <button
//                 type="button"
//                 onClick={() => { setShowGooglePickerModal(false); setShowFirebaseModal(true); }}
//                 className="text-[11px] font-bold text-[#f96332] hover:underline cursor-pointer"
//               >
//                 Configure &rarr;
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
// 
//     </div>
//   );
// }
// 

export default function LoginPage() {
  return null;
}
