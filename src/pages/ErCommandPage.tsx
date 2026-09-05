import React, { useState, useEffect } from 'react';
import { createEmergencyRequest, fetchEmergencyRequests } from '../services/emergencyService';
import type { EmergencyRequest, EmergencyMatch, EmergencyUrgency, Hospital } from '../types/database.types';
import { dbEngine } from '../lib/dbEngine';
import { HospitalNetworkMap } from '../components/HospitalNetworkMap';
import { TelegramAlertCard } from '../components/TelegramAlertCard';
import { TwilioEscalationTimeline } from '../components/TwilioEscalationTimeline';
import { AlertOctagon, Send, ShieldAlert, Radio, Clock, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';

const RESOURCE_TYPES = ['Oxygen', 'Blood', 'ICU Bed', 'Ventilator', 'Medicine', 'Other'];

export const ErCommandPage: React.FC = () => {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [requestingHospitalId, setRequestingHospitalId] = useState<string>('hosp-101');

  // Form Fields (Phase 8 ER Staff Inputs)
  const [resourceType, setResourceType] = useState<string>('Blood');
  const [resourceName, setResourceName] = useState<string>('O- Negative Blood');
  const [quantity, setQuantity] = useState<number>(4);
  const [urgency, setUrgency] = useState<EmergencyUrgency>('CRITICAL');
  const [notes, setNotes] = useState<string>('Multiple trauma patient requiring immediate transfusion.');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [lastMatchResult, setLastMatchResult] = useState<{
    request: EmergencyRequest;
    matches: EmergencyMatch[];
    message?: string;
  } | null>(null);

  const currentHospital = hospitals.find(h => h.id === requestingHospitalId);

  const loadRequests = async () => {
    const data = await fetchEmergencyRequests();
    setRequests(data);
    setHospitals(dbEngine.getHospitals());
  };

  useEffect(() => {
    loadRequests();
    const unsub = dbEngine.subscribe(() => loadRequests());
    return () => unsub();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await createEmergencyRequest({
        requesting_hospital_id: requestingHospitalId,
        resource_type: resourceType,
        resource_name: resourceName.trim() || resourceType,
        quantity: Number(quantity),
        urgency,
        notes: notes.trim(),
      });

      setLastMatchResult({
        request: res.request,
        matches: res.matches,
        message: res.message,
      });

      await loadRequests();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch emergency SOS request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-1">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>ER TRAUMA & EMERGENCY DISPATCH NETWORK</span>
          </span>
          <h1 className="text-2xl font-extrabold text-white">Emergency Command Center (15 km Haversine Geo-Fence)</h1>
          <p className="text-xs text-slate-400">
            Real-time hospital-to-hospital emergency supply request and atomic inventory matching.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={requestingHospitalId}
            onChange={e => setRequestingHospitalId(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500"
          >
            <option value="hosp-101">Metro City General Hospital (hosp-101)</option>
            <option value="hosp-102">City Trauma & Emergency Center (hosp-102)</option>
            <option value="hosp-103">Apex Specialty Care (hosp-103)</option>
          </select>

          <span className="px-3 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold rounded-xl flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>HAVERSINE MATCHING ENGINE READY</span>
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Create Request Form */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
              <span>Broadcast SOS Supply Request</span>
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">Max 15 km Radius</span>
          </div>

          {/* HOSPITAL REGISTERED LOCATION ENFORCEMENT NOTICE */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center space-x-2 text-teal-400 font-bold">
              <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Registered Hospital Location Enforcement</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Emergency requests strictly bind to your hospital's registered physical location (
              <span className="font-semibold text-white">
                {currentHospital?.name || 'Hospital'} — Lat: {currentHospital?.latitude ?? 28.6139}, Lng: {currentHospital?.longitude ?? 77.2090}
              </span>
              ). Personal ER staff GPS coordinates are <span className="font-bold text-rose-400">NEVER</span> used for emergency matching.
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/40 rounded-xl flex items-start space-x-3 text-xs text-rose-300 animate-in fade-in duration-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-rose-200">Emergency Dispatch Error</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Match Results Summary */}
          {lastMatchResult && (
            <div className={`p-4 rounded-xl border space-y-3 text-xs ${
              lastMatchResult.matches.length > 0
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-amber-500/10 border-amber-500/40'
            }`}>
              <div className="flex items-center space-x-2 font-bold">
                {lastMatchResult.matches.length > 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Emergency Request Evaluated & Matched!</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400">No Matching Facilities Found</span>
                  </>
                )}
              </div>

              <p className="text-slate-300 leading-relaxed">
                {lastMatchResult.message || `Found ${lastMatchResult.matches.length} hospitals within 15 km with available inventory.`}
              </p>

              {/* Match Table Display */}
              {lastMatchResult.matches.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-mono text-slate-400 uppercase block font-semibold">
                    Ranked Matches (Priority: Distance → Available Stock → Status):
                  </span>
                  <div className="space-y-1.5">
                    {lastMatchResult.matches.map((m, idx) => (
                      <div key={m.id} className="flex items-center justify-between p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] font-mono">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 flex items-center justify-center bg-teal-500/20 text-teal-300 font-bold rounded-full text-[10px]">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-white">{m.hospital_name || m.hospital_id}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-teal-400 font-semibold">{m.distance_km} km</span>
                          <span className="text-emerald-400">{m.available_quantity} avail</span>
                          <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded uppercase">{m.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Resource Category</label>
                <select
                  value={resourceType}
                  onChange={e => {
                    setResourceType(e.target.value);
                    if (!resourceName || RESOURCE_TYPES.includes(resourceName)) {
                      setResourceName(`${e.target.value} Stock`);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-rose-500 font-medium"
                >
                  {RESOURCE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Resource Name</label>
                <input
                  type="text"
                  placeholder="e.g. O- Negative Blood, Type D Cylinder"
                  value={resourceName}
                  onChange={e => setResourceName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-rose-500 font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Required Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-rose-500 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Urgency Triage Level</label>
                <select
                  value={urgency}
                  onChange={e => setUrgency(e.target.value as EmergencyUrgency)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-rose-400 font-bold focus:outline-none focus:border-rose-500"
                >
                  <option value="CRITICAL">CRITICAL (Immediate Dispatch)</option>
                  <option value="HIGH">HIGH (15 Min Response)</option>
                  <option value="MODERATE">MODERATE (30 Min Response)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Clinical Description & Triage Info</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-rose-500"
                placeholder="State clinical reason for emergency request..."
              />
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>Requesting Hospital GPS Coordinates:</span>
                <span className="font-mono text-teal-300 font-semibold">
                  {currentHospital?.latitude ?? 28.6139}° N, {currentHospital?.longitude ?? 77.2090}° E
                </span>
              </div>
              <div className="flex justify-between">
                <span>3-Minute Escalation Window:</span>
                <span className="font-mono text-rose-400">Active Telegram & Twilio Listener</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Evaluating 15 km Haversine Geo-Fence...' : 'Broadcast SOS Request to Regional Network'}</span>
            </button>
          </form>

          {/* Telegram Alert Preview Component */}
          {requests.length > 0 && (
            <TelegramAlertCard
              hospitalName={currentHospital?.name || 'Metro City General Hospital'}
              resourceName={requests[0].resource_name || requests[0].resource_type}
              quantity={requests[0].quantity}
              distanceKm={5.2}
              requestId={requests[0].id}
            />
          )}
        </div>

        {/* Radar Map & Active Requests */}
        <div className="lg:col-span-6 space-y-6">
          <HospitalNetworkMap hospitals={hospitals} />

          <TwilioEscalationTimeline />

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Radio className="w-4 h-4 text-rose-400" />
                <span>Active Network Emergency Broadcasts</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">{requests.length} Requests</span>
            </div>

            {requests.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No active emergency supply broadcasts on the network.
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(req => (
                  <div key={req.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs uppercase font-mono tracking-wider">
                        {req.resource_name || req.resource_type} × {req.quantity}
                      </span>
                      <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full border ${
                        req.status === 'FULFILLED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        req.status === 'PENDING' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">{req.notes || 'Emergency request'}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-900 pt-2 font-mono">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Expires: {new Date(req.expires_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-teal-400" />
                        <span>Radius: 15 km</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
