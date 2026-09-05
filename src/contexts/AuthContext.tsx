import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Profile, UserRole, Hospital } from '../types/database.types';
import {
  signInWithSupabase,
  signUpWithSupabase,
  signOutFromSupabase,
  getCurrentProfile,
  createOrUpdateProfile,
} from '../services/authService';
import { dbEngine } from '../lib/dbEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  activeRole: UserRole;
  activeHospital: Hospital | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass?: string, role?: UserRole) => Promise<void>;
  register: (email: string, pass: string, name: string, role: UserRole, hospitalId?: string) => Promise<void>;
  switchRole: (role: UserRole) => void;
  setActiveHospitalById: (hospitalId: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('patient');
  const [activeHospital, setActiveHospital] = useState<Hospital | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and sync hospital context
  const syncHospitalContext = (hospId?: string | null) => {
    const hospitals = dbEngine.getHospitals();
    if (hospId) {
      const match = hospitals.find((h) => h.id === hospId);
      if (match) {
        setActiveHospital(match);
        return;
      }
    }
    setActiveHospital(hospitals[0] || null);
  };

  const setActiveHospitalById = (hospitalId: string) => {
    syncHospitalContext(hospitalId);
  };

  // Initialize session and auth state change listeners
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const savedRole = (localStorage.getItem('medconnect_active_role') as UserRole) || null;
        
        if (isSupabaseConfigured) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const u = { id: session.user.id, email: session.user.email || '' };
            let prof = await getCurrentProfile(session.user.id);
            if (!prof) {
              const metaRole = (session.user.user_metadata?.role as UserRole) || savedRole || 'patient';
              const metaHosp = session.user.user_metadata?.hospital_id;
              prof = await createOrUpdateProfile({
                id: session.user.id,
                full_name: session.user.user_metadata?.full_name || u.email.split('@')[0],
                role: metaRole,
                hospital_id: metaHosp,
              });
            }
            if (isMounted) {
              setUser(u);
              setProfile(prof);
              setActiveRole(savedRole || prof.role || 'patient');
              syncHospitalContext(prof.hospital_id);
            }
          } else {
            loadLocalSession(savedRole, isMounted);
          }
        } else {
          loadLocalSession(savedRole, isMounted);
        }
      } catch (err) {
        console.warn('Auth initialization fallback:', err);
        loadLocalSession(null, isMounted);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes if Supabase is active
    let subscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const u = { id: session.user.id, email: session.user.email || '' };
          const prof = await getCurrentProfile(session.user.id);
          setUser(u);
          if (prof) {
            setProfile(prof);
            setActiveRole(prof.role);
            syncHospitalContext(prof.hospital_id);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setActiveRole('patient');
          localStorage.removeItem('medconnect_user');
          localStorage.removeItem('medconnect_active_role');
        }
      });
      subscription = data.subscription;
    }

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const loadLocalSession = (savedRole: UserRole | null, isMounted: boolean) => {
    const savedUser = localStorage.getItem('medconnect_user');
    const hospitals = dbEngine.getHospitals();
    const defaultHosp = hospitals[0] || null;

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        let prof = dbEngine.getProfile(parsedUser.id);
        if (!prof) {
          prof = dbEngine.createOrUpdateProfile({
            id: parsedUser.id,
            full_name: parsedUser.email.split('@')[0] || 'User',
            role: savedRole || 'patient',
            hospital_id: defaultHosp?.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          });
        }
        if (isMounted) {
          setUser(parsedUser);
          setProfile(prof);
          setActiveRole(savedRole || prof.role || 'patient');
          syncHospitalContext(prof.hospital_id);
        }
        return;
      } catch {
        // Safe fallback below
      }
    }

    const demoId = '11111111-1111-4111-8111-111111111111';
    const demoProfile = dbEngine.createOrUpdateProfile({
      id: demoId,
      full_name: 'Dr. Rajesh Sharma',
      role: savedRole || 'hospital_admin',
      hospital_id: defaultHosp?.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    });
    if (isMounted) {
      setUser({ id: demoId, email: 'admin@citygeneral.org' });
      setProfile(demoProfile);
      setActiveRole(savedRole || demoProfile.role);
      syncHospitalContext(demoProfile.hospital_id);
    }
  };

  const login = async (email: string, pass: string = 'password123', targetRole?: UserRole) => {
    setIsLoading(true);
    try {
      const res = await signInWithSupabase(email, pass);
      const chosenRole = targetRole || res.profile.role;
      setUser(res.user);
      setProfile({ ...res.profile, role: chosenRole });
      setActiveRole(chosenRole);
      syncHospitalContext(res.profile.hospital_id);

      localStorage.setItem('medconnect_user', JSON.stringify(res.user));
      localStorage.setItem('medconnect_active_role', chosenRole);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole,
    hospitalId?: string
  ) => {
    setIsLoading(true);
    try {
      const res = await signUpWithSupabase(email, pass, name, role, hospitalId);
      setUser(res.user);
      setProfile(res.profile);
      setActiveRole(role);
      syncHospitalContext(hospitalId || res.profile.hospital_id);

      localStorage.setItem('medconnect_user', JSON.stringify(res.user));
      localStorage.setItem('medconnect_active_role', role);
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = (role: UserRole) => {
    setActiveRole(role);
    localStorage.setItem('medconnect_active_role', role);
    if (profile && user) {
      const updated = dbEngine.createOrUpdateProfile({
        ...profile,
        role,
      });
      setProfile(updated);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOutFromSupabase();
      localStorage.removeItem('medconnect_user');
      localStorage.removeItem('medconnect_active_role');
      setUser(null);
      setProfile(null);
      setActiveRole('patient');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        activeRole,
        activeHospital,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        switchRole,
        setActiveHospitalById,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
