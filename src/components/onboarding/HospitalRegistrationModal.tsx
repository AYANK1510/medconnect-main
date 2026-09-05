import React, { useState } from 'react';
import { validateCoordinates, getCurrentBrowserLocation } from '../../utils/locationValidation';
import { Building2, MapPin, Navigation, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, X } from 'lucide-react';
import type { Hospital } from '../../types/database.types';

interface HospitalRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (hospitalData: Omit<Hospital, 'id' | 'created_at' | 'updated_at' | 'is_active'> & { code: string; city: string; state: string; pincode: string; email: string }) => Promise<void>;
}

export const HospitalRegistrationModal: React.FC<HospitalRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Info, 2: Location Choice, 3: Confirmation
  
  // Hospital Registration Info
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('New Delhi');
  const [state, setState] = useState('Delhi NCR');
  const [pincode, setPincode] = useState('110001');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Location State
  const [locationMethod, setLocationMethod] = useState<'current' | 'manual'>('manual');
  const [latitude, setLatitude] = useState<string>('28.6139');
  const [longitude, setLongitude] = useState<string>('77.2090');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFetchCurrentLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await getCurrentBrowserLocation();
      setLatitude(pos.lat.toString());
      setLongitude(pos.lng.toString());
      setLocationMethod('current');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not fetch location.');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !address || !city || !state || !pincode || !phone || !email || !emergencyContact) {
      setError('Please fill in all hospital facility details.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleProceedToConfirmation = () => {
    const val = validateCoordinates(latitude, longitude);
    if (!val.isValid) {
      setError(val.error || 'Invalid coordinates.');
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleFinalSubmit = async () => {
    if (!isConfirmed) {
      setError('You must check the confirmation box to confirm this physical location.');
      return;
    }

    const val = validateCoordinates(latitude, longitude);
    if (!val.isValid) {
      setError(val.error || 'Invalid coordinates.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullAddress = `${address}, ${city}, ${state} - ${pincode}`;
      await onSave({
        name,
        code,
        address: fullAddress,
        city,
        state,
        pincode,
        phone,
        email,
        emergency_contact: emergencyContact,
        latitude: val.formattedLat!,
        longitude: val.formattedLng!,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Hospital Registration & Onboarding</h2>
              <p className="text-xs text-slate-400">Step {step} of 3 — Verified Hospital Location System</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Facility Registration Details */}
          {step === 1 && (
            <form onSubmit={handleProceedToLocation} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hospital Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="City General Hospital"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Registration Number / Code *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="CGH-DEL-01"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-teal-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Physical Street Address *</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="122 Healthcare Boulevard, Sector 14"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State *</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pincode *</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hospital Phone *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91-11-23456789"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@hospital.org"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">24/7 ER Contact *</label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="+91-11-23459999"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-teal-500/20"
              >
                <span>Continue to Hospital Location Setup</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </form>
          )}

          {/* STEP 2: Location Method & Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-1">Where is your hospital located?</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Hospital location is strictly separate from patient and staff locations. This registered GPS location will be used for 15 km Haversine emergency radar matching.
                </p>
              </div>

              {/* Option Buttons */}
              <div className="grid sm:grid-cols-2 gap-4">
                
                {/* OPTION 1: Current Location */}
                <div
                  onClick={() => {
                    setLocationMethod('current');
                    handleFetchCurrentLocation();
                  }}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    locationMethod === 'current'
                      ? 'bg-teal-500/10 border-teal-500/50 text-white shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Navigation className="w-5 h-5 text-teal-400" />
                    <span className="font-bold text-xs text-white">OPTION 1</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-white mb-1">Use Current Location</h4>
                  <p className="text-xs text-slate-400">
                    Use browser GPS geolocation to auto-detect current physical coordinates.
                  </p>
                </div>

                {/* OPTION 2: Enter Manually */}
                <div
                  onClick={() => setLocationMethod('manual')}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    locationMethod === 'manual'
                      ? 'bg-teal-500/10 border-teal-500/50 text-white shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <MapPin className="w-5 h-5 text-teal-400" />
                    <span className="font-bold text-xs text-white">OPTION 2</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-white mb-1">Enter Hospital Location Manually</h4>
                  <p className="text-xs text-slate-400">
                    Manually specify precise physical Latitude and Longitude coordinates.
                  </p>
                </div>

              </div>

              {/* Coordinate Inputs */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Hospital GPS Coordinates</span>
                  {loading && <span className="text-teal-400 animate-pulse">Detecting GPS...</span>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Latitude (-90 to 90)</label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="28.6139"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Longitude (-180 to 180)</label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="77.2090"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                >
                  Back
                </button>

                <button
                  onClick={handleProceedToConfirmation}
                  className="w-2/3 py-3 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2"
                >
                  <span>Review & Confirm Location</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Explicit Physical Confirmation */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                <h3 className="text-sm font-bold text-amber-300 mb-1 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Physical Location Verification</span>
                </h3>
                <p className="text-xs text-slate-300">
                  Please review facility details carefully. Coordinate validation enforces non-zero values within valid GPS range.
                </p>
              </div>

              {/* Pre-saving summary screen */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 font-semibold">Hospital Name</span>
                  <span className="font-extrabold text-white text-sm">{name}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 font-semibold">Registration Code</span>
                  <span className="font-mono text-teal-400 font-bold">{code}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 font-semibold">Hospital Address</span>
                  <span className="text-right text-slate-200 font-medium max-w-[280px]">
                    {address}, {city}, {state} - {pincode}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 font-semibold">Latitude</span>
                  <span className="font-mono text-emerald-400 font-bold">{latitude}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Longitude</span>
                  <span className="font-mono text-emerald-400 font-bold">{longitude}</span>
                </div>
              </div>

              {/* MANDATORY Physical Location Confirmation Checkbox */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="confirm_hospital_location"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-teal-400 rounded cursor-pointer"
                />
                <label htmlFor="confirm_hospital_location" className="text-xs text-slate-200 font-semibold cursor-pointer leading-relaxed">
                  I confirm this is the physical location of the hospital.
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setStep(2)}
                  className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                >
                  Edit Location
                </button>

                <button
                  onClick={handleFinalSubmit}
                  disabled={loading || !isConfirmed}
                  className={`w-2/3 py-3 font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors ${
                    isConfirmed && !loading
                      ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'Saving Facility...' : 'Complete Hospital Registration'}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
