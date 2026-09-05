import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

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
import { startTelegramBotListener } from './services/telegramBotListener';

const AppShell: React.FC = () => {
  const { activePage } = useApp();
  const { activeRole } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  React.useEffect(() => {
    const stop = startTelegramBotListener();
    return () => {
      stop();
    };
  }, []);

  const renderPageContent = () => {
    switch (activePage) {
      case 'ai_receptionist':
        return (
          <ProtectedRoute allowedRoles={['patient', 'receptionist', 'er_staff', 'hospital_admin']}>
            <AiReceptionistPage />
          </ProtectedRoute>
        );
      case 'patient':
        return (
          <ProtectedRoute allowedRoles={['patient', 'receptionist', 'er_staff', 'hospital_admin']}>
            <PatientPortalPage />
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
        if (activeRole === 'patient') return <PatientPortalPage />;
        if (activeRole === 'receptionist') return <ReceptionDashboardPage />;
        if (activeRole === 'er_staff') return <ErCommandPage />;
        return <AnalyticsPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      <Header />
      
      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-full">
          {renderPageContent()}
        </main>
      </div>

      <footer className="border-t border-slate-800/80 py-4 px-6 text-xs text-slate-400 text-center bg-slate-950">
        <p className="font-medium text-slate-400">
          MedConnect Pulse Enterprise — Real-Time Healthcare Coordination & Emergency Dispatch Platform
        </p>
      </footer>
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
            
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
