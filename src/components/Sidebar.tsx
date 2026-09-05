import React from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import type { ActivePage } from '../contexts/AppContext';
import { Logo } from './Logo';
import {
  User,
  Stethoscope,
  Activity,
  Mic,
  ListOrdered,
  Truck,
  MapPin,
  Package,
  Zap,
  BarChart3,
  History,
  Settings,
  X,
  ShieldCheck,
  Building2,
  LogOut
} from 'lucide-react';

interface NavItem {
  id: ActivePage;
  label: string;
  icon: any;
  badge?: string;
  category: string;
}

export const Sidebar: React.FC<{ mobileOpen?: boolean; onCloseMobile?: () => void }> = ({
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { activePage, setActivePage, emergencyRequests, appointments } = useApp();
  const { profile, activeRole, activeHospital, logout } = useAuth();

  const navItems: NavItem[] = [
    { id: 'patient', label: 'Patient Portal', icon: User, category: 'Patient & OPD' },
    { id: 'ai_receptionist', label: 'AI Voice Receptionist', icon: Mic, badge: 'Sarvam AI', category: 'Patient & OPD' },
    { id: 'live_queue', label: 'Live OPD Queue Engine', icon: ListOrdered, badge: `${appointments.length}`, category: 'Patient & OPD' },

    { id: 'reception', label: 'Reception Desk', icon: Stethoscope, category: 'Hospital & ER' },
    { id: 'doctors', label: 'Doctors Directory', icon: Stethoscope, category: 'Hospital & ER' },
    { id: 'er_command', label: 'Emergency Command Center', icon: Activity, badge: emergencyRequests.length > 0 ? 'SOS' : undefined, category: 'Hospital & ER' },
    { id: 'emergency_dispatch', label: '15 KM Supply Dispatch', icon: Truck, category: 'Hospital & ER' },
    { id: 'hospital_network', label: '15 KM Geo-Fence Network', icon: MapPin, category: 'Hospital & ER' },
    { id: 'inventory', label: 'Regional Inventory', icon: Package, category: 'Hospital & ER' },

    { id: 'automation', label: 'n8n Workflow Engine', icon: Zap, badge: 'n8n', category: 'Analytics & Config' },
    { id: 'analytics', label: 'Regional Analytics', icon: BarChart3, category: 'Analytics & Config' },
    { id: 'activity', label: 'System Activity Stream', icon: History, category: 'Analytics & Config' },
    { id: 'settings', label: 'Settings & Integrations', icon: Settings, category: 'Analytics & Config' },
  ];

  const categories = Array.from(new Set(navItems.map((item) => item.category)));

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full">
      
      {/* Top Header Logo */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <Logo size="md" showText={true} />
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="p-1 text-slate-400 hover:text-white md:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="p-3 space-y-5 overflow-y-auto flex-1">
        {categories.map((cat) => (
          <div key={cat} className="space-y-1">
            <h4 className="px-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
              {cat}
            </h4>
            {navItems
              .filter((item) => item.category === cat)
              .map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActivePage(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition group ${
                      isActive
                        ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-lg shadow-teal-500/10 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon
                        className={`w-4 h-4 transition ${
                          isActive ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-mono font-extrabold rounded-md ${
                          item.badge === 'SOS'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                            : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        ))}
      </div>

      {/* User Persona & Role Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/90 space-y-2">
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold text-xs">
                {profile?.full_name?.charAt(0) || 'A'}
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-tight">{profile?.full_name || 'Ayank Kumar'}</div>
                <div className="text-[10px] text-teal-400 font-mono capitalize leading-tight">{activeRole.replace('_', ' ')}</div>
              </div>
            </div>
            <button onClick={logout} title="Sign out" className="text-slate-500 hover:text-rose-400 p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <Building2 className="w-3 h-3 text-slate-500" />
              <span className="truncate max-w-[130px]">{activeHospital?.name || 'Metro City General'}</span>
            </span>
            <span className="text-emerald-400 font-mono flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3" />
              <span>DB RLS</span>
            </span>
          </div>
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950/95 hidden md:flex flex-col shrink-0 min-h-[calc(100vh-65px)]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onCloseMobile}></div>
          <div className="relative w-72 bg-slate-950 border-r border-slate-800 h-full z-10 p-2 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
