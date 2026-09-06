import React, { useState } from 'react';
import { 
  Building2, 
  Stethoscope, 
  Radio, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  AlertCircle, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

interface HospitalEntryPageProps {
  onNavigate?: (section: string, tab?: string | null) => void;
}

export const HospitalEntryPage: React.FC<HospitalEntryPageProps> = ({ onNavigate }) => {
  const { user, profile, isAuthenticated, login, register, logout, switchRole } = useAuth();
  const { setActivePage } = useApp();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const navigateTo = (section: string, tab: string | null = null) => {
    if (onNavigate) {
      onNavigate(section, tab);
    } else {
      if (section === 'landing') {
        setActivePage('landing');
      } else if (section === 'hospitals-app') {
        switchRole('hospital_admin');
        if (tab === 'doctor') setActivePage('doctors');
        else if (tab === 'emergency') setActivePage('emergency_dispatch');
        else setActivePage('reception');
      } else if (section === 'patients-app') {
        switchRole('patient');
        setActivePage('patient');
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      await login(email, password, 'hospital_admin');
      navigateTo('hospitals-app', 'reception');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      await register(email, password, hospitalName, 'hospital_admin');
      navigateTo('hospitals-app', 'reception');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await login('admin.sharma@citygeneral.org', 'password123', 'hospital_admin');
      navigateTo('hospitals-app', 'reception');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo login failed';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans">
      
      {/* Top Breadcrumb & Context Header */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button 
              type="button"
              onClick={() => navigateTo('landing')}
              className="hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
            <span className="text-slate-600">/</span>
            <span className="text-teal-400 font-semibold flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>Hospital Product</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/80 border border-blue-700/60 text-[11px] font-semibold text-blue-300">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Staff Authenticated: {profile?.full_name || user?.email}
              </span>
            ) : (
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-[11px] font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Hospital Network: Live
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Hospital Product Hero */}
      <section className="py-12 md:py-16 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-950/70 border border-teal-700/60 text-teal-300 text-xs font-semibold mb-5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>MedConnect Pulse · Hospital Operations Suite</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            One operational layer connecting your hospital to patients and nearby hospitals.
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Eliminate triage delays, double-booked outpatient queues, and blind inter-hospital resource transfers. A unified clinical command center built for real-time healthcare throughput.
          </p>

          {/* Hospital Authentication Box */}
          <div className="mt-8 max-w-md mx-auto text-left bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
            
            {isAuthenticated ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 mx-auto rounded-xl bg-blue-950 border border-blue-700/60 flex items-center justify-center text-blue-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Active Hospital Workspace Session</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Operating Facility: <strong className="text-teal-300">{profile?.full_name || 'DemoCare Central Hospital'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{user?.email}</p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigateTo('hospitals-app', 'reception')}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-teal-500/20 cursor-pointer"
                  >
                    <span>Enter Workspace (Reception)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Log out from hospital workspace"
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
                    Staff Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setAuthError(null); }}
                    className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
                      authMode === 'register'
                        ? 'border-teal-500 text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Register Hospital
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
                        Staff Work Email
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="hospital@democare.org"
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Access Password
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
                      className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-teal-500/20 disabled:opacity-50 cursor-pointer mt-2"
                    >
                      {authLoading ? (
                        <span>Authenticating Staff...</span>
                      ) : (
                        <>
                          <span>Sign In to Hospital Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Register Hospital Form */
                  <form onSubmit={handleRegisterSubmit} className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-0.5">
                        Hospital Facility Name
                      </label>
                      <div className="relative">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={hospitalName}
                          onChange={(e) => setHospitalName(e.target.value)}
                          placeholder="City General Hospital"
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-0.5">
                          Emergency Phone
                        </label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                          <input
                            type="tel"
                            required
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            placeholder="+91 80 2200 1111"
                            className="w-full pl-9 pr-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-0.5">
                          Metro Address
                        </label>
                        <div className="relative">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="MG Road, Bangalore"
                            className="w-full pl-9 pr-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-0.5">
                        Admin Email
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@hospital.org"
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
                      className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-teal-500/20 disabled:opacity-50 cursor-pointer mt-2"
                    >
                      {authLoading ? (
                        <span>Registering Facility...</span>
                      ) : (
                        <>
                          <span>Register Hospital & Open Workspace</span>
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
                    <span className="text-teal-400">1-Click Live Auth</span>
                  </div>
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={handleDemoSignIn}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-teal-300 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 text-teal-400" />
                    <span>DemoCare Central Hospital (Bangalore)</span>
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-8 pt-8 border-t border-slate-800/80 grid grid-cols-3 gap-4 max-w-xl mx-auto text-center">
            <div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">&lt; 2s</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">QR Verification</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-teal-400 font-mono">100%</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Guaranteed Slot Locks</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">120s</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Auto-Escalation</div>
            </div>
          </div>
        </div>

        {/* 3 Dedicated Product Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          
          {/* Capability 1: RECEPTION */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-teal-500/60 transition-all shadow-xl hover:shadow-teal-500/10 group">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-teal-950 border border-teal-700/60 text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-teal-950/90 text-teal-300 border border-teal-800/60">
                  Pillar 1
                </span>
              </div>

              <h2 className="text-lg font-bold text-white mb-2 tracking-tight">
                Reception & Intake
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                High-throughput front-desk intake that turns physical check-in queues into frictionless, sub-second digital transitions.
              </p>

              {/* Exact Capabilities */}
              <div className="space-y-3 mb-6 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <div className="flex items-start gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">Patient check-in</strong>
                    <span className="text-slate-400 text-[11px]">Instant arrival logging with 1-click desk confirmation.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">QR verification</strong>
                    <span className="text-slate-400 text-[11px]">Sub-2s hardware barcode & webcam kiosk scanner.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">Live queue</strong>
                    <span className="text-slate-400 text-[11px]">Real-time position counter & reactive wait time display.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">Queue management</strong>
                    <span className="text-slate-400 text-[11px]">Department filters, no-show marking & room routing.</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigateTo('hospitals-app', 'reception')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-teal-300 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-teal-700/50 cursor-pointer"
            >
              <span>Launch Reception Desk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Capability 2: DOCTOR OPD */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-teal-500/60 transition-all shadow-xl hover:shadow-teal-500/10 group">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-teal-950 border border-teal-700/60 text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-teal-950/90 text-teal-300 border border-teal-800/60">
                  Pillar 1
                </span>
              </div>

              <h2 className="text-lg font-bold text-white mb-2 tracking-tight">
                Doctor OPD Consultation
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                A focused clinical workspace designed to eliminate administrative overhead and prioritize patient encounter quality.
              </p>

              {/* Exact Capabilities */}
              <div className="space-y-3 mb-6 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <div className="flex items-start gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">Patient queue</strong>
                    <span className="text-slate-400 text-[11px]">Ordered waiting bay with 1-click "Call In Next Patient".</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">Consultation workspace</strong>
                    <span className="text-slate-400 text-[11px]">AI-transcribed chief complaints, vitals & patient profile.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">Clinical guardrails</strong>
                    <span className="text-slate-400 text-[11px]">Automated CDSS checks for drug interactions & dosage.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">Digital prescription</strong>
                    <span className="text-slate-400 text-[11px]">Cryptographically verifiable, printable medical Rx pad.</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigateTo('hospitals-app', 'doctor')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-teal-300 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-teal-700/50 cursor-pointer"
            >
              <span>Launch Doctor OPD</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Capability 3: EMERGENCY NETWORK */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-rose-500/60 transition-all shadow-xl hover:shadow-rose-500/10 group">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-rose-950 border border-rose-700/60 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Radio className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-rose-950/90 text-rose-300 border border-rose-800/60">
                  Pillar 2
                </span>
              </div>

              <h2 className="text-lg font-bold text-white mb-2 tracking-tight">
                Emergency Dispatch Network
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Inter-hospital critical resource discovery & secure allocation engine when seconds count in trauma scenarios.
              </p>

              {/* Exact Capabilities */}
              <div className="space-y-3 mb-6 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <div className="flex items-start gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">Nearby hospital discovery</strong>
                    <span className="text-slate-400 text-[11px]">Haversine proximity radar scanning within 5-15 km.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">Emergency resource requests</strong>
                    <span className="text-slate-400 text-[11px]">ICU beds, O- blood, oxygen cylinders, ventilators.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">Resource broadcast</strong>
                    <span className="text-slate-400 text-[11px]">Instant peer-to-peer pubsub dispatch across regional centers.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">Secure resource allocation</strong>
                    <span className="text-slate-400 text-[11px]">Strict concurrency control prevents duplicate allocation.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">QR dispatch pass</strong>
                    <span className="text-slate-400 text-[11px]">Secure digital transit token with driver handover verification.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">Automatic escalation</strong>
                    <span className="text-slate-400 text-[11px]">Automated 120s/180s fallback expanding search radius.</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigateTo('hospitals-app', 'emergency')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-rose-700/50 cursor-pointer"
            >
              <span>Launch Emergency Network</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Operational Flow Architecture Strip */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-teal-400 text-xs font-mono font-bold tracking-wider uppercase">
              End-to-End Operational Flow
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
              How the Hospital Workspace Coordinates Care
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 text-xs font-bold flex items-center justify-center">1</div>
              <h4 className="text-sm font-bold text-white">Intake & Check-In</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Patients book via voice AI or walk-in. Front-desk kiosks verify tokens in &lt;2s and route directly to the doctor's roster.
              </p>
            </div>

            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 text-xs font-bold flex items-center justify-center">2</div>
              <h4 className="text-sm font-bold text-white">Clinical Consultation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Doctors call patients into rooms with atomic queue updates, consult with AI-transcribed notes, and issue verified Rx.
              </p>
            </div>

            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-center">3</div>
              <h4 className="text-sm font-bold text-white">Regional ER Exchange</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Critical trauma triggers a Haversine broadcast. First responding hospital locks the resource atomically with a digital transit pass.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => navigateTo('hospitals-app', 'reception')}
              className="inline-flex items-center gap-2 text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
            >
              <span>Enter Workspace Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </section>

    </div>
  );
};
export default HospitalEntryPage;
