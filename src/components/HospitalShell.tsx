import React from 'react';
import { 
  HeartPulse, 
  Building2, 
  Stethoscope, 
  Radio, 
  AlertOctagon, 
  Terminal, 
  RotateCcw, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HospitalShellProps {
  hospitalTab: string;
  onTabChange: (tab: string) => void;
  onNavigate: (section: string, tab?: string | null) => void;
  onOpenAudit?: () => void;
  onResetDemo?: () => void;
  isResetting?: boolean;
  activeEmergencyCount?: number;
}

export const HospitalShell: React.FC<HospitalShellProps> = ({
  hospitalTab,
  onTabChange,
  onNavigate,
  onOpenAudit,
  onResetDemo,
  isResetting = false,
  activeEmergencyCount = 0,
}) => {
  const { profile, activeHospital, logout } = useAuth();
  const facilityName = activeHospital?.name || profile?.full_name || 'DemoCare Central Hospital';

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        
        {/* Brand & Hospital Workspace Context */}
        <div 
          onClick={() => {
            onNavigate('hospitals-app', 'reception');
            onTabChange('reception');
          }}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
          title="MedConnect Pulse — Hospital Workspace"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:border-blue-400/60 transition-colors">
            <HeartPulse className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-white flex items-center gap-1">
              MedConnect <span className="text-blue-400 font-bold">Pulse</span>
            </span>
            <span className="text-slate-600 hidden sm:inline">/</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-700/50 text-blue-300">
              Hospital Workspace
            </span>
          </div>
        </div>

        {/* Hospital Navigation Only */}
        <nav className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800/80" role="tablist" aria-label="Hospital Operational Modules">
          <button
            type="button"
            role="tab"
            aria-selected={hospitalTab === 'reception'}
            onClick={() => onTabChange('reception')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              hospitalTab === 'reception'
                ? 'bg-teal-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Reception</span>
            <kbd className="hidden lg:inline text-[10px] text-slate-400/80 font-mono">2</kbd>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={hospitalTab === 'doctor'}
            onClick={() => onTabChange('doctor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              hospitalTab === 'doctor'
                ? 'bg-teal-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctor OPD</span>
            <kbd className="hidden lg:inline text-[10px] text-slate-400/80 font-mono">3</kbd>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={hospitalTab === 'emergency'}
            onClick={() => onTabChange('emergency')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              hospitalTab === 'emergency'
                ? 'bg-rose-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-rose-300 hover:bg-rose-950/30'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            <span>Emergency Network</span>
            <kbd className="hidden lg:inline text-[10px] text-rose-300/80 font-mono">4</kbd>
            {activeEmergencyCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            )}
          </button>
        </nav>

        {/* Right Utility Status & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/80 border border-blue-800/80 text-blue-300 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="max-w-[140px] truncate">{facilityName}</span>
          </span>

          {activeEmergencyCount > 0 && (
            <button 
              type="button"
              onClick={() => onTabChange('emergency')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/80 border border-rose-700/60 text-xs font-semibold text-rose-300 cursor-pointer"
              title="View active emergency dispatch"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{activeEmergencyCount} Emergency Active</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAudit}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800/80 transition-colors cursor-pointer"
            title="Open System Audit Console (Ctrl+K or `)"
          >
            <Terminal className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Audit Console</span>
            <kbd className="hidden md:inline text-[10px] font-mono text-slate-500 bg-slate-800 px-1 py-0.5 rounded">^K</kbd>
          </button>

          <button
            type="button"
            onClick={onResetDemo}
            disabled={isResetting}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800/80 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Reset demo data"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-amber-400 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={() => {
              logout();
              onNavigate('landing');
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-800/70 transition-colors cursor-pointer"
            title="Log out from hospital workspace"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
export default HospitalShell;
