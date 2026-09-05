import React, { useState, useEffect } from 'react';
import {
  Play,
  X,
  Bot,
  Zap,
  CheckCircle2,
  ShieldAlert,
  MapPin,
  Send,
  Lock,
  QrCode,
  ArrowRight,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Scene {
  id: number;
  title: string;
  subtitle: string;
  category: 'opd' | 'emergency';
  detail: string;
  icon: any;
  color: string;
}

export const FullJourneyDemoModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [currentSceneIdx, setCurrentSceneIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const scenes: Scene[] = [
    {
      id: 1,
      title: 'SCENE 1: Patient Opens AI Receptionist',
      subtitle: 'Multilingual Voice Assistance Online',
      category: 'opd',
      detail: 'Patient accesses MedConnect AI voice widget on web or WhatsApp.',
      icon: Bot,
      color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
    },
    {
      id: 2,
      title: 'SCENE 2: Indic Speech Input Received',
      subtitle: 'Multichannel Voice Stream Intake',
      category: 'opd',
      detail: '"नमस्ते, मुझे डॉक्टर राजेश शर्मा से कार्डियोलॉजी में आज सुबह 11 बजे अपॉइंटमेंट चाहिए।"',
      icon: Bot,
      color: 'text-blue-400 border-blue-500/40 bg-blue-950/40',
    },
    {
      id: 3,
      title: 'SCENE 3: Sarvam STT & OpenAI Intent Parsing',
      subtitle: 'saaras:v1 STT + gpt-4o-mini Slot Filling',
      category: 'opd',
      detail: 'Extracted: { Patient: Aarav Malhotra, Doctor: Dr. Rajesh Sharma, Dept: Cardiology, Time: 11:00 AM }',
      icon: Zap,
      color: 'text-purple-400 border-purple-500/40 bg-purple-950/40',
    },
    {
      id: 4,
      title: 'SCENE 4: Supabase Slot Reservation',
      subtitle: 'Double-Booking Prevention Verified',
      category: 'opd',
      detail: 'Appointment written to Supabase PostgreSQL schema with checked-in status.',
      icon: CheckCircle2,
      color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
    },
    {
      id: 5,
      title: 'SCENE 5: Token #MED-4029 Issued',
      subtitle: 'WhatsApp Booking Confirmation Dispatched',
      category: 'opd',
      detail: 'Patient receives SMS & WhatsApp tracking link for Token #MED-4029.',
      icon: CheckCircle2,
      color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
    },
    {
      id: 6,
      title: 'SCENE 6: Live OPD Queue Position Updates',
      subtitle: 'n8n Recalculation Engine Active',
      category: 'opd',
      detail: 'Previous token completes. n8n recalculates Aarav from 5th → 4th in line.',
      icon: Zap,
      color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
    },
    {
      id: 7,
      title: 'SCENE 7: Emergency SOS Triggered by ER Doctor',
      subtitle: 'Critical Shortage: O Negative Blood',
      category: 'emergency',
      detail: 'City Hospital ER staff broadcasts urgent request for 4 Units of O- Blood.',
      icon: ShieldAlert,
      color: 'text-rose-400 border-rose-500/50 bg-rose-950/50',
    },
    {
      id: 8,
      title: 'SCENE 8: Haversine 15 KM Radius Filter',
      subtitle: 'GPS Distance Calculations Executed',
      category: 'emergency',
      detail: 'Identified 4 eligible regional hospitals inside 15.0 km geo-fence (Apollo, Metro, Max, Fortis).',
      icon: MapPin,
      color: 'text-teal-400 border-teal-500/40 bg-teal-950/40',
    },
    {
      id: 9,
      title: 'SCENE 9: Telegram Emergency Alerts Dispatched',
      subtitle: 'Inline Action Cards Dispatched',
      category: 'emergency',
      detail: 'Telegram channels receive SOS cards with [ ACCEPT & SUPPLY ] buttons. 3-min timer starts.',
      icon: Send,
      color: 'text-sky-400 border-sky-500/40 bg-sky-950/40',
    },
    {
      id: 10,
      title: 'SCENE 10: Metro Hospital Accepts Request',
      subtitle: 'One-Click Acceptance at 6.8 KM Away',
      category: 'emergency',
      detail: 'Metro Hospital ER staff clicks ACCEPT & SUPPLY in Telegram dashboard.',
      icon: CheckCircle2,
      color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
    },
    {
      id: 11,
      title: 'SCENE 11: Automated Inventory Locking',
      subtitle: 'Double-Allocation Guard Applied',
      category: 'emergency',
      detail: 'O- Blood stock at Metro Hospital updated: 6 → 2 Available (4 Reserved for REQ #REQ-1042).',
      icon: Lock,
      color: 'text-amber-400 border-amber-500/40 bg-amber-950/40',
    },
    {
      id: 12,
      title: 'SCENE 12: QR Dispatch Pass Issued',
      subtitle: 'Verified Transit Security Code',
      category: 'emergency',
      detail: 'Pass #MEDPULSE-PASS-1042 generated with QR code for ambulance transit authorization.',
      icon: QrCode,
      color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
    },
    {
      id: 13,
      title: 'SCENE 13: CONNECTED CARE. AUTOMATED.',
      subtitle: 'Golden Hour Protected in <30 Seconds',
      category: 'emergency',
      detail: 'OPD inquiry automated & Emergency supply secured seamlessly without phone delays.',
      icon: Sparkles,
      color: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/50',
    },
  ];

  useEffect(() => {
    let timer: any;
    if (isOpen && isPlaying && currentSceneIdx < scenes.length - 1) {
      timer = setTimeout(() => {
        setCurrentSceneIdx((prev) => prev + 1);
      }, 3500);
    } else if (currentSceneIdx === scenes.length - 1 && isPlaying) {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    }
    return () => clearTimeout(timer);
  }, [isOpen, isPlaying, currentSceneIdx, scenes.length]);

  if (!isOpen) return null;

  const scene = scenes[currentSceneIdx];
  const Icon = scene.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-3xl glass-panel bg-slate-900/95 border border-cyan-500/40 rounded-3xl p-6 md:p-8 shadow-2xl shadow-cyan-500/30 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-extrabold text-xs border border-cyan-500/40 flex items-center space-x-1">
              <Play className="w-3.5 h-3.5 fill-current text-cyan-400 mr-1" />
              <span>Full Interactive Product Journey Demo (~90s)</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center justify-between gap-1 mb-6">
          {scenes.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => setCurrentSceneIdx(idx)}
              className={`h-2 flex-1 rounded-full cursor-pointer transition-all ${
                idx === currentSceneIdx
                  ? 'bg-cyan-400 scale-y-125'
                  : idx < currentSceneIdx
                  ? 'bg-emerald-400'
                  : 'bg-slate-800'
              }`}
            ></div>
          ))}
        </div>

        {/* Scene Content Card */}
        <div className={`p-8 rounded-3xl border transition space-y-5 ${scene.color}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <Icon className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                  {scene.category.toUpperCase()} WORKFLOW
                </span>
                <h3 className="text-xl font-extrabold text-white">{scene.title}</h3>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-slate-950/80 text-cyan-400 font-mono text-xs font-bold border border-cyan-500/30">
              {currentSceneIdx + 1} / {scenes.length}
            </span>
          </div>

          <p className="text-sm font-semibold text-cyan-200">{scene.subtitle}</p>
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-200 font-mono leading-relaxed">
            {scene.detail}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between pt-6 mt-4 border-t border-slate-800">
          <button
            onClick={() => {
              setCurrentSceneIdx(0);
              setIsPlaying(true);
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition flex items-center space-x-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Demo</span>
          </button>

          <div className="flex space-x-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-cyan-300 text-xs font-bold hover:bg-slate-700 transition"
            >
              {isPlaying ? 'Pause Demo' : 'Resume Demo'}
            </button>

            <button
              onClick={() => {
                if (currentSceneIdx < scenes.length - 1) {
                  setCurrentSceneIdx(currentSceneIdx + 1);
                } else {
                  onClose();
                }
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs hover:brightness-110 transition flex items-center space-x-1.5"
            >
              <span>{currentSceneIdx === scenes.length - 1 ? 'Finish & Explore' : 'Next Scene'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
