import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { 
  User, 
  ChevronDown, 
  LogOut, 
  Building2, 
  Search, 
  AlertOctagon,
  Terminal,
  RotateCcw,
  Menu,
  X,
  HeartPulse
} from 'lucide-react';

interface HeaderProps {
  onToggleMobile?: () => void;
  mobileNavOpen?: boolean;
  onOpenAudit?: () => void;
  onResetDemo?: () => void;
  isResetting?: boolean;
  onNavigate?: (section: string, tab?: string | null) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAudit,
  onResetDemo,
  isResetting = false,
  onNavigate
}) => {
  const { profile, user, logout, activeRole, switchRole } = useAuth();
  const { setActivePage, activePage, emergencyRequests, runDemoScenario } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const roleBadge = activeRole === 'hospital_admin' 
    ? 'Hospital Staff' 
    : activeRole === 'er_staff' 
    ? 'Hospital Staff' 
    : activeRole === 'receptionist' 
    ? 'Hospital Staff' 
    : 'Patient';

  const navigateTo = (section: string, tab: string | null = null) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(section, tab);
    } else {
      if (section === 'landing') {
        setActivePage('landing');
      } else if (section === 'patients-landing') {
        setActivePage('patients_landing');
      } else if (section === 'hospitals-landing') {
        setActivePage('hospitals_landing');
      } else if (section === 'patients-app') {
        switchRole('patient');
        setActivePage('patient');
      } else if (section === 'hospitals-app') {
        switchRole('hospital_admin');
        if (tab === 'emergency') setActivePage('emergency_dispatch');
        else if (tab === 'doctor') setActivePage('doctors');
        else setActivePage('reception');
      } else if (section === 'login') {
        window.location.href = '/login';
      }
    }
  };

  const scrollToAnchor = (anchorId: string) => {
    setMobileMenuOpen(false);
    if (activePage !== 'landing') {
      navigateTo('landing');
      setTimeout(() => {
        const el = document.getElementById(anchorId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      const el = document.getElementById(anchorId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-soft select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
        
        {/* 1. Logo Brand */}
        <div 
          onClick={() => navigateTo('landing')}
          className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
          title="MedConnect Pulse Home"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1 leading-tight">
              MedConnect <span className="text-blue-600 font-extrabold">Pulse</span>
            </span>
            <p className="text-[10px] text-slate-500 font-medium hidden sm:block leading-none mt-0.5">
              Connected Healthcare Platform
            </p>
          </div>
        </div>

        {/* 2. Navigation: Home, Patients, Hospitals, How It Works, Our Network, About */}
        <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => navigateTo('landing')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activePage === 'landing'
                ? 'text-blue-600 font-bold bg-blue-50'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Home
          </button>

          <button
            type="button"
            onClick={() => navigateTo('patients-landing')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activePage === 'patients_landing'
                ? 'text-blue-600 font-bold bg-blue-50'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Patients
          </button>

          <button
            type="button"
            onClick={() => navigateTo('hospitals-landing')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activePage === 'hospitals_landing'
                ? 'text-blue-600 font-bold bg-blue-50'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Hospitals
          </button>

          <button
            type="button"
            onClick={() => scrollToAnchor('how-it-works')}
            className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            How It Works
          </button>

          <button
            type="button"
            onClick={() => scrollToAnchor('network')}
            className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Our Network
          </button>

          <button
            type="button"
            onClick={() => scrollToAnchor('about')}
            className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            About
          </button>
        </nav>

        {/* 3. Search Bar */}
        <div className="hidden xl:flex items-center relative w-56">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hospitals, care..."
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          />
        </div>

        {/* 4. Controls: Emergency Button + Profile/Login + Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          
          {/* Emergency CTA Button */}
          <button 
            type="button"
            onClick={() => {
              navigateTo('hospitals-app', 'emergency');
              if (emergencyRequests.length === 0) {
                runDemoScenario(4);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
            title="Emergency Geo-Dispatch Network"
          >
            <AlertOctagon className="w-4 h-4 shrink-0 animate-pulse" />
            <span>Emergency</span>
            {emergencyRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/25 text-white text-[10px] font-extrabold">
                {emergencyRequests.length}
              </span>
            )}
          </button>

          {/* Audit Console Shortcut */}
          <button
            type="button"
            onClick={onOpenAudit}
            className="hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
            title="Open System Audit Console (Ctrl+K or `)"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">Audit</span>
          </button>

          {/* Reset Demo Button */}
          {onResetDemo && (
            <button
              type="button"
              onClick={onResetDemo}
              disabled={isResetting}
              className="hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Reset demo data"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-amber-500 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Reset</span>
            </button>
          )}

          {/* Login / Profile State */}
          {user || profile ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/60"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[100px]">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-none">
                    {roleBadge}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-slate-200/80 shadow-dropdown p-1.5 z-50 animate-in fade-in duration-150">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email || 'Active Session'}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      navigateTo('patients-app', 'overview');
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Patient Portal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      navigateTo('hospitals-app', 'reception');
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Hospital Desk</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                      navigateTo('landing');
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <User className="w-4 h-4 text-slate-600" />
              <span>Login</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 hover:text-slate-900 cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

        </div>

      </div>

      {/* Responsive Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 py-3 border-t border-slate-100 bg-white space-y-2 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
            <button
              type="button"
              onClick={() => navigateTo('landing')}
              className="p-2 rounded-lg bg-slate-50 text-left hover:bg-slate-100"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigateTo('patients-landing')}
              className="p-2 rounded-lg bg-slate-50 text-left hover:bg-slate-100"
            >
              Patients
            </button>
            <button
              type="button"
              onClick={() => navigateTo('hospitals-landing')}
              className="p-2 rounded-lg bg-slate-50 text-left hover:bg-slate-100"
            >
              Hospitals
            </button>
            <button
              type="button"
              onClick={() => scrollToAnchor('how-it-works')}
              className="p-2 rounded-lg bg-slate-50 text-left hover:bg-slate-100"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToAnchor('network')}
              className="p-2 rounded-lg bg-slate-50 text-left hover:bg-slate-100"
            >
              Our Network
            </button>
            <button
              type="button"
              onClick={() => scrollToAnchor('about')}
              className="p-2 rounded-lg bg-slate-50 text-left hover:bg-slate-100"
            >
              About
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            {!user && (
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="w-full py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm"
              >
                Sign In to Portal
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
export default Header;
