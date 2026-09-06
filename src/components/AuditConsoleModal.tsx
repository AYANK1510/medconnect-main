import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Terminal, Search, Copy, Check, Download, Zap
} from 'lucide-react';

export interface AuditLogEvent {
  id: string;
  stream: 'audit_log' | 'communication_log' | 'exception_log';
  tag: string;
  actor_type: string;
  workflow?: string;
  correlation_id?: string;
  action: string;
  severity: 'info' | 'warning' | 'critical';
  summary: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const INITIAL_DEMO_LOGS: AuditLogEvent[] = [
  {
    id: 'log-001',
    stream: 'audit_log',
    tag: 'AI_INTENT',
    actor_type: 'ai_agent',
    workflow: 'WF01_voice_receptionist',
    correlation_id: 'MED-20260904-402911',
    action: 'INTENT_CLASSIFIED',
    severity: 'info',
    summary: 'Transcribed "छाती का दर्द" -> General Medicine (Confidence 0.98)',
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    metadata: {
      engine: 'Sarvam AI Saaras STT',
      language: 'hi-IN',
      extracted_intent: 'book_appointment',
      department: 'General Medicine',
      confidence: 0.98,
      audio_duration_s: 3.4
    }
  },
  {
    id: 'log-002',
    stream: 'audit_log',
    tag: 'ATOMIC_SLOT',
    actor_type: 'n8n_automation',
    workflow: 'WF01_voice_receptionist',
    correlation_id: 'MED-20260904-402911',
    action: 'SLOT_RESERVED_ATOMIC',
    severity: 'info',
    summary: 'Reserved Slot #c001 for Ramesh Kumar -> Token #MED-4029',
    timestamp: new Date(Date.now() - 1000 * 60 * 17).toISOString(),
    metadata: {
      slot_id: 'c001-gen-med-1030',
      patient_id: 'DEMO-001',
      token_number: 'MED-4029',
      queue_position: 2,
      qr_hash: 'QR-PASS-MED-4029-7B8C',
      lock_strategy: 'SELECT FOR UPDATE (Atomic Postgres RPC)'
    }
  },
  {
    id: 'log-003',
    stream: 'communication_log',
    tag: 'QUEUE_TRIGGER',
    actor_type: 'system',
    workflow: 'WF05_queue_notification',
    correlation_id: 'MED-20260904-402911',
    action: 'TELEGRAM_DISPATCHED',
    severity: 'info',
    summary: 'Updated position to #2 -> Telegram alert dispatched (+91 98765 43210)',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    metadata: {
      channel: 'telegram',
      template_name: 'QUEUE_UPDATE_01',
      reminder_stage: 'initial',
      delivery_status: 'delivered',
      chat_id: '@medconnect_demo_bot'
    }
  },
  {
    id: 'log-004',
    stream: 'audit_log',
    tag: 'EMERGENCY_BROADCAST',
    actor_type: 'hospital_staff',
    workflow: 'WF08_emergency_broadcast',
    correlation_id: 'HOSP-20260904-892101',
    action: 'BROADCAST_PUBLISHED',
    severity: 'warning',
    summary: '2 units O- Blood broadcasted to 3 hospitals within 10km geofence',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    metadata: {
      requesting_hospital: 'DemoCare Multi-Specialty Central',
      resource_type: 'BLOOD_O_NEG',
      quantity: 2,
      radius_km: 10,
      nearby_discovered_count: 3,
      formula: 'Haversine formula (find_nearby_hospitals RPC)'
    }
  },
  {
    id: 'log-005',
    stream: 'exception_log',
    tag: 'RACE_GUARD',
    actor_type: 'n8n_automation',
    workflow: 'WF08_emergency_broadcast',
    correlation_id: 'HOSP-20260904-892101',
    action: 'CONCURRENCY_REJECTION_409',
    severity: 'critical',
    summary: 'Apollo locked resource; Fortis rejected (409 Conflict)',
    timestamp: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    metadata: {
      lock_status: 'ALREADY_CLAIMED',
      winning_hospital: 'Apollo Trauma Indiranagar',
      competing_hospital: 'Fortis Bannerghatta',
      atomic_isolation: 'Postgres Serializable Transaction Isolation'
    }
  },
  {
    id: 'log-006',
    stream: 'audit_log',
    tag: 'RX_SIGNATURE',
    actor_type: 'doctor',
    workflow: 'WF03_prescription_issue',
    correlation_id: 'MED-20260904-402911',
    action: 'PRESCRIPTION_SIGNED',
    severity: 'info',
    summary: 'Dr. Arvind Sharma signed Rx for #MED-1001 (Anita Sundaram)',
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    metadata: {
      doctor_reg_no: 'KMC-48209',
      items_count: 3,
      interaction_risk: 'LOW (Guardrails Passed)',
      signature_hash: 'SIG-9f4a812b4e7c'
    }
  }
];

interface AuditConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditConsoleModal: React.FC<AuditConsoleModalProps> = ({
  isOpen,
  onClose
}) => {
  const [logs, setLogs] = useState<AuditLogEvent[]>(INITIAL_DEMO_LOGS);
  const [streamFilter, setStreamFilter] = useState<'ALL' | 'audit_log' | 'communication_log' | 'exception_log'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      audit: logs.filter(l => l.stream === 'audit_log').length,
      comms: logs.filter(l => l.stream === 'communication_log').length,
      exceptions: logs.filter(l => l.stream === 'exception_log').length,
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchStream = streamFilter === 'ALL' || log.stream === streamFilter;
      const q = searchQuery.toLowerCase();
      const matchQuery = !searchQuery || 
        log.summary.toLowerCase().includes(q) ||
        (log.correlation_id && log.correlation_id.toLowerCase().includes(q)) ||
        log.tag.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q);
      return matchStream && matchQuery;
    });
  }, [logs, streamFilter, searchQuery]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const injectSampleEvent = () => {
    const newLog: AuditLogEvent = {
      id: `log-${Date.now()}`,
      stream: 'audit_log',
      tag: 'DATABASE_RPC',
      actor_type: 'supabase_rpc',
      workflow: 'WF07_sync_engine',
      correlation_id: `MED-REALTIME-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      action: 'REALTIME_BROADCAST',
      severity: 'info',
      summary: 'PostgreSQL Realtime change broadcasted to all connected UI clients',
      timestamp: new Date().toISOString(),
      metadata: {
        latency_ms: 18,
        transport: 'WebSocket SSL',
        payload_size_bytes: 412
      }
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const exportLogsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `medconnect_audit_${Date.now()}.json`);
    dlAnchor.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-slate-950 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-sm">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Master System Telemetry & Audit Stream
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-950 border border-teal-800 text-teal-300">
                  REALTIME
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                End-to-end trace log: Voice AI → n8n → Postgres RPC → Twilio / Telegram
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close Audit Console"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Metrics Bar */}
        <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-slate-900/30 border-b border-slate-800/60 text-center">
          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Total Events</span>
            <span className="text-sm font-black text-slate-200 font-mono">{stats.total}</span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-[10px] font-semibold text-cyan-400 block uppercase tracking-wider">Audit Trail</span>
            <span className="text-sm font-black text-cyan-300 font-mono">{stats.audit}</span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-[10px] font-semibold text-emerald-400 block uppercase tracking-wider">Comms Sent</span>
            <span className="text-sm font-black text-emerald-300 font-mono">{stats.comms}</span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-[10px] font-semibold text-amber-400 block uppercase tracking-wider">Exceptions</span>
            <span className="text-sm font-black text-amber-300 font-mono">{stats.exceptions}</span>
          </div>
        </div>

        {/* Action & Filter Controls */}
        <div className="p-3 border-b border-slate-800/60 bg-slate-950 flex flex-col gap-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Correlation ID (HOSP-..., MED-...), action, or keyword..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStreamFilter('ALL')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  streamFilter === 'ALL'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                All Streams
              </button>
              <button
                type="button"
                onClick={() => setStreamFilter('audit_log')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  streamFilter === 'audit_log'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Audit Log
              </button>
              <button
                type="button"
                onClick={() => setStreamFilter('communication_log')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  streamFilter === 'communication_log'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Comms Log
              </button>
              <button
                type="button"
                onClick={() => setStreamFilter('exception_log')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  streamFilter === 'exception_log'
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Exceptions
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={injectSampleEvent}
                className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center gap-1 cursor-pointer"
                title="Inject synthetic telemetry log for judge demonstration"
              >
                <Zap className="w-3 h-3 text-cyan-400" />
                Demo Event
              </button>
              <button
                type="button"
                onClick={exportLogsAsJson}
                className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer"
                title="Export all records as JSON"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Live Logs Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <Terminal className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              No telemetry events match the current filter criteria.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const isCopied = copiedId === log.id;

              let tagColor = 'bg-cyan-950 text-cyan-400 border-cyan-800';
              if (log.tag === 'AI_INTENT') tagColor = 'bg-purple-950 text-purple-300 border-purple-800';
              if (log.tag === 'ATOMIC_SLOT') tagColor = 'bg-blue-950 text-blue-300 border-blue-800';
              if (log.tag === 'QUEUE_TRIGGER') tagColor = 'bg-emerald-950 text-emerald-300 border-emerald-800';
              if (log.tag === 'EMERGENCY_BROADCAST') tagColor = 'bg-amber-950 text-amber-300 border-amber-800';
              if (log.tag === 'RACE_GUARD') tagColor = 'bg-rose-950 text-rose-300 border-rose-800';
              if (log.tag === 'RX_SIGNATURE') tagColor = 'bg-teal-950 text-teal-300 border-teal-800';

              return (
                <div
                  key={log.id}
                  className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 rounded-xl p-3 transition-all duration-150"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${tagColor}`}>
                        [{log.tag || log.action}]
                      </span>
                      
                      {log.correlation_id && (
                        <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                          Ref: <strong className="text-slate-200">{log.correlation_id}</strong>
                          <button
                            onClick={() => copyToClipboard(log.correlation_id!, log.id)}
                            className="text-slate-500 hover:text-slate-300 cursor-pointer ml-1"
                            title="Copy Correlation ID"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-medium mb-1">
                    {log.summary}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/50 mt-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        Actor: {log.actor_type}
                      </span>
                      {log.workflow && (
                        <span className="text-slate-500 font-mono">
                          {log.workflow}
                        </span>
                      )}
                    </div>

                    {log.metadata && (
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-cyan-400 hover:text-cyan-300 cursor-pointer font-semibold"
                      >
                        {isExpanded ? 'Hide Payload ▲' : 'View Payload ▼'}
                      </button>
                    )}
                  </div>

                  {isExpanded && log.metadata && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] text-emerald-300 overflow-x-auto">
                      <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
