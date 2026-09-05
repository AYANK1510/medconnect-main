import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import type { UserRole } from '../types/database.types';
import { Logo } from './Logo';
import { Bell, User, ShieldCheck, ChevronDown, Check, LogOut, Building2, Globe, Search, ShieldAlert } from 'lucide-react';

export const Header: React.FC = () => {
  const { profile, activeRole, activeHospital, switchRole, logout } = useAuth();
  const { setActivePage, activePage, runDemoScenario } = useApp();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi' | 'hinglish'>('en');

  const roles: { key: UserRole; label: string; desc: string }[] = [
    { key: 'patient', label: 'Patient Portal', desc: 'Book appointments, track live queue, AI intake' },
    { key: 'receptionist', label: 'OPD Receptionist', desc: 'Manage appointments, check-in, call queue' },
    { key: 'er_staff', label: 'ER / Trauma Staff', desc: 'SOS requests, 15km Haversine matching, dispatches' },
    { key: 'hospital_admin', label: 'Hospital Admin', desc: 'Doctor management, inventory control, analytics' }
  ];

  const mainNavItems = [
    { label: 'Home', page: 'patient' as const },
    { label: 'Patients', page: 'patient' as const },
    { label: 'Hospitals', page: 'hospital_network' as const },
    { label: 'How It Works', page: 'automation' as const },
    { label: 'Our Network', page: 'hospital_network' as const },
    { label: 'About', page: 'analytics' as const },
  ];

  return (
    <header className="bg-slate-950/95 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* LEFT: Logo & Facility Indicator */}
          <div className="flex items-center space-x-4">
            <button onClick={() => setActivePage('patient')} className="text-left focus:outline-none">
              <Logo size="sm" showText={true} />
            </button>

            <div className="hidden xl:flex items-center space-x-2 pl-4 border-l border-slate-800">
              <Building2 className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-semibold text-slate-300">
                {activeHospital?.name || 'Metro City General Hospital'}
              </span>
            </div>
          </div>

          {/* CENTER: Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-4">
            {mainNavItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setActivePage(item.page)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activePage === item.page
                    ? 'text-teal-300 bg-teal-500/10 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* RIGHT: Search, Emergency CTA, Language, Role & Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Search Bar */}
            <div className="hidden lg:flex items-center max-w-[180px]">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Emergency CTA Button */}
            <button
              onClick={() => {
                setActivePage('er_command');
                runDemoScenario(4);
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-md shadow-rose-600/20 transition-transform active:scale-95"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>Emergency</span>
            </button>

            {/* Language Selector */}
            <div className="hidden sm:flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-[11px] font-mono text-slate-300">
              <Globe className="w-3.5 h-3.5 text-slate-400 ml-1" />
              <button
                onClick={() => setLanguage('en')}
                className={`px-1.5 py-0.5 rounded ${language === 'en' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-1.5 py-0.5 rounded ${language === 'hi' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                हिंदी
              </button>
              <button
                onClick={() => setLanguage('hinglish')}
                className={`px-1.5 py-0.5 rounded ${language === 'hinglish' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Hinglish
              </button>
            </div>

            {/* Role Switcher Button */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline font-semibold text-white capitalize">{activeRole.replace('_', ' ')}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Select Persona / Role
                  </div>
                  {roles.map(r => (
                    <button
                      key={r.key}
                      onClick={() => {
                        switchRole(r.key);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-start justify-between hover:bg-slate-800/80 transition-colors ${
                        activeRole === r.key ? 'bg-teal-500/10 text-teal-300 font-bold' : 'text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{r.label}</div>
                        <div className="text-[10px] text-slate-400">{r.desc}</div>
                      </div>
                      {activeRole === r.key && <Check className="w-4 h-4 text-teal-400 mt-0.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-teal-400 rounded-full ring-2 ring-slate-950" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white">Notifications</span>
                    <span className="text-[10px] text-teal-400 font-medium">Realtime Subscribed</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                      <div className="font-semibold text-slate-200">Appointment Confirmed</div>
                      <div className="text-[11px] text-slate-400">Token #MED-4029 generated for Dr. Sharma</div>
                      <div className="text-[9px] text-slate-500 mt-1">2 mins ago</div>
                    </div>
                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                      <div className="font-semibold text-slate-200">Emergency Dispatch Active</div>
                      <div className="text-[11px] text-slate-400">O- Blood reserved for St. Jude Memorial</div>
                      <div className="text-[9px] text-slate-500 mt-1">12 mins ago</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile & Logout */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <button
                onClick={() => setActivePage('patient')}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-teal-400 font-semibold text-xs border border-slate-700 hover:border-teal-400 transition-colors"
                title="View Patient Profile"
              >
                {profile?.full_name?.charAt(0) || <User className="w-4 h-4" />}
              </button>
              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};

