import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Activity,
  Sparkles,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

export interface GuardrailItem {
  id: string;
  patient_name: string;
  patient_code: string;
  phone: string;
  token_number: string;
  detected_language: string;
  original_transcription: string;
  translated_summary: string;
  flag_type: string;
  flag_severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  ai_confidence: number;
  reason: string;
  flagged_at: string;
  status: string;
}

const INITIAL_GUARDRAIL_QUEUE: GuardrailItem[] = [
  {
    id: 'gr-001',
    patient_name: 'Vikram Singh',
    patient_code: 'DEMO-003',
    phone: '+91 98765 43212',
    token_number: '#MED-2041',
    detected_language: 'Hindi (hi-IN)',
    original_transcription: 'Mujhe seene mein bahut tej dard ho raha hai, paseena aa raha hai aur baaye haath mein dard ja raha hai.',
    translated_summary: 'Severe radiating chest pain with diaphoresis and left arm radiation.',
    flag_type: 'ACUTE_CARDIAC_RED_FLAG',
    flag_severity: 'CRITICAL',
    ai_confidence: 0.96,
    reason: 'Acute Coronary Syndrome / Myocardial Infarction indicators detected by AI triage.',
    flagged_at: '3 minutes ago',
    status: 'NEEDS_HUMAN_REVIEW'
  },
  {
    id: 'gr-002',
    patient_name: 'Sunita Devi',
    patient_code: 'DEMO-005',
    phone: '+91 98765 43214',
    token_number: '#MED-3108',
    detected_language: 'Telugu (te-IN)',
    original_transcription: 'Aakaasmatthuga oopiri aadatam ledu, SpO2 86% ki padipoyindi ani pulse oximeter choopisthundi.',
    translated_summary: 'Sudden severe dyspnea, home pulse oximeter reads SpO2 86%.',
    flag_type: 'RESPIRATORY_DISTRESS',
    flag_severity: 'HIGH',
    ai_confidence: 0.94,
    reason: 'Hypoxia warning: SpO2 < 90% with acute breathlessness.',
    flagged_at: '8 minutes ago',
    status: 'NEEDS_HUMAN_REVIEW'
  },
  {
    id: 'gr-003',
    patient_name: 'Kavita Rao',
    patient_code: 'DEMO-006',
    phone: '+91 98765 43216',
    token_number: '#MED-9022',
    detected_language: 'Tamil (ta-IN)',
    original_transcription: 'Theriyala, thala suthudu, aana marundhu theva illa, doctor paakanum aana nalla iruken.',
    translated_summary: 'Conflicting statements: reports syncope/dizziness but declines regular slot.',
    flag_type: 'LOW_CONFIDENCE_INTENT',
    flag_severity: 'MODERATE',
    ai_confidence: 0.58,
    reason: 'Ambiguous symptoms with syncope history; AI routed to Doctor Human Verification queue.',
    flagged_at: '14 minutes ago',
    status: 'NEEDS_HUMAN_REVIEW'
  }
];

interface ClinicalGuardrailQueueProps {
  onEmergencyFastTrack?: (item: GuardrailItem) => void;
  onPromoteToOPD?: (item: GuardrailItem) => void;
}

export const ClinicalGuardrailQueue: React.FC<ClinicalGuardrailQueueProps> = ({
  onEmergencyFastTrack,
  onPromoteToOPD
}) => {
  const [items, setItems] = useState<GuardrailItem[]>(INITIAL_GUARDRAIL_QUEUE);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'emergency' | 'opd' | 'dismiss';
    message: string;
  } | null>(null);

  const handleFastTrackEmergency = (item: GuardrailItem) => {
    setActionFeedback({
      type: 'emergency',
      message: `Emergency Desk Fast-Track initiated for ${item.patient_name} (${item.token_number}). Redirecting to Emergency Dispatch...`
    });

    setItems((prev) => prev.filter((i) => i.id !== item.id));

    if (onEmergencyFastTrack) {
      onEmergencyFastTrack(item);
    }

    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleAcceptPriorityOPD = (item: GuardrailItem) => {
    setActionFeedback({
      type: 'opd',
      message: `${item.patient_name} promoted to Immediate OPD Priority #1.`
    });

    setItems((prev) => prev.filter((i) => i.id !== item.id));

    if (onPromoteToOPD) {
      onPromoteToOPD(item);
    }

    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleDismiss = (item: GuardrailItem) => {
    setActionFeedback({
      type: 'dismiss',
      message: `Guardrail item for ${item.patient_name} marked as Reviewed / Dismissed.`
    });

    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const pendingCount = items.length;

  return (
    <section className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-card relative overflow-hidden font-sans">
      {/* Action Toast */}
      {actionFeedback && (
        <div
          className={`mb-4 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-sm transition-all ${
            actionFeedback.type === 'emergency'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : actionFeedback.type === 'opd'
              ? 'bg-teal-50 border border-teal-200 text-teal-800'
              : 'bg-slate-100 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-current" />
            <span>{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-xs opacity-75 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Clinical Safety Review Queue
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 border border-rose-200 text-rose-700">
                {pendingCount} Flagged
              </span>
            </div>
            <p className="text-xs text-slate-500">
              High-risk intake cases escalated for physician review and priority intervention.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          <span>Physician Oversight Protocol</span>
        </div>
      </div>

      {/* Guardrail Queue Body */}
      <div className="mt-5 space-y-4">
        {pendingCount === 0 ? (
          <div className="text-center py-8 text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">
              All clinical guardrail triage items have been resolved.
            </p>
            <p className="text-[11px] text-slate-400">
              No acute anomalies or unreviewed voice intakes currently pending.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                item.flag_severity === 'CRITICAL'
                  ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                  : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                {/* Left Side: Patient & AI Triage Analysis */}
                <div className="space-y-2.5 flex-1">
                  {/* Top Badges */}
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="font-mono font-bold text-teal-700">{item.token_number}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-slate-900">{item.patient_name}</span>
                    <span className="text-slate-400">({item.patient_code})</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-mono">{item.phone}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {item.flagged_at}
                    </span>
                  </div>

                  {/* Flag Type Pill */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        item.flag_severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {item.flag_type}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      AI Confidence: {(item.ai_confidence * 100).toFixed(0)}%
                    </span>
                    <span className="text-xs text-teal-700 font-medium">
                      Language: {item.detected_language}
                    </span>
                  </div>

                  {/* Clinical Reason & Audio Transcription Quote */}
                  <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-rose-600" />
                      <span>{item.translated_summary}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 italic">
                      "{item.original_transcription}"
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Rationale: {item.reason}
                    </p>
                  </div>
                </div>

                {/* Right Side: Doctor Review Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 lg:w-48">
                  {item.flag_severity === 'CRITICAL' && (
                    <button
                      type="button"
                      onClick={() => handleFastTrackEmergency(item)}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Fast-Track to ER</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAcceptPriorityOPD(item)}
                    className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Promote to Priority OPD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDismiss(item)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-colors cursor-pointer text-center"
                  >
                    Dismiss Flag
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default ClinicalGuardrailQueue;
