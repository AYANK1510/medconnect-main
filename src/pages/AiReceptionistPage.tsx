import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { processReceptionistTurn, getWelcomeMessage } from '../services/receptionistService';
import type { ReceptionistResponse, ConversationContext } from '../services/receptionistService';
import { checkN8nHealth } from '../services/n8nRealIntegration';
import { dbEngine } from '../lib/dbEngine';
import {
  Mic, MicOff, Send, Bot, Globe, Zap, Volume2, VolumeX,
  CheckCircle2, AlertCircle, Clock, User, Stethoscope,
  RotateCcw, Download, ListOrdered, Phone, MapPin,
  CalendarCheck, Activity, ChevronRight, Info, Loader2,
  Siren, BriefcaseMedical,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  status?: string;
  intent?: string;
  confidence?: number;
  validatedSlots?: Record<string, any>;
  actionPayload?: any;
  pipelineSteps?: PipelineStep[];
  isVoice?: boolean;
}

interface PipelineStep {
  label: string;
  status: 'pending' | 'running' | 'done' | 'skipped';
  detail?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'Hinglish', label: 'Hinglish', flag: '🇮🇳' },
  { code: 'Hindi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'English', label: 'English', flag: '🇬🇧' },
  { code: 'Tamil', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'Telugu', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'Bengali', label: 'বাংলা', flag: '🇮🇳' },
  { code: 'Marathi', label: 'मराठी', flag: '🇮🇳' },
];

const INTENT_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  BOOK_APPOINTMENT:        { color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/40', icon: <CalendarCheck className="w-3.5 h-3.5" />, label: 'Book Appointment' },
  CHECK_APPOINTMENT:       { color: 'text-blue-400',    bg: 'bg-blue-500/15 border-blue-500/40',    icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Check Appointment' },
  CANCEL_APPOINTMENT:      { color: 'text-rose-400',    bg: 'bg-rose-500/15 border-rose-500/40',    icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Cancel Appointment' },
  CHECK_QUEUE:             { color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/40',  icon: <ListOrdered className="w-3.5 h-3.5" />, label: 'Queue Status' },
  CHECK_DOCTOR_AVAILABILITY:{ color: 'text-purple-400',bg: 'bg-purple-500/15 border-purple-500/40', icon: <Stethoscope className="w-3.5 h-3.5" />, label: 'Doctor Availability' },
  CHECK_DUES:              { color: 'text-yellow-400',  bg: 'bg-yellow-500/15 border-yellow-500/40', icon: <BriefcaseMedical className="w-3.5 h-3.5" />, label: 'Check Dues' },
  GENERAL_HOSPITAL_QUERY:  { color: 'text-cyan-400',   bg: 'bg-cyan-500/15 border-cyan-500/40',    icon: <MapPin className="w-3.5 h-3.5" />, label: 'Hospital Info' },
  EMERGENCY_RESOURCE_REQUEST: { color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/40',      icon: <Siren className="w-3.5 h-3.5" />, label: 'EMERGENCY' },
  UNKNOWN:                 { color: 'text-slate-400',   bg: 'bg-slate-500/15 border-slate-500/40',  icon: <Info className="w-3.5 h-3.5" />, label: 'General Query' },
};

const QUICK_PROMPTS = [
  { emoji: '🩺', label: 'Dr. Rajesh Sharma', dept: 'Cardiology', text: 'Mujhe Dr. Rajesh Sharma se Cardiology me appointment chahiye aaj 11 AM.' },
  { emoji: '🦴', label: 'Dr. Priya Ananth', dept: 'Orthopedics', text: 'Mujhe Dr. Priya Ananth se Orthopedics me consultation appointment chahiye aaj.' },
  { emoji: '💊', label: 'Dr. Amit Patel', dept: 'General Medicine', text: 'Mujhe Dr. Amit Patel se General Medicine me checkup ke liye book karna hai.' },
  { emoji: '🧠', label: 'Dr. Vikram Malhotra', dept: 'Neurology', text: 'Mujhe Dr. Vikram Malhotra se Neurology department me appointment chahiye.' },
  { emoji: '✨', label: 'Dr. Sunita Rao', dept: 'Dermatology', text: 'Mujhe Dr. Sunita Rao se Dermatology me appointment chahiye skin checkup ke liye.' },
  { emoji: '👶', label: 'Dr. Ananya Roy', dept: 'Pediatrics', text: 'Mujhe Dr. Ananya Roy se Pediatrics me child checkup ke liye appointment chahiye.' },
  { emoji: '🔎', label: 'Queue Status', dept: 'OPD Queue', text: 'Mera queue status kya hai? Token MED-101.' },
  { emoji: '❌', label: 'Cancel', dept: 'Appointments', text: 'Mera appointment cancel kar do.' },
  { emoji: '👨‍⚕️', label: 'Doctors Today', dept: 'All OPD', text: 'Hospital me aaj kaun kaun se doctors available hain?' },
  { emoji: '💰', label: 'Dues', dept: 'Billing', text: 'Mera consultation fee kitna due hai?' },
  { emoji: '🏥', label: 'Hospital Info', dept: 'Hospital OPD', text: 'Hospital ka address aur OPD timing batao.' },
  { emoji: '🚨', label: 'Emergency', dept: 'Critical Care', text: 'Emergency! 2 ICU beds with ventilator chahiye turant.' },
  { emoji: '📋', label: 'My Appointment', dept: 'Records', text: 'Mera active appointment dikhao.' },
];

// ─── Text-to-Speech helper ────────────────────────────────────────────────────

function speakText(text: string, lang: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  // Pick language code
  const langMap: Record<string, string> = {
    Hindi: 'hi-IN', Hinglish: 'hi-IN', English: 'en-IN',
    Tamil: 'ta-IN', Telugu: 'te-IN', Bengali: 'bn-IN', Marathi: 'mr-IN',
  };
  utt.lang = langMap[lang] || 'hi-IN';
  utt.rate = 0.95;
  utt.pitch = 1.05;
  utt.volume = 1;
  window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

// ─── Pipeline Steps builder ───────────────────────────────────────────────────

function buildPipelineSteps(isVoice: boolean): PipelineStep[] {
  return [
    { label: isVoice ? 'Sarvam STT' : 'Text Input', status: 'pending', detail: isVoice ? 'Audio → Transcript' : 'Direct text' },
    { label: 'OpenAI NLP', status: 'pending', detail: 'Intent + slot extraction' },
    { label: 'DB Validation', status: 'pending', detail: 'Strict backend check' },
    { label: 'Action Executor', status: 'pending', detail: 'DB write / query' },
    { label: 'Response', status: 'pending', detail: 'Multilingual reply' },
  ];
}

async function animatePipeline(
  steps: PipelineStep[],
  onUpdate: (steps: PipelineStep[]) => void
): Promise<void> {
  for (let i = 0; i < steps.length; i++) {
    const updated = steps.map((s, idx) =>
      idx === i ? { ...s, status: 'running' as const } : s
    );
    onUpdate(updated);
    await new Promise(r => setTimeout(r, 380));
    const done = updated.map((s, idx) =>
      idx === i ? { ...s, status: 'done' as const } : s
    );
    onUpdate(done);
  }
}

// ─── Waveform Bars ────────────────────────────────────────────────────────────

const WaveformBars: React.FC<{ active: boolean }> = ({ active }) => (
  <div className="flex items-end gap-0.5 h-8">
    {[...Array(12)].map((_, i) => (
      <div
        key={i}
        className={`w-1 rounded-full transition-all ${active ? 'bg-red-400' : 'bg-slate-600'}`}
        style={{
          height: active ? `${20 + Math.sin(Date.now() / 200 + i) * 14}px` : '4px',
          animation: active ? `wave ${0.6 + i * 0.07}s ease-in-out infinite alternate` : 'none',
        }}
      />
    ))}
  </div>
);

// ─── Countdown Ring ───────────────────────────────────────────────────────────

const CountdownRing: React.FC<{ seconds: number; total: number }> = ({ seconds, total }) => {
  const pct = (seconds / total) * 100;
  const r = 26;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="64" height="64" className="-rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
      <circle
        cx="32" cy="32" r={r} fill="none"
        stroke={seconds <= 1 ? '#f87171' : '#22d3ee'}
        strokeWidth="4"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  );
};

// ─── Slot Card ────────────────────────────────────────────────────────────────

const SlotCard: React.FC<{ slots: Record<string, any> }> = ({ slots }) => {
  const entries = Object.entries(slots).filter(([, v]) => v !== undefined && v !== null);
  if (!entries.length) return null;
  return (
    <div className="mt-2 p-3 rounded-xl bg-slate-900/80 border border-cyan-500/20 text-[11px] space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex justify-between">
          <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>
          <span className="text-cyan-300 font-mono font-bold">{String(v)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Pipeline Visualizer ──────────────────────────────────────────────────────

const PipelineViz: React.FC<{ steps: PipelineStep[] }> = ({ steps }) => (
  <div className="flex items-center gap-1 flex-wrap mt-2">
    {steps.map((step, i) => (
      <React.Fragment key={step.label}>
        <div
          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all duration-300 ${
            step.status === 'done'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : step.status === 'running'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/30 scale-105'
              : 'bg-slate-800 text-slate-500 border border-slate-700'
          }`}
        >
          {step.status === 'running' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
          {step.status === 'done' && <CheckCircle2 className="w-2.5 h-2.5" />}
          {step.label}
        </div>
        {i < steps.length - 1 && (
          <ChevronRight className={`w-3 h-3 ${step.status === 'done' ? 'text-emerald-500' : 'text-slate-700'}`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export const AiReceptionistPage: React.FC = () => {
  const { setActivePage } = useApp();

  const [selectedLang, setSelectedLang] = useState('Hinglish');
  const [step, setStep] = useState<'idle' | 'recording' | 'processing' | 'speaking'>('idle');
  const [inputText, setInputText] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [conversationContext, setConversationContext] = useState<ConversationContext>({});
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'system',
      text: getWelcomeMessage('Hinglish'),
      timestamp: new Date(),
    },
  ]);
  const [activePipeline, setActivePipeline] = useState<PipelineStep[] | null>(null);
  const [sarvamStatus, setSarvamStatus] = useState(false);
  const [openaiStatus, setOpenaiStatus] = useState(false);
  const [n8nStatus, setN8nStatus] = useState(false);

  // Doctors and departments from real dbEngine
  const [doctorsList, setDoctorsList] = useState(() => dbEngine.getDoctors('hosp-101'));
  const [departmentsList, setDepartmentsList] = useState(() => dbEngine.getDepartments('hosp-101'));
  const [sidebarTab, setSidebarTab] = useState<'doctors' | 'intents'>('doctors');

  useEffect(() => {
    return dbEngine.subscribe(() => {
      setDoctorsList(dbEngine.getDoctors('hosp-101'));
      setDepartmentsList(dbEngine.getDepartments('hosp-101'));
    });
  }, []);

  useEffect(() => {
    checkN8nHealth().then(res => setN8nStatus(res.healthy)).catch(() => setN8nStatus(false));
  }, []);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatHistory, activePipeline]);

  // Update welcome message when language changes
  useEffect(() => {
    setChatHistory(prev => {
      if (prev[0]?.id === 'welcome') {
        return [{ ...prev[0], text: getWelcomeMessage(selectedLang) }, ...prev.slice(1)];
      }
      return prev;
    });
  }, [selectedLang]);

  // Cleanup TTS on unmount
  useEffect(() => () => stopSpeaking(), []);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const full: ChatMessage = { ...msg, id: `msg-${Date.now()}-${Math.random()}`, timestamp: new Date() };
    setChatHistory(prev => [...prev, full]);
    return full;
  }, []);

  const handleRunTurn = useCallback(async (textToProcess?: string, audioBlob?: Blob) => {
    const userText = textToProcess || inputText;
    if (!userText && !audioBlob) return;

    setStep('processing');
    setInputText('');

    // Add user message
    addMessage({
      sender: 'user',
      text: userText || '🎤 Voice message recorded',
      isVoice: !!audioBlob,
    });

    // Setup pipeline animation
    const pipelineSteps = buildPipelineSteps(!!audioBlob);
    setActivePipeline([...pipelineSteps]);

    // Animate pipeline while waiting
    const pipelinePromise = animatePipeline(pipelineSteps, setActivePipeline);

    // Actually call the backend
    let res: ReceptionistResponse;
    try {
      res = await processReceptionistTurn({
        channel: audioBlob ? 'mic' : 'text',
        text: userText,
        audioBlob,
        language: selectedLang,
        context: conversationContext,
        hospitalId: 'hosp-101',
      });
    } catch (err: any) {
      await pipelinePromise;
      setActivePipeline(null);
      addMessage({
        sender: 'assistant',
        text: `⚠️ System Error: ${err.message || 'Unknown error'}. Please try again.`,
        status: 'ERROR',
        intent: 'UNKNOWN',
      });
      setStep('idle');
      return;
    }

    await pipelinePromise;
    setActivePipeline(null);

    // Update config status
    setSarvamStatus(res.configurationStatus.sarvamConfigured);
    setOpenaiStatus(res.configurationStatus.openaiConfigured);
    setConversationContext(res.context || {});

    // Add assistant message
    addMessage({
      sender: 'assistant',
      text: res.aiMessage,
      status: res.status,
      intent: res.intent,
      confidence: res.configurationStatus.openaiConfigured ? 98 : 90,
      validatedSlots: res.validatedSlots,
      actionPayload: res.actionPayload,
      pipelineSteps: pipelineSteps.map(s => ({ ...s, status: 'done' })),
    });

    // Text-to-Speech
    if (ttsEnabled && res.aiMessage) {
      setStep('speaking');
      speakText(res.aiMessage, selectedLang);
      setTimeout(() => setStep('idle'), Math.min(res.aiMessage.length * 60, 8000));
    } else {
      setStep('idle');
    }
  }, [inputText, selectedLang, conversationContext, ttsEnabled, addMessage]);

  // Mic recording with countdown
  const handleMicClick = useCallback(async () => {
    if (step === 'recording') return;
    const RECORD_SECONDS = 5;

    try {
      setStep('recording');
      setCountdown(RECORD_SECONDS);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await handleRunTurn(undefined, audioBlob);
      };

      // Countdown timer
      let remaining = RECORD_SECONDS;
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(countdownRef.current!);
          if (mediaRecorder.state === 'recording') mediaRecorder.stop();
        }
      }, 1000);

      mediaRecorder.start();
    } catch {
      setStep('idle');
      setCountdown(0);
      // Mic not available — cycle demo text across different doctors
      const demoPhrases = [
        'Mujhe Dr. Rajesh Sharma se Cardiology me appointment chahiye aaj 11 baje.',
        'Mujhe Dr. Priya Ananth se Orthopedics me consultation appointment chahiye aaj.',
        'Mujhe Dr. Amit Patel se General Medicine me checkup ke liye book karna hai.',
        'Mujhe Dr. Vikram Malhotra se Neurology department me appointment chahiye.',
        'Mujhe Dr. Sunita Rao se Dermatology me appointment chahiye skin checkup ke liye.',
        'Mujhe Dr. Ananya Roy se Pediatrics me child checkup ke liye appointment chahiye.',
      ];
      const randomPhrase = demoPhrases[Math.floor(Math.random() * demoPhrases.length)];
      await handleRunTurn(randomPhrase);
    }
  }, [step, handleRunTurn]);

  const stopRecording = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setStep('idle');
    setCountdown(0);
  };

  const resetConversation = () => {
    stopSpeaking();
    setConversationContext({});
    setActivePipeline(null);
    setStep('idle');
    setChatHistory([{
      id: 'welcome',
      sender: 'system',
      text: getWelcomeMessage(selectedLang),
      timestamp: new Date(),
    }]);
  };

  const exportConversation = () => {
    const text = chatHistory
      .filter(m => m.sender !== 'system')
      .map(m => `[${m.timestamp.toLocaleTimeString()}] ${m.sender === 'user' ? 'YOU' : 'AI'}: ${m.text}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medconnect-conversation-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isProcessing = step === 'processing' || step === 'recording';

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 uppercase">Phase 13 · n8n + Sarvam AI</span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
              <span className={`h-1.5 w-1.5 rounded-full ${n8nStatus ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
              n8n: {n8nStatus ? 'Workflow Active' : 'Disconnected'}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
              <span className={`h-1.5 w-1.5 rounded-full ${openaiStatus ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              OpenAI: {openaiStatus ? 'Active' : 'Fallback NLP'}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
              <span className={`h-1.5 w-1.5 rounded-full ${sarvamStatus ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              Sarvam: {sarvamStatus ? 'Active' : 'Simulated STT'}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-cyan-400" />
            AI Voice Receptionist
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Voice → Sarvam STT → n8n AI Receptionist Workflow → Supabase DB → Multilingual Response → TTS
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* TTS Toggle */}
          <button
            onClick={() => { setTtsEnabled(p => !p); stopSpeaking(); }}
            title={ttsEnabled ? 'Mute AI voice' : 'Enable AI voice'}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${ttsEnabled ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{ttsEnabled ? 'TTS On' : 'TTS Off'}</span>
          </button>
          <button onClick={exportConversation} title="Export conversation" className="p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-400 hover:text-white transition">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={resetConversation} title="Reset conversation" className="p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-400 hover:text-white transition">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main Grid ──────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-12 gap-6">

        {/* Left: Controls ─────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">

          {/* Language Selector */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              Language / भाषा
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                    selectedLang === lang.code
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow shadow-cyan-500/10'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mic Input */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              Voice Input (Browser Mic)
            </div>

            {/* Waveform + Countdown */}
            <div className="flex items-center justify-center gap-6 py-2">
              <WaveformBars active={step === 'recording'} />
              {step === 'recording' && (
                <div className="relative flex items-center justify-center">
                  <CountdownRing seconds={countdown} total={5} />
                  <span className="absolute text-lg font-black text-white font-mono">{countdown}</span>
                </div>
              )}
            </div>

            <button
              onClick={step === 'recording' ? stopRecording : handleMicClick}
              disabled={step === 'processing' || step === 'speaking'}
              className={`w-full py-4 rounded-2xl font-extrabold text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${
                step === 'recording'
                  ? 'bg-red-500 text-white shadow-red-500/40 animate-pulse'
                  : step === 'speaking'
                  ? 'bg-cyan-800 text-cyan-200 opacity-70 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-cyan-500/25 hover:brightness-110 hover:scale-[1.02]'
              }`}
            >
              {step === 'recording' ? (
                <><MicOff className="w-5 h-5" /><span>Stop Recording</span></>
              ) : step === 'speaking' ? (
                <><Volume2 className="w-5 h-5 animate-pulse" /><span>AI Speaking...</span></>
              ) : (
                <><Mic className="w-5 h-5" /><span>🎤 Tap & Speak (5 sec)</span></>
              )}
            </button>

            <p className="text-[10px] text-slate-500 text-center">
              {step === 'recording'
                ? 'Recording… speak your request now'
                : step === 'speaking'
                ? 'AI is speaking — TTS active'
                : 'Allow mic access in browser when prompted'}
            </p>
          </div>

          {/* Doctor Selection & Quick Prompts Hub */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            {/* Header with Switcher */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 min-w-0">
                <Stethoscope className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">Book Appointment</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] shrink-0">
                <button
                  type="button"
                  onClick={() => setSidebarTab('doctors')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    sidebarTab === 'doctors'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3 h-3" />
                  Doctors ({doctorsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab('intents')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    sidebarTab === 'intents'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  Intents ({QUICK_PROMPTS.length})
                </button>
              </div>
            </div>

            {/* Doctors Tab Content */}
            {sidebarTab === 'doctors' ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                <div className="text-[10px] text-slate-400 flex items-center justify-between pb-1 border-b border-slate-800/60">
                  <span>Select any doctor to book OPD slot:</span>
                  <span className="text-[9px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    All Specialists Live
                  </span>
                </div>
                {doctorsList.map((doc) => {
                  const dept = departmentsList.find(d => d.id === doc.department_id)?.name || 'General';
                  const slots = dbEngine.calculateAvailableSlots(doc.id, new Date().toISOString().split('T')[0]);
                  return (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/40 transition group flex items-center gap-2.5"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-xs shrink-0">
                        {doc.name.replace('Dr. ', '').split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs truncate">{doc.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shrink-0 font-medium">
                            {dept}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{doc.specialization}</div>
                        <div className="text-[9px] font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {slots.length > 0 ? `${slots.length} slots today (next ${slots[0]})` : 'Available Today'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRunTurn(`Mujhe ${doc.name} se ${dept} me appointment chahiye aaj.`)}
                        disabled={isProcessing}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-extrabold text-[10px] hover:brightness-110 transition shrink-0 disabled:opacity-40 flex items-center gap-1 shadow shadow-cyan-500/10"
                      >
                        <CalendarCheck className="w-3 h-3" />
                        Book
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* All Intents Tab Content */
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleRunTurn(p.text)}
                    disabled={isProcessing}
                    className="w-full text-left px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:border-cyan-500/40 hover:text-white transition flex items-center gap-2 group disabled:opacity-40"
                  >
                    <span className="text-base shrink-0">{p.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-cyan-400 text-[10px]">{p.label}</span>
                        <span className="text-[9px] text-slate-500 font-mono">({p.dept})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{p.text}</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 ml-auto shrink-0 group-hover:text-cyan-400 transition" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stats Card */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <div className="text-2xl font-black text-cyan-400 font-mono">9</div>
              <div className="text-[10px] text-slate-400">Intent Types</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <div className="text-2xl font-black text-emerald-400 font-mono">7</div>
              <div className="text-[10px] text-slate-400">Languages</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <div className="text-2xl font-black text-purple-400 font-mono">5</div>
              <div className="text-[10px] text-slate-400">Pipeline Steps</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <div className="text-2xl font-black text-amber-400 font-mono">
                {chatHistory.filter(m => m.sender === 'user').length}
              </div>
              <div className="text-[10px] text-slate-400">Turns Taken</div>
            </div>
          </div>
        </div>

        {/* Right: Chat + Pipeline ─────────────────────────────────────── */}
        <div className="lg:col-span-8 flex flex-col gap-4">

          {/* Chat History */}
          <div
            ref={chatRef}
            className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 overflow-y-auto"
            style={{ minHeight: '420px', maxHeight: '520px' }}
          >
            {chatHistory.map(msg => {
              if (msg.sender === 'system') return (
                <div key={msg.id} className="flex items-start gap-2 mr-6">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 mt-0.5 shrink-0">
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-900 border border-cyan-500/20 text-xs text-cyan-100 leading-relaxed">
                    {msg.text}
                  </div>
                </div>
              );

              if (msg.sender === 'user') return (
                <div key={msg.id} className="flex items-start gap-2 ml-6 justify-end">
                  <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-100 text-right max-w-[85%]">
                    <div className="flex items-center justify-end gap-1 mb-1">
                      {msg.isVoice && <Mic className="w-3 h-3 text-cyan-400" />}
                      <span className="text-[9px] font-mono text-slate-400">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {msg.text}
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 mt-0.5 shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              );

              // Assistant message
              const intentCfg = INTENT_CONFIG[msg.intent || 'UNKNOWN'] || INTENT_CONFIG.UNKNOWN;
              return (
                <div key={msg.id} className="flex items-start gap-2 mr-6">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 mt-0.5 shrink-0">
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Intent + Status badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {msg.intent && (
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold flex items-center gap-1 border ${intentCfg.bg} ${intentCfg.color}`}>
                          {intentCfg.icon}
                          {intentCfg.label}
                        </span>
                      )}
                      {msg.status && (
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border ${
                          msg.status === 'ACTION_COMPLETED'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : msg.status === 'NEEDS_MORE_INFO'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-slate-700 text-slate-400 border-slate-600'
                        }`}>
                          {msg.status === 'ACTION_COMPLETED' ? '✓ Completed' : msg.status === 'NEEDS_MORE_INFO' ? '? Need Info' : msg.status}
                        </span>
                      )}
                      {msg.confidence && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                          {msg.confidence}% confidence
                        </span>
                      )}
                      <span className="text-[9px] font-mono text-slate-500 ml-auto">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Message bubble */}
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.status === 'ACTION_COMPLETED'
                        ? 'bg-slate-900 border border-emerald-500/20 text-slate-100'
                        : msg.status === 'NEEDS_MORE_INFO'
                        ? 'bg-slate-900 border border-amber-500/20 text-amber-100'
                        : msg.status === 'ERROR'
                        ? 'bg-rose-950/40 border border-rose-500/30 text-rose-200'
                        : 'bg-slate-900 border border-slate-800 text-slate-200'
                    }`}>
                      {msg.text}
                    </div>

                    {/* Validated Slots Card */}
                    {msg.validatedSlots && Object.keys(msg.validatedSlots).length > 0 && (
                      <SlotCard slots={msg.validatedSlots} />
                    )}

                    {/* Pipeline steps */}
                    {msg.pipelineSteps && <PipelineViz steps={msg.pipelineSteps} />}

                    {/* Action buttons */}
                    {msg.actionPayload?.token && (
                      <button
                        onClick={() => setActivePage('live_queue')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                        View Token {msg.actionPayload.token.token_number} in Live Queue
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                    {msg.intent === 'EMERGENCY_RESOURCE_REQUEST' && msg.status === 'ACTION_COMPLETED' && (
                      <button
                        onClick={() => setActivePage('emergency_dispatch')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold hover:bg-red-500/30 transition"
                      >
                        <Siren className="w-3.5 h-3.5" />
                        Open Emergency Dispatch
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                    {/* TTS replay button */}
                    {ttsEnabled && (
                      <button
                        onClick={() => speakText(msg.text, selectedLang)}
                        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-cyan-400 transition"
                      >
                        <Volume2 className="w-3 h-3" />
                        Replay voice
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Live pipeline animation */}
            {activePipeline && (
              <div className="flex items-start gap-2 mr-6">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 mt-0.5 shrink-0">
                  <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                </div>
                <div className="p-3 rounded-2xl bg-slate-900 border border-cyan-500/20 space-y-2 text-xs flex-1">
                  <div className="text-slate-400 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                    Processing request…
                  </div>
                  <PipelineViz steps={activePipeline} />
                </div>
              </div>
            )}
          </div>

          {/* Text Input Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <form
              onSubmit={e => { e.preventDefault(); if (inputText.trim() && !isProcessing) handleRunTurn(inputText); }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Type your request in any language…"
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition disabled:opacity-50"
              />
              <button
                type="button"
                onClick={step === 'recording' ? stopRecording : handleMicClick}
                disabled={step === 'processing' || step === 'speaking'}
                className={`p-2.5 rounded-xl font-bold transition ${
                  step === 'recording'
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'
                }`}
              >
                {step === 'recording' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                type="submit"
                disabled={isProcessing || !inputText.trim()}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:brightness-110 transition disabled:opacity-40 flex items-center gap-1.5"
              >
                {step === 'processing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {step === 'processing' ? 'Processing' : 'Send'}
              </button>
            </form>

            {/* Status row */}
            <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-cyan-500" />
                hosp-101 · Metro City General Hospital
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Context: {Object.keys(conversationContext).length} slot(s) held
              </span>
              {conversationContext.pendingIntent && (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Waiting: {conversationContext.pendingIntent}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CSS for waveform animation ─────────────────────────────────── */}
      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .animate-slideUp { animation: slideUp 0.35s ease; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
};
