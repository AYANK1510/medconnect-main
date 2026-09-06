import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { MapPin, Phone, Plus, X, Building2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { calculateDistanceKm } from '../services/geoService';
import { validateHospitalRadius, checkDuplicateHospital } from '../services/hospitalService';

export const HospitalNetworkPage: React.FC = () => {
  const { hospitals, addHospital } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('28.5850');
  const [longitude, setLongitude] = useState('77.2150');
  const [phone, setPhone] = useState('+91-11-23456789');
  const [emergencyContact, setEmergencyContact] = useState('+91-11-99990005');
  const [icuAvailable, setIcuAvailable] = useState('4');
  const [icuTotal, setIcuTotal] = useState('6');
  const [oxygenAvailable, setOxygenAvailable] = useState('15');
  const [oxygenTotal, setOxygenTotal] = useState('20');
  const [bloodONeg, setBloodONeg] = useState('8');

  // Base hospital for distance calculation (Metro City General Hospital)
  const baseHospital = hospitals[0] || { lat: 28.6139, lng: 77.2090 };

  // Live GPS Distance preview
  const liveDistanceInfo = useMemo(() => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
      return { isValid: false, distanceKm: 0, message: 'Enter valid GPS coordinates' };
    }
    const check = validateHospitalRadius(lat, lng);
    return {
      isValid: check.isValid,
      distanceKm: check.distanceKm,
      message: check.error || `${check.distanceKm} km from central hub (Within allowed 15 km radius)`,
    };
  }, [latitude, longitude]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (!name.trim()) {
      setFormError('Hospital name is required.');
      return;
    }
    if (!address.trim()) {
      setFormError('Hospital address is required.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Contact phone number is required.');
      return;
    }

    // Radius validation
    const radiusCheck = validateHospitalRadius(lat, lng);
    if (!radiusCheck.isValid) {
      setFormError(radiusCheck.error || 'Hospital is outside the allowed 15.0 km emergency radius.');
      return;
    }

    // Duplicate prevention
    const dupCheck = checkDuplicateHospital(name, lat, lng, code);
    if (dupCheck.isDuplicate) {
      setFormError(dupCheck.reason || 'This hospital is already registered in the network.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addHospital({
        name: name.trim(),
        code: code.trim().toUpperCase() || undefined,
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        phone: phone.trim(),
        emergency_contact: emergencyContact.trim() || undefined,
        icuBedsAvailable: parseInt(icuAvailable, 10) || 0,
        icuBedsTotal: parseInt(icuTotal, 10) || 0,
        oxygenUnitsAvailable: parseInt(oxygenAvailable, 10) || 0,
        oxygenUnitsTotal: parseInt(oxygenTotal, 10) || 0,
        bloodInventory: {
          'O-': parseInt(bloodONeg, 10) || 0,
        },
      });

      // Reset form and close
      setName('');
      setCode('');
      setAddress('');
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add hospital.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <span className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider block">
            REGIONAL INFRASTRUCTURE
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            15 KM Emergency Hospital Network
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            Real-time GPS coordinate mapping and resource availability across regional hospital nodes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Network Hospital</span>
        </button>
      </div>

      {/* Hospital Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {hospitals.map((hosp, idx) => {
          // Calculate dynamic Haversine distance from the primary center hospital
          let dist = hosp.distanceKm;
          if (dist === undefined) {
            const hLat = hosp.lat ?? hosp.latitude;
            const hLng = hosp.lng ?? hosp.longitude;
            const bLat = baseHospital.lat ?? (baseHospital as any).latitude ?? 28.6139;
            const bLng = baseHospital.lng ?? (baseHospital as any).longitude ?? 77.2090;
            if (hLat !== undefined && hLng !== undefined) {
              try {
                dist = idx === 0 ? 0.0 : calculateDistanceKm(bLat, bLng, hLat, hLng);
              } catch {
                dist = 5.0;
              }
            } else {
              dist = 5.0;
            }
          }

          return (
            <div
              key={hosp.id}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-4 hover:border-slate-300 hover:shadow-card-hover transition-all group"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-blue-600 font-bold">{hosp.code || 'HOSP'}</div>
                  <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {hosp.name}
                  </h3>
                </div>
                <Badge variant={dist <= 15.0 ? 'blue' : 'warning'} size="sm">
                  {dist.toFixed(1)} km
                </Badge>
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{hosp.address}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] text-slate-500 font-medium">ICU Beds</div>
                  <div className="font-bold text-blue-600 text-sm mt-0.5 font-mono tabular-nums">
                    {hosp.icuBedsAvailable} / {hosp.icuBedsTotal}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] text-slate-500 font-medium">Oxygen</div>
                  <div className="font-bold text-slate-800 text-sm mt-0.5 font-mono tabular-nums">
                    {hosp.oxygenUnitsAvailable}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] text-slate-500 font-medium">O- Blood</div>
                  <div className="font-bold text-emerald-600 text-sm mt-0.5 font-mono tabular-nums">
                    {hosp.bloodInventory?.['O-'] ?? 0}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-100 flex-wrap gap-2">
                <span className="text-slate-500 flex items-center space-x-1 font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{hosp.phone}</span>
                </span>
                <Badge variant="green" dot size="sm">
                  Operational
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Network Hospital Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Register Network Hospital</h3>
                  <p className="text-xs text-slate-500 font-normal">
                    Add a regional hospital within the 15 km emergency geo-fence.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Live Radius Distance Indicator */}
            <div
              className={`p-3 rounded-xl text-xs flex items-center space-x-2 border transition-all ${
                liveDistanceInfo.isValid
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {liveDistanceInfo.isValid ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="font-medium">
                {liveDistanceInfo.isValid
                  ? `✓ Valid Location: ${liveDistanceInfo.distanceKm.toFixed(1)} km from center (Within allowed 15 km radius)`
                  : liveDistanceInfo.message}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Hospital Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex South Specialty Hospital"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Code</label>
                  <input
                    type="text"
                    placeholder="HOSP-ASSH"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 72 Outer Ring Road, Sector 15"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Phone & Hotline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Phone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Emergency Hotline</label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Initial Emergency Inventory */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Initial Resource Sharing Capacity
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-600 font-medium block">ICU Beds (Avail/Tot)</label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="0"
                        value={icuAvailable}
                        onChange={(e) => setIcuAvailable(e.target.value)}
                        className="w-12 px-1.5 py-1 text-xs text-center rounded-lg bg-white border border-slate-200"
                      />
                      <span className="text-xs text-slate-400">/</span>
                      <input
                        type="number"
                        min="0"
                        value={icuTotal}
                        onChange={(e) => setIcuTotal(e.target.value)}
                        className="w-12 px-1.5 py-1 text-xs text-center rounded-lg bg-white border border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-600 font-medium block">Oxygen (Avail/Tot)</label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="0"
                        value={oxygenAvailable}
                        onChange={(e) => setOxygenAvailable(e.target.value)}
                        className="w-12 px-1.5 py-1 text-xs text-center rounded-lg bg-white border border-slate-200"
                      />
                      <span className="text-xs text-slate-400">/</span>
                      <input
                        type="number"
                        min="0"
                        value={oxygenTotal}
                        onChange={(e) => setOxygenTotal(e.target.value)}
                        className="w-12 px-1.5 py-1 text-xs text-center rounded-lg bg-white border border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-600 font-medium block">O- Blood Units</label>
                    <input
                      type="number"
                      min="0"
                      value={bloodONeg}
                      onChange={(e) => setBloodONeg(e.target.value)}
                      className="w-full px-2 py-1 text-xs text-center rounded-lg bg-white border border-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!liveDistanceInfo.isValid || isSubmitting}
                  className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                    !liveDistanceInfo.isValid || isSubmitting
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-sm cursor-pointer'
                  }`}
                >
                  {isSubmitting ? (
                    <span>Registering...</span>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Register Hospital</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalNetworkPage;

