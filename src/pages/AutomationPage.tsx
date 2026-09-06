import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  Zap,
  Play,
  CheckCircle2,
  Server,
  Activity,
  Loader2,
} from 'lucide-react';
import {
  executeAiReceptionistWorkflow,
  executeEmergencyDispatchWorkflow,
  testN8nConnectivity,
  N8N_WEBHOOK_SECRET,
} from '../services/n8nService';
import { Badge } from '../components/ui/Badge';

export const AutomationPage: React.FC = () => {
  const { workflows } = useApp();

  const [activeWfId, setActiveWfId] = useState<string>('wf-1');
  const [runningNodeIdx, setRunningNodeIdx] = useState<number | null>(null);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<{ success: boolean; data?: unknown; error?: string } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const handleTestConnectivity = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testN8nConnectivity();
    setTestResult(res);
    setIsTesting(false);
  };

  const selectedWf = workflows.find((w) => w.id === activeWfId) || workflows[0];

  const handleSimulateExecution = async () => {
    setExecutionLogs([]);
    setRunningNodeIdx(0);

    const headers = { 'x-webhook-secret': N8N_WEBHOOK_SECRET };

    if (activeWfId === 'wf-1' || activeWfId.includes('receptionist')) {
      const res = await executeAiReceptionistWorkflow(
        {
          channel: 'text',
          text: 'Book Cardiology appointment with Dr. Rajesh Sharma for today at 11:30 AM',
          hospitalId: 'hosp-101',
          idempotencyKey: `sim-${Date.now()}`,
        },
        headers
      );

      for (let i = 0; i < res.executionLogs.length; i++) {
        setRunningNodeIdx(i);
        const log = res.executionLogs[i];
        setExecutionLogs((prev) => [
          ...prev,
          `[${log.nodeType.split('.').pop()?.toUpperCase()}] ${log.nodeName}: ${JSON.stringify(log.outputPayload)}`,
        ]);
        await new Promise((r) => setTimeout(r, 600));
      }
    } else {
      const res = await executeEmergencyDispatchWorkflow(
        {
          requesting_hospital_id: 'hosp-101',
          resource_type: 'ICU Bed',
          quantity: 2,
          urgency: 'CRITICAL',
          simulatedAcceptedBeforeTimeout: true,
          idempotencyKey: `sim-em-${Date.now()}`,
        },
        headers
      );

      for (let i = 0; i < res.executionLogs.length; i++) {
        setRunningNodeIdx(i);
        const log = res.executionLogs[i];
        setExecutionLogs((prev) => [
          ...prev,
          `[${log.nodeType.split('.').pop()?.toUpperCase()}] ${log.nodeName}: ${JSON.stringify(log.outputPayload)}`,
        ]);
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    setRunningNodeIdx(null);
  };

  return (
    <div className="space-y-6 sm:space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider block">
              ENTERPRISE ORCHESTRATION ENGINE
            </span>
            <Badge variant="blue" size="sm">
              n8n 2.4 READY
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            n8n Automation Engine Visualizer
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            Inspect real-time event flowcharts, node execution states, and automated trigger loops.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={handleTestConnectivity}
            disabled={isTesting}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs shadow-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Testing Webhook...</span>
              </>
            ) : (
              <>
                <Server className="w-4 h-4 text-blue-600" />
                <span>Test Webhook Connectivity</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSimulateExecution}
            disabled={runningNodeIdx !== null}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Simulate n8n Workflow Execution</span>
          </button>
        </div>
      </div>

      {/* Connectivity Test Result Banner */}
      {testResult && (
        <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-card ${
          testResult.success
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center space-x-3">
            <Activity className={`w-5 h-5 shrink-0 ${testResult.success ? 'text-emerald-600' : 'text-rose-600'}`} />
            <div>
              <div className="font-bold text-sm">
                Connectivity Test: {testResult.success ? 'PASSED 200 OK' : 'FAILED'}
              </div>
              <div className="text-[11px] opacity-80 mt-0.5 font-mono">
                Target: POST http://localhost:5678/webhook/medconnect-test
              </div>
            </div>
          </div>
          <Badge variant={testResult.success ? 'green' : 'emergency'} size="sm" dot>
            {testResult.success ? 'Application ↔ n8n Connected' : 'Connection Error'}
          </Badge>
        </div>
      )}

      {/* Workflow Tabs Selector */}
      <div className="flex space-x-2 overflow-x-auto pb-1">
        {workflows.map((wf) => (
          <button
            key={wf.id}
            type="button"
            onClick={() => {
              setActiveWfId(wf.id);
              setRunningNodeIdx(null);
              setExecutionLogs([]);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeWfId === wf.id
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${activeWfId === wf.id ? 'text-white' : 'text-slate-400'}`} />
            <span>{wf.title}</span>
          </button>
        ))}
      </div>

      {/* Workflow Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="text-slate-500 font-medium">Total Executions</div>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600 mt-1 font-mono tabular-nums">{selectedWf.totalExecutions}</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="text-slate-500 font-medium">Success Rate</div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1 font-mono tabular-nums">{selectedWf.successRate}%</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="text-slate-500 font-medium">Avg Execution Latency</div>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-600 mt-1 font-mono tabular-nums">&lt; 140ms</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="text-slate-500 font-medium">Last Triggered</div>
          <div className="text-xs sm:text-sm font-bold text-slate-800 mt-2 truncate">{selectedWf.lastTriggered}</div>
        </div>
      </div>

      {/* Flowchart Node Graph */}
      <div className="p-5 sm:p-7 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900">{selectedWf.title}</h3>
            <p className="text-xs text-slate-500">{selectedWf.description}</p>
          </div>
          <Badge variant="blue" size="sm">
            {selectedWf.nodes.length} Connected Nodes
          </Badge>
        </div>

        {/* Node Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 relative">
          {selectedWf.nodes.map((node, idx) => {
            const isActive = runningNodeIdx === idx;
            const isCompleted = runningNodeIdx !== null && runningNodeIdx > idx;

            return (
              <div
                key={node.id}
                className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between space-y-3 ${
                  isActive
                    ? 'bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-500/20 scale-105 z-10'
                    : isCompleted
                    ? 'bg-emerald-50/60 border-emerald-300 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      node.type === 'trigger'
                        ? 'bg-blue-100 text-blue-700'
                        : node.type === 'ai'
                        ? 'bg-purple-100 text-purple-700'
                        : node.type === 'database'
                        ? 'bg-emerald-100 text-emerald-700'
                        : node.type === 'communication'
                        ? 'bg-cyan-100 text-cyan-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {node.type}
                  </span>

                  {isActive && <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping"></span>}
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-xs text-slate-900">{node.name}</div>
                  <div className="text-[10px] font-mono text-blue-600">{node.service}</div>
                </div>

                <p className="text-[10px] text-slate-500 leading-tight">{node.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Execution Stream */}
      {executionLogs.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 font-mono text-xs shadow-dropdown text-slate-200">
          <div className="flex justify-between items-center text-slate-400 text-[11px] pb-2 border-b border-slate-800">
            <span className="text-blue-400 font-bold">n8n Live Execution Stream</span>
            <span className="text-emerald-400 font-semibold">Status: Running Workflow</span>
          </div>

          <div className="space-y-1 text-slate-300 max-h-48 overflow-y-auto pt-1">
            {executionLogs.map((log, i) => (
              <div key={i} className="text-emerald-400">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationPage;
