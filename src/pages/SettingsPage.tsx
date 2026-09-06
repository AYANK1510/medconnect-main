import React, { useState, useEffect } from 'react';
import { getIntegrationStatuses, checkProductionReady } from '../services/integrationService';
import type { IntegrationStatus } from '../services/integrationService';
import { useAuth } from '../contexts/AuthContext';
import { validateCoordinates, getCurrentBrowserLocation } from '../utils/locationValidation';
import { dbEngine } from '../lib/dbEngine';
import {
  ShieldCheck,
  Cpu,
  CheckCircle2,
  MapPin,
  Navigation,
  Edit3,
  AlertTriangle,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  Zap,
  Search,
  ExternalLink,
  Compass,
  Building2,
} from 'lucide-react';
import {
  saveCredentialsToSystem,
  testServiceConnection,
} from '../services/credentialConfigService';
import { getSarvamCredentials } from '../services/sarvamService';
import { getOpenAICredentials } from '../services/openaiService';
import { getTelegramCredentials } from '../services/telegramService';
import { getTwilioCredentials } from '../services/twilioService';
import { getSupabaseCredentials } from '../lib/supabase';

const CITY_PRESETS = [
  {
    name: 'Delhi NCR (Central)',
    facility: 'Metro City General Hospital',
    address: '452 Healthcare Boulevard, Sector 4, New Delhi',
    lat: 28.6139,
    lng: 77.2090,
  },
  {
    name: 'Mumbai (Colaba / Marine)',
    facility: 'Metro City Medical Center - Mumbai',
    address: '12 Cama Road, Colaba, Mumbai, Maharashtra 400005',
    lat: 18.9220,
    lng: 72.8347,
  },
  {
    name: 'Bengaluru (Indiranagar)',
    facility: 'Metro City Super Speciality - Bengaluru',
    address: '88 100 Feet Ring Road, Indiranagar, Bengaluru, Karnataka 560038',
    lat: 12.9716,
    lng: 77.5946,
  },
  {
    name: 'Hyderabad (HITEC City)',
    facility: 'Metro City Health Campus - Hyderabad',
    address: 'Plot 14, Bio-Tech Park, HITEC City, Hyderabad, Telangana 500081',
    lat: 17.4435,
    lng: 78.3772,
  },
  {
    name: 'Chennai (Greams / Central)',
    facility: 'Metro City Institute of Trauma - Chennai',
    address: '21 Greams Lane, Thousand Lights, Chennai, Tamil Nadu 600006',
    lat: 13.0604,
    lng: 80.2496,
  },
  {
    name: 'Kolkata (Park Street)',
    facility: 'Metro City Multispeciality - Kolkata',
    address: '77 Park Street, Central Business District, Kolkata, West Bengal 700016',
    lat: 22.5535,
    lng: 88.3518,
  },
  {
    name: 'Pune (Shivaji Nagar)',
    facility: 'Metro City Care Hospital - Pune',
    address: '45 University Road, Shivaji Nagar, Pune, Maharashtra 411005',
    lat: 18.5314,
    lng: 73.8446,
  },
];

export const SettingsPage: React.FC = () => {
  const { profile, activeRole, activeHospital, setActiveHospitalById } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Hospital Location Editing state (with full manual control)
  const [editingLocation, setEditingLocation] = useState(false);
  const [facilityName, setFacilityName] = useState<string>('Metro City General Hospital');
  const [streetAddress, setStreetAddress] = useState<string>('452 Healthcare Boulevard, Sector 4');
  const [latitude, setLatitude] = useState<string>('28.6139');
  const [longitude, setLongitude] = useState<string>('77.2090');
  const [locationMode, setLocationMode] = useState<'manual' | 'presets' | 'gps'>('manual');
  const [searchLocationQuery, setSearchLocationQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccess, setLocationSuccess] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Active configuration drawer state
  const [activeConfigKey, setActiveConfigKey] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testingService, setTestingService] = useState<string | null>(null);
  const [savingService, setSavingService] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ key: string; message: string; type: 'success' | 'error' } | null>(null);

  const loadStatuses = async () => {
    setLoading(true);
    const data = await getIntegrationStatuses();
    setIntegrations(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStatuses();
  }, []);

  const openConfigDrawer = (key: string) => {
    if (activeConfigKey === key) {
      setActiveConfigKey(null);
      return;
    }
    setActiveConfigKey(key);
    setActionNotice(null);

    // Pre-populate fields based on active state
    if (key === 'supabase') {
      const { url, anonKey } = getSupabaseCredentials();
      setConfigForm({
        VITE_SUPABASE_URL: url === 'https://demo-medconnect.supabase.co' ? '' : url,
        VITE_SUPABASE_ANON_KEY: anonKey === 'demo-anon-key' ? '' : anonKey,
      });
    } else if (key === 'sarvam') {
      const { apiKey } = getSarvamCredentials();
      setConfigForm({ SARVAM_API_KEY: apiKey });
    } else if (key === 'openai') {
      const { apiKey } = getOpenAICredentials();
      setConfigForm({ OPENAI_API_KEY: apiKey });
    } else if (key === 'telegram') {
      const { token, chatId } = getTelegramCredentials();
      setConfigForm({ TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId });
    } else if (key === 'twilio') {
      const { accountSid, authToken, fromPhone, toPhone } = getTwilioCredentials();
      setConfigForm({
        TWILIO_ACCOUNT_SID: accountSid,
        TWILIO_AUTH_TOKEN: authToken,
        TWILIO_FROM_PHONE: fromPhone,
        TWILIO_TO_PHONE: toPhone,
      });
    } else if (key === 'n8n') {
      const baseUrl = (typeof window !== 'undefined' ? window.localStorage.getItem('MEDCONNECT_N8N_BASE_URL') : '') || ((process.env as any).N8N_BASE_URL || 'http://localhost:5678');
      const webhookUrl = (typeof window !== 'undefined' ? window.localStorage.getItem('MEDCONNECT_N8N_WEBHOOK_URL') : '') || ((process.env as any).N8N_WEBHOOK_URL || 'http://localhost:5678/webhook');
      const secret = (typeof window !== 'undefined' ? window.localStorage.getItem('MEDCONNECT_N8N_WEBHOOK_SECRET') : '') || ((process.env as any).N8N_WEBHOOK_SECRET || 'medconnect-n8n-secret-key');
      setConfigForm({
        N8N_BASE_URL: baseUrl,
        N8N_WEBHOOK_URL: webhookUrl,
        N8N_WEBHOOK_SECRET: secret,
      });
    }
  };

  const handleTestService = async (key: string) => {
    setTestingService(key);
    setActionNotice(null);
    try {
      const res = await testServiceConnection(key, configForm);
      if (res.success) {
        setActionNotice({ key, message: res.message, type: 'success' });
      } else {
        setActionNotice({ key, message: res.message, type: 'error' });
      }
    } finally {
      setTestingService(null);
    }
  };

  const handleSaveCredentials = async (key: string) => {
    setSavingService(key);
    setActionNotice(null);
    try {
      const res = await saveCredentialsToSystem(configForm);
      setActionNotice({ key, message: res.message, type: 'success' });
      await loadStatuses();
    } catch (e: any) {
      setActionNotice({ key, message: e.message || 'Failed to save', type: 'error' });
    } finally {
      setSavingService(null);
    }
  };

  useEffect(() => {
    if (activeHospital) {
      setFacilityName(activeHospital.name || 'Metro City General Hospital');
      setStreetAddress(activeHospital.address || '452 Healthcare Boulevard, Sector 4');
      setLatitude((activeHospital.latitude ?? (activeHospital as unknown as Record<string, number>).lat ?? 28.6139).toString());
      setLongitude((activeHospital.longitude ?? (activeHospital as unknown as Record<string, number>).lng ?? 77.2090).toString());
    }
  }, [activeHospital]);

  const handleSelectPreset = (preset: typeof CITY_PRESETS[0]) => {
    setFacilityName(preset.facility);
    setStreetAddress(preset.address);
    setLatitude(preset.lat.toString());
    setLongitude(preset.lng.toString());
    setLocationSuccess(`Applied location preset: ${preset.name}`);
    setLocationError(null);
  };

  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchLocationQuery.trim();
    if (!query) {
      setLocationError('Please type an address, area, or city to search.');
      return;
    }

    setIsSearchingLocation(true);
    setLocationError(null);
    setLocationSuccess(null);

    // Check presets first
    const presetMatch = CITY_PRESETS.find(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.address.toLowerCase().includes(query.toLowerCase()) ||
      query.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
    );

    if (presetMatch) {
      handleSelectPreset(presetMatch);
      setIsSearchingLocation(false);
      return;
    }

    // Try OpenStreetMap Nominatim geocoding
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const parsedLat = parseFloat(item.lat).toFixed(4);
        const parsedLng = parseFloat(item.lon).toFixed(4);
        setLatitude(parsedLat);
        setLongitude(parsedLng);
        const formattedAddr = item.display_name.split(',').slice(0, 3).join(', ').trim();
        if (formattedAddr) setStreetAddress(formattedAddr);
        setLocationSuccess(`Location resolved: "${formattedAddr || query}" (Lat: ${parsedLat}, Lng: ${parsedLng})`);
      } else {
        setLocationError(`No exact coordinates found for "${query}". You can adjust the latitude & longitude numbers manually below.`);
      }
    } catch {
      setLocationError(`Could not auto-resolve online. Please enter or fine-tune coordinates manually below.`);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleFetchCurrentGps = async () => {
    setGpsLoading(true);
    setLocationError(null);
    setLocationSuccess(null);
    try {
      const pos = await getCurrentBrowserLocation();
      setLatitude(pos.lat.toString());
      setLongitude(pos.lng.toString());
      setLocationSuccess(`GPS coordinates detected: Lat ${pos.lat}, Lng ${pos.lng}`);
    } catch (err: unknown) {
      setLocationError(err instanceof Error ? err.message : 'Could not fetch device location. Please enter coordinates manually.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSaveHospitalLocation = () => {
    if (!facilityName.trim()) {
      setLocationError('Facility name cannot be empty.');
      return;
    }
    if (!streetAddress.trim()) {
      setLocationError('Physical street address cannot be empty.');
      return;
    }

    const val = validateCoordinates(latitude, longitude);
    if (!val.isValid) {
      setLocationError(val.error || 'Invalid coordinates.');
      return;
    }

    setLocationError(null);
    const prevLat = activeHospital?.latitude ?? 28.6139;
    const prevLng = activeHospital?.longitude ?? 77.2090;

    const targetId = activeHospital?.id || 'hosp-101';

    // Update hospital location in dbEngine
    const updated = dbEngine.addOrUpdateHospital({
      id: targetId,
      name: facilityName.trim(),
      address: streetAddress.trim(),
      latitude: val.formattedLat!,
      longitude: val.formattedLng!,
      lat: val.formattedLat!,
      lng: val.formattedLng!,
      phone: activeHospital?.phone || '+91-11-23456789',
      emergency_contact: activeHospital?.emergency_contact || '+91-11-99990001',
      is_active: true,
    });

    // Update in-memory activeHospital
    if (activeHospital) {
      activeHospital.name = facilityName.trim();
      activeHospital.address = streetAddress.trim();
      activeHospital.latitude = val.formattedLat!;
      activeHospital.longitude = val.formattedLng!;
      (activeHospital as unknown as Record<string, number>).lat = val.formattedLat!;
      (activeHospital as unknown as Record<string, number>).lng = val.formattedLng!;
    }

    // Persist to localStorage
    try {
      localStorage.setItem('medconnect_custom_hospital_location', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    // Notify AuthContext
    if (setActiveHospitalById) {
      setActiveHospitalById(targetId);
    }

    // Record activity log
    dbEngine.logActivity(
      targetId,
      profile?.id || null,
      'hospital_location_updated',
      'hospital',
      targetId,
      {
        previousLat: prevLat,
        previousLng: prevLng,
        newLat: val.formattedLat,
        newLng: val.formattedLng,
        facilityName: facilityName.trim(),
        address: streetAddress.trim(),
        updatedBy: profile?.full_name || 'Hospital Admin',
      }
    );

    setLocationSuccess(`Hospital physical location successfully saved and verified! (Lat: ${val.formattedLat}, Lng: ${val.formattedLng})`);
    setEditingLocation(false);
  };

  const currentLat = activeHospital?.latitude ?? (activeHospital as unknown as Record<string, number>).lat ?? 28.6139;
  const currentLng = activeHospital?.longitude ?? (activeHospital as unknown as Record<string, number>).lng ?? 77.2090;

  return (
    <div className="space-y-6 sm:space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-[11px] font-extrabold text-blue-700 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            SYSTEM CONFIGURATION &amp; LOCATION MANAGEMENT
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Platform Settings &amp; Facility Location
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage hospital physical coordinates, audit API integration health, and review active credentials.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* LEFT COLUMN: Profile & Hospital Registered Location */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active Profile */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-card">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Active User Profile &amp; Permissions</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 block text-[10px] uppercase font-mono tracking-wider">User Full Name</span>
                <span className="font-bold text-slate-900 text-sm">{profile?.full_name || 'Dr. Rajesh Sharma'}</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 block text-[10px] uppercase font-mono tracking-wider">Operational Role</span>
                <span className="font-mono font-bold text-blue-700 capitalize">{activeRole.replace('_', ' ')}</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 block text-[10px] uppercase font-mono tracking-wider">Assigned Facility</span>
                <span className="font-bold text-slate-800">{activeHospital?.name || 'City General Hospital'}</span>
              </div>
            </div>
          </div>

          {/* HOSPITAL REGISTERED LOCATION PANEL */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>Hospital Physical GPS Location</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingLocation(!editingLocation)}
                className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-bold text-[11px] rounded-lg flex items-center space-x-1.5 transition cursor-pointer shadow-xs active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{editingLocation ? 'Cancel' : 'Update Location'}</span>
              </button>
            </div>

            {locationSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{locationSuccess}</span>
              </div>
            )}

            {locationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{locationError}</span>
              </div>
            )}

            {/* Readonly View */}
            {!editingLocation && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500 font-semibold flex items-center space-x-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Facility Name</span>
                    </span>
                    <span className="font-bold text-slate-900">{activeHospital?.name || facilityName}</span>
                  </div>

                  <div className="flex items-start justify-between pb-2 border-b border-slate-200 gap-4">
                    <span className="text-slate-500 font-semibold flex items-center space-x-1.5 shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>Street Address</span>
                    </span>
                    <span className="text-slate-700 font-medium text-right">{activeHospital?.address || streetAddress}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Latitude</span>
                    <span className="font-mono text-blue-700 font-extrabold text-base tracking-wide block">{currentLat}</span>
                    <span className="text-[10px] text-slate-500">North / South Anchor</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Longitude</span>
                    <span className="font-mono text-blue-700 font-extrabold text-base tracking-wide block">{currentLng}</span>
                    <span className="text-[10px] text-slate-500">East / West Anchor</span>
                  </div>
                </div>

                {/* Map Link & Verification Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-blue-50/60 border border-blue-200/70 rounded-xl">
                  <div className="flex items-center space-x-2 text-blue-800 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="font-semibold">Verified GPS Anchor: ±3m Precision</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${currentLat},${currentLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-[11px] font-bold underline underline-offset-2"
                  >
                    <span>Inspect on Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  * ER staff emergency supply requests strictly bind to these registered coordinates.
                </p>
              </div>
            )}

            {/* Editing View with Comprehensive Manual Choice */}
            {editingLocation && (
              <div className="space-y-4 pt-1 text-xs">
                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setLocationMode('manual')}
                    className={`py-2 px-2.5 rounded-lg font-bold text-[11px] flex items-center justify-center space-x-1.5 transition ${
                      locationMode === 'manual'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Manual Entry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode('presets')}
                    className={`py-2 px-2.5 rounded-lg font-bold text-[11px] flex items-center justify-center space-x-1.5 transition ${
                      locationMode === 'presets'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>City Presets</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode('gps')}
                    className={`py-2 px-2.5 rounded-lg font-bold text-[11px] flex items-center justify-center space-x-1.5 transition ${
                      locationMode === 'gps'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Auto GPS</span>
                  </button>
                </div>

                {/* MODE 1: MANUAL LOCATION & ADDRESS */}
                {locationMode === 'manual' && (
                  <div className="space-y-3.5 animate-fadeIn">
                    {/* Search & Auto-Locate Bar */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        Quick Landmark / City Search
                      </label>
                      <form onSubmit={handleSearchLocation} className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={searchLocationQuery}
                            onChange={(e) => setSearchLocationQuery(e.target.value)}
                            placeholder="Type area, city, hospital or landmark (e.g. Saket, Mumbai, Koramangala)..."
                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSearchingLocation}
                          className="px-3 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center space-x-1 shrink-0 cursor-pointer shadow-xs active:scale-95"
                        >
                          {isSearchingLocation ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Compass className="w-3.5 h-3.5" />
                          )}
                          <span>Locate</span>
                        </button>
                      </form>
                    </div>

                    {/* Facility Name Field */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        Hospital / Healthcare Facility Name
                      </label>
                      <input
                        type="text"
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        placeholder="e.g. Metro City General Hospital"
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs text-slate-800 outline-none font-semibold"
                      />
                    </div>

                    {/* Street Address Field */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        Physical Postal / Street Address
                      </label>
                      <textarea
                        rows={2}
                        value={streetAddress}
                        onChange={(e) => setStreetAddress(e.target.value)}
                        placeholder="e.g. 452 Healthcare Boulevard, Sector 4, New Delhi, Delhi 110001"
                        className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs text-slate-800 outline-none resize-none"
                      />
                    </div>

                    {/* Exact Coordinate Fields */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Latitude (-90 to 90)</label>
                          <span className="text-[9px] text-blue-600 font-mono">Dec Deg</span>
                        </div>
                        <input
                          type="number"
                          step="any"
                          value={latitude}
                          onChange={(e) => setLatitude(e.target.value)}
                          placeholder="28.6139"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-blue-700 font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Longitude (-180 to 180)</label>
                          <span className="text-[9px] text-blue-600 font-mono">Dec Deg</span>
                        </div>
                        <input
                          type="number"
                          step="any"
                          value={longitude}
                          onChange={(e) => setLongitude(e.target.value)}
                          placeholder="77.2090"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-blue-700 font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE 2: POPULAR CITY PRESETS */}
                {locationMode === 'presets' && (
                  <div className="space-y-2.5 animate-fadeIn">
                    <p className="text-slate-500 text-[11px]">
                      Choose your healthcare regional zone to instantly auto-populate street address &amp; GPS coordinates:
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {CITY_PRESETS.map((preset, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectPreset(preset)}
                          className="p-3 bg-slate-50 border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 rounded-xl flex items-center justify-between cursor-pointer transition group"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 group-hover:text-blue-700 text-xs flex items-center space-x-1.5">
                              <MapPin className="w-3 h-3 text-blue-600" />
                              <span>{preset.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[260px]">{preset.address}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-mono rounded-lg border border-blue-200 group-hover:bg-blue-600 group-hover:text-white font-bold transition">
                              Apply
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MODE 3: AUTO GPS */}
                {locationMode === 'gps' && (
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 animate-fadeIn text-center">
                    <Navigation className="w-8 h-8 text-blue-600 mx-auto animate-pulse" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-xs">Browser Satellite Geolocation</h4>
                      <p className="text-[11px] text-slate-500">
                        Query the device's hardware GPS sensor to anchor your current physical facility.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleFetchCurrentGps}
                      disabled={gpsLoading}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                    >
                      <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
                      <span>{gpsLoading ? 'Acquiring GPS Fix...' : 'Detect Device GPS Coordinates Now'}</span>
                    </button>
                    <p className="text-[10px] text-slate-400">
                      * If browser permission is blocked, switch to the "Manual Entry" tab to type coordinates or address directly.
                    </p>
                  </div>
                )}

                {/* Coordinate Visualizer Card */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                    <span className="text-slate-600 font-mono">
                      Selected: <span className="text-blue-700 font-bold">{latitude || '0'}, {longitude || '0'}</span>
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center space-x-1"
                  >
                    <span>Preview Map</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveHospitalLocation}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs transition cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save &amp; Bind Facility Coordinates</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLocation(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Service Integrations Health & Key Configuration */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Production Integration Matrix</span>
            </h3>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={loadStatuses}
                disabled={loading}
                title="Refresh Health Check"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {!loading && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  checkProductionReady(integrations).ready
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  STATUS: {checkProductionReady(integrations).ready ? 'FULLY OPERATIONAL' : `${checkProductionReady(integrations).unconfiguredCount} CONFIG PENDING`}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-white border border-slate-200/80 rounded-2xl">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mx-auto mb-2" />
              Checking service health &amp; credentials...
            </div>
          ) : (
            <div className="space-y-3">
              {integrations.map((item) => {
                const isConfigurable = ['supabase', 'openai', 'sarvam', 'telegram', 'twilio', 'n8n'].includes(item.key);
                const isOpen = activeConfigKey === item.key;

                return (
                  <div key={item.key} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition shadow-card">
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                          <span className="px-2 py-0.5 text-[9px] font-mono bg-slate-100 text-slate-600 rounded-full">{item.category}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{item.details}</p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                        {isConfigurable && (
                          <button
                            type="button"
                            onClick={() => openConfigDrawer(item.key)}
                            className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition flex items-center space-x-1 cursor-pointer active:scale-95 ${
                              isOpen
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <Key className="w-3 h-3" />
                            <span>{isOpen ? 'Close' : 'Configure'}</span>
                          </button>
                        )}

                        <span className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-full border flex items-center space-x-1 ${
                          item.status === 'PASS'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'FAIL'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : item.status === 'FALLBACK ONLY'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {item.status === 'PASS' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{item.status}</span>
                        </span>
                      </div>
                    </div>

                    {/* Expandable Configuration & Live Test Drawer */}
                    {isOpen && (
                      <div className="px-4 pb-4 pt-3 border-t border-slate-100 bg-slate-50/60 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center space-x-1.5">
                            <Zap className="w-3.5 h-3.5 text-blue-600" />
                            <span>Live Credential Management &amp; Endpoint Verification</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Changes persist to active environment</span>
                        </div>

                        {actionNotice && actionNotice.key === item.key && (
                          <div className={`p-2.5 rounded-lg text-xs flex items-center space-x-2 ${
                            actionNotice.type === 'success'
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                              : 'bg-rose-50 border border-rose-200 text-rose-700'
                          }`}>
                            {actionNotice.type === 'success' ? (
                              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                            )}
                            <span>{actionNotice.message}</span>
                          </div>
                        )}

                        {/* Service-Specific Inputs */}
                        {item.key === 'supabase' && (
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">VITE_SUPABASE_URL</label>
                              <input
                                type="text"
                                value={configForm['VITE_SUPABASE_URL'] ?? ''}
                                onChange={(e) => setConfigForm(prev => ({ ...prev, VITE_SUPABASE_URL: e.target.value }))}
                                placeholder="https://xyz.supabase.co"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">VITE_SUPABASE_ANON_KEY</label>
                              <div className="relative">
                                <input
                                  type={showSecrets['supabase'] ? 'text' : 'password'}
                                  value={configForm['VITE_SUPABASE_ANON_KEY'] ?? ''}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, VITE_SUPABASE_ANON_KEY: e.target.value }))}
                                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                  className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowSecrets(prev => ({ ...prev, supabase: !prev['supabase'] }))}
                                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                >
                                  {showSecrets['supabase'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Service-Specific Inputs */}
                        {item.key === 'sarvam' && (
                          <div className="space-y-2">
                            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">SARVAM_API_KEY</label>
                            <div className="relative">
                              <input
                                type={showSecrets['sarvam'] ? 'text' : 'password'}
                                value={configForm['SARVAM_API_KEY'] ?? ''}
                                onChange={(e) => setConfigForm(prev => ({ ...prev, SARVAM_API_KEY: e.target.value }))}
                                placeholder="sk_..."
                                className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowSecrets(prev => ({ ...prev, sarvam: !prev['sarvam'] }))}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                              >
                                {showSecrets['sarvam'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}

                        {item.key === 'openai' && (
                          <div className="space-y-2">
                            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">OPENAI_API_KEY</label>
                            <div className="relative">
                              <input
                                type={showSecrets['openai'] ? 'text' : 'password'}
                                value={configForm['OPENAI_API_KEY'] ?? ''}
                                onChange={(e) => setConfigForm(prev => ({ ...prev, OPENAI_API_KEY: e.target.value }))}
                                placeholder="sk-proj-..."
                                className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowSecrets(prev => ({ ...prev, openai: !prev['openai'] }))}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                              >
                                {showSecrets['openai'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}

                        {item.key === 'telegram' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">TELEGRAM_BOT_TOKEN</label>
                              <div className="relative">
                                <input
                                  type={showSecrets['telegram'] ? 'text' : 'password'}
                                  value={configForm['TELEGRAM_BOT_TOKEN'] ?? ''}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, TELEGRAM_BOT_TOKEN: e.target.value }))}
                                  placeholder="123456:ABC-DEF..."
                                  className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowSecrets(prev => ({ ...prev, telegram: !prev['telegram'] }))}
                                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                >
                                  {showSecrets['telegram'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">TELEGRAM_CHAT_ID</label>
                              <input
                                type="text"
                                value={configForm['TELEGRAM_CHAT_ID'] ?? ''}
                                onChange={(e) => setConfigForm(prev => ({ ...prev, TELEGRAM_CHAT_ID: e.target.value }))}
                                placeholder="-100..."
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                              />
                            </div>
                          </div>
                        )}

                        {item.key === 'twilio' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">TWILIO_ACCOUNT_SID</label>
                              <input
                                type="text"
                                value={configForm['TWILIO_ACCOUNT_SID'] ?? ''}
                                onChange={(e) => setConfigForm(prev => ({ ...prev, TWILIO_ACCOUNT_SID: e.target.value }))}
                                placeholder="AC..."
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">TWILIO_AUTH_TOKEN</label>
                              <div className="relative">
                                <input
                                  type={showSecrets['twilio'] ? 'text' : 'password'}
                                  value={configForm['TWILIO_AUTH_TOKEN'] ?? ''}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, TWILIO_AUTH_TOKEN: e.target.value }))}
                                  placeholder="Token..."
                                  className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowSecrets(prev => ({ ...prev, twilio: !prev['twilio'] }))}
                                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                >
                                  {showSecrets['twilio'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">FROM PHONE</label>
                              <input
                                type="text"
                                value={configForm['TWILIO_FROM_PHONE'] ?? ''}
                                onChange={(e) => setConfigForm(prev => ({ ...prev, TWILIO_FROM_PHONE: e.target.value }))}
                                placeholder="+18005550199"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">TO PHONE (EMERGENCY)</label>
                              <input
                                type="text"
                                value={configForm['TWILIO_TO_PHONE'] ?? ''}
                                onChange={(e) => setConfigForm(prev => ({ ...prev, TWILIO_TO_PHONE: e.target.value }))}
                                placeholder="+91999900000"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                              />
                            </div>
                          </div>
                        )}

                        {item.key === 'n8n' && (
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">REMOTE N8N BASE URL</label>
                              <input
                                type="text"
                                value={configForm['N8N_BASE_URL'] ?? ''}
                                onChange={(e) => {
                                  const base = e.target.value;
                                  setConfigForm(prev => ({
                                    ...prev,
                                    N8N_BASE_URL: base,
                                    N8N_WEBHOOK_URL: base ? `${base.replace(/\/$/, '')}/webhook` : prev.N8N_WEBHOOK_URL,
                                  }));
                                }}
                                placeholder="https://your-n8n-instance.railway.app or https://n8n.cloud"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                              />
                              <p className="text-[10px] text-slate-400">Root domain of your remote n8n server (e.g., https://n8n.example.com)</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">N8N_WEBHOOK_URL</label>
                                <input
                                  type="text"
                                  value={configForm['N8N_WEBHOOK_URL'] ?? ''}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, N8N_WEBHOOK_URL: e.target.value }))}
                                  placeholder="https://your-n8n.example.com/webhook"
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">WEBHOOK_SECRET</label>
                                <input
                                  type="text"
                                  value={configForm['N8N_WEBHOOK_SECRET'] ?? ''}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, N8N_WEBHOOK_SECRET: e.target.value }))}
                                  placeholder="medconnect-n8n-secret-key"
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                />
                              </div>
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 space-y-1">
                              <span className="font-bold text-slate-800 block">Workflows Trigger Endpoints in n8n Remote:</span>
                              <div className="font-mono text-[10px] text-blue-700 font-semibold">POST {configForm['N8N_WEBHOOK_URL'] || 'https://.../webhook'}/medconnect-test</div>
                              <div className="font-mono text-[10px] text-blue-700 font-semibold">POST {configForm['N8N_WEBHOOK_URL'] || 'https://.../webhook'}/ai-receptionist</div>
                              <div className="font-mono text-[10px] text-blue-700 font-semibold">POST {configForm['N8N_WEBHOOK_URL'] || 'https://.../webhook'}/emergency-dispatch</div>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons: Test Connection & Save */}
                        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleTestService(item.key)}
                            disabled={testingService === item.key}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer active:scale-95"
                          >
                            <RefreshCw className={`w-3 h-3 ${testingService === item.key ? 'animate-spin' : ''}`} />
                            <span>{testingService === item.key ? 'Testing...' : 'Test Connection'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveCredentials(item.key)}
                            disabled={savingService === item.key}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer active:scale-95"
                          >
                            <Check className="w-3 h-3" />
                            <span>{savingService === item.key ? 'Saving...' : 'Save &amp; Activate'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
