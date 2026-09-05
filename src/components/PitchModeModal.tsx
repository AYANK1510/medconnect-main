import React from 'react';
import { useApp } from '../contexts/AppContext';
import {
  Presentation,
  X,
  Zap,
  ShieldAlert,
  CheckCircle2,
  Play,
} from 'lucide-react';

export const PitchModeModal: React.FC = () => {
  const { pitchMode, setPitchMode, runDemoScenario } = useApp();

  if (!pitchMode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-panel bg-slate-900/95 border border-cyan-500/40 rounded-3xl p-6 md:p-8 shadow-2xl shadow-cyan-500/20">
        
        {/* Close Button */}
        <button
          onClick={() => setPitchMode(false)}
          className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Pitch Banner */}
        <div className="flex items-center space-x-3 mb-4">
          <span className="px-3 py-1 text-xs font-extrabold bg-amber-500 text-slate-950 rounded-full uppercase tracking-wider flex items-center space-x-1">
            <Presentation className="w-3.5 h-3.5 inline mr-1" />
            Hackathon Pitch Mode Active
          </span>
          <span className="text-xs text-slate-400 font-mono">Team 4 Bit Minds • JIMS VK</span>
        </div>

        {/* Main Headline */}
        <div className="space-y-2 mb-6">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-200 to-blue-500">
            MEDCONNECT PULSE
          </h2>
          <p className="text-lg font-medium text-cyan-300">
            "Connecting Care When Seconds Count"
          </p>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            An n8n-powered event-driven healthcare safety network connecting regional hospitals, front desks, and emergency supply lines in real-time. Built around lessons from the 2021 oxygen crisis.
          </p>
        </div>

        {/* 4 Core Impact Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-center">
            <div className="text-3xl font-extrabold text-cyan-400">&lt;30s</div>
            <div className="text-xs text-slate-300 font-medium mt-1">Emergency Match & Response Latency</div>
          </div>
          <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-center">
            <div className="text-3xl font-extrabold text-blue-400">80%</div>
            <div className="text-xs text-slate-300 font-medium mt-1">Routine OPD Inquiries Automated</div>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center">
            <div className="text-3xl font-extrabold text-emerald-400">15 KM</div>
            <div className="text-xs text-slate-300 font-medium mt-1">Regional Safety-Net Radius</div>
          </div>
          <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-center">
            <div className="text-3xl font-extrabold text-purple-400">10K+</div>
            <div className="text-xs text-slate-300 font-medium mt-1">Daily Workflow Runs per Node</div>
          </div>
        </div>

        {/* Two Pillars Summary */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Pillar 1 */}
          <div className="p-5 rounded-2xl glass-panel bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>PILLAR 1: AI RECEPTIONIST & QUEUE ENGINE</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Indic Voice STT via Sarvam AI saaras:v1 (Hindi, Hinglish, English)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>OpenAI gpt-4o-mini intent parsing & slot extraction</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Live token generation (#MED-4029) & WhatsApp queue notifications</span>
              </li>
            </ul>
          </div>

          {/* Pillar 2 */}
          <div className="p-5 rounded-2xl glass-panel bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>PILLAR 2: 15 KM EMERGENCY SUPPLY DISPATCH</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Haversine GPS distance formula & 15 km geo-fence filter</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Telegram inline alerts + One-click Accept & Inventory Lock</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>3-Minute timer fallback & automated Twilio voice escalation</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Quick Pitch Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/20">
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-white">Judge Demo Triggers:</span> Experience the 2 connected workflows in action.
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setPitchMode(false);
                runDemoScenario(4); // Emergency Blood
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-xs shadow-lg hover:brightness-110 transition flex items-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Trigger 15km Emergency SOS</span>
            </button>

            <button
              onClick={() => {
                setPitchMode(false);
                runDemoScenario(2); // AI Voice
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 transition flex items-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Test Multilingual Voice AI</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
