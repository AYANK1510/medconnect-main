import React, { useState } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Mic, 
  QrCode, 
  Clock, 
  FileText, 
  CheckCircle2, 
  History, 
  Languages, 
  ShieldCheck, 
  User, 
  Calendar, 
  ChevronRight, 
  Mail, 
  Phone, 
  Lock, 
  LogOut, 
  AlertCircle 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

interface PatientEntryPageProps {
  onNavigate?: (section: string, tab?: string | null) => void;
}

export const PatientEntryPage: React.FC<PatientEntryPageProps> = ({ onNavigate }) => {
  const { user, profile, isAuthenticated, login, register, logout, switchRole } = useAuth();
  const { setActivePage } = useApp();

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [languagePreference, setLanguagePreference] = useState('en');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const navigateTo = (section: string, tab: string | null = null) => {
    if (onNavigate) {
      onNavigate(section, tab);
    } else {
      if (section === 'landing') {
        setActivePage('landing');
      } else if (section === 'patients-app') {
        switchRole('patient');
        setActivePage('patient');
      } else if (section === 'hospitals-app') {
        switchRole('hospital_admin');
        setActivePage('reception');
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      await login(email, password, 'patient');
      navigateTo('patients-app', 'overview');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      await register(email, password, fullName, 'patient');
      navigateTo('patients-app', 'overview');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoSignIn = async (key: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const demoEmail = key === 'anita' 
        ? 'anita.sundaram@medconnectpulse.org' 
        : key === 'ramesh' 
        ? 'ramesh.kumar@medconnectpulse.org' 
        : 'vikram.singh@medconnectpulse.org';
      await login(demoEmail, 'password123', 'patient');
      navigateTo('patients-app', 'overview');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo login failed';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-[#090e17] text-slate-100 font-sans selection:bg-teal-500 selection:text-white">
      
      {/* Sub-Navigation Strip */}
      <div className="border-b border-slate-800/70 bg-slate-900/40 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <button 
              type="button"
              onClick={() => navigateTo('landing')}
              className="hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
            <span className="text-slate-600">/</span>
            <span className="text-teal-400 font-medium">Patient Services</span>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 hidden sm:inline">Signed in as:</span>
              <span className="text-teal-300 font-semibold">{profile?.full_name || user?.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hero Section with Integrated Authentication */}
      <section className="relative pt-12 pb-16 md:pt-16 md:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-slate-800/60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.07)_0%,rgba(15,23,42,0)_70%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-950/60 border border-teal-800/50 text-teal-300 text-xs font-medium mb-5">
            <Languages className="w-3.5 h-3.5 text-teal-400" />
            <span>Multilingual Clinic Intake & Live Queue Pass</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.15] max-w-3xl mx-auto">
            Your healthcare, without the waiting-room uncertainty.
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Speak naturally in your mother tongue, book an outpatient consultation in seconds, receive a verified digital QR pass, and watch your queue position update live on your phone.
          </p>

          {/* Authentication Container */}
          <div className="mt-8 max-w-md mx-auto text-left bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
            
            {isAuthenticated ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 mx-auto rounded-xl bg-teal-950 border border-teal-700/60 flex items-center justify-center text-teal-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Active Patient Session</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Authenticated as <strong className="text-teal-300">{profile?.full_name || user?.email}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{user?.email}</p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigateTo('patients-app', 'overview')}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-teal-900/40 cursor-pointer"
                  >
                    <span>Launch Patient Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Log out from current session"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Auth Mode Tabs */}
                <div className="flex border-b border-slate-800 mb-4">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(null); }}
                    className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
                      authMode === 'login'
                        ? 'border-teal-500 text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                    className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
                      authMode === 'signup'
                        ? 'border-teal-500 text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {authError && (
                  <div className="mb-3.5 p-2.5 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {/* Login Form */}
                {authMode === 'login' ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="patient@example.com"
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-teal-900/40 disabled:opacity-50 cursor-pointer mt-2"
                    >
                      {authLoading ? (
                        <span>Authenticating...</span>
                      ) : (
                        <>
                          <span>Sign In to Patient Portal</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Sign Up Form */
                  <form onSubmit={handleSignUpSubmit} className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-0.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ramesh Kumar"
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-0.5">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                          <input
                            type="tel"
                            required
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full pl-9 pr-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-0.5">
                          Language
                        </label>
                        <select
                          value={languagePreference}
                          onChange={(e) => setLanguagePreference(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 transition-colors cursor-pointer"
                        >
                          <option value="en">English</option>
                          <option value="hi">Hindi (हिन्दी)</option>
                          <option value="ta">Tamil (தமிழ்)</option>
                          <option value="te">Telugu (తెలుగు)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-0.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-0.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-teal-900/40 disabled:opacity-50 cursor-pointer mt-2"
                    >
                      {authLoading ? (
                        <span>Registering...</span>
                      ) : (
                        <>
                          <span>Create Patient Account</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Demo Quick Sign-in Section */}
                <div className="mt-4 pt-3.5 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 font-medium">
                    <span>Quick Demo Sign-In:</span>
                    <span className="text-teal-400">1-Click Live Persona Auth</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      disabled={authLoading}
                      onClick={() => handleDemoSignIn('anita')}
                      className="py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-teal-300 hover:text-white transition-colors text-center truncate cursor-pointer"
                      title="Anita Sundaram (Tamil, Checked in)"
                    >
                      Anita (ta)
                    </button>
                    <button
                      type="button"
                      disabled={authLoading}
                      onClick={() => handleDemoSignIn('ramesh')}
                      className="py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-amber-300 hover:text-white transition-colors text-center truncate cursor-pointer"
                      title="Ramesh Kumar (Hindi, In line)"
                    >
                      Ramesh (hi)
                    </button>
                    <button
                      type="button"
                      disabled={authLoading}
                      onClick={() => handleDemoSignIn('vikram')}
                      className="py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors text-center truncate cursor-pointer"
                      title="Vikram Singh (English, Voice intake)"
                    >
                      Vikram (en)
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>

          <p className="mt-4 text-xs text-slate-400 flex items-center justify-center gap-2">
            <span>✓ Real Supabase Authentication</span>
            <span>•</span>
            <span>✓ Persistent Session</span>
            <span>•</span>
            <span>✓ Free for patients</span>
          </p>

        </div>
      </section>

      {/* The 8 Patient Experience Pillars */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-2">Designed for Comfort & Clarity</h2>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Everything you need for a stress-free clinic visit.
          </h3>
          <p className="text-sm text-slate-400 mt-3">
            From the moment symptoms arise to collecting your digital prescription, experience thoughtful care with zero guesswork.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Feature 1: Multilingual AI Receptionist */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4">
                <Languages className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Multilingual AI Receptionist</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Describe your condition naturally in Hindi, Tamil, Telugu, or English. The AI understands regional expressions and conversational speech.
              </p>
            </div>
            <div className="text-[11px] font-medium text-teal-400 flex items-center gap-1 pt-2 border-t border-slate-800/80">
              <span>Natural Speech Processing</span>
            </div>
          </div>

          {/* Feature 2: Voice & Chat Booking */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
                <Mic className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Voice & Chat Booking</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hold to speak or type in short sentences. The system extracts symptoms, matches the right medical specialist, and checks for red-flag symptoms.
              </p>
            </div>
            <div className="text-[11px] font-medium text-blue-400 flex items-center gap-1 pt-2 border-t border-slate-800/80">
              <span>Voice-first or text options</span>
            </div>
          </div>

          {/* Feature 3: Sub-2s Appointment Booking */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <Calendar className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Guaranteed Slot Reservation</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your consultation slot is secured in real time, guaranteeing zero double-booking or scheduling conflicts under clinic traffic.
              </p>
            </div>
            <div className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 pt-2 border-t border-slate-800/80">
              <span>Instant confirmation</span>
            </div>
          </div>

          {/* Feature 4: Instant QR Token Pass */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
                <QrCode className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Instant QR Token Pass</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Receive an encrypted digital token immediately. No paper printouts needed—simply present your phone screen at the clinic entrance kiosk.
              </p>
            </div>
            <div className="text-[11px] font-medium text-purple-400 flex items-center gap-1 pt-2 border-t border-slate-800/80">
              <span>Contactless check-in ready</span>
            </div>
          </div>

          {/* Feature 5: Live Queue Tracker */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Live Queue Tracker</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                See exactly which token is currently inside with the doctor, your place in line, and how many patients are ahead in the waiting room.
              </p>
            </div>
            <div className="text-[11px] font-medium text-amber-400 flex items-center gap-1 pt-2 border-t border-slate-800/80">
              <span>Live hospital status sync</span>
            </div>
          </div>

          {/* Feature 6: Dynamic Wait-Time Updates */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Wait-Time Updates</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Continuous 15-minute pacing calculations alert you when your turn approaches, so you can wait at a coffee shop or nearby rather than crowded benches.
              </p>
            </div>
            <div className="text-[11px] font-medium text-rose-400 flex items-center gap-1 pt-2 border-t border-slate-800/80">
              <span>Dynamic pacing algorithm</span>
            </div>
          </div>

          {/* Feature 7: Digital Prescriptions */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Digital Prescriptions</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Review verified medicine names, morning/afternoon/night schedules, food timings, and physician dietary advice. Download or print cleanly.
              </p>
            </div>
            <div className="text-[11px] font-medium text-teal-400 flex items-center gap-1 pt-2 border-t border-slate-800/80">
              <span>Digitally authenticated by doctor</span>
            </div>
          </div>

          {/* Feature 8: Complete Visit History */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                <History className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Visit History & Continuity</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Review past doctor diagnoses, historical token IDs, and treatment timelines in one consolidated, private medical record.
              </p>
            </div>
            <div className="text-[11px] font-medium text-indigo-400 flex items-center gap-1 pt-2 border-t border-slate-800/80">
              <span>Encrypted longitudinal record</span>
            </div>
          </div>

        </div>

      </section>

      {/* Patient Care Journeys & Walkthrough Presets */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900/40 border-y border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-400 uppercase tracking-wider mb-2">
                <User className="w-3.5 h-3.5" />
                <span>Patient Care Journeys</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Experience healthcare from the patient's perspective.
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Explore real clinic scenarios—from arrival check-in and live queue tracking to voice appointment booking.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigateTo('patients-app', 'overview')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 self-start md:self-auto cursor-pointer"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Anita Sundaram */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
                  Checked In • Next in Line
                </span>
                <span className="font-mono text-xs font-bold text-slate-400">#MED-1001</span>
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Anita Sundaram</h4>
                <p className="text-xs text-slate-400 mt-0.5">Tamil (தமிழ்) • 34 yrs • Bangalore</p>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                Active appointment with Dr. Arvind Sharma (Room 101). Verified digital pass and authenticated digital prescription.
              </p>
              <button
                type="button"
                onClick={() => handleDemoSignIn('anita')}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-teal-300 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Sign In as Anita (Pass & Rx)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Ramesh Kumar */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-semibold">
                  Confirmed • #2 in Line
                </span>
                <span className="font-mono text-xs font-bold text-slate-400">#MED-4029</span>
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Ramesh Kumar</h4>
                <p className="text-xs text-slate-400 mt-0.5">Hindi (हिन्दी) • 45 yrs • Bangalore</p>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                Confirmed consultation slot for joint discomfort. Ready to simulate contactless arrival check-in at clinic kiosk.
              </p>
              <button
                type="button"
                onClick={() => handleDemoSignIn('ramesh')}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Sign In as Ramesh (Queue Status)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Vikram Singh */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[11px] font-semibold">
                  Voice Intake Ready
                </span>
                <span className="font-mono text-xs font-bold text-slate-400">New Intake</span>
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Vikram Singh</h4>
                <p className="text-xs text-slate-400 mt-0.5">English • 52 yrs • Bangalore</p>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                Interactive voice reception: speak or type symptoms naturally in any Indian language for instant slot reservation.
              </p>
              <button
                type="button"
                onClick={() => handleDemoSignIn('vikram')}
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Sign In as Vikram (Voice AI)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* Final Action CTA Banner */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full text-center">
        <div className="p-10 sm:p-12 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ready to access care without waiting in line?
          </h2>
          <p className="text-sm text-slate-300 max-w-lg mx-auto">
            Book an appointment using your voice or track an existing medical pass in seconds.
          </p>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigateTo('patients-app', 'book')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-all shadow-md shadow-teal-900/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Book an Appointment</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigateTo('patients-app', 'overview')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Clock className="w-4 h-4 text-teal-400" />
              <span>Track My Appointment</span>
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
export default PatientEntryPage;
