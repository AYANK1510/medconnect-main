import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  Zap,
  Play,
  CheckCircle2,
  Server,
  Activity,
} from 'lucide-react';
import {
  executeAiReceptionistWorkflow,
  executeEmergencyDispatchWorkflow,
  testN8nConnectivity,
  N8N_WEBHOOK_SECRET,
} from '../services/n8nService';

export const AutomationPage: React.FC = () => {
  const { workflows } = useApp();

  const [activeWfId, setActiveWfId] = useState<string>('wf-1');
  const [runningNodeIdx, setRunningNodeIdx] = useState<number | null>(null);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<any>(null);
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
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/30 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 uppercase">
              BEST USE OF n8n — HEALTHCARE
            </span>
            <span className="text-xs text-slate-400">Version 2.4</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">n8n Automation Engine Visualizer</h1>
          <p className="text-xs text-slate-400">
            Inspect real-time event flowcharts, node execution states, and automated trigger loops.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleTestConnectivity}
            disabled={isTesting}
            className="px-4 py-3 rounded-2xl bg-slate-900 border border-cyan-500/40 text-cyan-300 font-extrabold text-xs shadow-lg hover:bg-slate-800 transition flex items-center space-x-2 disabled:opacity-50"
          >
            <Server className="w-4 h-4 text-cyan-400" />
            <span>{isTesting ? 'Testing Webhook...' : 'Test n8n Webhook (Phase 3)'}</span>
          </button>

          <button
            onClick={handleSimulateExecution}
            disabled={runningNodeIdx !== null}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold text-xs shadow-xl shadow-cyan-500/25 hover:brightness-110 transition flex items-center space-x-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4 text-slate-950 fill-current" />
            <span>Simulate n8n Workflow Execution</span>
          </button>
        </div>
      </div>

      {/* Phase 3 Connectivity Test Result Banner */}
      {testResult && (
        <div className={`p-5 rounded-2xl border flex items-center justify-between font-mono text-xs shadow-lg ${
          testResult.success
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
        }`}>
          <div className="flex items-center space-x-3">
            <Activity className={`w-5 h-5 ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`} />
            <div>
              <div className="font-bold text-sm">
                Phase 3 Connectivity Result: {testResult.success ? 'PASSED 200 OK' : 'FAILED'}
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                Target: POST http://localhost:5678/webhook/medconnect-test | Response: {JSON.stringify(testResult)}
              </div>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full font-bold uppercase text-[10px] ${
            testResult.success ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}>
            {testResult.success ? 'Application ↔ Backend ↔ n8n Connected' : 'Connection Error'}
          </span>
        </div>
      )}

      {/* Workflow Tabs Selector */}
      <div className="flex space-x-3">
        {workflows.map((wf) => (
          <button
            key={wf.id}
            onClick={() => {
              setActiveWfId(wf.id);
              setRunningNodeIdx(null);
              setExecutionLogs([]);
            }}
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center space-x-2 border ${
              activeWfId === wf.id
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Zap className={`w-4 h-4 ${activeWfId === wf.id ? 'text-cyan-400' : 'text-slate-500'}`} />
            <span>{wf.title}</span>
          </button>
        ))}
      </div>

      {/* Workflow Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl glass-panel bg-slate-900/80 border border-slate-800">
          <div className="text-slate-400">Total Executions</div>
          <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">{selectedWf.totalExecutions}</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel bg-slate-900/80 border border-slate-800">
          <div className="text-slate-400">Success Rate</div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">{selectedWf.successRate}%</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel bg-slate-900/80 border border-slate-800">
          <div className="text-slate-400">Avg Execution Latency</div>
          <div className="text-2xl font-black text-purple-400 mt-1 font-mono">&lt; 140ms</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel bg-slate-900/80 border border-slate-800">
          <div className="text-slate-400">Last Triggered</div>
          <div className="text-sm font-bold text-white mt-2">{selectedWf.lastTriggered}</div>
        </div>
      </div>

      {/* Flowchart Node Graph */}
      <div className="p-6 md:p-8 rounded-3xl glass-panel bg-slate-950 border border-slate-800 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-white">{selectedWf.title}</h3>
            <p className="text-xs text-slate-400">{selectedWf.description}</p>
          </div>
          <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full font-mono text-xs font-semibold border border-cyan-500/20">
            {selectedWf.nodes.length} Connected Nodes
          </span>
        </div>

        {/* Node Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 relative">
          {selectedWf.nodes.map((node, idx) => {
            const isActive = runningNodeIdx === idx;
            const isCompleted = runningNodeIdx !== null && runningNodeIdx > idx;

            return (
              <div
                key={node.id}
                className={`p-4 rounded-2xl border transition relative flex flex-col justify-between space-y-3 ${
                  isActive
                    ? 'bg-cyan-950/60 border-cyan-400 shadow-2xl shadow-cyan-500/40 scale-105 z-10'
                    : isCompleted
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      node.type === 'trigger'
                        ? 'bg-blue-500/20 text-blue-300'
                        : node.type === 'ai'
                        ? 'bg-purple-500/20 text-purple-300'
                        : node.type === 'database'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : node.type === 'communication'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {node.type}
                  </span>

                  {isActive && <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>}
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-xs text-white">{node.name}</div>
                  <div className="text-[10px] font-mono text-cyan-400">{node.service}</div>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight">{node.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Execution Terminal Log */}
      {executionLogs.length > 0 && (
        <div className="p-5 rounded-3xl glass-panel bg-slate-950 border border-cyan-500/30 space-y-2 font-mono text-xs shadow-2xl">
          <div className="flex justify-between items-center text-slate-400 text-[11px] pb-2 border-b border-slate-800">
            <span className="text-cyan-400 font-bold">n8n Live Execution Stream</span>
            <span>Status: Running Workflow</span>
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
