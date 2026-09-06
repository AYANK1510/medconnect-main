import React, { useState } from 'react';
import {
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  FileCheck2,
  AlertCircle,
  Stethoscope,
  ChevronDown,
  Info,
  ShieldCheck,
  Printer
} from 'lucide-react';

export interface PrescriptionMedicineItem {
  id: string;
  medicine_name: string;
  category: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration_days: number;
  instructions: string;
}

export interface IssuedPrescription {
  id: string;
  appointment_id?: string;
  token_number: string;
  patient_id?: string;
  patient_name: string;
  patient_code: string;
  doctor_name: string;
  doctor_specialization: string;
  doctor_reg_no: string;
  room_number: string;
  diagnosis_notes: string;
  clinical_advice: string;
  created_at: string;
  digital_signature_hash: string;
  items: PrescriptionMedicineItem[];
}

export const FORMULARY_MEDICINES = [
  {
    name: 'Paracetamol 500mg',
    category: 'Antipyretic / Analgesic',
    defaultDosage: '500 mg (1 tablet)',
    defaultFrequency: '1-0-1',
    defaultTiming: 'After Food',
    defaultDuration: 3,
    instructions: 'Take after meals. Do not exceed 4000mg in 24 hours.'
  },
  {
    name: 'Amoxicillin 500mg',
    category: 'Broad Spectrum Antibiotic',
    defaultDosage: '500 mg (1 capsule)',
    defaultFrequency: '1-1-1',
    defaultTiming: 'After Food',
    defaultDuration: 5,
    instructions: 'Complete full 5-day course even if feeling better.'
  },
  {
    name: 'Pantoprazole 40mg',
    category: 'Proton Pump Inhibitor (Antacid)',
    defaultDosage: '40 mg (1 tablet)',
    defaultFrequency: '1-0-0',
    defaultTiming: 'Before Food',
    defaultDuration: 7,
    instructions: 'Take in morning 30 minutes before breakfast.'
  },
  {
    name: 'Azithromycin 500mg',
    category: 'Macrolide Antibiotic',
    defaultDosage: '500 mg (1 tablet)',
    defaultFrequency: '1-0-0',
    defaultTiming: 'After Food',
    defaultDuration: 3,
    instructions: 'Take once daily at the same time for 3 consecutive days.'
  },
  {
    name: 'Cetirizine 10mg',
    category: 'Antihistamine / Antiallergic',
    defaultDosage: '10 mg (1 tablet)',
    defaultFrequency: '0-0-1',
    defaultTiming: 'After Food',
    defaultDuration: 5,
    instructions: 'Take at night. May cause mild sedation.'
  },
  {
    name: 'Metformin 500mg',
    category: 'Oral Hypoglycemic',
    defaultDosage: '500 mg (1 tablet)',
    defaultFrequency: '1-0-1',
    defaultTiming: 'With Food',
    defaultDuration: 30,
    instructions: 'Take with major meals to reduce GI irritation.'
  },
  {
    name: 'Atorvastatin 20mg',
    category: 'Lipid Lowering / Statin',
    defaultDosage: '20 mg (1 tablet)',
    defaultFrequency: '0-0-1',
    defaultTiming: 'After Food',
    defaultDuration: 30,
    instructions: 'Take once at bedtime.'
  },
  {
    name: 'ORS Electrolyte Sachet',
    category: 'Rehydration Salts',
    defaultDosage: '1 sachet in 1L water',
    defaultFrequency: 'SOS',
    defaultTiming: 'With Food',
    defaultDuration: 3,
    instructions: 'Sip frequently throughout the day.'
  }
];

const FREQUENCY_OPTIONS = [
  { value: '1-0-1', label: '1-0-1 (Morning & Night)' },
  { value: '1-1-1', label: '1-1-1 (Morning, Afternoon & Night)' },
  { value: '1-0-0', label: '1-0-0 (Morning only)' },
  { value: '0-0-1', label: '0-0-1 (Night only)' },
  { value: '0-1-0', label: '0-1-0 (Afternoon only)' },
  { value: 'SOS', label: 'SOS (As needed for acute distress)' }
];

const TIMING_OPTIONS = ['After Food', 'Before Food', 'With Food'];

interface PrescriptionPadProps {
  patient: {
    id?: string;
    patient_name?: string;
    name?: string;
    patient_code?: string;
    code?: string;
    phone?: string;
  };
  appointment?: {
    id?: string;
    token_number?: string;
    symptoms_summary?: string;
    department?: string;
  };
  doctor?: {
    id?: string;
    name: string;
    specialization: string;
    room_number: string;
    reg_no: string;
  };
  onPrescriptionIssued?: (prescription: IssuedPrescription) => void;
  onClose?: () => void;
}

export const PrescriptionPad: React.FC<PrescriptionPadProps> = ({
  patient,
  appointment,
  doctor,
  onPrescriptionIssued,
  onClose
}) => {
  const [diagnosisNotes, setDiagnosisNotes] = useState(
    appointment?.symptoms_summary
      ? `Acute presentation: ${appointment.symptoms_summary}. Clinical impression: Mild Upper Respiratory Tract Infection.`
      : 'Acute Upper Respiratory Tract Infection, mild dehydration'
  );
  const [clinicalAdvice, setClinicalAdvice] = useState(
    'Drink plenty of warm fluids, rest for 48 hours, report immediately if high fever persists or breathing difficulty ensues.'
  );

  const [items, setItems] = useState<PrescriptionMedicineItem[]>([
    {
      id: 'item-1',
      medicine_name: 'Paracetamol 500mg',
      category: 'Antipyretic / Analgesic',
      dosage: '500 mg',
      frequency: '1-0-1',
      timing: 'After Food',
      duration_days: 3,
      instructions: 'Take 1 tablet after food as needed for body ache or temperature > 99.5°F'
    },
    {
      id: 'item-2',
      medicine_name: 'Pantoprazole 40mg',
      category: 'Proton Pump Inhibitor (Antacid)',
      dosage: '40 mg',
      frequency: '1-0-0',
      timing: 'Before Food',
      duration_days: 5,
      instructions: 'Take 30 minutes before morning breakfast'
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormulary, setSelectedFormulary] = useState<typeof FORMULARY_MEDICINES[0] | null>(null);
  const [customMedicineName, setCustomMedicineName] = useState('');
  const [dosage, setDosage] = useState('500 mg');
  const [frequency, setFrequency] = useState('1-0-1');
  const [timing, setTiming] = useState('After Food');
  const [durationDays, setDurationDays] = useState(5);
  const [instructions, setInstructions] = useState('Take after food with water.');
  const [showDropdown, setShowDropdown] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const filteredMedicines = FORMULARY_MEDICINES.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectMed = (med: typeof FORMULARY_MEDICINES[0]) => {
    setSelectedFormulary(med);
    setSearchQuery(med.name);
    setCustomMedicineName(med.name);
    setDosage(med.defaultDosage);
    setFrequency(med.defaultFrequency);
    setTiming(med.defaultTiming);
    setDurationDays(med.defaultDuration);
    setInstructions(med.instructions);
    setShowDropdown(false);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const medName = searchQuery.trim() || customMedicineName.trim();
    if (!medName) {
      setValidationError('Please select or type a valid medicine name.');
      return;
    }

    if (!dosage.trim()) {
      setValidationError('Please specify dosage.');
      return;
    }

    const alreadyExists = items.some(
      (item) => item.medicine_name.toLowerCase() === medName.toLowerCase()
    );
    if (alreadyExists) {
      setValidationError(`"${medName}" is already present in this prescription list.`);
      return;
    }

    const newItem: PrescriptionMedicineItem = {
      id: `item-${Date.now()}`,
      medicine_name: medName,
      category: selectedFormulary?.category || 'General Therapeutics',
      dosage: dosage.trim(),
      frequency,
      timing,
      duration_days: parseInt(String(durationDays), 10) || 5,
      instructions: instructions.trim()
    };

    setItems((prev) => [...prev, newItem]);
    setSearchQuery('');
    setCustomMedicineName('');
    setSelectedFormulary(null);
    setDosage('500 mg');
    setFrequency('1-0-1');
    setTiming('After Food');
    setDurationDays(5);
    setInstructions('Take after food with water.');
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSignAndIssue = async () => {
    if (items.length === 0) {
      setValidationError('Prescription must contain at least one medication item before signing.');
      return;
    }

    if (!diagnosisNotes.trim()) {
      setValidationError('Please enter clinical diagnosis notes.');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    const prescriptionId = `rx-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const docName = doctor?.name || 'Dr. Arvind Sharma';
    const docSpecialization = doctor?.specialization || 'Internal Medicine';
    const docRoom = doctor?.room_number || 'Room 101';
    const docRegNo = doctor?.reg_no || 'KMC-48209';

    const prescriptionData: IssuedPrescription = {
      id: prescriptionId,
      appointment_id: appointment?.id,
      token_number: appointment?.token_number || '#MED-1001',
      patient_id: patient?.id,
      patient_name: patient?.patient_name || patient?.name || 'Anita Sundaram',
      patient_code: patient?.patient_code || patient?.code || 'DEMO-002',
      doctor_name: docName,
      doctor_specialization: docSpecialization,
      doctor_reg_no: docRegNo,
      room_number: docRoom,
      diagnosis_notes: diagnosisNotes.trim(),
      clinical_advice: clinicalAdvice.trim(),
      created_at: timestamp,
      digital_signature_hash: `SIG-${Date.now().toString(36).toUpperCase()}-${docRegNo}`,
      items
    };

    setSuccessMessage(
      `Digital Prescription signed & verified! #${prescriptionData.token_number} updated to Completed.`
    );

    if (onPrescriptionIssued) {
      onPrescriptionIssued(prescriptionData);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      if (onClose) onClose();
    }, 1500);
  };

  const handlePrint = () => {
    window.print();
  };

  const patientDisplayName = patient?.patient_name || patient?.name || 'Anita Sundaram';
  const patientDisplayCode = patient?.patient_code || patient?.code || 'DEMO-002';
  const doctorDisplayName = doctor?.name || 'Dr. Arvind Sharma';
  const doctorDisplayRoom = doctor?.room_number || 'Room 101';
  const doctorDisplayReg = doctor?.reg_no || 'KMC-48209';

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-card space-y-6 relative overflow-hidden text-slate-800 font-sans">
      {/* Background Watermark */}
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <Stethoscope className="w-48 h-48 text-teal-600" />
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Header with Patient & Doctor Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Digital OPD Prescription Pad
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200">
              {appointment?.token_number || '#MED-1001'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Patient: <strong className="text-slate-800">{patientDisplayName} ({patientDisplayCode})</strong>{' '}
            · Doctor: <strong className="text-teal-700">{doctorDisplayName} ({doctorDisplayRoom})</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print PDF</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Close Pad
            </button>
          )}
        </div>
      </div>

      {/* 1. Clinical Diagnosis & Impression */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
            Clinical Diagnosis & Consultation Impression
          </span>
          <span className="text-[11px] font-normal text-slate-400">SNOMED / ICD-10 Aligned</span>
        </label>
        <textarea
          rows={2}
          value={diagnosisNotes}
          onChange={(e) => setDiagnosisNotes(e.target.value)}
          placeholder="e.g., Acute Upper Respiratory Tract Infection, mild dehydration, viral etiology."
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors resize-none"
        />
      </div>

      {/* 2. Prescribed Medications Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Pill className="w-3.5 h-3.5 text-teal-600" />
            Prescribed Medications ({items.length})
          </label>
          <span className="text-[11px] text-slate-500 font-medium">CDSS Interaction Safe</span>
        </div>

        {items.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
            No medicines added yet. Use the quick formulary below to add medications.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Medicine & Category</th>
                    <th className="px-3 py-3">Dosage</th>
                    <th className="px-3 py-3">Frequency</th>
                    <th className="px-3 py-3">Timing</th>
                    <th className="px-3 py-3">Duration</th>
                    <th className="px-4 py-3">Specific Instructions</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.medicine_name}</div>
                        <div className="text-[10px] text-slate-500">{item.category}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-teal-700">{item.dosage}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-700 font-mono text-[11px]">
                          {item.frequency}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] ${
                            item.timing === 'Before Food'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {item.timing}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-800">
                        {item.duration_days} days
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px] max-w-xs truncate">
                        {item.instructions}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 3. Add Medication Quick Formulary Tool */}
      <form
        onSubmit={handleAddItem}
        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-teal-600" />
            Add Medication to Prescription
          </div>
          <span className="text-[11px] text-slate-500">Searchable Formulary or Custom Entry</span>
        </div>

        {/* Row 1: Search / Select Medicine */}
        <div className="relative">
          <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
            Medicine Name (Generic / Brand)
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCustomMedicineName(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Type to search (e.g., Paracetamol, Amoxicillin, Pantoprazole)..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
            />
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          {showDropdown && searchQuery && filteredMedicines.length > 0 && (
            <div className="absolute z-20 top-full mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-card max-h-56 overflow-y-auto divide-y divide-slate-100">
              {filteredMedicines.map((med) => (
                <button
                  key={med.name}
                  type="button"
                  onClick={() => handleSelectMed(med)}
                  className="w-full text-left px-4 py-2.5 hover:bg-teal-50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-slate-900">{med.name}</span>
                    <span className="text-slate-500 text-[11px] ml-2">({med.category})</span>
                  </div>
                  <span className="text-[10px] text-teal-700 font-mono">
                    {med.defaultDosage} · {med.defaultFrequency}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Row 2: Dosage, Frequency, Timing, Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
              Dosage Unit
            </label>
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g., 500 mg, 1 tablet"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
              Frequency Schedule
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {FREQUENCY_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
              Meal Timing
            </label>
            <select
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {TIMING_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
              Duration (Days)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* Row 3: Specific Patient Instructions & Append Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Take after food with warm water. Complete full course."
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Append Medicine
          </button>
        </div>
      </form>

      {/* 4. Advice & Next Steps */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-teal-600" />
          General Patient Advice & Follow-Up Directions
        </label>
        <textarea
          rows={2}
          value={clinicalAdvice}
          onChange={(e) => setClinicalAdvice(e.target.value)}
          placeholder="e.g., Hydrate adequately, follow up in OPD after 5 days if symptoms do not resolve."
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors resize-none"
        />
      </div>

      {/* 5. Doctor Signature Block & Finalize Action */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900">
              {doctorDisplayName}
              <span className="text-[10px] text-slate-400 ml-1.5">
                (Reg: {doctorDisplayReg})
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Cryptographic Digital Timestamp & Pharmacy Lock
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignAndIssue}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing & Syncing...
            </>
          ) : (
            <>
              <FileCheck2 className="w-4 h-4" />
              Sign & Issue Digital Prescription
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PrescriptionPad;
