import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity,
  ShieldAlert,
  Mic,
  Truck,
  MapPin,
  Users,
  Building2,
  Clock,
  ArrowRight
} from 'lucide-react';

export const LandingPage: React.FC<{ onLaunchConnecting?: () => void }> = () => {
  const { setActivePage, setAiWidgetOpen, runDemoScenario } = useApp();
  const { switchRole } = useAuth();

  const [floatingEvents] = useState([
    { id: 1, text: 'Appointment #MED-4029 booked', time: '1s ago', color: 'border-cyan-500/40 text-cyan-300' },
    { id: 2, text: 'O- Blood SOS request created', time: '3s ago', color: 'border-rose-500/50 text-rose-300' },
    { id: 3, text: 'Metro Hospital accepted dispatch', time: '5s ago', color: 'border-emerald-500/40 text-emerald-300' },
    { id: 4, text: 'Live queue recalculated via n8n', time: '8s ago', color: 'border-purple-500/40 text-purple-300' },
  ]);

  return (
    <div className="space-y-16 py-4 animate-fadeIn">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl glass-panel bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-slate-950 border border-slate-800 p-6 md:p-12">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          
          {/* Eyebrow */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold tracking-widest uppercase">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>REAL-TIME • AI-POWERED • FOR A HEALTHIER TOMORROW</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-none">
            Healthcare{' '}
            <span className="block text-emerald-400 text-4xl md:text-6xl lg:text-7xl mt-2 font-black">
              Without Delays
            </span>
          </h1>

          {/* Description */}
          <p className="text-base md:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            AI-powered appointments, real-time emergency resource sharing, and a connected hospital network — all in one platform.
          </p>

          {/* Primary & Secondary CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => {
                switchRole('patient');
                setActivePage('patient');
              }}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/25 hover:brightness-110 hover:scale-105 active:scale-95 transition text-left group"
            >
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-slate-950" />
                <span className="text-base font-black">I'm a Patient</span>
              </div>
              <div className="text-[11px] text-slate-900 opacity-90 font-medium pl-7">
                Book, check, track →
              </div>
            </button>

            <button
              onClick={() => {
                switchRole('er_staff');
                setActivePage('er_command');
              }}
              className="px-8 py-4 rounded-2xl bg-slate-900 border border-slate-700 text-white font-extrabold text-sm hover:bg-slate-800 hover:border-slate-600 transition text-left group"
            >
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-teal-400" />
                <span className="text-base font-black">I'm Hospital Staff</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium pl-7">
                Access dashboard →
              </div>
            </button>
          </div>

          {/* Floating Status Card */}
          <div className="pt-8 max-w-3xl mx-auto">
            <div className="p-6 rounded-3xl glass-panel bg-slate-900/90 border border-slate-800 shadow-2xl text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-bold text-sm text-white">Live Network Status</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                  Operational
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-xl font-black text-cyan-400 font-mono">6</div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">Nearby Hospitals</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-xl font-black text-emerald-400 font-mono">54</div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">Critical Resources</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-xl font-black text-rose-400 font-mono">2</div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">Active Requests</div>
                </div>
              </div>

              <div className="text-center pt-1 text-xs font-semibold text-teal-300 italic">
                "Every second counts. We make sure help is closer."
              </div>
            </div>
          </div>

          {/* Interactive Network Graph */}
          <div className="pt-6">
            <div className="p-6 md:p-8 rounded-3xl glass-panel bg-slate-950/90 border border-slate-800 relative overflow-hidden">
              <div className="text-center mb-6">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                  INTERACTIVE REGIONAL NETWORK GRAPH
                </span>
              </div>

              <div className="relative w-full h-72 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-cyan-500/30 stroke-2">
                  <line x1="50%" y1="50%" x2="20%" y2="25%" className="animate-line-flow" />
                  <line x1="50%" y1="50%" x2="80%" y2="25%" className="animate-line-flow" />
                  <line x1="50%" y1="50%" x2="15%" y2="75%" className="animate-line-flow" />
                  <line x1="50%" y1="50%" x2="85%" y2="75%" className="animate-line-flow" />
                  <line x1="50%" y1="50%" x2="50%" y2="15%" className="animate-line-flow" />
                </svg>

                <div className="relative z-20 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-teal-500/40 animate-node-glow">
                    <Activity className="w-10 h-10 text-slate-950 animate-pulse" />
                  </div>
                  <span className="mt-2 font-black text-xs text-teal-300 tracking-wider">MEDCONNECT PULSE</span>
                  <span className="text-[10px] text-slate-400 font-mono">Central n8n Engine</span>
                </div>

                <div className="absolute top-2 flex flex-col items-center z-10">
                  <div className="p-2.5 rounded-2xl bg-slate-900 border border-cyan-500/40 text-cyan-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200 mt-1">PATIENT</span>
                </div>

                <div className="absolute top-8 left-8 flex flex-col items-center z-10">
                  <div className="p-2.5 rounded-2xl bg-slate-900 border border-rose-500/40 text-rose-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200 mt-1">HOSPITAL A</span>
                </div>

                <div className="absolute top-8 right-8 flex flex-col items-center z-10">
                  <div className="p-2.5 rounded-2xl bg-slate-900 border border-emerald-500/40 text-emerald-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200 mt-1">HOSPITAL B</span>
                </div>

                <div className="absolute bottom-8 left-10 flex flex-col items-center z-10">
                  <div className="p-2.5 rounded-2xl bg-slate-900 border border-blue-500/40 text-blue-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200 mt-1">HOSPITAL C</span>
                </div>

                <div className="absolute bottom-8 right-10 flex flex-col items-center z-10">
                  <div className="p-2.5 rounded-2xl bg-slate-900 border border-amber-500/40 text-amber-400">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200 mt-1">ER TEAM</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap justify-center gap-2">
                {floatingEvents.map((ev) => (
                  <span
                    key={ev.id}
                    className={`px-3 py-1 rounded-xl glass-panel bg-slate-950 text-[11px] font-mono border ${ev.color} animate-float`}
                  >
                    ⚡ {ev.text} <span className="opacity-60 text-[9px]">({ev.time})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Metrics Section */}
      <section className="py-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="text-3xl font-black text-white font-mono">50+</div>
            <div className="text-xs font-semibold text-slate-400">Hospitals Connected</div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-3xl font-black text-white font-mono">10,000+</div>
            <div className="text-xs font-semibold text-slate-400">Patients Benefited</div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-white font-mono">Under 3 Min</div>
            <div className="text-xs font-semibold text-slate-400">Average Emergency Response</div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="text-3xl font-black text-white font-mono">15 km</div>
            <div className="text-xs font-semibold text-slate-400">Smart Geo-Dispatch Radius</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-widest">CORE CAPABILITIES</span>
          <h2 className="text-3xl font-black text-white">One Platform. Many Lives. Real Impact.</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Card 1: AI Receptionist */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 hover:border-teal-500/40 transition group">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">AI Receptionist</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Multilingual voice intake powered by Sarvam STT & OpenAI intent parsing. Book OPD appointments, check queue status, or get clinic help in real-time.
            </p>
            <button
              onClick={() => setAiWidgetOpen(true)}
              className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center space-x-1 pt-2"
            >
              <span>Test AI Receptionist</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Emergency Geo-Dispatch */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 hover:border-rose-500/40 transition group">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Emergency Geo-Dispatch</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              15 km Haversine radar automatically finds nearby facilities with available Oxygen, Blood, or ICU Beds and dispatches Telegram SOS alerts in &lt;30s.
            </p>
            <button
              onClick={() => runDemoScenario(4)}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center space-x-1 pt-2"
            >
              <span>Simulate Geo-Dispatch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Unified Hospital Network */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 hover:border-cyan-500/40 transition group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Unified Hospital Network</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Eliminates medical silos. Connects hospital ICUs, blood banks, and OPD queues into one synchronized regional safety net.
            </p>
            <button
              onClick={() => setActivePage('hospital_network')}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 pt-2"
            >
              <span>View Network Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

    </div>
  );
};
