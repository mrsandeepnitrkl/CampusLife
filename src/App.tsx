/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, UserRole, Announcement } from "./types.js";
import FAQPage from "./components/FAQPage.jsx";
import StudentPortal from "./components/StudentPortal.jsx";
import AdminPortal from "./components/AdminPortal.jsx";
import TrackComponent from "./components/TrackComponent.jsx";
import CaptchaComponent from "./components/CaptchaComponent.jsx";
import { supabase, isSupabaseConfigured } from "./lib/supabase.js";
import {
  ShieldAlert,
  Moon,
  Sun,
  Lock,
  Megaphone,
  ChevronRight,
  BookOpen,
  Search,
  CheckCircle,
  HelpCircle,
  Sparkles,
  LogOut,
  Building,
  UserPlus,
  Key
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("campuscare_token"));
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Layout View States for landing page
  const [landingSubView, setLandingSubView] = useState<"login" | "faq" | "track">("login");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(localStorage.getItem("campuscare_theme") === "dark");

  // Auth Modes & State Toggles
  const [isSignUp, setIsSignUp] = useState(false);
  const [useSandboxBypass, setUseSandboxBypass] = useState(!isSupabaseConfigured);

  // Login Form States
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Sign Up Form States
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpDepartment, setSignUpDepartment] = useState("Computer Science");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpSuccess, setSignUpSuccess] = useState("");

  // Announcements Ticker list
  const [publicAnnouncements, setPublicAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    // Validate current token
    if (token) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error("Invalid token");
          }
          return res.json();
        })
        .then((userData) => {
          setUser(userData);
          setCheckingAuth(false);
        })
        .catch(() => {
          // Token is invalid/expired
          localStorage.removeItem("campuscare_token");
          setToken(null);
          setUser(null);
          setCheckingAuth(false);
        });
    } else {
      setCheckingAuth(false);
    }

    // Load active announcements
    fetch("/api/announcements")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPublicAnnouncements(data);
      })
      .catch((err) => console.error("Error loading public broadcasts:", err));
  }, [token]);

  // Handle Dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("campuscare_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("campuscare_theme", "light");
    }
  }, [isDarkMode]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setSignUpSuccess("");

    if (!loginId.trim() || !loginPassword.trim()) {
      return setLoginError("Please enter both User ID and Password.");
    }
    if (!captchaAnswer.trim()) {
      return setLoginError("Please solve the security verification (CAPTCHA).");
    }

    setLoggingIn(true);

    if (isSupabaseConfigured && !useSandboxBypass) {
      try {
        const email = loginId.includes("@") ? loginId.trim() : `${loginId.trim()}@campuscare.edu`;
        
        const res = await fetch("/api/auth/supabase/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password: loginPassword
          })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Supabase authentication failed.");
        }

        if (!data.session) {
          throw new Error("No session returned from Supabase Auth.");
        }

        // Store the session access token (JWT)
        localStorage.setItem("campuscare_token", data.session.access_token);
        setToken(data.session.access_token);
        
        // Clean form
        setLoginId("");
        setLoginPassword("");
        setCaptchaAnswer("");
      } catch (err: any) {
        setLoginError(err.message || "Supabase authentication failed.");
        setCaptchaReset(prev => prev + 1); // Refresh CAPTCHA
      } finally {
        setLoggingIn(false);
      }
      return;
    }

    // Sandbox / Developer Mode Fallback login
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: loginId.trim(),
          password: loginPassword,
          captchaToken,
          captchaAnswer
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login attempt failed.");
      }

      // Store credentials and set user session
      localStorage.setItem("campuscare_token", data.token);
      setToken(data.token);
      setUser(data.user);
      
      // Clean form
      setLoginId("");
      setLoginPassword("");
      setCaptchaAnswer("");
    } catch (err: any) {
      setLoginError(err.message || "An unexpected network error occurred.");
      setCaptchaReset(prev => prev + 1); // Refresh CAPTCHA
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setSignUpSuccess("");

    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPassword.trim()) {
      return setLoginError("Please fill out all fields.");
    }
    if (!captchaAnswer.trim()) {
      return setLoginError("Please solve the security verification (CAPTCHA).");
    }

    setLoggingIn(true);

    try {
      const res = await fetch("/api/auth/supabase/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signUpEmail.trim(),
          password: signUpPassword,
          name: signUpName.trim(),
          department: signUpDepartment
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Supabase user registration failed.");
      }

      setSignUpSuccess("Registration successful! If confirmation is required, please check your email. Otherwise, you can log in now.");
      // Switch back to Login mode and reset sign up inputs
      setIsSignUp(false);
      setSignUpName("");
      setSignUpEmail("");
      setSignUpPassword("");
    } catch (err: any) {
      setLoginError(err.message || "Supabase user registration failed.");
      setCaptchaReset(prev => prev + 1);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    if (token) {
      // Sign out from Supabase if token is a Supabase JWT (contains dot)
      if (isSupabaseConfigured && token.includes(".")) {
        localStorage.removeItem("campuscare_token");
        setToken(null);
        setUser(null);
        setLandingSubView("login");
        return;
      }

      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).finally(() => {
        localStorage.removeItem("campuscare_token");
        setToken(null);
        setUser(null);
        setLandingSubView("login");
      });
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
        <p className="mt-4 text-xs font-mono text-slate-500 tracking-wider uppercase">Verifying Security Session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans selection:bg-blue-500/10 selection:text-blue-600">
      
      {/* Dynamic announcements ribbon ticker */}
      {publicAnnouncements.length > 0 && !user && (
        <div className="bg-blue-600 text-white py-2 px-4 text-xs font-medium flex items-center justify-center gap-2 overflow-hidden shadow-sm relative">
          <Megaphone className="h-4 w-4 shrink-0 animate-bounce text-blue-200" />
          <div className="animate-pulse whitespace-nowrap overflow-hidden text-center max-w-full truncate font-sans">
            <strong>LATEST ALERTS:</strong> {publicAnnouncements[0].title} — {publicAnnouncements[0].content.slice(0, 80)}...
          </div>
          <button
            onClick={() => setLandingSubView("faq")}
            className="underline font-bold text-[10px] uppercase ml-2 tracking-wider shrink-0 text-blue-100 hover:text-white"
          >
            Read Broadcasts
          </button>
        </div>
      )}

      {/* Global Navbar */}
      <header className="border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/80 backdrop-blur sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-sans font-bold text-xl tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                CampusCare
              </span>
              <p className="text-[9px] font-mono tracking-widest text-slate-400 uppercase leading-none font-bold">
                FIC EMERGENCY SUPPORT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5 text-slate-500" />}
            </button>

            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{user.name}</p>
                  <p className="text-[9px] font-mono text-slate-400 capitalize">{user.role} Workspace</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-2.5 rounded-xl transition-all shadow-sm border border-rose-100/50 flex items-center gap-1.5 text-xs font-semibold"
                  title="Logout Session"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLandingSubView("faq")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    landingSubView === "faq"
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  FAQs
                </button>
                <button
                  onClick={() => setLandingSubView("track")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    landingSubView === "track"
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Track Publicly
                </button>
                <button
                  onClick={() => setLandingSubView("login")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    landingSubView === "login"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  Portal Login
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* LOGGED IN USER WORKSPACE ROUTING */}
        {user ? (
          user.role === UserRole.ADMIN ? (
            <AdminPortal user={user} token={token!} />
          ) : (
            <StudentPortal user={user} token={token!} />
          )
        ) : (
          /* GUEST / LANDING PAGES WORKSPACE */
          <div className="animate-fade-in">
            {landingSubView === "login" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                
                {/* Left side: branding/welcome statement */}
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <span className="bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                      Institutional Support Center
                    </span>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-extrabold tracking-tight text-slate-900 dark:text-white mt-4 leading-tight">
                      Empowering Your <br />
                      <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">Campus Experience.</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mt-4 max-w-xl">
                      CampusCare is your centralized administrative helpline desk. Instantly report concerns with Course registration, library databases, marksheet verification, Wi-Fi networks, and hostels.
                    </p>
                  </div>

                  {/* Feature lists bento snippet */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl shadow-sm flex items-start gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg">
                        <CheckCircle className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase">Instant Ticket Generation</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">Generate tracking indices instantly to trace investigation audits.</p>
                      </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl shadow-sm flex items-start gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg">
                        <BookOpen className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase">Direct FAQ Screening</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">Find stamps, Counter timings, hostel forms instantly without waits.</p>
                      </div>
                    </div>
                  </div>

                  {/* Public Alerts Box */}
                  {publicAnnouncements.length > 0 && (
                    <div className="p-5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-sm space-y-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Megaphone className="h-4.5 w-4.5 text-blue-600" />
                        Official Campus Broadcaster Alerts
                      </h3>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {publicAnnouncements.slice(0, 2).map((ann) => (
                          <div key={ann.id} className="py-2.5 first:pt-0 last:pb-0">
                            <h4 className="text-sm font-bold text-slate-850 dark:text-white">{ann.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5 max-w-xl truncate">{ann.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right side: Login Panel card */}
                <div className="lg:col-span-5 max-w-md mx-auto w-full">
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-md">
                    
                    {/* Supabase Status Banner */}
                    <div className="mb-6 p-3 rounded-2xl text-[11px] leading-relaxed border border-slate-150 dark:border-slate-800 font-medium bg-slate-50 dark:bg-slate-850">
                      {isSupabaseConfigured ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              Supabase Live Auth Active
                            </span>
                            <button 
                              type="button"
                              onClick={() => {
                                setUseSandboxBypass(!useSandboxBypass);
                                setLoginError("");
                                setSignUpSuccess("");
                              }}
                              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              {useSandboxBypass ? "Enable Supabase" : "Use Sandbox Bypass"}
                            </button>
                          </div>
                          <p className="text-slate-400 text-[10px]">
                            {useSandboxBypass 
                              ? "Currently in Offline Sandbox Bypass mode. Log in with sandeepiitp / student123." 
                              : "Currently using real Supabase Auth handles for user logins & signups."}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 text-amber-600 dark:text-amber-400">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Supabase Auth Offline (Sandbox Mode)
                          </div>
                          <p className="text-slate-400 text-[10px] leading-relaxed">
                            VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env variables are not set. The portal is in Sandbox mode with demo accounts (sandeepiitp / student123).
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Auth Navigation Tabs */}
                    {(!isSupabaseConfigured || useSandboxBypass) ? (
                      <div className="mb-6">
                        <h3 className="text-xl font-bold font-sans text-slate-900 dark:text-white">Portal Secure Login</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                          Log in using your registered credentials to raise and track complaints.
                        </p>
                      </div>
                    ) : (
                      <div className="flex border-b border-slate-100 dark:border-slate-800 mb-6">
                        <button
                          type="button"
                          onClick={() => { setIsSignUp(false); setLoginError(""); setSignUpSuccess(""); }}
                          className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${
                            !isSignUp
                              ? "border-blue-600 text-blue-600 dark:text-blue-400"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Sign In
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsSignUp(true); setLoginError(""); setSignUpSuccess(""); }}
                          className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${
                            isSignUp
                              ? "border-blue-600 text-blue-600 dark:text-blue-400"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Sign Up
                        </button>
                      </div>
                    )}

                    {signUpSuccess && (
                      <div className="p-3 mb-4 bg-emerald-50 border border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400 rounded-xl text-xs font-semibold leading-relaxed animate-fade-in">
                        {signUpSuccess}
                      </div>
                    )}

                    {loginError && (
                      <div className="p-3 mb-4 bg-rose-50 border border-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400 rounded-xl text-xs font-semibold leading-relaxed animate-fade-in">
                        {loginError}
                      </div>
                    )}

                    {!isSignUp ? (
                      /* Sign In Form */
                      <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                            {(!isSupabaseConfigured || useSandboxBypass) ? "User login ID *" : "Email Address or Username *"}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={(!isSupabaseConfigured || useSandboxBypass) ? "e.g. admin or student123" : "e.g. student@example.com or student123"}
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Account Password *</label>
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold"
                          />
                        </div>

                        {/* CAPTCHA validation */}
                        <CaptchaComponent
                          onValidated={(token, answer) => {
                            setCaptchaToken(token);
                            setCaptchaAnswer(answer);
                          }}
                          resetTrigger={captchaReset}
                        />

                        <button
                          type="submit"
                          disabled={loggingIn}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                          {loggingIn ? (
                            <>
                              <div className="animate-spin rounded-full h-4.5 w-4.5 border-2 border-white border-t-transparent"></div>
                              Verifying secure session...
                            </>
                          ) : (
                            <>
                              Authenticate Portal
                              <ChevronRight className="h-4.5 w-4.5" />
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      /* Sign Up Form */
                      <form onSubmit={handleSignUpSubmit} className="space-y-4">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Full Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Amit Kumar"
                            value={signUpName}
                            onChange={(e) => setSignUpName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Email Address *</label>
                          <input
                            type="email"
                            required
                            placeholder="e.g. amit.kumar@campuscare.edu"
                            value={signUpEmail}
                            onChange={(e) => setSignUpEmail(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">User Department *</label>
                          <select
                            value={signUpDepartment}
                            onChange={(e) => setSignUpDepartment(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold"
                          >
                            <option value="Computer Science">Computer Science</option>
                            <option value="Electronics Engineering">Electronics Engineering</option>
                            <option value="Mechanical Engineering">Mechanical Engineering</option>
                            <option value="Civil Engineering">Civil Engineering</option>
                            <option value="Administration Office">Administration Office</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Account Password *</label>
                          <input
                            type="password"
                            required
                            placeholder="At least 6 characters"
                            value={signUpPassword}
                            onChange={(e) => setSignUpPassword(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold"
                          />
                        </div>

                        {/* CAPTCHA validation */}
                        <CaptchaComponent
                          onValidated={(token, answer) => {
                            setCaptchaToken(token);
                            setCaptchaAnswer(answer);
                          }}
                          resetTrigger={captchaReset}
                        />

                        <button
                          type="submit"
                          disabled={loggingIn}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                          {loggingIn ? (
                            <>
                              <div className="animate-spin rounded-full h-4.5 w-4.5 border-2 border-white border-t-transparent"></div>
                              Creating account...
                            </>
                          ) : (
                            <>
                              Create Secure Account
                              <UserPlus className="h-4.5 w-4.5" />
                            </>
                          )}
                        </button>
                      </form>
                    )}

                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400 font-mono">
                      CampusCare Support System © 2026<br />
                      Managed securely via FIC emergency counters
                    </div>
                  </div>
                </div>
              </div>
            )}

            {landingSubView === "faq" && (
              <FAQPage />
            )}

            {landingSubView === "track" && (
              <TrackComponent onBack={() => setLandingSubView("login")} />
            )}
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900 py-6 mt-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            CampusCare Support Portal • Managed by **FIC Emergency Desk**
          </p>
          <div className="flex gap-4">
            <span className="font-mono text-[10px]">Server PORT: 3000</span>
            <span>•</span>
            <span>Zero Trust Security Activated</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
