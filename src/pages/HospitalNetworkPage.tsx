import React from 'react';
import { useApp } from '../contexts/AppContext';
import { MapPin, Phone } from 'lucide-react';

export const HospitalNetworkPage: React.FC = () => {
  const { hospitals } = useApp();

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
          REGIONAL INFRASTRUCTURE
        </span>
        <h1 className="text-2xl font-extrabold text-white">15 KM Emergency Hospital Network</h1>
        <p className="text-xs text-slate-400">
          Real-time GPS coordinate mapping and resource availability across 6 regional nodes.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hospitals.map((hosp, idx) => {
          const distances = [0.0, 8.2, 4.7, 11.4, 6.8, 14.1];
          const dist = distances[idx] || 5.0;

          return (
            <div
              key={hosp.id}
              className="p-6 rounded-3xl glass-panel bg-slate-900/80 border border-slate-800 space-y-4 hover:border-cyan-500/40 transition group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-mono text-cyan-400 font-bold">{hosp.code}</div>
                  <h3 className="font-bold text-base text-white group-hover:text-cyan-300 transition">
                    {hosp.name}
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30">
                  {dist} km
                </span>
              </div>

              <div className="flex items-center space-x-1 text-xs text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{hosp.address}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">ICU Beds</div>
                  <div className="font-bold text-blue-400 text-sm mt-0.5">{hosp.icuBedsAvailable} / {hosp.icuBedsTotal}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Oxygen</div>
                  <div className="font-bold text-cyan-400 text-sm mt-0.5">{hosp.oxygenUnitsAvailable} units</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">O- Blood</div>
                  <div className="font-bold text-emerald-400 text-sm mt-0.5">{hosp.bloodInventory['O-']} units</div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800/80">
                <span className="text-slate-400 flex items-center space-x-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span>{hosp.phone}</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase">
                  ● Operational
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
