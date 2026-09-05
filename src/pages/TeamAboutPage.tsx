import React from 'react';
import { Award, GraduationCap } from 'lucide-react';

export const TeamAboutPage: React.FC = () => {
  const teamMembers = [
    {
      name: 'Ayank Kumar',
      role: 'Team Leader',
      responsibilities: 'n8n Workflows & Multilingual Voice AI Integration (Sarvam + OpenAI)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'Ishan Varshney',
      role: 'Core Backend & Geo Architect',
      responsibilities: 'Supabase DB, Haversine 15 KM Distance Math, Telegram & Twilio Escalation',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'Ishaan Sama',
      role: 'Frontend & UI/UX Specialist',
      responsibilities: 'React / Vite 3-in-1 Role Dashboard & Multilingual Voice AI Widget',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'Bhavya Gupta',
      role: 'QA & Hackathon Pitch Lead',
      responsibilities: 'E2E System Testing, Demo Mode Fail-Safes & Pitch Presentation Deck',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
            HACKATHON CREATORS
          </span>
        </div>
        <h1 className="text-3xl font-black text-white mt-1">Team 4 Bit Minds</h1>
        <p className="text-xs text-slate-300 flex items-center space-x-1 mt-1">
          <GraduationCap className="w-4 h-4 text-cyan-400" />
          <span>JIMS Engineering Management Technical Campus (JEMTEC)</span>
        </p>
      </div>

      {/* Vision Callout */}
      <div className="p-6 rounded-3xl glass-panel bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 space-y-3">
        <h3 className="font-extrabold text-base text-cyan-300">
          "Turning isolated hospital silos into one connected, event-driven regional emergency safety net."
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          MedConnect Pulse was conceived to solve the critical coordination breakdown experienced during severe health crises. By combining n8n event automation, Sarvam AI voice intake, and Haversine geo-fencing, our platform transforms fragmented hospital operations into a synchronized regional safety infrastructure.
        </p>
      </div>

      {/* Team Members Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {teamMembers.map((member) => (
          <div
            key={member.name}
            className="p-6 rounded-3xl glass-panel-hover glass-panel bg-slate-900/80 border border-slate-800 text-center space-y-4 flex flex-col items-center justify-between"
          >
            <div className="space-y-3 flex flex-col items-center">
              <div className="relative">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-cyan-400/50 shadow-lg"
                />
                <span className="absolute bottom-0 right-0 h-4 w-4 bg-cyan-500 rounded-full border-2 border-slate-950"></span>
              </div>

              <div>
                <h3 className="font-extrabold text-base text-white">{member.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-500/30">
                  {member.role}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-normal pt-1">{member.responsibilities}</p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 text-[10px] font-mono text-slate-500 w-full">
              4 Bit Minds • JEMTEC
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
