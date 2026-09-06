import React, { useState, useEffect } from 'react';
import { createEmergencyRequest, fetchEmergencyRequests } from '../services/emergencyService';
import type { EmergencyRequest, EmergencyMatch, EmergencyUrgency, Hospital } from '../types/database.types';
import { dbEngine } from '../lib/dbEngine';
import { HospitalNetworkMap } from '../components/HospitalNetworkMap';
import { TelegramAlertCard } from '../components/TelegramAlertCard';
import { TwilioEscalationTimeline } from '../components/TwilioEscalationTimeline';
import { AlertOctagon, Send, ShieldAlert, Radio, Clock, MapPin, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

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
      const result = await createEmergencyRequest({
        requesting_hospital_id: requestingHospitalId,
        resource_type: resourceType,
        resource_name: resourceName,
        quantity: Number(quantity),
        urgency,
        notes,
      });

      setLastMatchResult(result);
      await loadRequests();
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'Failed to dispatch emergency broadcast.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <span className="text-[10px] sm:text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center space-x-1">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>ER TRAUMA & EMERGENCY DISPATCH NETWORK</span>
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Emergency Command Center (15 km Haversine Geo-Fence)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            Real-time hospital-to-hospital emergency supply request and atomic inventory matching.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
          <select
            value={requestingHospitalId}
            onChange={e => setRequestingHospitalId(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 cursor-pointer shadow-xs"
          >
            <option value="hosp-101">Metro City General Hospital (hosp-101)</option>
            <option value="hosp-102">City Trauma & Emergency Center (hosp-102)</option>
            <option value="hosp-103">Apex Specialty Care (hosp-103)</option>
          </select>

          <Badge variant="emergency" dot pulseDot size="md">
            HAVERSINE ENGINE READY
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Create Request Form */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2">
              <AlertOctagon className="w-5 h-5 text-rose-600" />
              <span>Broadcast SOS Supply Request</span>
            </h2>
            <span className="text-[10px] text-slate-500 font-mono font-medium">Max 15 km Radius</span>
          </div>

          {/* Location Enforcement Notice */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center space-x-2 text-blue-700 font-bold">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Registered Hospital Location Enforcement</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Emergency requests strictly bind to your hospital's registered physical location (
              <span className="font-semibold text-slate-900">
                {currentHospital?.name || 'Hospital'} — Lat: {currentHospital?.latitude ?? 28.6139}, Lng: {currentHospital?.longitude ?? 77.2090}
              </span>
              ). Personal ER staff GPS coordinates are <span className="font-bold text-rose-600">NEVER</span> used for emergency matching.
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-xs text-rose-700 animate-in fade-in duration-200">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-rose-900">Emergency Dispatch Error</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Match Results Summary */}
          {lastMatchResult && (
            <div className={`p-4 rounded-xl border space-y-3 text-xs ${
              lastMatchResult.matches.length > 0
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center space-x-2 font-bold">
                {lastMatchResult.matches.length > 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Emergency Request Evaluated & Matched!</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-700">No Matching Facilities Found</span>
                  </>
                )}
              </div>

              <p className="text-slate-600 leading-relaxed text-xs">
                {lastMatchResult.message || `Found ${lastMatchResult.matches.length} hospitals within 15 km with available inventory.`}
              </p>

              {/* Match Table Display */}
              {lastMatchResult.matches.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-emerald-200/60">
                  <span className="text-[11px] font-mono text-slate-500 uppercase block font-semibold">
                    Ranked Matches (Priority: Distance → Available Stock → Status):
                  </span>
                  <div className="space-y-1.5">
                    {lastMatchResult.matches.map((m, idx) => (
                      <div key={m.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-[11px] font-mono">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-700 font-bold rounded-full text-[10px]">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-800">{m.hospital_name || m.hospital_id}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-blue-600 font-semibold">{m.distance_km} km</span>
                          <span className="text-emerald-600 font-bold">{m.available_quantity} avail</span>
                          <span className="px-1.5 py-0.5 text-[9px] bg-slate-100 text-slate-600 rounded uppercase font-semibold">{m.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Resource Category</label>
                <select
                  value={resourceType}
                  onChange={e => {
                    setResourceType(e.target.value);
                    if (!resourceName || RESOURCE_TYPES.includes(resourceName)) {
                      setResourceName(`${e.target.value} Stock`);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 font-medium cursor-pointer"
                >
                  {RESOURCE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Resource Name</label>
                <input
                  type="text"
                  placeholder="e.g. O- Negative Blood, Type D Cylinder"
                  value={resourceName}
                  onChange={e => setResourceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Required Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Urgency Triage Level</label>
                <select
                  value={urgency}
                  onChange={e => setUrgency(e.target.value as EmergencyUrgency)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-rose-600 font-bold focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                >
                  <option value="CRITICAL">CRITICAL (Immediate Dispatch)</option>
                  <option value="HIGH">HIGH (15 Min Response)</option>
                  <option value="MODERATE">MODERATE (30 Min Response)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold">Clinical Description & Triage Info</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                placeholder="State clinical reason for emergency request..."
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-[11px] text-slate-500">
              <div className="flex justify-between flex-wrap gap-1">
                <span>Requesting Hospital GPS Coordinates:</span>
                <span className="font-mono text-blue-600 font-semibold">
                  {currentHospital?.latitude ?? 28.6139}° N, {currentHospital?.longitude ?? 77.2090}° E
                </span>
              </div>
              <div className="flex justify-between flex-wrap gap-1">
                <span>3-Minute Escalation Window:</span>
                <span className="font-mono text-rose-600 font-semibold">Active Telegram & Twilio Listener</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating 15 km Haversine Geo-Fence...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Broadcast SOS Request to Regional Network</span>
                </>
              )}
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
          <HospitalNetworkMap
            centerHospital={currentHospital}
            hospitals={hospitals}
            onSelectHospital={(hosp) => setRequestingHospitalId(hosp.id)}
          />

          <TwilioEscalationTimeline />

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2">
                <Radio className="w-4 h-4 text-rose-600" />
                <span>Active Network Emergency Broadcasts</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono font-medium">{requests.length} Requests</span>
            </div>

            {requests.length === 0 ? (
              <EmptyState
                title="No active broadcasts"
                description="There are currently no emergency supply broadcasts active on the regional network."
              />
            ) : (
              <div className="space-y-3">
                {requests.map(req => (
                  <div key={req.id} className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wider">
                        {req.resource_name || req.resource_type} × {req.quantity}
                      </span>
                      <Badge
                        variant={req.status === 'FULFILLED' ? 'green' : req.status === 'PENDING' ? 'emergency' : 'neutral'}
                        dot
                        pulseDot={req.status === 'PENDING'}
                        size="sm"
                      >
                        {req.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{req.notes || 'Emergency request'}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 font-mono flex-wrap gap-2">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Expires: {new Date(req.expires_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
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

export default ErCommandPage;
