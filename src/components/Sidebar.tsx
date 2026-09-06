import React from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import type { ActivePage } from '../contexts/AppContext';
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
  LogOut,
} from 'lucide-react';

interface NavItem {
  id: ActivePage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  category: string;
  shortcut?: string;
}

export const Sidebar: React.FC<{ mobileOpen?: boolean; onCloseMobile?: () => void }> = ({
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { activePage, setActivePage, emergencyRequests, appointments } = useApp();
  const { profile, activeRole, activeHospital, logout } = useAuth();

  const navItems: NavItem[] = [
    { id: 'patient', label: 'Patient Portal', icon: User, category: 'Patient & OPD', shortcut: '1' },
    { id: 'ai_receptionist', label: 'AI Voice Receptionist', icon: Mic, badge: 'Sarvam AI', category: 'Patient & OPD' },
    { id: 'live_queue', label: 'Live OPD Queue Engine', icon: ListOrdered, badge: `${appointments.length}`, category: 'Patient & OPD' },

    { id: 'reception', label: 'Reception Desk', icon: Building2, category: 'Hospital & ER', shortcut: '2' },
    { id: 'doctors', label: 'Doctors Directory', icon: Stethoscope, category: 'Hospital & ER', shortcut: '3' },
    { id: 'er_command', label: 'Emergency Command Center', icon: Activity, badge: emergencyRequests.length > 0 ? 'SOS' : undefined, category: 'Hospital & ER', shortcut: '4' },
    { id: 'emergency_dispatch', label: '15 KM Supply Dispatch', icon: Truck, category: 'Hospital & ER' },
    { id: 'hospital_network', label: '15 KM Geo-Fence Network', icon: MapPin, category: 'Hospital & ER' },
    { id: 'inventory', label: 'Regional Inventory', icon: Package, category: 'Hospital & ER' },

    { id: 'automation', label: 'n8n Workflow Engine', icon: Zap, badge: 'n8n', category: 'Analytics & Config' },
    { id: 'analytics', label: 'Regional Analytics', icon: BarChart3, category: 'Analytics & Config' },
    { id: 'activity', label: 'System Activity Stream', icon: History, category: 'Analytics & Config', shortcut: '^K' },
    { id: 'settings', label: 'Settings & Integrations', icon: Settings, category: 'Analytics & Config' },
  ];

  const categories = Array.from(new Set(navItems.map((item) => item.category)));

  const hospitalDisplayName = activeHospital?.name || 'DemoCare Central Hospital';
  const departmentDisplayName = activeRole === 'patient' 
    ? 'Patient Services & Care' 
    : activeRole === 'er_staff' 
    ? 'Trauma & Emergency Response' 
    : activeRole === 'hospital_admin' 
    ? 'Executive Administration' 
    : 'Clinical Outpatient Services';

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full bg-white select-none">
      
      {/* Hospital Workspace Brand Head */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shadow-sm shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-slate-900 truncate">
              {hospitalDisplayName}
            </h2>
            <p className="text-[11px] text-slate-500 truncate">
              {departmentDisplayName}
            </p>
          </div>
        </div>

        {onCloseMobile && (
          <button 
            type="button"
            onClick={onCloseMobile} 
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg md:hidden cursor-pointer shrink-0 ml-2"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Group Items */}
      <div className="p-3 space-y-4 overflow-y-auto flex-1">
        {categories.map((cat) => (
          <div key={cat} className="space-y-1">
            <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {cat}
            </div>
            {navItems
              .filter((item) => item.category === cat)
              .map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                const isEmergencyItem = item.id === 'er_command' || item.id === 'emergency_dispatch';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActivePage(item.id);
                      window.history.pushState({}, '', '/' + item.id.replace('_', '-'));
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer group ${
                      isActive
                        ? isEmergencyItem
                          ? 'bg-rose-50 text-rose-700 font-bold shadow-sm border border-rose-200/60'
                          : 'bg-blue-50 text-blue-600 font-bold shadow-sm border border-blue-200/60'
                        : isEmergencyItem
                        ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50/50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? isEmergencyItem
                              ? 'text-rose-600'
                              : 'text-blue-600'
                            : isEmergencyItem
                            ? 'text-rose-500'
                            : 'text-slate-400 group-hover:text-slate-700'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                            item.badge === 'SOS'
                              ? 'bg-rose-100 text-rose-700 animate-pulse'
                              : isActive
                              ? 'bg-blue-200/70 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {item.shortcut && (
                        <kbd className="hidden lg:inline text-[9px] font-mono text-slate-400 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                          {item.shortcut}
                        </kbd>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        ))}
      </div>

      {/* Operational Status Footer Strip & Persona Card */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-3">
        {/* Live operational indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-600">
              System Live
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400">
            v1.0.0
          </span>
        </div>

        {/* Facility & RLS Persona Card */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                {profile?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 leading-tight truncate">
                  {profile?.full_name || 'Ayank Kumar'}
                </div>
                <div className="text-[10px] text-blue-600 capitalize leading-tight font-medium truncate">
                  {activeRole.replace('_', ' ')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1 truncate max-w-[130px]">
              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{hospitalDisplayName}</span>
            </span>
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md font-semibold text-[9px] flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
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
      <aside className="w-64 border-r border-slate-200/80 bg-white hidden md:flex flex-col shrink-0 min-h-[calc(100vh-65px)]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fadeIn">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 bg-white border-r border-slate-200 h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;

