import React, { useState, useMemo } from 'react';
import type { Hospital } from '../types/database.types';
import {
  Compass,
  Layers,
  Bed,
  Droplet,
  Wind,
  Activity,
  Building2
} from 'lucide-react';

export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

interface HospitalNetworkMapProps {
  centerHospital?: Hospital;
  hospitals: Hospital[];
  onSelectHospital?: (hospital: Hospital) => void;
  radiusKm?: number;
  onRadiusChange?: (radius: number) => void;
}

export const HospitalNetworkMap: React.FC<HospitalNetworkMapProps> = ({
  centerHospital,
  hospitals,
  onSelectHospital,
  radiusKm = 10,
  onRadiusChange
}) => {
  const [selectedRadius, setSelectedRadius] = useState<number>(radiusKm);
  const [hoveredHospitalId, setHoveredHospitalId] = useState<string | null>(null);
  const [showResourceOverlay, setShowResourceOverlay] = useState<boolean>(true);

  const activeRadius = onRadiusChange ? radiusKm : selectedRadius;

  const handleRadiusClick = (r: number) => {
    setSelectedRadius(r);
    if (onRadiusChange) onRadiusChange(r);
  };

  // Center reference hospital
  const selectedCenter = centerHospital || hospitals[0] || {
    id: 'hosp-101',
    name: 'Metro City General Hospital',
    latitude: 12.9716,
    longitude: 77.5946,
    address: 'Central Bangalore'
  };

  // Radar geometry
  const radarSize = 380;
  const center = radarSize / 2; // 190
  const maxDisplayRadiusKm = 18.0;
  const radarInnerRadiusPx = 165;

  const plottedHospitals = useMemo(() => {
    return hospitals.map((hosp, idx) => {
      const distance = calculateHaversineDistance(
        selectedCenter.latitude,
        selectedCenter.longitude,
        hosp.latitude,
        hosp.longitude
      );

      const isCenter = hosp.id === selectedCenter.id;
      const inRange = distance <= activeRadius;

      let x = center;
      let y = center;

      if (!isCenter) {
        const dLat = hosp.latitude - selectedCenter.latitude;
        const dLng =
          (hosp.longitude - selectedCenter.longitude) *
          Math.cos(((selectedCenter.latitude + hosp.latitude) / 2) * (Math.PI / 180));

        const angleRad = Math.atan2(dLng, dLat);
        const rPx = Math.min(
          radarInnerRadiusPx,
          (distance / maxDisplayRadiusKm) * radarInnerRadiusPx
        );

        x = center + rPx * Math.sin(angleRad);
        y = center - rPx * Math.cos(angleRad);
      }

      // Mock resource inventory per hospital for rich visual inspection
      const mockResources = {
        icuBeds: 4 + (idx * 3) % 12,
        bloodUnits: 6 + (idx * 5) % 18,
        oxygenCylinders: 15 + (idx * 7) % 40,
        ventilators: 3 + (idx * 2) % 8,
        etaMinutes: Math.max(5, Math.round(distance * 3.5))
      };

      return {
        ...hosp,
        distance,
        isCenter,
        inRange,
        radarX: Math.round(x * 10) / 10,
        radarY: Math.round(y * 10) / 10,
        resources: mockResources
      };
    });
  }, [selectedCenter, hospitals, activeRadius, center, radarInnerRadiusPx, maxDisplayRadiusKm]);

  // Concentric Rings in pixels
  const ring5KmPx = (5.0 / maxDisplayRadiusKm) * radarInnerRadiusPx;
  const ring10KmPx = (10.0 / maxDisplayRadiusKm) * radarInnerRadiusPx;
  const ring15KmPx = (15.0 / maxDisplayRadiusKm) * radarInnerRadiusPx;
  const activeRadiusPx = (activeRadius / maxDisplayRadiusKm) * radarInnerRadiusPx;

  const activeHoveredHospital = plottedHospitals.find((h) => h.id === hoveredHospitalId);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-slate-200 font-sans relative overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-600/15 border border-teal-500/30 rounded-xl text-teal-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
              Regional Proximity Radar
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-teal-950/70 text-teal-300 border border-teal-800/60 font-mono">
                Geodesic Proximity
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Center: <span className="text-slate-200 font-medium">{selectedCenter.name}</span>
            </p>
          </div>
        </div>

        {/* Quick Radius Selector */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleRadiusClick(10)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeRadius === 10
                  ? 'bg-teal-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              10 km (Standard)
            </button>
            <button
              type="button"
              onClick={() => handleRadiusClick(15)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeRadius === 15
                  ? 'bg-amber-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              15 km (Extended)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowResourceOverlay(!showResourceOverlay)}
            className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition-all cursor-pointer ${
              showResourceOverlay
                ? 'bg-slate-800 border-slate-700 text-teal-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle Resource Badges"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Radar Viewport */}
      <div className="relative w-full aspect-square max-h-[380px] mx-auto flex items-center justify-center select-none">
        <svg
          viewBox={`0 0 ${radarSize} ${radarSize}`}
          className="w-full h-full rounded-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-inner border border-slate-800"
        >
          <defs>
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="70%" stopColor="#065f46" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#022c22" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="activeRadiusAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.03" />
              <stop offset="90%" stopColor="#06b6d4" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.25" />
            </radialGradient>

            <linearGradient id="radarBeamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>

            <filter id="blipGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background circular radar base */}
          <circle cx={center} cy={center} r={radarInnerRadiusPx} fill="url(#radarGlow)" />

          {/* Dynamic Active Radius Area */}
          <circle
            cx={center}
            cy={center}
            r={activeRadiusPx}
            fill="url(#activeRadiusAura)"
            stroke="#06b6d4"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            className="transition-all duration-500 ease-out"
          />

          {/* 5 km Concentric Ring */}
          <circle
            cx={center}
            cy={center}
            r={ring5KmPx}
            fill="none"
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <text x={center + ring5KmPx + 3} y={center - 3} fill="#64748b" fontSize="9" fontFamily="monospace">
            5 km
          </text>

          {/* 10 km Concentric Ring */}
          <circle
            cx={center}
            cy={center}
            r={ring10KmPx}
            fill="none"
            stroke="#10b981"
            strokeOpacity="0.4"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          <text x={center + ring10KmPx + 3} y={center - 3} fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="monospace">
            10 km
          </text>

          {/* 15 km Concentric Ring */}
          <circle
            cx={center}
            cy={center}
            r={ring15KmPx}
            fill="none"
            stroke="#f59e0b"
            strokeOpacity="0.35"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <text x={center + ring15KmPx + 3} y={center - 3} fill="#f59e0b" fontSize="9" fontFamily="monospace">
            15 km
          </text>

          {/* Crosshair Graticule Lines */}
          <line x1={center - radarInnerRadiusPx} y1={center} x2={center + radarInnerRadiusPx} y2={center} stroke="#1e293b" strokeWidth="1" />
          <line x1={center} y1={center - radarInnerRadiusPx} x2={center} y2={center + radarInnerRadiusPx} stroke="#1e293b" strokeWidth="1" />

          {/* Compass Cardinal Points */}
          <text x={center - 3} y={center - radarInnerRadiusPx + 14} fill="#475569" fontSize="10" fontWeight="bold">N</text>
          <text x={center + radarInnerRadiusPx - 14} y={center + 4} fill="#475569" fontSize="10" fontWeight="bold">E</text>
          <text x={center - 3} y={center + radarInnerRadiusPx - 6} fill="#475569" fontSize="10" fontWeight="bold">S</text>
          <text x={center - radarInnerRadiusPx + 6} y={center + 4} fill="#475569" fontSize="10" fontWeight="bold">W</text>

          {/* Rotating Animated Radar Sweep Line */}
          <g style={{ transformOrigin: `${center}px ${center}px` }} className="animate-[spin_4s_linear_infinite]">
            <path
              d={`M ${center} ${center} L ${center} ${center - radarInnerRadiusPx} A ${radarInnerRadiusPx} ${radarInnerRadiusPx} 0 0 1 ${center + 80} ${center - 144} Z`}
              fill="url(#radarBeamGradient)"
              opacity="0.25"
            />
            <line
              x1={center}
              y1={center}
              x2={center}
              y2={center - radarInnerRadiusPx}
              stroke="#34d399"
              strokeWidth="2"
              filter="url(#blipGlow)"
            />
          </g>

          {/* Center Hospital Beacon (Selected Facility) */}
          <circle cx={center} cy={center} r="7" fill="#38bdf8" filter="url(#blipGlow)" />
          <circle cx={center} cy={center} r="14" fill="none" stroke="#38bdf8" strokeWidth="1.5" className="animate-ping" />

          {/* Plotted Neighbor Hospitals */}
          {plottedHospitals.map((hosp) => {
            if (hosp.isCenter) return null;
            const isHovered = hosp.id === hoveredHospitalId;

            return (
              <g
                key={hosp.id}
                transform={`translate(${hosp.radarX}, ${hosp.radarY})`}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredHospitalId(hosp.id)}
                onMouseLeave={() => setHoveredHospitalId(null)}
                onClick={() => onSelectHospital && onSelectHospital(hosp)}
              >
                {/* Node blip circle */}
                <circle
                  r={isHovered ? '8' : '6'}
                  fill={hosp.inRange ? '#10b981' : '#f43f5e'}
                  stroke="#0f172a"
                  strokeWidth="2"
                  filter={hosp.inRange ? 'url(#blipGlow)' : undefined}
                  className="transition-all"
                />
                <circle
                  r={isHovered ? '14' : '11'}
                  fill="none"
                  stroke={hosp.inRange ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}
                  strokeWidth="1.5"
                />
                <text
                  y="-11"
                  fill={hosp.inRange ? '#f8fafc' : '#94a3b8'}
                  fontSize="8"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {hosp.name.split(' ')[0]} ({hosp.distance}km)
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected / Hovered Hospital Info Card Overlay */}
      {activeHoveredHospital && (
        <div className="p-4 bg-slate-900 border border-teal-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <span>{activeHoveredHospital.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950 border border-teal-600/40 text-teal-300">
                  {activeHoveredHospital.distance} km away
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {activeHoveredHospital.address} · Est. Transit: ~{activeHoveredHospital.resources.etaMinutes} mins
              </div>
            </div>
          </div>

          {showResourceOverlay && (
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] shrink-0">
              <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block flex items-center justify-center gap-1">
                  <Bed className="w-3 h-3 text-teal-400" /> Beds
                </span>
                <strong className="text-white font-mono">{activeHoveredHospital.resources.icuBeds}</strong>
              </div>
              <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block flex items-center justify-center gap-1">
                  <Droplet className="w-3 h-3 text-rose-400" /> O-
                </span>
                <strong className="text-white font-mono">{activeHoveredHospital.resources.bloodUnits}</strong>
              </div>
              <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block flex items-center justify-center gap-1">
                  <Wind className="w-3 h-3 text-cyan-400" /> O2
                </span>
                <strong className="text-white font-mono">{activeHoveredHospital.resources.oxygenCylinders}</strong>
              </div>
              <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block flex items-center justify-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400" /> Vent
                </span>
                <strong className="text-white font-mono">{activeHoveredHospital.resources.ventilators}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HospitalNetworkMap;
