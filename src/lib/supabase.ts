import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvValue = (key: string): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const local = window.localStorage.getItem(`MEDCONNECT_${key}`);
    if (local && local.trim()) return local.trim();
  }
  const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : (typeof process !== 'undefined' ? process.env : {});
  return (env as any)[key] || '';
};

export const getSupabaseCredentials = () => {
  const url = getEnvValue('VITE_SUPABASE_URL') || 'https://demo-medconnect.supabase.co';
  const anonKey = getEnvValue('VITE_SUPABASE_ANON_KEY') || 'demo-anon-key';
  const isConfigured = Boolean(
    url &&
    anonKey &&
    url !== 'https://demo-medconnect.supabase.co' &&
    anonKey !== 'demo-anon-key'
  );
  return { url, anonKey, isConfigured };
};

const creds = getSupabaseCredentials();

export const isSupabaseConfigured = creds.isConfigured;

export const supabase: SupabaseClient = createClient(creds.url, creds.anonKey);
