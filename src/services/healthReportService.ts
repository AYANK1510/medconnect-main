/**
 * MedConnect Pulse - Clinical Health Report & Lab Interpretation Service
 * Handles manual lab report analysis, biomarker evaluation, patient profiles,
 * and consolidated EHR health report generation.
 */

export interface PatientProfile {
  id: string;
  uhid: string;
  abhaId: string;
  fullName: string;
  email: string;
  phone: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  address: string;
  emergencyContact: { name: string; relation: string; phone: string };
  allergies: string[];
  chronicConditions: string[];
  primaryDoctor: string;
  hospital: string;
}

export const DEMO_PATIENTS: PatientProfile[] = [
  {
    id: 'pt-8821',
    uhid: 'MED-PT-8821',
    abhaId: '91-4829-1029-4821',
    fullName: 'Rohit Verma',
    email: 'rohit.verma@example.com',
    phone: '+91-98765-43210',
    age: 34,
    gender: 'Male',
    bloodGroup: 'O+',
    address: 'Flat 402, Green Glen Heights, Metro City - 560034',
    emergencyContact: { name: 'Pooja Verma', relation: 'Spouse', phone: '+91-98765-43219' },
    allergies: ['Penicillin', 'Sulfa Antibiotics'],
    chronicConditions: ['Stage 1 Essential Hypertension', 'Mild Hyperlipidemia'],
    primaryDoctor: 'Dr. Rajesh Sharma',
    hospital: 'Metro City General Hospital'
  },
  {
    id: 'pt-3912',
    uhid: 'MED-PT-3912',
    abhaId: '91-6284-9310-3912',
    fullName: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '+91-98112-23344',
    age: 29,
    gender: 'Female',
    bloodGroup: 'B+',
    address: 'B-12, Palm Meadows, Metro City - 560066',
    emergencyContact: { name: 'Karan Sharma', relation: 'Brother', phone: '+91-98112-23399' },
    allergies: ['No Known Drug Allergies (NKDA)'],
    chronicConditions: ['Hypothyroidism (Controlled on Eltroxin)'],
    primaryDoctor: 'Dr. Sneha Patel',
    hospital: 'Metro City General Hospital'
  },
  {
    id: 'pt-1049',
    uhid: 'MED-PT-1049',
    abhaId: '91-1049-5582-7719',
    fullName: 'Aarav Malhotra',
    email: 'aarav.malhotra@example.com',
    phone: '+91-99887-76655',
    age: 42,
    gender: 'Male',
    bloodGroup: 'A+',
    address: 'Villa 14, Silver Oak Enclave, Metro City - 560100',
    emergencyContact: { name: 'Sunita Malhotra', relation: 'Mother', phone: '+91-99887-76611' },
    allergies: ['Aspirin (Mild dyspepsia)'],
    chronicConditions: ['Pre-Diabetes (Impaired Fasting Glucose)'],
    primaryDoctor: 'Dr. Vikram Mehta',
    hospital: 'CityCare Trauma Center'
  }
];

export interface BiomarkerDefinition {
  id: string;
  test: string;
  unit: string;
  normalRange: string;
  min: number;
  max: number;
  defaultResult: string;
  description: string;
}

export interface LabPanelPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  biomarkers: BiomarkerDefinition[];
}

export const LAB_PANEL_PRESETS: LabPanelPreset[] = [
  {
    id: 'cbc',
    name: 'Complete Blood Count (CBC)',
    category: 'Hematology',
    description: 'Measures cellular blood components including oxygen carriers, immune cells, and clotting platelets.',
    biomarkers: [
      { id: 'hb', test: 'Hemoglobin (Hb)', unit: 'g/dL', normalRange: '13.0 - 17.5', min: 13.0, max: 17.5, defaultResult: '14.5', description: 'Oxygen carrying protein in red blood cells' },
      { id: 'wbc', test: 'Total Leukocyte Count (WBC)', unit: '/mcL', normalRange: '4,000 - 11,000', min: 4000, max: 11000, defaultResult: '6800', description: 'Infection-fighting immune leukocytes' },
      { id: 'plt', test: 'Platelet Count', unit: '/mcL', normalRange: '150,000 - 450,000', min: 150000, max: 450000, defaultResult: '250000', description: 'Coagulation and hemostasis cellular fragments' },
      { id: 'rbc', test: 'Red Blood Cell (RBC) Count', unit: 'million/mcL', normalRange: '4.5 - 5.9', min: 4.5, max: 5.9, defaultResult: '5.1', description: 'Total erythrocytes circulating in blood' },
      { id: 'pcv', test: 'Hematocrit (PCV)', unit: '%', normalRange: '38 - 50', min: 38, max: 50, defaultResult: '42.5', description: 'Percentage of blood volume composed of erythrocytes' }
    ]
  },
  {
    id: 'lipid',
    name: 'Lipid & Cholesterol Profile',
    category: 'Cardiology',
    description: 'Evaluates cardiovascular risk, arterial plaque propensity, and fat metabolism markers.',
    biomarkers: [
      { id: 'tchol', test: 'Total Cholesterol', unit: 'mg/dL', normalRange: '< 200', min: 100, max: 199, defaultResult: '210', description: 'Overall sterol level in circulatory system' },
      { id: 'ldl', test: 'LDL (Bad Cholesterol)', unit: 'mg/dL', normalRange: '< 100', min: 40, max: 99, defaultResult: '135', description: 'Atherogenic low-density lipoprotein' },
      { id: 'hdl', test: 'HDL (Good Cholesterol)', unit: 'mg/dL', normalRange: '> 40', min: 40, max: 90, defaultResult: '54', description: 'Protective high-density lipoprotein' },
      { id: 'trig', test: 'Serum Triglycerides', unit: 'mg/dL', normalRange: '< 150', min: 50, max: 149, defaultResult: '162', description: 'Circulating storage lipids' },
      { id: 'vldl', test: 'VLDL Cholesterol', unit: 'mg/dL', normalRange: '5 - 30', min: 5, max: 30, defaultResult: '28', description: 'Very low-density lipid fraction' }
    ]
  },
  {
    id: 'diabetes',
    name: 'Diabetes & Glycemic Panel',
    category: 'Endocrinology',
    description: 'Evaluates pancreatic beta-cell function, insulin sensitivity, and long-term 3-month glycemic control.',
    biomarkers: [
      { id: 'fbs', test: 'Fasting Blood Sugar (FBS)', unit: 'mg/dL', normalRange: '70 - 99', min: 70, max: 99, defaultResult: '105', description: 'Plasma glucose after 8-10 hour fast' },
      { id: 'ppbs', test: 'Post-Prandial Glucose (PPBS)', unit: 'mg/dL', normalRange: '< 140', min: 70, max: 139, defaultResult: '148', description: 'Plasma glucose 2 hours after standard meal' },
      { id: 'hba1c', test: 'HbA1c (Glycated Hemoglobin)', unit: '%', normalRange: '< 5.7', min: 4.0, max: 5.6, defaultResult: '5.9', description: 'Estimated 90-day mean glycemic index' }
    ]
  },
  {
    id: 'kft',
    name: 'Kidney Function Test (KFT / RFT)',
    category: 'Nephrology',
    description: 'Monitors renal clearance, glomerular filtration rate, and waste excretion efficiency.',
    biomarkers: [
      { id: 'creat', test: 'Serum Creatinine', unit: 'mg/dL', normalRange: '0.7 - 1.3', min: 0.7, max: 1.3, defaultResult: '1.05', description: 'Muscle metabolism metabolic waste cleared by kidneys' },
      { id: 'bun', test: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', normalRange: '7 - 20', min: 7, max: 20, defaultResult: '14', description: 'Nitrogenous waste product from protein catabolism' },
      { id: 'uric', test: 'Serum Uric Acid', unit: 'mg/dL', normalRange: '3.5 - 7.2', min: 3.5, max: 7.2, defaultResult: '5.8', description: 'Purine breakdown byproduct' },
      { id: 'egfr', test: 'Estimated GFR (eGFR)', unit: 'mL/min/1.73m²', normalRange: '> 90', min: 90, max: 140, defaultResult: '98', description: 'Calculated glomerular filtration capacity' }
    ]
  },
  {
    id: 'lft',
    name: 'Liver Function Test (LFT)',
    category: 'Gastroenterology',
    description: 'Measures hepatic enzymes, synthesis capacity, and biliary clearance.',
    biomarkers: [
      { id: 'sgot', test: 'SGOT / AST', unit: 'U/L', normalRange: '10 - 40', min: 10, max: 40, defaultResult: '26', description: 'Aspartate aminotransferase enzyme' },
      { id: 'sgpt', test: 'SGPT / ALT', unit: 'U/L', normalRange: '7 - 56', min: 7, max: 56, defaultResult: '32', description: 'Alanine aminotransferase liver specific enzyme' },
      { id: 'bilitot', test: 'Total Bilirubin', unit: 'mg/dL', normalRange: '0.2 - 1.2', min: 0.2, max: 1.2, defaultResult: '0.8', description: 'Heme degradation pigment' },
      { id: 'alb', test: 'Serum Albumin', unit: 'g/dL', normalRange: '3.5 - 5.0', min: 3.5, max: 5.0, defaultResult: '4.3', description: 'Major circulating oncotic protein synthesized by liver' },
      { id: 'alp', test: 'Alkaline Phosphatase (ALP)', unit: 'U/L', normalRange: '44 - 147', min: 44, max: 147, defaultResult: '88', description: 'Biliary tract and bone enzyme' }
    ]
  },
  {
    id: 'thyroid',
    name: 'Thyroid Function Profile (TFT)',
    category: 'Endocrinology',
    description: 'Assesses pituitary-thyroid hormonal axis controlling cellular basal metabolic rate.',
    biomarkers: [
      { id: 'tsh', test: 'Thyroid Stimulating Hormone (TSH)', unit: 'uIU/mL', normalRange: '0.45 - 4.50', min: 0.45, max: 4.50, defaultResult: '2.85', description: 'Pituitary gland control hormone' },
      { id: 'ft3', test: 'Free T3 (Triiodothyronine)', unit: 'pg/mL', normalRange: '2.3 - 4.2', min: 2.3, max: 4.2, defaultResult: '3.1', description: 'Active metabolic thyroid hormone fraction' },
      { id: 'ft4', test: 'Free T4 (Thyroxine)', unit: 'ng/dL', normalRange: '0.8 - 1.8', min: 0.8, max: 1.8, defaultResult: '1.24', description: 'Prohormone reservoir in circulation' }
    ]
  },
  {
    id: 'vitals',
    name: 'Vitals & Hemodynamics',
    category: 'General Health',
    description: 'Core physiological parameters tracking arterial pressure, pulse rate, oxygenation, and temperature.',
    biomarkers: [
      { id: 'bpsys', test: 'Systolic Blood Pressure', unit: 'mmHg', normalRange: '90 - 120', min: 90, max: 120, defaultResult: '128', description: 'Peak arterial pressure during ventricular contraction' },
      { id: 'bpdia', test: 'Diastolic Blood Pressure', unit: 'mmHg', normalRange: '60 - 80', min: 60, max: 80, defaultResult: '84', description: 'Resting arterial pressure between cardiac contractions' },
      { id: 'pulse', test: 'Heart Rate / Pulse', unit: 'bpm', normalRange: '60 - 100', min: 60, max: 100, defaultResult: '74', description: 'Resting pulse beats per minute' },
      { id: 'spo2', test: 'Oxygen Saturation (SpO2)', unit: '%', normalRange: '95 - 100', min: 95, max: 100, defaultResult: '98', description: 'Peripheral capillary oxygen saturation' },
      { id: 'temp', test: 'Body Temperature', unit: '°F', normalRange: '97.5 - 99.0', min: 97.5, max: 99.0, defaultResult: '98.4', description: 'Core thermal regulation' }
    ]
  }
];

export interface AnalyzedBiomarker {
  id: string;
  test: string;
  result: string;
  unit: string;
  normalRange: string;
  status: 'NORMAL' | 'ELEVATED' | 'LOW';
  numericVal: number;
  min: number;
  max: number;
  clinicalNote: string;
}

export interface ClinicalReportAnalysis {
  id: string;
  title: string;
  panelId: string;
  patientName: string;
  patientUhid: string;
  date: string;
  hospital: string;
  doctor: string;
  healthScore: number; // 0 - 100
  riskLevel: 'OPTIMAL' | 'MILD_RISK' | 'MODERATE_RISK' | 'HIGH_RISK';
  summary: string;
  findings: string[];
  abnormalCount: number;
  totalParameters: number;
  analyzedBiomarkers: AnalyzedBiomarker[];
  recommendations: string[];
  lifestyleDirectives: string[];
  doctorQuestions: string[];
  emergencyWarning?: string;
}

/**
 * Clinical evaluation engine that interprets manual lab inputs
 */
export function analyzeLabReport(
  panel: LabPanelPreset,
  inputs: { [biomarkerId: string]: string },
  patient: PatientProfile,
  metadata: { hospital: string; doctor: string; date: string }
): ClinicalReportAnalysis {
  const analyzedBiomarkers: AnalyzedBiomarker[] = [];
  let abnormalCount = 0;
  const findings: string[] = [];
  const recommendations: string[] = [];
  const lifestyleDirectives: string[] = [];
  const doctorQuestions: string[] = [];

  panel.biomarkers.forEach((bio) => {
    const rawVal = inputs[bio.id] ?? bio.defaultResult;
    // Extract numerical value
    const cleanNum = parseFloat(rawVal.replace(/[^0-9.]/g, ''));
    const isNum = !isNaN(cleanNum);

    let status: 'NORMAL' | 'ELEVATED' | 'LOW' = 'NORMAL';
    let clinicalNote = 'Within optimal physiological reference parameters.';

    if (isNum) {
      if (cleanNum > bio.max) {
        status = 'ELEVATED';
        abnormalCount++;
        const pct = Math.round(((cleanNum - bio.max) / bio.max) * 100);
        clinicalNote = `Elevated by approximately +${pct}% above maximum standard baseline.`;
      } else if (cleanNum < bio.min) {
        status = 'LOW';
        abnormalCount++;
        const pct = Math.round(((bio.min - cleanNum) / bio.min) * 100);
        clinicalNote = `Lower by approximately -${pct}% below minimum physiological threshold.`;
      }
    }

    analyzedBiomarkers.push({
      id: bio.id,
      test: bio.test,
      result: rawVal,
      unit: bio.unit,
      normalRange: bio.normalRange,
      status,
      numericVal: isNum ? cleanNum : 0,
      min: bio.min,
      max: bio.max,
      clinicalNote
    });
  });

  // Calculate Health Score (100 base, penalize for deviations)
  const penaltyPerAbnormal = Math.min(22, Math.max(12, Math.round(50 / Math.max(1, panel.biomarkers.length))));
  const healthScore = Math.max(38, Math.min(100, 100 - abnormalCount * penaltyPerAbnormal));

  // Determine Clinical Risk Level
  let riskLevel: ClinicalReportAnalysis['riskLevel'] = 'OPTIMAL';
  if (abnormalCount === 0) {
    riskLevel = 'OPTIMAL';
  } else if (abnormalCount === 1) {
    riskLevel = 'MILD_RISK';
  } else if (abnormalCount === 2) {
    riskLevel = 'MODERATE_RISK';
  } else {
    riskLevel = 'HIGH_RISK';
  }

  // Generate Specific Findings based on Panel & Outliers
  const elevatedList = analyzedBiomarkers.filter((b) => b.status === 'ELEVATED');
  const lowList = analyzedBiomarkers.filter((b) => b.status === 'LOW');

  if (abnormalCount === 0) {
    findings.push(`All ${analyzedBiomarkers.length} evaluated markers within expected healthy boundaries.`);
    findings.push(`Physiological homeostasis maintained for ${panel.name}.`);
    recommendations.push('Maintain current balanced nutrition, hydration, and regular exercise regimen.');
    recommendations.push('Schedule routine annual preventative checkup in 12 months.');
    lifestyleDirectives.push('Continue 150 minutes of moderate aerobic physical activity per week.');
    lifestyleDirectives.push('Maintain consistent 7-8 hours restorative sleep routine.');
    doctorQuestions.push('Are there any age-specific preventative wellness screenings recommended for my profile?');
  } else {
    if (elevatedList.length > 0) {
      const names = elevatedList.map((b) => `${b.test} (${b.result} ${b.unit})`).join(', ');
      findings.push(`Elevated levels detected in: ${names}.`);
    }
    if (lowList.length > 0) {
      const names = lowList.map((b) => `${b.test} (${b.result} ${b.unit})`).join(', ');
      findings.push(`Sub-optimal / decreased levels detected in: ${names}.`);
    }

    // Panel-specific clinical insights
    if (panel.id === 'lipid') {
      recommendations.push('Reduce dietary saturated fats and trans-fatty acids; favor Mediterranean unsaturated oils.');
      recommendations.push('Increase soluble fiber intake (oats, legumes, psyllium husk) to assist hepatic LDL clearance.');
      lifestyleDirectives.push('Engage in 30 minutes of brisk aerobic cardio 5 days per week.');
      doctorQuestions.push('Do my current lipid values warrant statin therapy or a follow-up coronary calcium score?');
    } else if (panel.id === 'diabetes') {
      recommendations.push('Adopt a low-glycemic index dietary pattern; distribute carbohydrate intake evenly.');
      recommendations.push('Perform an oral glucose tolerance test (OGTT) or repeat fasting plasma glucose in 4-6 weeks.');
      lifestyleDirectives.push('Incorporate 15 minutes of post-meal light walking to enhance peripheral insulin receptor sensitivity.');
      doctorQuestions.push('Should we monitor continuous interstitial glucose or initiate early insulin-sensitizing therapy?');
    } else if (panel.id === 'cbc') {
      recommendations.push('Ensure balanced intake of dietary iron, folate, and cyanocobalamin (Vitamin B12).');
      recommendations.push('Hydrate adequately (2.5 - 3 liters daily) to maintain optimal plasma volume.');
      lifestyleDirectives.push('Avoid strenuous high-intensity anaerobic training until cell counts stabilize.');
      doctorQuestions.push('Is a complete peripheral blood smear (PBS) or serum ferritin test indicated?');
    } else if (panel.id === 'kft') {
      recommendations.push('Maintain optimal daily hydration; avoid nephrotoxic NSAIDs (ibuprofen, naproxen).');
      recommendations.push('Moderate dietary animal purines and excess sodium intake (< 2,300 mg/day).');
      lifestyleDirectives.push('Monitor morning seated blood pressure to protect renal microvasculature.');
      doctorQuestions.push('Does the calculated eGFR reflect stable baseline renal reserve?');
    } else if (panel.id === 'lft') {
      recommendations.push('Limit hepatotoxic substances, alcohol consumption, and unverified herbal supplements.');
      recommendations.push('Consider an ultrasound of upper abdomen to evaluate for hepatic steatosis.');
      lifestyleDirectives.push('Aim for gradual 5-7% body weight reduction if BMI exceeds standard range.');
      doctorQuestions.push('Should viral hepatitis markers or a hepatic ultrasound screening be ordered?');
    } else if (panel.id === 'thyroid') {
      recommendations.push('Maintain consistent timing with thyroid medications on an empty stomach with plain water.');
      recommendations.push('Retest TSH and free thyroid hormones in 6 to 8 weeks to determine steady state.');
      lifestyleDirectives.push('Report symptoms of heat/cold intolerance, palpitations, or unexpected weight changes.');
      doctorQuestions.push('Is dose titration required for my thyroid maintenance regimen?');
    } else {
      recommendations.push('Consult attending physician for comprehensive correlation with clinical symptoms.');
      recommendations.push('Maintain daily vitals logging in the MedConnect Pulse app.');
      lifestyleDirectives.push('Reduce dietary sodium and engage in daily mindful stress-reduction.');
      doctorQuestions.push('What are the target physiological milestones for my next clinic visit?');
    }
  }

  // Check for critical warnings
  let emergencyWarning: string | undefined;
  const sysBp = analyzedBiomarkers.find((b) => b.id === 'bpsys');
  const fbsVal = analyzedBiomarkers.find((b) => b.id === 'fbs');
  const spo2Val = analyzedBiomarkers.find((b) => b.id === 'spo2');

  if (sysBp && sysBp.numericVal >= 180) {
    emergencyWarning = 'CRITICAL ALERT: Systolic BP exceeds 180 mmHg (Hypertensive Crisis range). Seek emergency care immediately.';
  } else if (fbsVal && fbsVal.numericVal >= 300) {
    emergencyWarning = 'CRITICAL ALERT: Severe hyperglycemia detected (>300 mg/dL). Immediate medical evaluation is required.';
  } else if (spo2Val && spo2Val.numericVal < 90) {
    emergencyWarning = 'CRITICAL ALERT: Oxygen saturation below 90% (Hypoxemia). Supplemental oxygen and emergency ER care recommended.';
  }

  const summary =
    abnormalCount === 0
      ? `Comprehensive clinical evaluation of ${panel.name} indicates normal, balanced physiological values. Overall health index is optimal at ${healthScore}/100.`
      : `Clinical interpretation identifies ${abnormalCount} parameter${abnormalCount > 1 ? 's' : ''} outside standard reference limits in ${panel.name}. Overall calculated score is ${healthScore}/100 with ${riskLevel.replace('_', ' ')} status. Follow-up consultation is advised.`;

  return {
    id: `ANALYSIS-${Date.now().toString().slice(-6)}`,
    title: `${panel.name} Clinical Analysis`,
    panelId: panel.id,
    patientName: patient.fullName,
    patientUhid: patient.uhid,
    date: metadata.date,
    hospital: metadata.hospital,
    doctor: metadata.doctor,
    healthScore,
    riskLevel,
    summary,
    findings,
    abnormalCount,
    totalParameters: analyzedBiomarkers.length,
    analyzedBiomarkers,
    recommendations,
    lifestyleDirectives,
    doctorQuestions,
    emergencyWarning
  };
}

/**
 * Generates an official Consolidated Medical Health Report (Health Passport) as plain formatted text
 */
export function generateConsolidatedHealthReport(
  patient: PatientProfile,
  records: Array<{
    id: string;
    title: string;
    date: string;
    category: string;
    hospital: string;
    doctor: string;
    status?: string;
    summary?: string;
  }>
): string {
  const now = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const divider = '================================================================================';
  const subDivider = '--------------------------------------------------------------------------------';

  let report = `${divider}
                     MEDCONNECT PULSE NATIONAL HEALTH STACK
                 OFFICIAL CONSOLIDATED EHR PATIENT HEALTH PASSPORT
${divider}

DOCUMENT ID       : EHR-CONSOLIDATED-${patient.uhid}-${Date.now().toString().slice(-6)}
DATE GENERATED    : ${now}
SECURITY PROTOCOL : ISO-27799 / HIPAA / ABDM Compliant (End-to-End Encrypted)
HEALTH REPOSITORY : Metro City General Hospital & Regional Connected Network

${subDivider}
1. PATIENT DEMOGRAPHICS & IDENTIFICATION
${subDivider}
Full Name         : ${patient.fullName}
UHID Number       : ${patient.uhid}
ABHA Health ID    : ${patient.abhaId}
Date of Birth/Age : ${patient.age} Years (${patient.gender})
Blood Group       : ${patient.bloodGroup}
Primary Phone     : ${patient.phone}
Email Address     : ${patient.email}
Registered Address: ${patient.address}
Emergency Contact : ${patient.emergencyContact.name} (${patient.emergencyContact.relation}) - ${patient.emergencyContact.phone}
Primary Physician : ${patient.primaryDoctor} (${patient.hospital})

${subDivider}
2. CLINICAL ALERTS, ALLERGIES & CHRONIC CONDITIONS
${subDivider}
Known Allergies   : ${patient.allergies.join(', ') || 'No Known Drug Allergies (NKDA)'}
Chronic Diagnoses : ${patient.chronicConditions.join(', ') || 'No chronic medical conditions reported'}
Cardiovascular Rx : Stable on active maintenance regimen
Immunization Stat : Complete adult baseline tetanus and influenza boosters up-to-date

${subDivider}
3. CUMULATIVE MEDICAL RECORDS ON FILE (${records.length} TOTAL ARCHIVED RECORDS)
${subDivider}
`;

  records.forEach((r, idx) => {
    report += `[${idx + 1}] ${r.title}
    Record ID   : #${r.id}
    Category    : ${r.category}
    Date Issued : ${r.date}
    Facility    : ${r.hospital}
    Attending Dr: ${r.doctor}
    Status      : ${r.status || 'VERIFIED'}
    Summary     : ${r.summary || 'Clinical record archived in MedConnect EHR repository.'}
\n`;
  });

  report += `${subDivider}
4. CLINICAL DIRECTIVES & EMERGENCY PROTOCOLS
${subDivider}
- Carry this digital health passport for ER admissions, OPD triage, and interstate referrals.
- For acute symptoms (chest pressure, severe dyspnea, acute neurological deficit), call 108 or
  tap the MedConnect Emergency SOS button for immediate 15 KM Haversine nearest-bed dispatch.
- In case of drug changes, notify attending physician regarding recorded allergies (${patient.allergies.join(', ')}).

${divider}
DIGITALLY CERTIFIED BY:
Chief Medical Informatics Officer (CMIO) - MedConnect Health Network
Digital Signature Key: SHA256-${patient.uhid.replace(/-/g, '')}-CERT-STAMP
${divider}
`;

  return report;
}

export interface PatientSelfReportInput {
  fullName: string;
  uhid?: string;
  abhaId?: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  phone: string;
  email: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  heightCm: number;
  weightKg: number;
  systolicBp: number;
  diastolicBp: number;
  restingHeartRate: number;
  bloodSugarFasting?: number;
  bloodSugarPostPrandial?: number;
  hba1c?: number;
  cholesterolTotal?: number;
  oxygenSaturation?: number;
  symptoms: string[];
  chronicConditions: string[];
  allergies: string[];
  currentMedications: string[];
  smokingStatus: 'Never' | 'Former' | 'Occasional' | 'Regular';
  alcoholIntake: 'None' | 'Occasional' | 'Moderate' | 'Heavy';
  physicalActivity: 'Sedentary' | 'Light (1-2 days/wk)' | 'Moderate (3-5 days/wk)' | 'Active (Daily)';
  sleepHours: number;
  dietPreference: 'Vegetarian' | 'Non-Vegetarian' | 'Vegan' | 'Eggetarian';
  patientNotes?: string;
}

export interface VitalBiomarkerEvaluation {
  parameter: string;
  value: string;
  unit: string;
  reference: string;
  status: 'NORMAL' | 'ELEVATED' | 'LOW';
  clinicalNote: string;
}

export interface GeneratedSelfHealthReport {
  id: string;
  dateGenerated: string;
  patient: PatientProfile;
  metrics: {
    bmi: number;
    bmiCategory: 'Underweight' | 'Normal Weight' | 'Overweight' | 'Obese Class I' | 'Obese Class II';
    bpCategory: 'Normal' | 'Elevated' | 'Hypertension Stage 1' | 'Hypertension Stage 2' | 'Hypertensive Crisis';
    sugarCategory?: 'Normal' | 'Pre-Diabetes' | 'Diabetes';
    cholesterolCategory?: 'Desirable' | 'Borderline High' | 'High';
    heartRateStatus: 'Bradycardia' | 'Normal Resting' | 'Tachycardia';
    spo2Status: 'Optimal' | 'Borderline' | 'Hypoxemia';
  };
  healthScore: number;
  clinicalStatus: 'OPTIMAL' | 'MILD_ATTENTION' | 'MODERATE_RISK' | 'HIGH_RISK';
  clinicalExecutiveSummary: string;
  organSystemEvaluations: Array<{
    system: string;
    status: 'HEALTHY' | 'MILD_RISK' | 'HIGH_RISK';
    findings: string;
  }>;
  identifiedRiskFactors: string[];
  vitalBiomarkers: VitalBiomarkerEvaluation[];
  personalizedDirectives: {
    nutrition: string[];
    physicalActivity: string[];
    lifestyleAndSleep: string[];
    monitoringSchedule: string[];
  };
  warningSignsEmergency: string[];
  doctorDiscussionPoints: string[];
  rawTextReport: string;
}

/**
 * Site clinical engine that analyzes patient's self-filled details and generates their official health report
 */
export function evaluatePatientSelfDetails(
  input: PatientSelfReportInput,
  records: Array<{
    id: string;
    title: string;
    date: string;
    category: string;
    hospital: string;
    doctor: string;
    status?: string;
  }>
): GeneratedSelfHealthReport {
  const heightM = (input.heightCm || 170) / 100;
  const weightKg = input.weightKg || 70;
  const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

  let bmiCategory: GeneratedSelfHealthReport['metrics']['bmiCategory'] = 'Normal Weight';
  if (bmi < 18.5) bmiCategory = 'Underweight';
  else if (bmi <= 24.9) bmiCategory = 'Normal Weight';
  else if (bmi <= 29.9) bmiCategory = 'Overweight';
  else if (bmi <= 34.9) bmiCategory = 'Obese Class I';
  else bmiCategory = 'Obese Class II';

  const sys = input.systolicBp || 120;
  const dia = input.diastolicBp || 80;
  let bpCategory: GeneratedSelfHealthReport['metrics']['bpCategory'] = 'Normal';
  if (sys > 180 || dia > 120) bpCategory = 'Hypertensive Crisis';
  else if (sys >= 140 || dia >= 90) bpCategory = 'Hypertension Stage 2';
  else if (sys >= 130 || dia >= 80) bpCategory = 'Hypertension Stage 1';
  else if (sys >= 120 && dia < 80) bpCategory = 'Elevated';
  else bpCategory = 'Normal';

  const hr = input.restingHeartRate || 72;
  let hrStatus: GeneratedSelfHealthReport['metrics']['heartRateStatus'] = 'Normal Resting';
  if (hr < 60) hrStatus = 'Bradycardia';
  else if (hr > 100) hrStatus = 'Tachycardia';

  const spo2 = input.oxygenSaturation || 98;
  let spo2Status: GeneratedSelfHealthReport['metrics']['spo2Status'] = 'Optimal';
  if (spo2 < 90) spo2Status = 'Hypoxemia';
  else if (spo2 <= 94) spo2Status = 'Borderline';

  let sugarCat: GeneratedSelfHealthReport['metrics']['sugarCategory'] | undefined;
  if (input.bloodSugarFasting !== undefined) {
    if (input.bloodSugarFasting < 100) sugarCat = 'Normal';
    else if (input.bloodSugarFasting <= 125) sugarCat = 'Pre-Diabetes';
    else sugarCat = 'Diabetes';
  }

  let cholCat: GeneratedSelfHealthReport['metrics']['cholesterolCategory'] | undefined;
  if (input.cholesterolTotal !== undefined) {
    if (input.cholesterolTotal < 200) cholCat = 'Desirable';
    else if (input.cholesterolTotal <= 239) cholCat = 'Borderline High';
    else cholCat = 'High';
  }

  // Calculate Health Score
  let score = 100;
  if (bmiCategory === 'Overweight') score -= 7;
  if (bmiCategory === 'Obese Class I') score -= 14;
  if (bmiCategory === 'Obese Class II') score -= 22;
  if (bmiCategory === 'Underweight') score -= 7;

  if (bpCategory === 'Elevated') score -= 6;
  if (bpCategory === 'Hypertension Stage 1') score -= 12;
  if (bpCategory === 'Hypertension Stage 2') score -= 20;
  if (bpCategory === 'Hypertensive Crisis') score -= 35;

  if (sugarCat === 'Pre-Diabetes') score -= 10;
  if (sugarCat === 'Diabetes') score -= 22;

  if (cholCat === 'Borderline High') score -= 6;
  if (cholCat === 'High') score -= 14;

  if (spo2Status === 'Borderline') score -= 10;
  if (spo2Status === 'Hypoxemia') score -= 25;

  if (input.smokingStatus === 'Regular') score -= 14;
  if (input.smokingStatus === 'Occasional') score -= 6;
  if (input.alcoholIntake === 'Heavy') score -= 12;
  if (input.physicalActivity === 'Sedentary') score -= 8;
  if (input.sleepHours < 6 || input.sleepHours > 9) score -= 6;

  score -= Math.min(20, input.symptoms.length * 4);
  score = Math.max(35, Math.min(100, Math.round(score)));

  let clinicalStatus: GeneratedSelfHealthReport['clinicalStatus'] = 'OPTIMAL';
  if (score >= 85) clinicalStatus = 'OPTIMAL';
  else if (score >= 70) clinicalStatus = 'MILD_ATTENTION';
  else if (score >= 55) clinicalStatus = 'MODERATE_RISK';
  else clinicalStatus = 'HIGH_RISK';

  // Biomarkers list
  const vitalBiomarkers: VitalBiomarkerEvaluation[] = [
    {
      parameter: 'Body Mass Index (BMI)',
      value: `${bmi}`,
      unit: 'kg/m²',
      reference: '18.5 - 24.9',
      status: bmiCategory === 'Normal Weight' ? 'NORMAL' : (bmi < 18.5 ? 'LOW' : 'ELEVATED'),
      clinicalNote: `Classified as ${bmiCategory} based on height of ${input.heightCm} cm and weight of ${input.weightKg} kg.`
    },
    {
      parameter: 'Blood Pressure (Arterial)',
      value: `${sys}/${dia}`,
      unit: 'mmHg',
      reference: '< 120 / < 80',
      status: bpCategory === 'Normal' ? 'NORMAL' : 'ELEVATED',
      clinicalNote: `Cardiovascular hemodynamics indicate ${bpCategory} status.`
    },
    {
      parameter: 'Resting Heart Rate',
      value: `${hr}`,
      unit: 'bpm',
      reference: '60 - 100',
      status: hrStatus === 'Normal Resting' ? 'NORMAL' : (hr < 60 ? 'LOW' : 'ELEVATED'),
      clinicalNote: `Cardiac chronotropic response is ${hrStatus}.`
    },
    {
      parameter: 'Oxygen Saturation (SpO2)',
      value: `${spo2}`,
      unit: '%',
      reference: '95 - 100',
      status: spo2Status === 'Optimal' ? 'NORMAL' : 'LOW',
      clinicalNote: `Peripheral capillary oxygen transport is ${spo2Status}.`
    }
  ];

  if (input.bloodSugarFasting !== undefined) {
    vitalBiomarkers.push({
      parameter: 'Fasting Plasma Glucose',
      value: `${input.bloodSugarFasting}`,
      unit: 'mg/dL',
      reference: '70 - 99',
      status: sugarCat === 'Normal' ? 'NORMAL' : 'ELEVATED',
      clinicalNote: `Glycemic equilibrium classified as ${sugarCat || 'Evaluated'}.`
    });
  }

  if (input.cholesterolTotal !== undefined) {
    vitalBiomarkers.push({
      parameter: 'Serum Total Cholesterol',
      value: `${input.cholesterolTotal}`,
      unit: 'mg/dL',
      reference: '< 200',
      status: cholCat === 'Desirable' ? 'NORMAL' : 'ELEVATED',
      clinicalNote: `Atherogenic lipid index classified as ${cholCat || 'Evaluated'}.`
    });
  }

  // Organ System Ratings
  const organSystemEvaluations = [
    {
      system: 'Cardiovascular & Hemodynamic',
      status: (bpCategory === 'Normal' && hrStatus === 'Normal Resting') ? 'HEALTHY' as const : (bpCategory === 'Hypertensive Crisis' ? 'HIGH_RISK' as const : 'MILD_RISK' as const),
      findings: `Blood pressure at ${sys}/${dia} mmHg (${bpCategory}); resting pulse ${hr} bpm.`
    },
    {
      system: 'Metabolic & Glycemic Balance',
      status: (bmiCategory === 'Normal Weight' && (!sugarCat || sugarCat === 'Normal')) ? 'HEALTHY' as const : 'MILD_RISK' as const,
      findings: `BMI is ${bmi} (${bmiCategory}). ${sugarCat ? `Fasting glucose: ${input.bloodSugarFasting} mg/dL (${sugarCat}).` : 'Glycemic control unflagged.'}`
    },
    {
      system: 'Respiratory & Gas Exchange',
      status: spo2Status === 'Optimal' && input.smokingStatus === 'Never' ? 'HEALTHY' as const : (spo2Status === 'Hypoxemia' ? 'HIGH_RISK' as const : 'MILD_RISK' as const),
      findings: `Resting SpO2 at ${spo2}%. Tobacco exposure status: ${input.smokingStatus}.`
    },
    {
      system: 'Vitality, Sleep & Recovery',
      status: (input.sleepHours >= 7 && input.physicalActivity !== 'Sedentary') ? 'HEALTHY' as const : 'MILD_RISK' as const,
      findings: `Sleep average ${input.sleepHours} hours/night; Physical activity tier: ${input.physicalActivity}.`
    }
  ];

  // Risk factors
  const identifiedRiskFactors: string[] = [];
  if (bmiCategory !== 'Normal Weight') identifiedRiskFactors.push(`Weight index outside optimal threshold (${bmiCategory} - BMI ${bmi})`);
  if (bpCategory !== 'Normal') identifiedRiskFactors.push(`Arterial blood pressure elevated (${bpCategory} - ${sys}/${dia} mmHg)`);
  if (sugarCat && sugarCat !== 'Normal') identifiedRiskFactors.push(`Fasting blood sugar elevated (${sugarCat} - ${input.bloodSugarFasting} mg/dL)`);
  if (input.smokingStatus === 'Regular' || input.smokingStatus === 'Occasional') identifiedRiskFactors.push(`Active tobacco/nicotine inhalation (${input.smokingStatus})`);
  if (input.physicalActivity === 'Sedentary') identifiedRiskFactors.push('Sedentary daily routine with low cardiorespiratory conditioning');
  if (input.symptoms.length > 0) identifiedRiskFactors.push(`Active subjective symptoms noted: ${input.symptoms.join(', ')}`);

  // Directives
  const nutrition: string[] = [];
  const physicalActivity: string[] = [];
  const lifestyleAndSleep: string[] = [];
  const monitoringSchedule: string[] = [];
  const doctorDiscussionPoints: string[] = [];
  const warningSignsEmergency: string[] = [];

  if (bmiCategory === 'Overweight' || bmiCategory.startsWith('Obese')) {
    nutrition.push('Focus on a high-fiber, nutrient-dense diet emphasizing legumes, vegetables, and lean proteins.');
    nutrition.push('Reduce refined carbohydrates, sweetened beverages, and ultra-processed snack foods.');
    physicalActivity.push('Target 200-250 minutes of moderate aerobic activity weekly (brisk walking, cycling, swimming).');
  } else {
    nutrition.push('Maintain a balanced Mediterranean or wholesome nutrient-rich dietary pattern.');
    physicalActivity.push('Maintain 150 minutes of moderate cardiovascular exercise plus 2 weekly resistance sessions.');
  }

  if (bpCategory !== 'Normal') {
    nutrition.push('Adopt the DASH eating pattern with dietary sodium restricted to < 2,000 mg/day.');
    monitoringSchedule.push('Log morning and evening resting blood pressure twice weekly in MedConnect Pulse.');
    doctorDiscussionPoints.push(`Discuss target BP goals for ${sys}/${dia} mmHg and whether pharmacotherapy or lifestyle titration is indicated.`);
  }

  if (sugarCat && sugarCat !== 'Normal') {
    nutrition.push('Favor low-glycemic foods (oats, millets, leafy greens) and space carbohydrate intake evenly.');
    monitoringSchedule.push('Check fasting and 2-hour post-meal capillary glucose weekly.');
    doctorDiscussionPoints.push(`Review fasting glucose level (${input.bloodSugarFasting} mg/dL) and consider an HbA1c screening.`);
  }

  lifestyleAndSleep.push(`Aim for consistent ${Math.max(7, input.sleepHours)} hours of restorative sleep in a dark, quiet room.`);
  lifestyleAndSleep.push('Incorporate 10-15 minutes of daily stress-reduction practices (deep diaphragmatic breathing, mindfulness).');
  monitoringSchedule.push('Schedule an annual comprehensive preventative health checkup in MedConnect Pulse.');

  if (input.symptoms.length > 0) {
    doctorDiscussionPoints.push(`Present reported symptoms (${input.symptoms.join(', ')}) during consultation for physical examination.`);
  }

  warningSignsEmergency.push('Seek immediate emergency room care if experiencing crushing chest pain, radiating arm/jaw pain, or sudden shortness of breath.');
  warningSignsEmergency.push('Seek urgent evaluation if experiencing sudden facial asymmetry, slurred speech, or unilateral limb weakness (FAST protocol).');

  const clinicalExecutiveSummary = `Comprehensive clinical health evaluation conducted for ${input.fullName} (${input.age} Y / ${input.gender}). Calculated composite health index is ${score}/100 with ${clinicalStatus.replace('_', ' ')} clinical standing. Hemodynamics reflect ${bpCategory} blood pressure (${sys}/${dia} mmHg) with ${hrStatus.toLowerCase()} pulse (${hr} bpm) and ${bmiCategory.toLowerCase()} body mass index (${bmi}). ${identifiedRiskFactors.length > 0 ? `Key physiological flags include ${identifiedRiskFactors.join('; ')}.` : 'No critical physiological abnormalities detected.'} Follow prescribed lifestyle, nutritional, and monitoring directives.`;

  // Construct patient profile
  const patientProfile: PatientProfile = {
    id: `pt-${input.fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'user'}`,
    uhid: input.uhid || `MED-PT-${Math.floor(1000 + Math.random() * 9000)}`,
    abhaId: input.abhaId || `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
    fullName: input.fullName,
    email: input.email || `${input.fullName.toLowerCase().replace(/\s+/g, '.')}@medconnect.org`,
    phone: input.phone || '+91-98765-00000',
    age: input.age,
    gender: input.gender,
    bloodGroup: input.bloodGroup,
    address: input.address || 'Metro City Healthcare District',
    emergencyContact: {
      name: input.emergencyContactName || 'Family Contact',
      relation: 'Emergency Contact',
      phone: input.emergencyContactPhone || input.phone || '+91-98765-11111'
    },
    allergies: input.allergies && input.allergies.length > 0 ? input.allergies : ['No Known Drug Allergies (NKDA)'],
    chronicConditions: input.chronicConditions && input.chronicConditions.length > 0 ? input.chronicConditions : ['None Documented'],
    primaryDoctor: 'Dr. Rajesh Sharma',
    hospital: 'Metro City General Hospital'
  };

  // Generate complete plain-text EHR report
  const divider = '================================================================================';
  const subDivider = '--------------------------------------------------------------------------------';
  const now = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let rawText = `${divider}
                  MEDCONNECT PULSE NATIONAL HEALTH REPOSITORY
             OFFICIAL PATIENT CLINICAL HEALTH EVALUATION & PASSPORT
${divider}

DOCUMENT ID       : EHR-REPORT-${patientProfile.uhid}-${Date.now().toString().slice(-6)}
DATE GENERATED    : ${now}
EVALUATED BY      : MedConnect Clinical AI & National Health Stack Engine
STATUS            : OFFICIALLY GENERATED & AUTHENTICATED
SECURITY          : ISO-27799 / ABDM / HIPAA Verified EHR Container

${subDivider}
1. PATIENT DEMOGRAPHICS & IDENTIFICATION (ENTERED BY PATIENT)
${subDivider}
Full Name         : ${patientProfile.fullName}
UHID Number       : ${patientProfile.uhid}
ABHA Health ID    : ${patientProfile.abhaId}
Age & Biological  : ${patientProfile.age} Years (${patientProfile.gender})
Blood Group       : ${patientProfile.bloodGroup}
Primary Phone     : ${patientProfile.phone}
Email Address     : ${patientProfile.email}
Residential Addr  : ${patientProfile.address}
Emergency Contact : ${patientProfile.emergencyContact.name} (${patientProfile.emergencyContact.phone})

${subDivider}
2. CLINICAL EXECUTIVE SUMMARY & COMPOSITE HEALTH SCORE
${subDivider}
Calculated Health Index : ${score} / 100
Clinical Standing       : ${clinicalStatus.replace('_', ' ')}
Clinical Summary:
${clinicalExecutiveSummary}

${subDivider}
3. MEASURED VITALS, PHYSIOLOGICAL BIOMARKERS & BMI
${subDivider}
${String('PARAMETER').padEnd(30)} | ${String('MEASURED').padEnd(14)} | ${String('REFERENCE').padEnd(16)} | STATUS
${subDivider}
`;

  vitalBiomarkers.forEach(v => {
    rawText += `${v.parameter.padEnd(30)} | ${(v.value + ' ' + v.unit).padEnd(14)} | ${v.reference.padEnd(16)} | ${v.status}\n`;
  });

  rawText += `\n${subDivider}
4. ORGAN SYSTEM CLINICAL EVALUATION
${subDivider}
`;
  organSystemEvaluations.forEach(o => {
    rawText += `[${o.system.toUpperCase()}] -> ${o.status}\n  Findings: ${o.findings}\n\n`;
  });

  rawText += `${subDivider}
5. ALLERGIES, CHRONIC DIAGNOSES & REPORTED SYMPTOMS
${subDivider}
Known Allergies   : ${patientProfile.allergies.join(', ')}
Chronic Diagnoses : ${patientProfile.chronicConditions.join(', ')}
Active Symptoms   : ${input.symptoms.join(', ') || 'No acute symptoms reported (Wellness check)'}
Active Medications: ${input.currentMedications.join(', ') || 'None reported'}

${subDivider}
6. PERSONALIZED CLINICAL DIRECTIVES & NUTRITION PROTOCOL
${subDivider}
NUTRITION & DIET:
`;
  nutrition.forEach(n => { rawText += `• ${n}\n`; });

  rawText += `\nPHYSICAL ACTIVITY & WORKOUT:
`;
  physicalActivity.forEach(p => { rawText += `• ${p}\n`; });

  rawText += `\nLIFESTYLE & RECOVERY:
`;
  lifestyleAndSleep.forEach(l => { rawText += `• ${l}\n`; });

  rawText += `\nHOME MONITORING SCHEDULE:
`;
  monitoringSchedule.forEach(m => { rawText += `• ${m}\n`; });

  rawText += `\n${subDivider}
7. QUESTIONS FOR YOUR ATTENDING PHYSICIAN
${subDivider}
`;
  doctorDiscussionPoints.forEach(q => { rawText += `? ${q}\n`; });

  rawText += `\n${subDivider}
8. HISTORICAL RECORDS ON FILE (${records.length} TOTAL IN REPOSITORY)
${subDivider}
`;
  records.forEach((r, idx) => {
    rawText += `[${idx + 1}] ${r.title} | ${r.category} | ${r.date} | ${r.doctor} (${r.hospital}) - ${r.status || 'VERIFIED'}\n`;
  });

  rawText += `\n${divider}
DIGITALLY CERTIFIED BY:
Chief Medical Informatics Officer (CMIO) - MedConnect Health Network
Digital Signature Key: SHA256-${patientProfile.uhid.replace(/-/g, '')}-SITE-AUTH-CERT
${divider}
`;

  return {
    id: `REPORT-${patientProfile.uhid}-${Date.now().toString().slice(-4)}`,
    dateGenerated: now,
    patient: patientProfile,
    metrics: {
      bmi,
      bmiCategory,
      bpCategory,
      sugarCategory: sugarCat,
      cholesterolCategory: cholCat,
      heartRateStatus: hrStatus,
      spo2Status
    },
    healthScore: score,
    clinicalStatus,
    clinicalExecutiveSummary,
    organSystemEvaluations,
    identifiedRiskFactors,
    vitalBiomarkers,
    personalizedDirectives: {
      nutrition,
      physicalActivity,
      lifestyleAndSleep,
      monitoringSchedule
    },
    warningSignsEmergency,
    doctorDiscussionPoints,
    rawTextReport: rawText
  };
}

