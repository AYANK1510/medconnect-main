import React, { useState, useEffect } from 'react';
import { fetchEmergencyRequests, acceptEmergencyRequest } from '../services/emergencyService';
import { fetchDispatches } from '../services/dispatchService';
import type { EmergencyRequest, Dispatch } from '../types/database.types';
import { dbEngine } from '../lib/dbEngine';
import { Link } from 'react-router-dom';
import { Truck, ShieldCheck, CheckCircle2, QrCode, AlertTriangle } from 'lucide-react';

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
      // Execute atomic database reservation procedure
      await acceptEmergencyRequest(requestId, 'hosp-102'); // Responding as St. Jude Memorial
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Inventory transaction failed.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
            REGIONAL EMERGENCY DISPATCH & INVENTORY ALLOCATION
          </span>
          <h1 className="text-2xl font-extrabold text-white">Emergency Supply Dispatch Portal</h1>
          <p className="text-xs text-slate-400">
            Accept regional SOS requests, reserve inventory atomically, and issue QR dispatch passes.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Incoming Emergency Requests to Accept */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Incoming Regional SOS Requests</span>
            </h2>
            <span className="text-xs font-mono text-amber-400">{requests.length} Pending</span>
          </div>

          {requests.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No pending emergency supply requests targeting this facility.
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-mono">REQUESTING FACILITY</span>
                      <div className="text-sm font-bold text-white">Metro City General Hospital</div>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-full">
                      CRITICAL SOS
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1">
                    <div className="text-slate-300">Resource: <span className="font-bold text-white uppercase">{req.resource_type.replace('_', ' ')}</span></div>
                    <div className="text-slate-300">Quantity Needed: <span className="font-bold text-teal-400 font-mono">{req.quantity} Units</span></div>
                    <div className="text-slate-400 text-[11px] mt-1">{req.notes}</div>
                  </div>

                  <button
                    onClick={() => handleAccept(req.id)}
                    disabled={processingId === req.id}
                    className="w-full py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{processingId === req.id ? 'Reserving Inventory & Creating Dispatch...' : 'Accept Request & Reserve Inventory'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Dispatches and QR Pass Generator */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Truck className="w-5 h-5 text-teal-400" />
              <span>Active Dispatches & QR Passes</span>
            </h2>
            <span className="text-xs font-mono text-teal-400">{dispatches.length} Total</span>
          </div>

          {dispatches.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No dispatches currently generated.
            </div>
          ) : (
            <div className="space-y-3">
              {dispatches.map(disp => (
                <div key={disp.id} className="p-4 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="font-mono text-xs font-bold text-emerald-300">
                        {disp.verification_code}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full uppercase">
                      {disp.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1 font-mono">
                    <div>Resource: <span className="text-white uppercase">{disp.resource_type.replace('_', ' ')}</span> ({disp.quantity} Units)</div>
                    <div>Destination: <span className="text-slate-200">Metro City General</span></div>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-xs">
                    <span className="text-[10px] text-slate-500 font-mono">Created: {new Date(disp.created_at).toLocaleTimeString()}</span>
                    <Link
                      to={`/dispatch/verify/${disp.verification_code}`}
                      target="_blank"
                      className="px-3 py-1.5 bg-teal-400/10 border border-teal-500/30 text-teal-300 hover:bg-teal-400 hover:text-slate-950 font-semibold rounded-lg transition-colors flex items-center space-x-1"
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
