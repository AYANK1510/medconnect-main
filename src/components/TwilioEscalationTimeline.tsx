import React from 'react';
import { PhoneCall, CheckCircle2 } from 'lucide-react';

interface Step {
  title: string;
  desc: string;
  timeStr: string;
  status: 'completed' | 'active' | 'pending';
}

export const TwilioEscalationTimeline: React.FC<{ steps?: Step[] }> = ({ steps }) => {
  const defaultSteps: Step[] = [
    { title: 'Emergency SOS Broadcasted', desc: 'Request created for 4 Units of O- Blood', timeStr: '00:00', status: 'completed' },
    { title: '15 km Haversine Geo-Matching', desc: 'Identified 3 hospitals with available stock within 15 km', timeStr: '00:02', status: 'completed' },
    { title: 'Telegram Dispatch Alert Sent', desc: 'Pushed interactive bot notification to regional hospital channel', timeStr: '00:05', status: 'completed' },
    { title: '3-Minute Response Window', desc: 'Awaiting hospital response before regional escalation', timeStr: '01:42', status: 'active' },
    { title: 'Twilio Voice Call Escalation', desc: 'Triggers automated voice call to Regional Medical Coordinator if unfulfilled', timeStr: '03:00', status: 'pending' }
  ];

  const activeSteps = steps || defaultSteps;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <PhoneCall className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white text-sm">3-Minute Twilio Escalation Architecture</h3>
        </div>
        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold rounded-full border border-amber-500/30">
          AUTOMATED PROTOCOL
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {activeSteps.map((step, idx) => (
          <div key={idx} className="relative flex items-start space-x-3 text-xs">
            <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step.status === 'completed' ? 'bg-emerald-500 text-slate-950' :
              step.status === 'active' ? 'bg-amber-500 text-slate-950 animate-pulse' :
              'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              {step.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : idx + 1}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className={`font-bold ${step.status === 'active' ? 'text-amber-400' : 'text-white'}`}>
                  {step.title}
                </span>
                <span className="font-mono text-[10px] text-slate-500">{step.timeStr}</span>
              </div>
              <p className="text-[11px] text-slate-400">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
