import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { AuditConsoleModal } from '../components/AuditConsoleModal';
import {
  HeartPulse,
  User,
  Building2,
  ArrowRight,
  CheckCircle2,
  Clock,
  Radio,
  Mic,
  MapPin,
  Terminal,
  Languages
} from 'lucide-react';
import { Badge, Button } from '../components/ui';

interface LandingPageProps {
  onNavigate?: (section: string, tab?: string | null) => void;
  onOpenAudit?: () => void;
  onResetDemo?: () => void;
  isResetting?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onNavigate, 
  onOpenAudit, 
  onResetDemo: _onResetDemo, 
  isResetting: _isResetting = false 
}) => {
  const { setActivePage, emergencyRequests } = useApp();
  const { switchRole } = useAuth();
  const navigate = useNavigate();

  const [selectedLanguageDemo, setSelectedLanguageDemo] = useState('en');
  const [auditOpen, setAuditOpen] = useState(false);
  const handleOpenAudit = onOpenAudit || (() => setAuditOpen(true));

  const languages = [
    { code: 'en', name: 'English', text: '“I need an orthopedic appointment for knee pain tomorrow morning.”' },
    { code: 'hi', name: 'हिन्दी (Hindi)', text: '“मुझे कल सुबह डॉक्टर से छाती के दर्द के लिए मिलना है।”' },
    { code: 'ta', name: 'தமிழ் (Tamil)', text: '“எனக்கு நாளை காலை பொது மருத்துவரை பார்க்க வேண்டும்.”' },
    { code: 'te', name: 'తెలుగు (Telugu)', text: '“నాకు నిన్నటి నుండి తీవ్రమైన కడుపు నొప్పి ఉంది.”' },
  ];

  const navigateTo = (section: string, tab: string | null = null) => {
    if (onNavigate) {
      onNavigate(section, tab);
    } else {
      if (section === 'landing') setActivePage('landing');
      else if (section === 'patients-landing') setActivePage('patients_landing');
      else if (section === 'hospitals-landing') setActivePage('hospitals_landing');
      else if (section === 'patients-app') {
        switchRole('patient');
        setActivePage('patient');
      } else if (section === 'hospitals-app') {
        switchRole('hospital_admin');
        if (tab === 'emergency') setActivePage('emergency_dispatch');
        else if (tab === 'doctor') setActivePage('doctors');
        else setActivePage('reception');
      } else if (section === 'login') {
        navigate('/login');
      }
    }
  };

  const handlePatientClick = () => {
    navigateTo('patients-landing');
  };

  const handleHospitalStaffClick = () => {
    navigateTo('hospitals-landing');
  };

  const handleAiReceptionistClick = () => {
    navigateTo('ai-receptionist');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      {/* ======================================================= */}
      {/* 1. HERO SECTION                                         */}
      {/* ======================================================= */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-white via-blue-50/20 to-slate-50 border-b border-slate-200/80">
        
        {/* Subtle decorative background circles */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Hero Copy & CTA Cards (7 Cols) */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-extrabold tracking-wider uppercase shadow-soft">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>REAL-TIME • AI-POWERED • FOR A HEALTHIER TOMORROW</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                Healthcare{' '}
                <span className="text-emerald-600 block sm:inline">
                  Without Delays
                </span>
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-2xl">
                AI-powered appointments, real-time emergency resource sharing, and a connected hospital network — all in one platform.
              </p>

              {/* Two CTA Cards: I'm a Patient & I'm Hospital Staff */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                
                {/* CTA Card 1: Patient */}
                <div
                  onClick={handlePatientClick}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                      <User className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                      Patient Portal
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                      <span>I'm a Patient</span>
                      <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-600" />
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Book, check, track
                    </p>
                  </div>
                </div>

                {/* CTA Card 2: Hospital Staff */}
                <div
                  onClick={handleHospitalStaffClick}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-sm">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      Clinical Ops
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center gap-1">
                      <span>I'm Hospital Staff</span>
                      <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-emerald-600" />
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Access dashboard
                    </p>
                  </div>
                </div>

              </div>

              {/* Bottom Reassurance Message */}
              <div className="pt-2 flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-slate-900 font-bold">Every second counts.</span>
                <span className="text-slate-500">We make sure help is closer.</span>
              </div>

            </div>

            {/* Right Column: Large Professional Healthcare Visual & Floating Card (5 Cols) */}
            <div className="lg:col-span-5 relative">
              
              {/* Main Visual Graphic Container */}
              <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 sm:p-8 text-white shadow-dropdown overflow-hidden border border-slate-800">
                
                {/* Background Radar Animation Circles */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <div className="w-72 h-72 rounded-full border border-blue-400 animate-ping" style={{ animationDuration: '4s' }} />
                  <div className="w-96 h-96 rounded-full border border-teal-400 absolute" />
                </div>

                {/* Header in graphic */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Bangalore Dispatch Grid</h4>
                      <p className="text-[10px] text-slate-400">Live Telemetry & Radar</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>

                {/* Hospital Nodes Visual */}
                <div className="py-6 space-y-3 relative z-10">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-xs font-bold text-white">DemoCare Central Hospital</p>
                        <p className="text-[10px] text-slate-400">MG Road • 1.4 km</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400">4 ICU Beds Free</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-xs font-bold text-white">Apollo Trauma Center</p>
                        <p className="text-[10px] text-slate-400">Indiranagar • 3.2 km</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400">6 ICU Beds Free</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-xs font-bold text-white">Manipal HAL Hospital</p>
                        <p className="text-[10px] text-slate-400">HAL Airport Rd • 5.1 km</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400">8 ICU Beds Free</span>
                  </div>
                </div>

                {/* Floating Card inside visual */}
                <div className="mt-2 bg-white text-slate-900 rounded-2xl p-5 shadow-dropdown border border-slate-100 relative z-20">
                  
                  <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Live Network Status
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60">
                      Operational
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-left text-xs">
                    
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[11px] font-bold text-slate-500">Nearby Hospitals</p>
                      <p className="text-sm font-extrabold text-slate-900 mt-0.5">8 within 15 km</p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">All synchronized</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[11px] font-bold text-slate-500">Critical Resources</p>
                      <p className="text-sm font-extrabold text-slate-900 mt-0.5">Available</p>
                      <p className="text-[10px] text-blue-600 font-semibold mt-0.5">ICU, O₂, Blood O-neg</p>
                    </div>

                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Active Emergency Requests</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      {emergencyRequests.length} in Queue • 4 Dispatched
                    </span>
                  </div>

                </div>

              </div>

            </div>

          </div>
        </div>

      </section>

      {/* ======================================================= */}
      {/* 2. METRICS STRIP                                        */}
      {/* ======================================================= */}
      <section className="py-12 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            
            {/* Metric 1 */}
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">50+</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">Hospitals Connected</p>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">10,000+</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">Patients Benefited</p>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 shadow-sm">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Under 3 Min</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">Average Emergency Response</p>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">15 km</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">Smart Geo-Dispatch Radius</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================= */}
      {/* 3. MULTILINGUAL VOICE DEMO STRIP                        */}
      {/* ======================================================= */}
      <section className="py-12 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Languages className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Natural Speech Intake</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Multilingual AI Clinical Receptionist
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Powered by Sarvam AI Indic language models with clinical entity extraction.
                </p>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/60">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguageDemo(lang.code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedLanguageDemo === lang.code
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Mic className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Simulated Patient Speech Query</p>
                  <p className="text-sm font-semibold text-slate-800 italic mt-0.5">
                    {languages.find((l) => l.code === selectedLanguageDemo)?.text}
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleAiReceptionistClick}
                rightIcon={ArrowRight}
                className="shrink-0"
              >
                Launch Live AI Receptionist
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================= */}
      {/* 4. FEATURE SECTION                                      */}
      {/* ======================================================= */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="blue" size="md" className="mb-3">
            Core Technological Pillars
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            One Platform. Many Lives. Real Impact.
          </h2>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Eliminating clinical bottlenecks from primary triage to high-acuity emergency dispatch.
          </p>
        </div>

        {/* Three Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: AI Receptionist */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-6 shadow-sm">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-3">
                AI Receptionist
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Multilingual triage in English, Hindi, Tamil, and Telugu. Understands symptoms, determines clinical urgency, and reserves an atomic slot in under 15 seconds.
              </p>
              
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sarvam AI Saaras STT & Bulbul TTS</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Automated department routing & safety checks</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Instant verified digital QR token pass</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiReceptionistClick}
                className="w-full justify-between"
                rightIcon={ArrowRight}
              >
                Try Voice Booking
              </Button>
            </div>
          </div>

          {/* Card 2: Emergency Geo-Dispatch */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-6 shadow-sm">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-3">
                Emergency Geo-Dispatch
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Instant Haversine-based broadcast to hospitals within 15 km. First responding hospital atomically locks ICU beds and oxygen cylinders with zero double allocations.
              </p>
              
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Sub-3-minute nearby radius dispatch</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>120-second automatic escalation timer</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Cryptographic QR ambulance pass</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
              <Button
                variant="emergency"
                size="sm"
                onClick={handleHospitalStaffClick}
                className="w-full justify-between shadow-sm"
                rightIcon={ArrowRight}
              >
                View Emergency Dispatch
              </Button>
            </div>
          </div>

          {/* Card 3: Unified Hospital Network */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-6 shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-3">
                Unified Hospital Network
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Interconnected clinical dashboard synchronizing OPD queues, doctor prescription pads, camera kiosk check-ins, and regional emergency capacity in real time.
              </p>
              
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Kiosk check-in with single-use verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Doctor OPD with ICD-10 drug interaction guards</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Reactive Supabase Realtime synchronization</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  switchRole('hospital_admin');
                  setActivePage('hospital_network');
                }}
                className="w-full justify-between"
                rightIcon={ArrowRight}
              >
                Explore Hospital Hub
              </Button>
            </div>
          </div>

        </div>

      </section>

      {/* ======================================================= */}
      {/* 5. OUR NETWORK SECTION                                  */}
      {/* ======================================================= */}
      <section id="network" className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Connected Across Bangalore's Key Corridors
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              Instant resource balancing between premier medical trauma hubs within 15 km.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-left">
            {[
              { name: 'DemoCare Central Hospital', loc: 'MG Road', beds: '4 ICU Beds', phone: '+91 80 2200 1111' },
              { name: 'Apollo Trauma Center', loc: 'Indiranagar 100ft', beds: '6 ICU Beds', phone: '+91 80 2500 2222' },
              { name: 'Manipal HAL Hospital', loc: 'HAL Airport Road', beds: '8 ICU Beds', phone: '+91 80 2600 3333' },
              { name: 'Fortis Bannerghatta', loc: 'Bannerghatta Road', beds: '3 ICU Beds', phone: '+91 80 2700 4444' },
              { name: 'Columbia Asia Whitefield', loc: 'Whitefield Main Rd', beds: '5 ICU Beds', phone: '+91 80 2800 5555' },
            ].map((h, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:bg-white hover:shadow-card transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-[11px] font-bold text-blue-700">{h.loc}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug mb-1">{h.name}</h4>
                <p className="text-[11px] font-semibold text-emerald-600 mb-2">{h.beds} Available</p>
                <p className="text-[10px] text-slate-500">{h.phone}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================= */}
      {/* 6. ABOUT SECTION                                        */}
      {/* ======================================================= */}
      <section id="about" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-900 to-blue-950 text-white shadow-dropdown grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          <div className="md:col-span-8 space-y-3">
            <Badge variant="blue" size="md">
              Enterprise Clinical Standards
            </Badge>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Designed For High-Throughput & Zero Double Allocations
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-2xl">
              MedConnect Pulse utilizes PostgreSQL row-level locking (<code className="text-blue-300 font-mono">FOR UPDATE</code>), cryptographic QR token hashes, and automated Telegram bots to deliver verifiable healthcare workflows.
            </p>
          </div>

          <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col gap-3 justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/login')}
              className="w-full shadow-md"
            >
              Sign In to Portal
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleOpenAudit}
              className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20"
              leftIcon={Terminal}
            >
              Open Audit Console
            </Button>
          </div>

        </div>
      </section>

      {/* ======================================================= */}
      {/* 7. FOOTER                                               */}
      {/* ======================================================= */}
      <footer className="bg-white border-t border-slate-200/80 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <HeartPulse className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-800">MedConnect Pulse</span>
            <span>• Connecting Care When Seconds Count</span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#network" className="hover:text-blue-600 transition-colors">Our Network</a>
            <a href="#about" className="hover:text-blue-600 transition-colors">About</a>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="hover:text-blue-600 transition-colors font-bold cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
      
      {/* Master Telemetry Audit Console Drawer */}
      <AuditConsoleModal
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
      />
    </div>
  );
};
