import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { processReceptionistTurn, getWelcomeMessage } from '../services/receptionistService';
import type { ReceptionistResponse, ConversationContext } from '../services/receptionistService';
import {
  startListening,
  type SpeechRecognitionController,
} from '../services/speechRecognitionService';
import {
  X, Bot, Send, Loader2, ChevronRight, Globe,
  RotateCcw, Mic, MicOff, Volume2, VolumeX,
  CheckCircle2, AlertCircle, CalendarCheck, ListOrdered,
  Stethoscope, MapPin, Siren, BriefcaseMedical, Info,
  Activity, Maximize2,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatMsg {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  intent?: string;
  status?: string;
  validatedSlots?: Record<string, any>;
  actionPayload?: any;
  suggestedActions?: { label: string; text: string; icon?: string }[];
  isVoice?: boolean;
  timestamp: Date;
}

// ── Intent config ─────────────────────────────────────────────────────────────

const INTENT_CFG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  BOOK_APPOINTMENT:          { color: 'text-emerald-400', icon: <CalendarCheck className="w-3 h-3" />, label: 'Book Appt' },
  CHECK_APPOINTMENT:         { color: 'text-blue-400',    icon: <CheckCircle2 className="w-3 h-3" />,  label: 'Check Appt' },
  CANCEL_APPOINTMENT:        { color: 'text-rose-400',    icon: <AlertCircle className="w-3 h-3" />,   label: 'Cancel Appt' },
  CHECK_QUEUE:               { color: 'text-amber-400',   icon: <ListOrdered className="w-3 h-3" />,   label: 'Queue' },
  CHECK_DOCTOR_AVAILABILITY: { color: 'text-purple-400',  icon: <Stethoscope className="w-3 h-3" />,   label: 'Availability' },
  CHECK_DUES:                { color: 'text-yellow-400',  icon: <BriefcaseMedical className="w-3 h-3" />, label: 'Dues' },
  GENERAL_HOSPITAL_QUERY:    { color: 'text-cyan-400',    icon: <MapPin className="w-3 h-3" />,         label: 'Hospital Info' },
  EMERGENCY_RESOURCE_REQUEST:{ color: 'text-red-400',     icon: <Siren className="w-3 h-3" />,          label: 'EMERGENCY' },
  UNKNOWN:                   { color: 'text-slate-400',   icon: <Info className="w-3 h-3" />,            label: 'Query' },
};

const LANGUAGES = [
  { code: 'Hinglish', label: 'HI', flag: '🇮🇳' },
  { code: 'Hindi',    label: 'हि', flag: '🇮🇳' },
  { code: 'English',  label: 'EN', flag: '🇬🇧' },
  { code: 'Tamil',    label: 'TA', flag: '🇮🇳' },
  { code: 'Telugu',   label: 'TE', flag: '🇮🇳' },
  { code: 'Bengali',  label: 'BN', flag: '🇮🇳' },
  { code: 'Marathi',  label: 'MR', flag: '🇮🇳' },
];

const QUICK_CHIPS = [
  { emoji: '📅', text: 'Mujhe doctor se milna hai.' },
  { emoji: '🔎', text: 'Mera queue status kya hai?' },
  { emoji: '👨‍⚕️', text: 'Doctors availability check karo aaj.' },
  { emoji: '🚨', text: 'Emergency! 2 ICU beds chahiye.' },
];

function speakText(text: string, lang: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  const map: Record<string, string> = {
    Hindi: 'hi-IN', Hinglish: 'hi-IN', English: 'en-IN',
    Tamil: 'ta-IN', Telugu: 'te-IN', Bengali: 'bn-IN', Marathi: 'mr-IN',
  };
  utt.lang = map[lang] || 'hi-IN';
  utt.rate = 0.95; utt.pitch = 1.05;
  window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

// ── WaveformBars ─────────────────────────────────────────────────────────────

const WaveformBars: React.FC<{ active: boolean }> = ({ active }) => (
  <div className="flex items-end gap-0.5 h-5">
    {[...Array(8)].map((_, i) => (
      <div
        key={i}
        className={`w-0.5 rounded-full ${active ? 'bg-red-400' : 'bg-slate-600'}`}
        style={{
          height: active ? `${8 + Math.sin(i * 1.2) * 8}px` : '3px',
          animation: active ? `wave ${0.5 + i * 0.08}s ease-in-out infinite alternate` : 'none',
        }}
      />
    ))}
  </div>
);

// ── Main widget ───────────────────────────────────────────────────────────────

export const AiReceptionistWidget: React.FC = () => {
  const { aiWidgetOpen, setAiWidgetOpen, setActivePage } = useApp();

  const [selectedLang, setSelectedLang] = useState('Hinglish');
  const [step, setStep] = useState<'idle' | 'recording' | 'processing' | 'speaking'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [widgetLiveText, setWidgetLiveText] = useState('');
  const [conversationContext, setConversationContext] = useState<ConversationContext>({});
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { id: 'w0', sender: 'assistant', text: getWelcomeMessage('Hinglish'), timestamp: new Date() },
  ]);

  const chatRef = useRef<HTMLDivElement>(null);
  const speechControllerRef = useRef<SpeechRecognitionController | null>(null);

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages, isPipelineRunning, widgetLiveText]);

  // Update welcome on lang change
  useEffect(() => {
    setChatMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'w0') {
        return [{ ...prev[0], text: getWelcomeMessage(selectedLang) }];
      }
      return prev;
    });
  }, [selectedLang]);

  useEffect(() => () => {
    stopSpeaking();
    if (speechControllerRef.current) speechControllerRef.current.abort();
  }, []);

  const addMsg = useCallback((m: Omit<ChatMsg, 'id' | 'timestamp'>): ChatMsg => {
    const full: ChatMsg = { ...m, id: `m-${Date.now()}-${Math.random()}`, timestamp: new Date() };
    setChatMessages(prev => [...prev, full]);
    return full;
  }, []);

  const handleSendTurn = useCallback(async (inputText?: string, audioBlob?: Blob) => {
    const textToUse = inputText || manualInput;
    if (!textToUse && !audioBlob) return;

    setStep('processing');
    setIsPipelineRunning(true);
    setManualInput('');
    setWidgetLiveText('');

    addMsg({
      sender: 'user',
      text: textToUse || '🎤 Voice message',
      isVoice: !!audioBlob,
    });

    let res: ReceptionistResponse;
    try {
      res = await processReceptionistTurn({
        channel: audioBlob ? 'mic' : 'text',
        text: textToUse,
        audioBlob,
        language: selectedLang,
        context: conversationContext,
        hospitalId: 'hosp-101',
      });
    } catch (err: any) {
      setIsPipelineRunning(false);
      addMsg({ sender: 'assistant', text: `⚠️ ${err.message || 'Error'}`, status: 'ERROR', intent: 'UNKNOWN' });
      setStep('idle');
      return;
    }

    setIsPipelineRunning(false);
    setConversationContext(res.context || {});

    addMsg({
      sender: 'assistant',
      text: res.aiMessage,
      status: res.status,
      intent: res.intent,
      validatedSlots: res.validatedSlots,
      actionPayload: res.actionPayload,
      suggestedActions: res.suggestedActions,
    });

    if (ttsEnabled && res.aiMessage) {
      setStep('speaking');
      speakText(res.aiMessage, selectedLang);
      setTimeout(() => setStep('idle'), Math.min(res.aiMessage.length * 60, 7000));
    } else {
      setStep('idle');
    }
  }, [manualInput, selectedLang, conversationContext, ttsEnabled, addMsg]);

  const stopRecording = useCallback(async () => {
    const controller = speechControllerRef.current;
    speechControllerRef.current = null;
    setIsRecording(false);
    setWidgetLiveText('');
    if (controller) {
      const { transcript, audioBlob } = await controller.stop();
      await handleSendTurn(transcript || undefined, audioBlob || undefined);
    }
  }, [handleSendTurn]);

  const handleMicClick = useCallback(async () => {
    if (step === 'processing') return;
    if (isRecording) {
      await stopRecording();
      return;
    }
    try {
      setIsRecording(true);
      setStep('recording');
      setWidgetLiveText('');
      const controller = await startListening({
        language: selectedLang,
        autoStopOnSilence: true,
        silenceThresholdMs: 1800,
        onInterimText: (txt) => {
          setWidgetLiveText(txt);
        },
        onSilenceDetected: async () => {
          await stopRecording();
        },
        onError: () => { setIsRecording(false); setStep('idle'); setWidgetLiveText(''); }
      });
      speechControllerRef.current = controller;
    } catch {
      setIsRecording(false);
      setStep('idle');
    }
  }, [isRecording, step, selectedLang, stopRecording]);

  const handleResetConversation = () => {
    stopSpeaking();
    setConversationContext({});
    setStep('idle');
    setIsRecording(false);
    setChatMessages([{ id: 'w0', sender: 'assistant', text: getWelcomeMessage(selectedLang), timestamp: new Date() }]);
  };

  if (!aiWidgetOpen) {
    return (
      <button
        id="ai-receptionist-fab"
        onClick={() => setAiWidgetOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center space-x-2 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-slate-950 font-extrabold text-xs shadow-2xl shadow-cyan-500/40 hover:scale-105 active:scale-95 transition"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950" />
        </span>
        <Bot className="w-5 h-5 text-slate-950" />
        <span>MedConnect AI</span>
      </button>
    );
  }

  const isBusy = step === 'processing' || isRecording;

  return (
    <div
      id="ai-receptionist-widget"
      className="fixed bottom-6 right-6 z-50 w-full max-w-sm bg-slate-900/98 border border-cyan-500/40 rounded-3xl shadow-2xl shadow-cyan-500/20 overflow-hidden flex flex-col"
      style={{ maxHeight: '82vh' }}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
            <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-[11px] text-white flex items-center gap-1.5">
              MEDCONNECT AI
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            </h3>
            <p className="text-[9px] text-slate-400">
              {step === 'recording' ? '🎤 Recording…' : step === 'speaking' ? '🔊 Speaking…' : step === 'processing' ? '⚙️ Processing…' : '● Ready'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setTtsEnabled(p => !p); stopSpeaking(); }}
            className={`p-1.5 rounded-lg transition ${ttsEnabled ? 'text-cyan-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-800'}`}
            title={ttsEnabled ? 'Mute AI voice' : 'Unmute AI voice'}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          <button onClick={handleResetConversation} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition" title="Reset conversation">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setAiWidgetOpen(false);
              setActivePage('ai_receptionist');
              window.history.pushState({}, '', '/ai-receptionist');
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 transition"
            title="Open Full AI Receptionist Portal"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setAiWidgetOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Language pills */}
      <div className="px-3 pt-2 pb-1 flex gap-1 overflow-x-auto shrink-0">
        <Globe className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
        {LANGUAGES.map(l => (
          <button
            key={l.code}
            onClick={() => setSelectedLang(l.code)}
            className={`px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0 transition ${
              selectedLang === l.code
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-slate-800/60 text-slate-500 hover:bg-slate-800'
            }`}
          >
            {l.flag} {l.label}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {chatMessages.map(msg => {
          const cfg = INTENT_CFG[msg.intent || 'UNKNOWN'] || INTENT_CFG.UNKNOWN;
          if (msg.sender === 'user') return (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[85%] p-2.5 rounded-2xl rounded-tr-sm bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-100">
                {msg.isVoice && <span className="text-[9px] text-cyan-400 block mb-0.5">🎤 Voice</span>}
                {msg.text}
              </div>
            </div>
          );
          return (
            <div key={msg.id} className="flex flex-col gap-1">
              {/* Intent badge */}
              {msg.intent && msg.intent !== 'UNKNOWN' && (
                <div className={`flex items-center gap-1 text-[9px] font-mono font-bold ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                  {msg.status === 'ACTION_COMPLETED' && (
                    <span className="text-emerald-400 ml-1">· ✓ Done</span>
                  )}
                  {msg.status === 'NEEDS_MORE_INFO' && (
                    <span className="text-amber-400 ml-1">· ? Need Info</span>
                  )}
                </div>
              )}
              <div className={`p-2.5 rounded-2xl rounded-tl-sm text-xs leading-relaxed ${
                msg.status === 'ACTION_COMPLETED'
                  ? 'bg-slate-800 border border-emerald-500/20 text-slate-100'
                  : msg.status === 'NEEDS_MORE_INFO'
                  ? 'bg-slate-800 border border-amber-500/20 text-amber-100'
                  : 'bg-slate-800 border border-slate-700 text-slate-200'
              }`}>
                {msg.text}
              </div>
              {/* Slot card */}
              {msg.validatedSlots && Object.keys(msg.validatedSlots).length > 0 && (
                <div className="p-2 rounded-xl bg-slate-900 border border-cyan-500/20 text-[10px] space-y-0.5">
                  {Object.entries(msg.validatedSlots)
                    .filter(([, v]) => v != null)
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="text-cyan-300 font-mono">{String(v)}</span>
                      </div>
                    ))}
                </div>
              )}
              {/* Interactive Suggested Action Buttons */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {msg.suggestedActions.map((act, actI) => (
                    <button
                      key={actI}
                      type="button"
                      onClick={() => handleSendTurn(act.text)}
                      className="px-2 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 hover:text-white border border-cyan-500/30 text-[10px] font-semibold transition flex items-center gap-1 shadow-sm"
                    >
                      <span>{act.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {/* Action buttons */}
              {msg.actionPayload?.token && (
                <button
                  onClick={() => { setAiWidgetOpen(false); setActivePage('live_queue'); }}
                  className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition"
                >
                  <ListOrdered className="w-3 h-3" />
                  View Token {msg.actionPayload.token.token_number}
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
              {/* TTS replay */}
              {ttsEnabled && (
                <button
                  onClick={() => speakText(msg.text, selectedLang)}
                  className="flex items-center gap-1 text-[9px] text-slate-600 hover:text-cyan-400 transition"
                >
                  <Volume2 className="w-2.5 h-2.5" /> replay
                </button>
              )}
            </div>
          );
        })}

        {/* Live speech hearing bar */}
        {isRecording && (
          <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-[11px] text-cyan-200 animate-fadeIn">
            <div className="flex items-center justify-between text-[9px] font-mono text-cyan-400 font-bold uppercase mb-0.5">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                Hearing Voice…
              </span>
              <span className="text-slate-400">Auto-sends on pause</span>
            </div>
            <div className="italic text-white">
              {widgetLiveText || 'Speak into microphone…'}
            </div>
          </div>
        )}

        {/* Live processing indicator */}
        {isPipelineRunning && (
          <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-800 border border-cyan-500/20 text-xs text-slate-400">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <WaveformBars active={true} />
            <span>Validating…</span>
            <Loader2 className="w-3 h-3 animate-spin text-cyan-400 ml-auto" />
          </div>
        )}
      </div>

      {/* Quick chips */}
      <div className="flex gap-1 px-3 pb-1 overflow-x-auto shrink-0">
        {QUICK_CHIPS.map((c, i) => (
          <button
            key={i}
            onClick={() => handleSendTurn(c.text)}
            disabled={isBusy}
            className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[10px] hover:border-cyan-500/40 shrink-0 disabled:opacity-40 transition"
          >
            {c.emoji}
          </button>
        ))}
      </div>

      {/* Input footer */}
      <div className="px-3 pb-3 shrink-0">
        <form
          onSubmit={e => { e.preventDefault(); if (manualInput.trim() && !isBusy) handleSendTurn(manualInput); }}
          className="flex gap-1.5"
        >
          <input
            type="text"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            placeholder="Type or use mic…"
            disabled={isBusy}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50 transition"
          />
          {/* Mic button */}
          <button
            type="button"
            onClick={handleMicClick}
            disabled={step === 'processing' || step === 'speaking'}
            title={isRecording ? 'Recording…' : 'Tap to speak'}
            className={`p-2 rounded-xl font-bold transition ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'
            }`}
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          {/* Send button */}
          <button
            type="submit"
            disabled={isBusy || !manualInput.trim()}
            className="p-2 rounded-xl bg-cyan-500 text-slate-950 hover:brightness-110 transition disabled:opacity-40"
          >
            {step === 'processing'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
        .animate-slideUp { animation: slideUp 0.3s ease; }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
      `}</style>
    </div>
  );
};
