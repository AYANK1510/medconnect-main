import React from 'react';
import { Cpu, Zap, Bot, Database, Globe, Send, PhoneCall, MapPin } from 'lucide-react';

export const TechStackPage: React.FC = () => {
  const techCards = [
    {
      name: 'n8n',
      role: 'Workflow Engine & Automation',
      description: 'Orchestrates real-time webhooks, Sarvam AI STT, OpenAI intent parsing, Supabase DB operations, and Telegram/Twilio alerts.',
      icon: Zap,
      color: 'text-amber-400 border-amber-500/30 bg-amber-950/30',
    },
    {
      name: 'Sarvam AI',
      role: 'saaras:v1 Speech-to-Text',
      description: 'Accurate Indic language speech-to-text recognition supporting Hindi, Hinglish, English, Tamil, and Telugu.',
      icon: Bot,
      color: 'text-purple-400 border-purple-500/30 bg-purple-950/30',
    },
    {
      name: 'OpenAI',
      role: 'gpt-4o-mini Intent Agent',
      description: 'Parses raw medical transcriptions into structured JSON slots (Patient name, doctor, department, slot, symptoms).',
      icon: Cpu,
      color: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/30',
    },
    {
      name: 'Supabase',
      role: 'PostgreSQL Relational DB',
      description: 'Stores regional hospital profiles, doctors, appointments, queue tokens, inventory locks, and dispatch logs.',
      icon: Database,
      color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30',
    },
    {
      name: 'React 19 & Vite 6',
      role: 'Frontend & Role-Based Dashboard',
      description: 'Desktop-first, fully mobile responsive 3-in-1 role dashboard with Tailwind v4, Lucide icons, and Recharts.',
      icon: Globe,
      color: 'text-blue-400 border-blue-500/30 bg-blue-950/30',
    },
    {
      name: 'Telegram Bot API',
      role: 'Inline Emergency Alerts',
      description: 'Dispatches emergency supply requests directly to regional hospital ER Telegram channels with Accept/Decline actions.',
      icon: Send,
      color: 'text-sky-400 border-sky-500/30 bg-sky-950/30',
    },
    {
      name: 'Twilio Voice API',
      role: 'Voice Fallback Escalation',
      description: 'Initiates automated phone calls to Regional Emergency Coordinators when 3-minute Telegram timers expire.',
      icon: PhoneCall,
      color: 'text-rose-400 border-rose-500/30 bg-rose-950/30',
    },
    {
      name: 'Haversine Math Node',
      role: '15 KM Geo-Fence Engine',
      description: 'Pure GPS-distance math calculating great-circle distance to filter hospitals within a 15 km safety radius.',
      icon: MapPin,
      color: 'text-teal-400 border-teal-500/30 bg-teal-950/30',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
          TECHNICAL DECK SPECIFICATION
        </span>
        <h1 className="text-2xl font-extrabold text-white">Technology Architecture</h1>
        <p className="text-xs text-slate-400">
          Integrated stack specified in the hackathon project design.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {techCards.map((tech) => {
          const Icon = tech.icon;

          return (
            <div
              key={tech.name}
              className="p-6 rounded-3xl glass-panel-hover glass-panel bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className={`p-3 rounded-2xl border w-fit ${tech.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{tech.name}</h3>
                  <p className="text-xs text-cyan-400 font-mono">{tech.role}</p>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{tech.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 text-[10px] font-mono text-slate-500">
                Status: Integrated & Configured
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
