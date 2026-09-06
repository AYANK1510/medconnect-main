import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/database.types';
import {
  HeartPulse,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  Building2,
  User,
  Activity,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '../../components/ui';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('patient.rahul@medconnectpulse.org');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<UserRole>('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rolePresets: Record<UserRole, { email: string; name: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
    patient: { email: 'patient.rahul@medconnectpulse.org', name: 'Rahul Kapoor (Patient)', label: 'Patient', icon: User },
    receptionist: { email: 'reception.sunita@citygeneral.org', name: 'Sunita Verma (Receptionist)', label: 'Reception', icon: Building2 },
    er_staff: { email: 'er.vikram@citygeneral.org', name: 'Vikram Singh (ER Staff)', label: 'ER Staff', icon: Activity },
    hospital_admin: { email: 'admin.sharma@citygeneral.org', name: 'Dr. Rajesh Sharma (Admin)', label: 'Admin', icon: Shield },
  };

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setEmail(rolePresets[selectedRole].email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password, role);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login('patient.guest@medconnectpulse.org', 'password123', 'patient');
      navigate('/');
    } catch {
      setError('Guest sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Breadcrumb / Return to Landing */}
      <div className="max-w-6xl w-full mx-auto mb-4 flex items-center justify-between">
        <Link
          to="/landing"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <span>← Back to MedConnect Pulse Home</span>
        </Link>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Regional Network Live</span>
        </div>
      </div>

      {/* Main Two-Column Card Container */}
      <div className="max-w-6xl w-full mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-dropdown overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* ======================================================= */}
        {/* LEFT COLUMN: Healthcare Visual & Benefits (5 Cols)     */}
        {/* ======================================================= */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          
          {/* Ambient Background Decorative Grid & Glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Identity */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-sm">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1">
                  MedConnect <span className="text-blue-400 font-extrabold">Pulse</span>
                </span>
                <p className="text-xs text-slate-400 font-medium">Healthcare Network</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <span className="text-[11px] font-mono font-bold text-emerald-400 tracking-wider uppercase px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 inline-block">
                HEALTHCARE WITHOUT DELAYS
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                Role-Based Healthcare Security & Access
              </h1>
              <p className="text-xs text-slate-300 font-normal leading-relaxed">
                Supabase RLS protected platform supporting Patients, OPD Receptionists, ER Trauma Staff, and Hospital Admins.
              </p>
            </div>

            {/* 3 Key Benefits */}
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Patients</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Strictly isolated private records, queue tokens, and appointment bookings.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Hospital Staff</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Authorized hospital-scoped OPD queue management and live ER command dispatch.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Hospital Admins</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Full control over inventory, doctor schedules, staff membership, and analytics.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Left Column Footer */}
          <div className="pt-8 border-t border-slate-800/80 relative z-10 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-mono text-slate-400 tracking-wider uppercase font-semibold">
              SUPABASE RLS • AUTHENTICATION
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          </div>

        </div>

        {/* ======================================================= */}
        {/* RIGHT COLUMN: Login Form (7 Cols)                       */}
        {/* ======================================================= */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between bg-white text-left">
          
          <div>
            {/* Top Form Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Sign In to MedConnect Pulse
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-1">
                Select your role to load matching preset demo credentials or sign in with your account.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Segmented Role Selector */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Select Portal Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80">
                {(Object.keys(rolePresets) as UserRole[]).map((r) => {
                  const preset = rolePresets[r];
                  const Icon = preset.icon;
                  const isSelected = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleSelect(r)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white text-blue-600 shadow-sm border border-blue-200/60'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@hospital.org"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-card hover:shadow-card-hover transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

            </form>

            {/* Guest Sign-In Option */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGuestLogin}
                className="w-full justify-center text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                disabled={loading}
              >
                Continue as Guest Patient
              </Button>
            </div>

            {/* 1-Click Demo Personas Strip */}
            <div className="mt-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  1-Click Demo Personas
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(rolePresets) as UserRole[]).map((r) => {
                  const preset = rolePresets[r];
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleSelect(r)}
                      className={`text-left p-2 rounded-xl border text-[11px] transition-all cursor-pointer ${
                        role === r
                          ? 'bg-blue-50 border-blue-200 text-blue-800 font-bold'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-600 font-medium'
                      }`}
                    >
                      <p className="truncate font-semibold">{preset.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{preset.email}</p>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Bottom Link to Register */}
          <div className="pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            <span>Don't have an account? </span>
            <Link
              to="/register"
              className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Register for Care or Facility
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
};
