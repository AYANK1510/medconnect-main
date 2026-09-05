import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchDispatchByIdentifier, updateDispatchStatus } from '../services/dispatchService';
import type { Dispatch, DispatchStatus } from '../types/database.types';
import { ShieldCheck, Truck, Building2, Clock, CheckCircle2, ArrowRight, AlertTriangle, PackageCheck } from 'lucide-react';

export const DispatchVerifyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (id) {
        const found = await fetchDispatchByIdentifier(id);
        setDispatch(found || null);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleStatusUpdate = async (nextStatus: DispatchStatus) => {
    if (!dispatch) return;
    setUpdating(true);
    setErrorMsg(null);
    try {
      const updated = await updateDispatchStatus(dispatch.id, nextStatus);
      setDispatch({ ...updated });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-400">Verifying Dispatch Pass...</span>
        </div>
      </div>
    );
  }

  if (!dispatch) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Invalid Dispatch Verification Code</h2>
          <p className="text-xs text-slate-400 mb-6">
            The requested dispatch pass code ({id}) could not be verified against the regional healthcare database.
          </p>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-400 text-slate-950 text-xs font-semibold rounded-lg hover:bg-teal-300 transition-colors"
          >
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const getNextStatusAction = (): { label: string; status: DispatchStatus; icon: any } | null => {
    if (['DISPATCH_CREATED', 'STOCK_RESERVED', 'RESERVED', 'ACCEPTED'].includes(dispatch.status)) {
      return { label: 'Mark as IN TRANSIT 🚚', status: 'IN_TRANSIT', icon: Truck };
    }
    if (dispatch.status === 'IN_TRANSIT') {
      return { label: 'Mark as RECEIVED 📦', status: 'RECEIVED', icon: PackageCheck };
    }
    if (dispatch.status === 'RECEIVED') {
      return { label: 'Mark as COMPLETED & CONSUME RESERVATION ✅', status: 'COMPLETED', icon: CheckCircle2 };
    }
    return null;
  };

  const nextAction = getNextStatusAction();

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-lg w-full bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden relative">
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span className="text-sm font-bold tracking-wider text-emerald-300 uppercase">Verified Emergency Supply Pass</span>
          </div>
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold rounded-full uppercase">
            AUTHENTICATED
          </span>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <span className="text-xs text-slate-400 uppercase tracking-widest font-mono">Verification Code</span>
            <div className="text-2xl font-black font-mono tracking-wider text-white mt-1">
              {dispatch.verification_code}
            </div>
            <p className="text-xs text-emerald-400 font-medium mt-1">Verified on Regional MedConnect Network</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2 text-slate-300 text-xs">
                <Truck className="w-4 h-4 text-teal-400" />
                <span>Resource Allocation</span>
              </div>
              <span className="text-sm font-bold text-white uppercase">{dispatch.resource_type.replace('_', ' ')}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-xs text-slate-400">Reserved Quantity</span>
              <span className="text-sm font-bold text-teal-400 font-mono">{dispatch.quantity} Units</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <span className="text-slate-500 block mb-1 flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dispatch Origin</span>
                </span>
                <span className="font-semibold text-slate-200 block">Supplying Hospital</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Destination Facility</span>
                </span>
                <span className="font-semibold text-slate-200 block">Emergency Hospital</span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Authorized Staff State Transition Action Button */}
          {nextAction ? (
            <button
              disabled={updating}
              onClick={() => handleStatusUpdate(nextAction.status)}
              className="w-full py-3 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <nextAction.icon className="w-4 h-4" />
              <span>{updating ? 'Updating Status...' : nextAction.label}</span>
            </button>
          ) : dispatch.status === 'COMPLETED' ? (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                DISPATCH COMPLETED & RESERVATION CONSUMED ✅
              </span>
            </div>
          ) : null}

          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-4">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Timestamp: {new Date(dispatch.created_at).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center space-x-1 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">{dispatch.status}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex justify-between items-center">
          <Link to="/" className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center space-x-1">
            <span>Back to System Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <span className="text-[10px] text-slate-500 font-mono">MedConnect Pulse Sec-v2</span>
        </div>
      </div>
    </div>
  );
};
