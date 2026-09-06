import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PatientShell } from './components/PatientShell';
import { HospitalShell } from './components/HospitalShell';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import {
  ChevronRight,
  ArrowLeft,
  HeartPulse,
  Activity,
  Building2,
  Stethoscope,
  Mic,
  ListOrdered,
  Truck,
  MapPin,
  Package,
  Zap,
  BarChart3,
  History,
  Settings,
  User,
} from 'lucide-react';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { DispatchVerifyPage } from './pages/DispatchVerifyPage';

import { PatientPortalPage } from './pages/PatientPortalPage';
import { ReceptionDashboardPage } from './pages/ReceptionDashboardPage';
import { ErCommandPage } from './pages/ErCommandPage';
import { LiveQueuePage } from './pages/LiveQueuePage';
import { EmergencyDispatchPage } from './pages/EmergencyDispatchPage';
import { HospitalNetworkPage } from './pages/HospitalNetworkPage';
import { DoctorsPage } from './pages/DoctorsPage';
import { InventoryPage } from './pages/InventoryPage';
import { AutomationPage } from './pages/AutomationPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ActivityFeedPage } from './pages/ActivityFeedPage';
import { SettingsPage } from './pages/SettingsPage';
import { AiReceptionistPage } from './pages/AiReceptionistPage';
import { LandingPage } from './pages/LandingPage';
import { PatientEntryPage } from './pages/PatientEntryPage';
import { HospitalEntryPage } from './pages/HospitalEntryPage';
import { startTelegramBotListener } from './services/telegramBotListener';
import { AuditConsoleModal } from './components/AuditConsoleModal';

const AppShell: React.FC = () => {
  const { activePage, setActivePage, emergencyRequests } = useApp();
  const { activeHospital, switchRole } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [auditConsoleOpen, setAuditConsoleOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hospitalSubTab, setHospitalSubTab] = useState<'reception' | 'doctor' | 'emergency'>('reception');
  const [patientSubTab, setPatientSubTab] = useState<string>('overview');

  // Start Telegram bot listener
  useEffect(() => {
    const stop = startTelegramBotListener();
    return () => {
      stop();
    };
  }, []);

  // Global audit shortcut (^K or `)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === '`' || (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) {
        e.preventDefault();
        setAuditConsoleOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Synchronize route from URL on mount and popstate
  useEffect(() => {
    const syncFromLocation = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
      if (path === '' || path === '/' || path === '/landing') {
        setActivePage('landing');
      } else if (path === '/patients' || path === '/patient-landing' || path === '/patient-services') {
        setActivePage('patients_landing');
      } else if (path === '/hospitals' || path === '/hospital-landing' || path === '/hospital-services') {
        setActivePage('hospitals_landing');
      } else if (path.startsWith('/patients/app') || path === '/patient') {
        setActivePage('patient');
        if (path.includes('queue')) setPatientSubTab('queue');
        else if (path.includes('book')) setPatientSubTab('book');
        else if (path.includes('prescription')) setPatientSubTab('prescriptions');
        else if (path.includes('record')) setPatientSubTab('history');
        else setPatientSubTab('overview');
      } else if (path.startsWith('/hospitals/app') || path === '/reception' || path === '/doctor' || path === '/emergency') {
        if (path.includes('emergency')) {
          setActivePage('er_command');
          setHospitalSubTab('emergency');
        } else if (path.includes('doctor')) {
          setActivePage('doctors');
          setHospitalSubTab('doctor');
        } else {
          setActivePage('reception');
          setHospitalSubTab('reception');
        }
      } else if (path === '/inventory') {
        setActivePage('inventory');
      } else if (path === '/automation') {
        setActivePage('automation');
      } else if (path === '/analytics') {
        setActivePage('analytics');
      } else if (path === '/activity') {
        setActivePage('activity');
      } else if (path === '/settings') {
        setActivePage('settings');
      } else if (path === '/hospital-network' || path === '/network') {
        setActivePage('hospital_network');
      } else if (path === '/emergency-dispatch' || path === '/dispatch') {
        setActivePage('emergency_dispatch');
      } else if (path === '/live-queue' || path === '/queue') {
        setActivePage('live_queue');
      } else if (path === '/ai-receptionist' || path === '/voice-ai') {
        setActivePage('ai_receptionist');
      } else if (path === '/audit' || path === '/audit-console') {
        setAuditConsoleOpen(true);
      }
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, [setActivePage]);

  // Handle centralized route transitions
  const handleNavigate = (section: string, tab?: string | null) => {
    if (section === 'landing') {
      setActivePage('landing');
      window.history.pushState({}, '', '/');
    } else if (section === 'patients-landing') {
      setActivePage('patients_landing');
      window.history.pushState({}, '', '/patients');
    } else if (section === 'hospitals-landing') {
      setActivePage('hospitals_landing');
      window.history.pushState({}, '', '/hospitals');
    } else if (section === 'patients-app') {
      switchRole('patient');
      const targetTab = tab || 'overview';
      setPatientSubTab(targetTab);
      if (targetTab === 'queue') setActivePage('live_queue');
      else setActivePage('patient');
      window.history.pushState({}, '', `/patients/app/${targetTab}`);
    } else if (section === 'hospitals-app') {
      switchRole('hospital_admin');
      const targetTab = (tab || 'reception') as 'reception' | 'doctor' | 'emergency';
      setHospitalSubTab(targetTab);
      if (targetTab === 'emergency') setActivePage('er_command');
      else if (targetTab === 'doctor') setActivePage('doctors');
      else setActivePage('reception');
      window.history.pushState({}, '', `/hospitals/app/${targetTab}`);
    } else if (section === 'login') {
      window.location.href = '/login';
    } else if (section === 'audit') {
      setAuditConsoleOpen(true);
    }
  };

  const handleHospitalTabChange = (tab: string) => {
    const nextTab = tab as 'reception' | 'doctor' | 'emergency';
    setHospitalSubTab(nextTab);
    if (nextTab === 'reception') setActivePage('reception');
    else if (nextTab === 'doctor') setActivePage('doctors');
    else if (nextTab === 'emergency') setActivePage('er_command');
    window.history.pushState({}, '', `/hospitals/app/${nextTab}`);
  };

  const handlePatientTabChange = (tab: string) => {
    setPatientSubTab(tab);
    if (tab === 'queue') setActivePage('live_queue');
    else setActivePage('patient');
    window.history.pushState({}, '', `/patients/app/${tab}`);
  };

  const handleResetDemo = () => {
    setIsResetting(true);
    try {
      sessionStorage.clear();
      setTimeout(() => {
        setIsResetting(false);
      }, 400);
    } catch {
      setIsResetting(false);
    }
  };

  // Section categorization
  const isPublicLanding = activePage === 'landing';
  const isPatientLanding = activePage === 'patients_landing';
  const isHospitalLanding = activePage === 'hospitals_landing';
  const isPublic = isPublicLanding || isPatientLanding || isHospitalLanding;

  const isHospitalApp = ['reception', 'doctors', 'er_command', 'emergency_dispatch'].includes(activePage);
  const isPatientApp = ['patient', 'live_queue', 'ai_receptionist'].includes(activePage);
  const isAdminWorkspace = !isPublic && !isHospitalApp && !isPatientApp;

  const getPageMeta = (page: string) => {
    switch (page) {
      case 'ai_receptionist':
        return { title: 'AI Voice Receptionist (Sarvam AI)', icon: Mic };
      case 'patient':
        return { title: 'Patient Care & Appointment Portal', icon: User };
      case 'live_queue':
        return { title: 'Live OPD Queue Engine', icon: ListOrdered };
      case 'reception':
        return { title: 'Reception Desk & Token Management', icon: Building2 };
      case 'doctors':
        return { title: 'Doctors Directory & Availability', icon: Stethoscope };
      case 'er_command':
        return { title: 'Emergency Command Center & Triage', icon: Activity };
      case 'emergency_dispatch':
        return { title: '15 KM Regional Supply Dispatch', icon: Truck };
      case 'hospital_network':
        return { title: '15 KM Geo-Fence Hospital Network', icon: MapPin };
      case 'inventory':
        return { title: 'Regional Blood & Bed Inventory', icon: Package };
      case 'automation':
        return { title: 'n8n Automated Workflow Engine', icon: Zap };
      case 'analytics':
        return { title: 'Regional Clinical & Operational Analytics', icon: BarChart3 };
      case 'activity':
        return { title: 'Master System Telemetry & Activity Stream', icon: History };
      case 'settings':
        return { title: 'Settings, Integrations & API Config', icon: Settings };
      default:
        return { title: 'Healthcare Command Center', icon: Activity };
    }
  };

  const pageMeta = getPageMeta(activePage);
  const PageIcon = pageMeta.icon;

  const renderPageContent = () => {
    switch (activePage) {
      case 'landing':
        return (
          <LandingPage
            onNavigate={handleNavigate}
            onOpenAudit={() => setAuditConsoleOpen(true)}
            onResetDemo={handleResetDemo}
            isResetting={isResetting}
          />
        );
      case 'patients_landing':
        return <PatientEntryPage onNavigate={handleNavigate} />;
      case 'hospitals_landing':
        return <HospitalEntryPage onNavigate={handleNavigate} />;
      case 'ai_receptionist':
        return (
          <ProtectedRoute allowedRoles={['patient', 'receptionist', 'er_staff', 'hospital_admin']}>
            <AiReceptionistPage />
          </ProtectedRoute>
        );
      case 'patient':
        return (
          <ProtectedRoute allowedRoles={['patient', 'receptionist', 'er_staff', 'hospital_admin']}>
            <PatientPortalPage
              subTab={patientSubTab}
              onSubTabChange={handlePatientTabChange}
            />
          </ProtectedRoute>
        );
      case 'reception':
        return (
          <ProtectedRoute allowedRoles={['receptionist', 'hospital_admin']}>
            <ReceptionDashboardPage />
          </ProtectedRoute>
        );
      case 'er_command':
        return (
          <ProtectedRoute allowedRoles={['er_staff', 'hospital_admin']}>
            <ErCommandPage />
          </ProtectedRoute>
        );
      case 'doctors':
        return (
          <ProtectedRoute allowedRoles={['receptionist', 'hospital_admin']}>
            <DoctorsPage />
          </ProtectedRoute>
        );
      case 'live_queue':
        return (
          <ProtectedRoute allowedRoles={['patient', 'receptionist', 'er_staff', 'hospital_admin']}>
            <LiveQueuePage />
          </ProtectedRoute>
        );
      case 'emergency_dispatch':
        return (
          <ProtectedRoute allowedRoles={['er_staff', 'hospital_admin']}>
            <EmergencyDispatchPage />
          </ProtectedRoute>
        );
      case 'hospital_network':
        return (
          <ProtectedRoute allowedRoles={['er_staff', 'hospital_admin']}>
            <HospitalNetworkPage />
          </ProtectedRoute>
        );
      case 'inventory':
        return (
          <ProtectedRoute allowedRoles={['receptionist', 'er_staff', 'hospital_admin']}>
            <InventoryPage />
          </ProtectedRoute>
        );
      case 'automation':
        return (
          <ProtectedRoute allowedRoles={['hospital_admin']}>
            <AutomationPage />
          </ProtectedRoute>
        );
      case 'analytics':
        return (
          <ProtectedRoute allowedRoles={['hospital_admin']}>
            <AnalyticsPage />
          </ProtectedRoute>
        );
      case 'activity':
        return (
          <ProtectedRoute allowedRoles={['receptionist', 'er_staff', 'hospital_admin']}>
            <ActivityFeedPage />
          </ProtectedRoute>
        );
      case 'settings':
        return (
          <ProtectedRoute allowedRoles={['hospital_admin']}>
            <SettingsPage />
          </ProtectedRoute>
        );
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-blue-600 selection:text-white ${
      isHospitalApp ? 'bg-slate-950 text-slate-100 selection:bg-teal-600' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* 1. PUBLIC HEADER (Public Landing, Patients Landing, Hospitals Landing) */}
      {isPublic && (
        <Header
          mobileNavOpen={mobileNavOpen}
          onToggleMobile={() => setMobileNavOpen((prev) => !prev)}
          onOpenAudit={() => setAuditConsoleOpen(true)}
          onResetDemo={handleResetDemo}
          isResetting={isResetting}
          onNavigate={handleNavigate}
        />
      )}

      {/* 2. PATIENT APPLICATION HEADER */}
      {isPatientApp && (
        <PatientShell
          patientTab={patientSubTab}
          onTabChange={handlePatientTabChange}
          onNavigate={handleNavigate}
          onOpenAudit={() => setAuditConsoleOpen(true)}
          onResetDemo={handleResetDemo}
          isResetting={isResetting}
        />
      )}

      {/* 3. HOSPITAL OPERATIONAL WORKSPACE HEADER */}
      {isHospitalApp && (
        <HospitalShell
          hospitalTab={hospitalSubTab}
          onTabChange={handleHospitalTabChange}
          onNavigate={handleNavigate}
          onOpenAudit={() => setAuditConsoleOpen(true)}
          onResetDemo={handleResetDemo}
          isResetting={isResetting}
          activeEmergencyCount={emergencyRequests.length}
        />
      )}


      {/* 5. ADMIN WORKSPACE HEADER & BREADCRUMB (For Inventory, Automation, Analytics, etc.) */}
      {isAdminWorkspace && (
        <>
          <Header
            mobileNavOpen={mobileNavOpen}
            onToggleMobile={() => setMobileNavOpen((prev) => !prev)}
            onOpenAudit={() => setAuditConsoleOpen(true)}
            onResetDemo={handleResetDemo}
            isResetting={isResetting}
            onNavigate={handleNavigate}
          />

          <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-2.5 sticky top-16 z-30 shadow-2xs">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActivePage('landing')}
                  className="text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1.5 shrink-0 pr-2.5 border-r border-slate-200 cursor-pointer"
                  title="Return to Home Landing"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Home</span>
                </button>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700 hidden md:inline truncate max-w-[180px]">
                    {activeHospital?.name || 'DemoCare Central'}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-400 hidden md:inline" />
                  <span className="font-bold text-blue-600 flex items-center gap-1.5">
                    <PageIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{pageMeta.title}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/80 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-slate-500 font-normal">System:</span>
                  <span className="text-emerald-700 font-bold">Operational</span>
                </span>

                {emergencyRequests.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActivePage('er_command');
                      setHospitalSubTab('emergency');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[11px] text-rose-700 font-bold transition-colors cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>{emergencyRequests.length} Active SOS</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* MAIN VIEWPORT: Role-specific layout structure */}
      {isPublic ? (
        <main className="flex-1 w-full overflow-x-hidden">
          {renderPageContent()}
        </main>
      ) : isHospitalApp ? (
        <main className="flex-1 w-full bg-slate-950 text-slate-100 overflow-x-hidden">
          {renderPageContent()}
        </main>
      ) : isPatientApp ? (
        <main className="flex-1 w-full bg-slate-50 overflow-x-hidden">
          {renderPageContent()}
        </main>
      ) : (
        <div className="flex flex-1 max-w-7xl w-full mx-auto">
          <Sidebar
            mobileOpen={mobileNavOpen}
            onCloseMobile={() => setMobileNavOpen(false)}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-full min-w-0 bg-slate-50/50">
            {renderPageContent()}
          </main>
        </div>
      )}

      {/* Admin Workspace Footer */}
      {isAdminWorkspace && (
        <footer className="bg-white border-t border-slate-200/80 py-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 select-none">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                <HeartPulse className="w-3.5 h-3.5" />
              </div>
              <span className="font-extrabold text-slate-900 tracking-tight">
                MedConnect <span className="text-blue-600 font-extrabold">Pulse</span>
              </span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="text-slate-500 hidden sm:inline">
                Enterprise Real-Time Healthcare Coordination & Emergency Dispatch
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-500 font-medium flex-wrap justify-center">
              <span className="hover:text-blue-600 cursor-pointer transition-colors">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-blue-600 cursor-pointer transition-colors">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-blue-600 cursor-pointer transition-colors">HIPAA / DPDP Compliance</span>
              <span>•</span>
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Systems Live
              </span>
            </div>
          </div>
        </footer>
      )}

      {/* Master Telemetry Audit Modal Drawer */}
      <AuditConsoleModal
        isOpen={auditConsoleOpen}
        onClose={() => setAuditConsoleOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/dispatch/verify/:id" element={<DispatchVerifyPage />} />
            <Route path="/*" element={<AppShell />} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
