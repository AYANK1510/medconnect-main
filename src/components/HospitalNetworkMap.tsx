import React, { useState } from 'react';
import type { Hospital } from '../types/database.types';
import { Building2 } from 'lucide-react';

interface HospitalNetworkMapProps {
  centerHospital?: Hospital;
  hospitals: Hospital[];
  onSelectHospital?: (hospital: Hospital) => void;
}

export const HospitalNetworkMap: React.FC<HospitalNetworkMapProps> = ({
  hospitals,
  onSelectHospital
}) => {
  const [activeHoverId, setActiveHoverId] = useState<string | null>(null);

  // Center coordinate reference (Metro City General)
  const centerLat = 28.6139;
  const centerLng = 77.2090;

  // Scale map offsets to SVG viewBox (-150 to 150)
  const getPosition = (lat: number, lng: number) => {
    const dx = (lng - centerLng) * 1200;
    const dy = (centerLat - lat) * 1200;
    return { x: Math.max(-130, Math.min(130, dx)), y: Math.max(-130, Math.min(130, dy)) };
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 z-10 relative">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-teal-400 animate-ping" />
          <span className="text-xs font-mono font-bold text-teal-300 uppercase tracking-wider">
            15 KM HAVERSINE GEO-FENCE RADAR MAP
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-mono">
          <span className="flex items-center space-x-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Eligible (&lt;= 15km)</span>
          </span>
          <span className="flex items-center space-x-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Out of Range (&gt; 15km)</span>
          </span>
        </div>
      </div>

      {/* SVG Radar Visualizer */}
      <div className="relative w-full aspect-square max-h-[380px] mx-auto flex items-center justify-center">
        
        {/* Radar Rings */}
        <svg viewBox="-160 -160 320 320" className="w-full h-full">
          {/* Outer 15km Geo-Fence Boundary */}
          <circle cx="0" cy="0" r="140" fill="none" stroke="rgba(20, 184, 166, 0.25)" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x="0" y="-144" fill="#2dd4bf" fontSize="9" fontFamily="monospace" textAnchor="middle">15.0 KM GEO-FENCE BOUNDARY</text>

          {/* 10km Inner Ring */}
          <circle cx="0" cy="0" r="95" fill="none" stroke="rgba(51, 65, 85, 0.6)" strokeWidth="1" />
          <text x="0" y="-98" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">10.0 KM</text>

          {/* 5km Inner Ring */}
          <circle cx="0" cy="0" r="50" fill="none" stroke="rgba(51, 65, 85, 0.4)" strokeWidth="1" />
          <text x="0" y="-53" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">5.0 KM</text>

          {/* Crosshairs */}
          <line x1="-150" y1="0" x2="150" y2="0" stroke="rgba(51, 65, 85, 0.3)" strokeWidth="1" />
          <line x1="0" y1="-150" x2="0" y2="150" stroke="rgba(51, 65, 85, 0.3)" strokeWidth="1" />

          {/* Requesting Hospital Center Node */}
          <circle cx="0" cy="0" r="7" fill="#14b8a6" className="animate-pulse" />
          <circle cx="0" cy="0" r="14" fill="none" stroke="#14b8a6" strokeWidth="1.5" className="animate-ping" />
          <text x="0" y="20" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">Metro City General (Origin)</text>

          {/* Plotted Nearby Hospitals */}
          {hospitals.map(hosp => {
            const { x, y } = getPosition(hosp.latitude, hosp.longitude);
            const dist = Math.round(Math.sqrt(x * x + y * y) / 9.3 * 10) / 10;
            const isEligible = dist <= 15.0;

            return (
              <g
                key={hosp.id}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer group"
                onMouseEnter={() => setActiveHoverId(hosp.id)}
                onMouseLeave={() => setActiveHoverId(null)}
                onClick={() => onSelectHospital && onSelectHospital(hosp)}
              >
                <circle
                  r="6"
                  fill={isEligible ? '#10b981' : '#f43f5e'}
                  stroke="#0f172a"
                  strokeWidth="2"
                  className="transition-transform group-hover:scale-125"
                />
                <circle
                  r="11"
                  fill="none"
                  stroke={isEligible ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}
                  strokeWidth="1.5"
                />
                <text y="-10" fill="#cbd5e1" fontSize="8" fontWeight="600" textAnchor="middle">
                  {hosp.name.split(' ')[0]} ({dist}km)
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Hospital Info Card Overlay */}
      {activeHoverId && (
        <div className="mt-4 p-3 bg-slate-900 border border-teal-500/40 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-teal-400" />
            <div>
              <div className="font-bold text-white">
                {hospitals.find(h => h.id === activeHoverId)?.name}
              </div>
              <div className="text-[10px] text-slate-400">
                {hospitals.find(h => h.id === activeHoverId)?.address}
              </div>
            </div>
          </div>
          <span className="px-2 py-1 bg-teal-500/10 text-teal-300 font-mono text-[10px] rounded-lg border border-teal-500/30">
            GPS Verified
          </span>
        </div>
      )}
    </div>
  );
};
