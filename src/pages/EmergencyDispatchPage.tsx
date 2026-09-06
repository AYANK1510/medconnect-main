import React, { useState, useEffect } from 'react';
import { fetchEmergencyRequests, acceptEmergencyRequest } from '../services/emergencyService';
import { fetchDispatches } from '../services/dispatchService';
import type { EmergencyRequest, Dispatch } from '../types/database.types';
import { dbEngine } from '../lib/dbEngine';
import { Link } from 'react-router-dom';
import { Truck, ShieldCheck, CheckCircle2, QrCode, AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export const EmergencyDispatchPage: React.FC = () => {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    const reqs = await fetchEmergencyRequests();
    const disps = await fetchDispatches();
    setRequests(reqs.filter(r => r.status === 'PENDING'));
    setDispatches(disps);
  };

  useEffect(() => {
    loadData();
    const unsub = dbEngine.subscribe(() => loadData());
    return () => unsub();
  }, []);

  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await acceptEmergencyRequest(requestId, 'hosp-102');
      await loadData();
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || 'Inventory transaction failed.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <span className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider block">
            REGIONAL EMERGENCY DISPATCH & INVENTORY ALLOCATION
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Emergency Supply Dispatch Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            Accept regional SOS requests, reserve inventory atomically, and issue QR dispatch passes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Incoming Emergency Requests to Accept */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Incoming Regional SOS Requests</span>
            </h2>
            <Badge variant="warning" size="sm" dot>
              {requests.length} Pending
            </Badge>
          </div>

          {requests.length === 0 ? (
            <EmptyState
              title="No pending SOS requests"
              description="No emergency supply requests targeting this facility are currently pending."
            />
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">REQUESTING FACILITY</span>
                      <div className="text-xs sm:text-sm font-bold text-slate-900">Metro City General Hospital</div>
                    </div>
                    <Badge variant="emergency" dot pulseDot size="sm">
                      CRITICAL SOS
                    </Badge>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="text-slate-600">
                      Resource: <span className="font-bold text-slate-900 uppercase">{req.resource_type.replace('_', ' ')}</span>
                    </div>
                    <div className="text-slate-600">
                      Quantity Needed: <span className="font-bold text-blue-600 font-mono">{req.quantity} Units</span>
                    </div>
                    {req.notes && <div className="text-slate-500 text-[11px] mt-1">{req.notes}</div>}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAccept(req.id)}
                    disabled={processingId === req.id}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingId === req.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Reserving Inventory & Creating Dispatch...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept Request & Reserve Inventory</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Dispatches and QR Pass Generator */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>Active Dispatches & QR Passes</span>
            </h2>
            <span className="text-xs font-mono text-slate-500 font-medium">{dispatches.length} Total</span>
          </div>

          {dispatches.length === 0 ? (
            <EmptyState
              title="No active dispatches"
              description="No active supply dispatches currently generated."
            />
          ) : (
            <div className="space-y-3">
              {dispatches.map(disp => (
                <div key={disp.id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {disp.verification_code}
                      </span>
                    </div>
                    <Badge variant="green" size="sm" dot>
                      {disp.status}
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 font-mono">
                    <div>Resource: <span className="text-slate-900 font-semibold uppercase">{disp.resource_type.replace('_', ' ')}</span> ({disp.quantity} Units)</div>
                    <div>Destination: <span className="text-slate-700">Metro City General</span></div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Created: {new Date(disp.created_at).toLocaleTimeString()}
                    </span>
                    <Link
                      to={`/dispatch/verify/${disp.verification_code}`}
                      target="_blank"
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 font-semibold rounded-xl transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>View Verified QR Pass</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmergencyDispatchPage;
