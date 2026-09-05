import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/database.types';
import { Activity, ShieldCheck, Mail, Lock, ArrowRight, CheckCircle2, Building2, User, Flame } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('patient.rahul@medconnectpulse.org');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<UserRole>('patient');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rolePresets: Record<UserRole, { email: string; name: string }> = {
    patient: { email: 'patient.rahul@medconnectpulse.org', name: 'Rahul Kapoor (Patient)' },
    receptionist: { email: 'reception.sunita@citygeneral.org', name: 'Sunita Verma (Receptionist)' },
    er_staff: { email: 'er.vikram@citygeneral.org', name: 'Vikram Singh (ER Staff)' },
    hospital_admin: { email: 'admin.sharma@citygeneral.org', name: 'Dr. Rajesh Sharma (Admin)' },
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 lg:p-8 relative overflow-hidden font-sans">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl w-full grid lg:grid-cols-12 gap-8 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10">
        
        {/* LEFT COLUMN: Healthcare Visual & Benefits */}
        <div className="lg:col-span-5 p-8 md:p-12 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 border-r border-slate-800/80 flex flex-col justify-between space-y-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
                <Activity className="w-6 h-6 text-teal-400" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">MedConnect <span className="text-teal-400">Pulse</span></span>
            </div>

            <div className="space-y-3 pt-4">
              <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-widest">
                HEALTHCARE WITHOUT DELAYS
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
                Role-Based Healthcare Security & Access
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Supabase RLS protected platform supporting Patients, OPD Receptionists, ER Trauma Staff, and Hospital Admins.
              </p>
            </div>

            <div className="space-y-3.5 pt-4">
              <div className="flex items-start space-x-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Patients</div>
                  <div className="text-[11px] text-slate-400">Strictly isolated private records, queue tokens, and appointment bookings.</div>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Hospital Staff</div>
                  <div className="text-[11px] text-slate-400">Authorized hospital-scoped OPD queue management and live ER command dispatch.</div>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Hospital Admins</div>
                  <div className="text-[11px] text-slate-400">Full control over inventory, doctor schedules, staff membership, and analytics.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 text-[11px] font-mono text-slate-500 font-semibold tracking-wider uppercase">
            SUPABASE RLS • AUTHENTICATION • SECURITY
          </div>
        </div>

        {/* RIGHT COLUMN: Login Form */}
        <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Sign In to MedConnect Pulse</h2>
            <p className="text-xs text-slate-400">Select your role to load the matching preset demo credentials.</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* 4 Role Selector Buttons */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Select Portal Role</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('patient')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
                    role === 'patient' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Patient</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('receptionist')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
                    role === 'receptionist' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Reception</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('er_staff')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
                    role === 'er_staff' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>ER Staff</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('hospital_admin')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
                    role === 'hospital_admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  placeholder="name@medconnectpulse.org"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <Link to="/forgot-password" className="text-[11px] text-teal-400 hover:text-teal-300 font-medium">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Primary Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-teal-500/20 flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Authenticating...' : `Sign In as ${role.replace('_', ' ').toUpperCase()}`}</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </form>

          {/* Guest Action */}
          <div className="space-y-3 pt-2">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[10px] text-slate-500 font-mono uppercase">OR</span>
            </div>

            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center space-x-2"
            >
              <User className="w-4 h-4 text-teal-400" />
              <span>Sign In as Demo Patient Guest</span>
            </button>
          </div>

          <div className="pt-2 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-teal-400 hover:text-teal-300 font-bold">
              Register New Hospital / User
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
};
