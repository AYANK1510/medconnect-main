import React from 'react';
import { 
  HeartPulse, 
  Activity, 
  Sparkles, 
  Clock, 
  FileText, 
  History, 
  Terminal, 
  RotateCcw, 
  LogOut, 
  User 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PatientShellProps {
  patientTab: string;
  onTabChange: (tab: string) => void;
  onNavigate: (section: string, tab?: string | null) => void;
  onOpenAudit?: () => void;
  onResetDemo?: () => void;
  isResetting?: boolean;
}

export const PatientShell: React.FC<PatientShellProps> = ({
  patientTab,
  onTabChange,
  onNavigate,
  onOpenAudit,
  onResetDemo,
  isResetting = false,
}) => {
  const { user, profile, logout } = useAuth();
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Patient User';

  const patientTabs = [
    { id: 'overview', label: 'Dashboard', icon: Activity },
    { id: 'book', label: 'Book Appointment', icon: Sparkles },
    { id: 'queue', label: 'Live Queue', icon: Clock },
    { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
    { id: 'history', label: 'Records', icon: History }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        
        {/* Brand & Patient Portal Context */}
        <div 
          onClick={() => {
            onNavigate('patients-app', 'overview');
            onTabChange('overview');
          }}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
          title="MedConnect Pulse — Patient Portal"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 group-hover:border-blue-300 transition-colors shadow-xs">
            <HeartPulse className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1">
              MedConnect <span className="text-blue-600 font-extrabold">Pulse</span>
            </span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700">
              Patient Portal
            </span>
          </div>
        </div>

        {/* Patient Quick Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
          {patientTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = patientTab === tab.id || (tab.id === 'overview' && (!patientTab || patientTab === 'overview' || patientTab === 'dashboard'));
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Utility Status & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {user && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span className="max-w-[120px] truncate">{displayName}</span>
            </span>
          )}

          {/* Audit Console Shortcut */}
          <button
            type="button"
            onClick={onOpenAudit}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
            title="Open System Audit Console (Ctrl+K or `)"
          >
            <Terminal className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Audit</span>
            <kbd className="hidden md:inline text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1 py-0.5 rounded">^K</kbd>
          </button>

          {/* Reset Demo State */}
          <button
            type="button"
            onClick={onResetDemo}
            disabled={isResetting}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Reset demo data"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-amber-500 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={() => {
              logout();
              onNavigate('landing');
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 transition-colors cursor-pointer"
            title="Log out from patient session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
export default PatientShell;
