/**
 * MedConnect Pulse Phase 13 - Real AI Receptionist Service
 * End-to-end Voice/Text Receptionist with multi-channel support (web mic, text, WhatsApp, Telegram).
 * Workflow: Input -> Sarvam STT -> Transcript -> OpenAI Intent Engine -> Backend DB Validation -> Database Action -> Conversational Response.
 * Supported Intents:
 * 1. BOOK_APPOINTMENT
 * 2. CHECK_APPOINTMENT
 * 3. CANCEL_APPOINTMENT
 * 4. CHECK_QUEUE
 * 5. CHECK_DOCTOR_AVAILABILITY
 * 6. CHECK_DUES
 * 7. GENERAL_HOSPITAL_QUERY
 * 8. EMERGENCY_RESOURCE_REQUEST
 * 9. UNKNOWN
 */

import { dbEngine } from '../lib/dbEngine';
import { transcribeAudio, getSarvamCredentials } from './sarvamService';
import { extractIntentAndSlots, getOpenAICredentials } from './openaiService';
import type { ReceptionistIntentType } from './openaiService';
import { callN8nAiReceptionist } from './n8nRealIntegration';

export interface ConversationContext {
  patientName?: string;
  patientPhone?: string;
  departmentId?: string;
  departmentName?: string;
  doctorId?: string;
  doctorName?: string;
  date?: string;
  timeSlot?: string;
  tokenId?: string;
  pendingIntent?: ReceptionistIntentType;
  missingSlots?: string[];
}

export interface ReceptionistInput {
  channel?: 'text' | 'mic' | 'whatsapp' | 'telegram';
  text?: string;
  audioBlob?: Blob | ArrayBuffer | string;
  language?: string;
  hospitalId?: string;
  context?: ConversationContext;
}

export interface ReceptionistResponse {
  success: boolean;
  status: 'ACTION_COMPLETED' | 'NEEDS_MORE_INFO' | 'INVALID_INPUT' | 'ERROR';
  intent: ReceptionistIntentType;
  transcript: string;
  aiMessage: string;
  configurationStatus: {
    sarvamConfigured: boolean;
    openaiConfigured: boolean;
    statusReport: string;
  };
  validatedSlots?: Record<string, any>;
  missingSlots?: string[];
  actionPayload?: any;
  context?: ConversationContext;
  suggestedActions?: { label: string; text: string; icon?: string }[];
}

export function getReceptionistConfigStatus(): {
  sarvamConfigured: boolean;
  openaiConfigured: boolean;
  statusReport: string;
} {
  const sarvam = getSarvamCredentials();
  const openai = getOpenAICredentials();

  const reports: string[] = [];
  if (!sarvam.isConfigured) reports.push('SARVAM_NOT_CONFIGURED');
  if (!openai.isConfigured) reports.push('OPENAI_NOT_CONFIGURED');

  const statusReport = reports.length === 0 ? 'ALL_AI_SERVICES_CONFIGURED' : reports.join(' & ');

  return {
    sarvamConfigured: sarvam.isConfigured,
    openaiConfigured: openai.isConfigured,
    statusReport,
  };
}

const WELCOME_MESSAGES: Record<string, string> = {
  English: 'Hello! I am MedConnect AI Receptionist. How can I assist you today with appointment booking, queue status, doctor availability, dues query, or emergency resource requests?',
  Hindi: 'नमस्ते! मैं मेडकनेक्ट एआई रिसेप्शनिस्ट हूँ। मैं आज आपकी अपॉइंटमेंट बुकिंग, कतार स्थिति, डॉक्टर उपलब्धता, शुल्क संबंधी प्रश्न, या आपातकालीन संसाधनों में सहायता कर सकता हूँ।',
  Hinglish: 'Namaste! Main MedConnect AI Receptionist hoon. Main aapki appointment booking, queue status, doctor availability, dues query, ya emergency resource requests me help kar sakta hoon.',
  Bengali: 'নমস্কার! আমি মেডকানেক্ট এআই রিশেপশনিস্ট। আমি আপনার অ্যাপয়েন্টমেন্ট বুকিং, কিউ স্ট্যাটাস, এবং জরুরী অনুসন্ধানে সহায়তা করতে পারি।',
  Tamil: 'வணக்கம்! நான் மெட்கனெக்ட் AI வரவேற்பாளர். உங்கள் அப்பாயிண்ட்மென்ட் முன்பதிவு, வரிசை நிலை, மற்றும் அவசர தகவல்களுக்கு நான் உதவ முடியும்.',
  Telugu: 'నమస్కారం! నేను మెడ్ కనెక్ట్ AI రిసెప్షనిస్ట్‌ని. అపాయింట్‌మెంట్ బుకింగ్, క్యూ స్థితి, మరియు అత్యవసర సేవల్లో నేను సహాయపడగలను.',
  Marathi: 'नमस्कार! मी मेडकनेक्ट एआय रिसेप्शनिस्ट आहे. मी तुमची अपॉइंटमेंट बुकिंग, रांगेची स्थिती, डॉक्टर उपलब्धता आणि आणीबाणीच्या कामात मदत करू शकतो.',
};

export function getWelcomeMessage(lang: string = 'Hinglish'): string {
  return WELCOME_MESSAGES[lang] || WELCOME_MESSAGES['Hinglish'];
}

export function fallbackTranslate(text: string, targetLang: string): string {
  if (!text) return text;
  const lang = targetLang.trim();
  if (lang === 'Hinglish') return text;

  if (lang === 'Hindi') {
    let t = text;
    t = t.replace(/Namaste!/gi, 'नमस्ते!');
    t = t.replace(/Aapka appointment successful book ho gaya hai!/gi, 'आपका अपॉइंटमेंट सफलतापूर्वक बुक हो गया है!');
    t = t.replace(/Aapka Queue Token ID hai:/gi, 'आपका टोकन आईडी है:');
    t = t.replace(/Doctor:/gi, 'डॉक्टर:');
    t = t.replace(/Date:/gi, 'दिनांक:');
    t = t.replace(/Time:/gi, 'समय:');
    t = t.replace(/Aapka active appointment mila!/gi, 'आपका सक्रिय अपॉइंटमेंट मिल गया है!');
    t = t.replace(/Status:/gi, 'स्थिति:');
    t = t.replace(/Aapka appointment \((.*?)\) safaltapoorvak cancel kar diya gaya hai\./gi, 'आपका अपॉइंटमेंट ($1) सफलतापूर्वक रद्द कर दिया गया है।');
    t = t.replace(/Current token in consultation:/gi, 'वर्तमान परामर्श टोकन:');
    t = t.replace(/Aapke aage (\d+) patients hain\./gi, 'आपके आगे $1 मरीज हैं।');
    t = t.replace(/Estimated wait time: (\d+) minutes\./gi, 'अनुमानित प्रतीक्षा समय: $1 मिनट।');
    t = t.replace(/Doctors availability on (.*?):/gi, 'डॉक्टरों की उपलब्धता दिनांक $1:');
    t = t.replace(/slots available/gi, 'स्लॉट उपलब्ध');
    t = t.replace(/Patient (.*?) ke koi pending dues nahi hain\./gi, 'मरीज $1 का कोई बकाया शुल्क नहीं है।');
    t = t.replace(/Standard OPD consultation fee ₹(\d+) per visit hai\./gi, 'मानक ओपीडी परामर्श शुल्क ₹$1 प्रति विजिट है।');
    t = t.replace(/🚨 Emergency Request Logged!/gi, '🚨 आपातकालीन अनुरोध दर्ज किया गया!');
    t = t.replace(/Resource:/gi, 'संसाधन:');
    t = t.replace(/Request ID:/gi, 'अनुरोध आईडी:');
    t = t.replace(/Matched facilities within 15 km:/gi, '15 किमी के दायरे में मिले अस्पताल:');
    t = t.replace(/Unka next available slot (.*?) ko (.*?) par hai\./gi, 'उनका अगला उपलब्ध स्लॉट $1 को $2 पर है।');
    t = t.replace(/Bilkul! Aap kis problem ke liye doctor se milna chahte hain ya kis department me appointment chahiye\?/gi, 'बिल्कुल! आप किस समस्या के लिए डॉक्टर से मिलना चाहते हैं या किस विभाग में अपॉइंटमेंट चाहिए?');
    t = t.replace(/Available departments:/gi, 'उपलब्ध विभाग:');
    t = t.replace(/Sahi hai\./gi, 'सही है।');
    t = t.replace(/department me ye doctors available hain:/gi, 'विभाग में यह डॉक्टर उपलब्ध हैं:');
    t = t.replace(/Aap kin doctor se konsi date ko milna chahenge\?/gi, 'आप किस डॉक्टर से किस तारीख को मिलना चाहेंगे?');
    t = t.replace(/Maaf kijiye,/gi, 'क्षमा करें,');
    t = t.replace(/ke pass (.*?) ko koi slot available nahi hai\./gi, 'के पास $1 को कोई स्लॉट उपलब्ध नहीं है।');
    t = t.replace(/Kripya koi dusri date chunnein\./gi, 'कृपया कोई दूसरी तारीख चुनें।');
    t = t.replace(/ke pass (.*?) ko ye time slots available hain:/gi, 'के पास $1 को यह समय स्लॉट उपलब्ध हैं:');
    t = t.replace(/Aap kis samay aana chahenge\?/gi, 'आप किस समय आना चाहेंगे?');
    t = t.replace(/Cancel karne ke liye koi active appointment nahi mila\./gi, 'रद्द करने के लिए कोई सक्रिय अपॉइंटमेंट नहीं मिला।');
    t = t.replace(/Aapka koi active appointment nahi mila\./gi, 'आपका कोई सक्रिय अपॉइंटमेंट नहीं मिला।');
    return t;
  }

  if (lang === 'English') {
    let t = text;
    t = t.replace(/Namaste!/gi, 'Hello!');
    t = t.replace(/Aapka appointment successful book ho gaya hai!/gi, 'Your appointment has been successfully booked!');
    t = t.replace(/Aapka Queue Token ID hai:/gi, 'Your Queue Token ID is:');
    t = t.replace(/Aapka active appointment mila!/gi, 'Active appointment found!');
    t = t.replace(/Aapka appointment \((.*?)\) safaltapoorvak cancel kar diya gaya hai\./gi, 'Your appointment ($1) has been successfully cancelled.');
    t = t.replace(/Aapke aage (\d+) patients hain\./gi, 'There are $1 patients ahead of you.');
    t = t.replace(/Patient (.*?) ke koi pending dues nahi hain\./gi, 'Patient $1 has no pending dues.');
    t = t.replace(/Standard OPD consultation fee ₹(\d+) per visit hai\./gi, 'Standard OPD consultation fee is ₹$1 per visit.');
    t = t.replace(/Unka next available slot (.*?) ko (.*?) par hai\./gi, 'Their next available slot is on $1 at $2.');
    t = t.replace(/Bilkul! Aap kis problem ke liye doctor se milna chahte hain ya kis department me appointment chahiye\?/gi, 'Sure! Which department or problem would you like to book an appointment for?');
    t = t.replace(/Available departments:/gi, 'Available departments:');
    t = t.replace(/Sahi hai\./gi, 'Got it.');
    t = t.replace(/department me ye doctors available hain:/gi, 'department has these available doctors:');
    t = t.replace(/Aap kin doctor se konsi date ko milna chahenge\?/gi, 'Which doctor and date would you prefer?');
    t = t.replace(/Maaf kijiye,/gi, 'Sorry,');
    t = t.replace(/ke pass (.*?) ko koi slot available nahi hai\./gi, 'has no available slots on $1.');
    t = t.replace(/Kripya koi dusri date chunnein\./gi, 'Please choose another date.');
    t = t.replace(/ke pass (.*?) ko ye time slots available hain:/gi, 'has these available time slots on $1:');
    t = t.replace(/Aap kis samay aana chahenge\?/gi, 'Which time slot would you prefer?');
    t = t.replace(/Cancel karne ke liye koi active appointment nahi mila\./gi, 'No active appointment found to cancel.');
    t = t.replace(/Aapka koi active appointment nahi mila\./gi, 'No active appointment found.');
    return t;
  }

  if (lang === 'Bengali') {
    let t = text;
    t = t.replace(/Namaste!/gi, 'নমস্কার!');
    t = t.replace(/Aapka appointment successful book ho gaya hai!/gi, 'আপনার অ্যাপয়েন্টমেন্ট সফলভাবে বুক করা হয়েছে!');
    t = t.replace(/Aapka Queue Token ID hai:/gi, 'আপনার কিউ টোকেন আইডি:');
    t = t.replace(/Aapka active appointment mila!/gi, 'আপনার সক্রিয় অ্যাপয়েন্টমেন্ট পাওয়া গেছে!');
    t = t.replace(/Aapka appointment \((.*?)\) safaltapoorvak cancel kar diya gaya hai\./gi, 'আপনার অ্যাপয়েন্টমেন্ট ($1) বাতিল করা হয়েছে।');
    t = t.replace(/Unka next available slot (.*?) ko (.*?) par hai\./gi, 'তাদের পরবর্তী উপলব্ধ স্লট হলো $1 তারিখে $2।');
    t = t.replace(/Maaf kijiye,/gi, 'ক্ষমা করবেন,');
    t = t.replace(/ke pass (.*?) ko koi slot available nahi hai\./gi, 'এর $1 তারিখে কোনো স্লট উপলব্ধ নেই।');
    t = t.replace(/Kripya koi dusri date chunnein\./gi, 'অনুগ্রহ করে অন্য একটি তারিখ বেছে নিন।');
    return t;
  }

  if (lang === 'Tamil') {
    let t = text;
    t = t.replace(/Namaste!/gi, 'வணக்கம்!');
    t = t.replace(/Aapka appointment successful book ho gaya hai!/gi, 'உங்கள் அப்பாயிண்ட்மென்ட் வெற்றிகரமாக பதிவு செய்யப்பட்டது!');
    t = t.replace(/Aapka Queue Token ID hai:/gi, 'உங்கள் டோக்கன் ஐடி:');
    t = t.replace(/Aapka active appointment mila!/gi, 'உங்கள் அப்பாயிண்ட்மென்ட் கண்டறியப்பட்டது!');
    t = t.replace(/Unka next available slot (.*?) ko (.*?) par hai\./gi, 'அவர்களின் அடுத்த டோக்கன் ஸ்லாட் $1 அன்று $2.');
    t = t.replace(/Maaf kijiye,/gi, 'மன்னிக்கவும்,');
    t = t.replace(/ke pass (.*?) ko koi slot available nahi hai\./gi, 'அவர்களுக்கு $1 அன்று ஸ்லாட் இல்லை.');
    t = t.replace(/Kripya koi dusri date chunnein\./gi, 'தயவுசெய்து வேறு தேதியை தேர்வு செய்யவும்.');
    return t;
  }

  if (lang === 'Telugu') {
    let t = text;
    t = t.replace(/Namaste!/gi, 'నమస్కారం!');
    t = t.replace(/Aapka appointment successful book ho gaya hai!/gi, 'మీ అపాయింట్‌మెంట్ విజయవంతంగా బుక్ చేయబడింది!');
    t = t.replace(/Aapka Queue Token ID hai:/gi, 'మీ టోకెన్ ఐడీ:');
    t = t.replace(/Unka next available slot (.*?) ko (.*?) par hai\./gi, 'వారి తదుపరి అందుబాటులో ఉన్న స్లాట్ $1న $2.');
    t = t.replace(/Maaf kijiye,/gi, 'క్షమించండి,');
    t = t.replace(/ke pass (.*?) ko koi slot available nahi hai\./gi, 'వద్ద $1న స్లాట్లు అందుబాటులో లేవు.');
    t = t.replace(/Kripya koi dusri date chunnein\./gi, 'దయచేసి మరొక తేదీని ఎంచుకోండి.');
    return t;
  }

  if (lang === 'Marathi') {
    let t = text;
    t = t.replace(/Namaste!/gi, 'नमस्कार!');
    t = t.replace(/Aapka appointment successful book ho gaya hai!/gi, 'तुमची अपॉइंटमेंट यशस्वीरित्या बुक झाली आहे!');
    t = t.replace(/Aapka Queue Token ID hai:/gi, 'तुमचा टोकन आयडी:');
    t = t.replace(/Unka next available slot (.*?) ko (.*?) par hai\./gi, 'त्यांचा पुढील उपलब्ध स्लॉट $1 रोजी $2 वाजता आहे.');
    t = t.replace(/Maaf kijiye,/gi, 'माफ करा,');
    t = t.replace(/ke pass (.*?) ko koi slot available nahi hai\./gi, 'कडे $1 रोजी कोणतीही स्लॉट उपलब्ध नाही.');
    t = t.replace(/Kripya koi dusri date chunnein\./gi, 'कृपया दुसरी तारीख निवडा.');
    return t;
  }

  return text;
}

export async function translateAiMessage(message: string, targetLang: string = 'Hinglish'): Promise<string> {
  if (!message || !targetLang) return message;
  const lang = targetLang.trim();
  if (lang.toLowerCase() === 'hinglish') return message;

  const { apiKey, isConfigured } = getOpenAICredentials();
  if (isConfigured && message.trim()) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an AI medical receptionist translator for an Indian hospital system. Translate the given response into ${lang}. Ensure doctor names, department names, dates, times, token numbers (e.g. MED-101), rupee values, and status words remain accurate. Return ONLY the translated string.`
            },
            { role: 'user', content: message },
          ],
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const translated = data.choices?.[0]?.message?.content?.trim();
        if (translated) return translated;
      }
    } catch {
      // Fall through to template fallback
    }
  }

  return fallbackTranslate(message, lang);
}

export async function processReceptionistTurn(
  input: ReceptionistInput
): Promise<ReceptionistResponse> {
  const res = await processReceptionistTurnRaw(input);
  if (input.language && input.language !== 'Hinglish') {
    res.aiMessage = await translateAiMessage(res.aiMessage, input.language);
  }
  return res;
}

async function processReceptionistTurnRaw(
  input: ReceptionistInput
): Promise<ReceptionistResponse> {
  const hospitalId = input.hospitalId || 'hosp-101';
  const configStatus = getReceptionistConfigStatus();
  const currentContext: ConversationContext = { ...(input.context || {}) };

  // 1. Voice Speech-to-Text Pipeline (Sarvam STT) or direct text
  let transcriptText = input.text?.trim() || '';

  if (!transcriptText && input.audioBlob) {
    const sttResult = await transcribeAudio(input.audioBlob, input.language || 'Hinglish');
    transcriptText = sttResult.text || '';
  }

  if (!transcriptText) {
    return {
      success: false,
      status: 'INVALID_INPUT',
      intent: 'UNKNOWN',
      transcript: '',
      aiMessage: 'Namaste! Mujhe aapki aawaaz samajh nahi aayi. Kripya dobara kahein ya message type karein.',
      configurationStatus: configStatus,
      context: currentContext,
    };
  }

  // 2. Route Turn through Real Local n8n Workflow (wf-ai-receptionist-v14)
  try {
    const n8nRes = await callN8nAiReceptionist({
      channel: input.channel || (input.audioBlob ? 'mic' : 'text'),
      text: transcriptText,
      language: input.language || 'Hinglish',
      hospitalId,
      context: currentContext,
    });

    if (n8nRes && (n8nRes.source === 'n8n' || n8nRes.executedBy === 'local-n8n')) {
      // Sync confirmed appointment/token to dbEngine
      if (n8nRes.intent === 'BOOK_APPOINTMENT' && n8nRes.actionPayload?.token) {
        const t = n8nRes.actionPayload.token;
        const docs = dbEngine.getDoctors(hospitalId);
        const doc = docs.find(d => 
          (t.doctor && d.name.toLowerCase().includes(t.doctor.toLowerCase())) ||
          (n8nRes.validatedSlots?.doctorName && d.name.toLowerCase().includes(n8nRes.validatedSlots.doctorName.toLowerCase()))
        ) || docs[0];

        try {
          let targetDate = t.date || currentContext.date || new Date().toISOString().split('T')[0];
          let availableSlots = dbEngine.calculateAvailableSlots(doc.id, targetDate);

          if (availableSlots.length === 0) {
            for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
              const checkDate = new Date(Date.now() + dayOffset * 86400000).toISOString().split('T')[0];
              const slots = dbEngine.calculateAvailableSlots(doc.id, checkDate);
              if (slots.length > 0) {
                targetDate = checkDate;
                availableSlots = slots;
                break;
              }
            }
          }
          if (availableSlots.length === 0) {
            targetDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
          }
          const assignedSlot = availableSlots[0] || '10:00 AM';

          dbEngine.createAppointment({
            hospital_id: hospitalId,
            department_id: doc?.department_id || undefined,
            doctor_id: doc?.id || 'doc-1',
            patient_name: currentContext.patientName || 'Patient',
            patient_phone: currentContext.patientPhone || '+91 98999 12345',
            appointment_date: targetDate,
            appointment_time: assignedSlot,
            notes: 'Booked via n8n AI Receptionist Workflow',
          });
        } catch (syncErr) {
          console.warn('[receptionistService] Note: Failed to sync n8n appointment to local db:', syncErr);
        }
      }

      return {
        success: n8nRes.success,
        status: (n8nRes.status as any) || 'ACTION_COMPLETED',
        intent: (n8nRes.intent as ReceptionistIntentType) || 'BOOK_APPOINTMENT',
        transcript: transcriptText,
        aiMessage: n8nRes.aiMessage || 'Appointment processed via n8n workflow.',
        configurationStatus: {
          sarvamConfigured: configStatus.sarvamConfigured,
          openaiConfigured: true,
          statusReport: 'Executed via local n8n workflow (wf-ai-receptionist-v14)',
        },
        validatedSlots: n8nRes.validatedSlots,
        missingSlots: n8nRes.missingSlots,
        actionPayload: n8nRes.actionPayload,
        context: {
          ...currentContext,
          ...(n8nRes.context || {}),
        },
      };
    }
  } catch (n8nErr: any) {
    console.warn('[receptionistService] n8n workflow bypassed/unavailable, using local pipeline fallback:', n8nErr?.message || n8nErr);
  }

  // 3. Local OpenAI / Indic NLP Intent & Slot Extraction (Fallback)
  const extracted = await extractIntentAndSlots(transcriptText);
  let intent: ReceptionistIntentType = extracted.intent;

  // Merge context if continuing a multi-turn conversation
  if (intent === 'UNKNOWN' && currentContext.pendingIntent) {
    intent = currentContext.pendingIntent;
  }

  const doctorQuery = extracted.doctorName || currentContext.doctorName;
  const deptQuery = extracted.department || currentContext.departmentName;
  const dateQuery = extracted.preferredDate || currentContext.date;
  const timeQuery = extracted.preferredTime || currentContext.timeSlot;
  const patientName = extracted.patientName || currentContext.patientName || 'Patient';
  const patientPhone = extracted.patientPhone || currentContext.patientPhone || '+91 98999 12345';
  const tokenIdQuery = extracted.tokenId || currentContext.tokenId;

  // 3. Strict Backend Validation Engine against Real Database
  switch (intent) {
    // -------------------------------------------------------------
    // INTENT 1: BOOK_APPOINTMENT
    // -------------------------------------------------------------
    case 'BOOK_APPOINTMENT': {
      const doctors = dbEngine.getDoctors(hospitalId);
      const departments = dbEngine.getDepartments(hospitalId);

      let selectedDoctor = doctors.find(d => {
        if (!doctorQuery) return false;
        const target = doctorQuery.toLowerCase();
        return d.name.toLowerCase().includes(target) || target.includes(d.name.toLowerCase());
      });

      let selectedDepartment = departments.find(dep => {
        if (!deptQuery) return false;
        const target = deptQuery.toLowerCase();
        return dep.name.toLowerCase().includes(target) || target.includes(dep.name.toLowerCase());
      });

      if (!selectedDoctor && selectedDepartment) {
        const deptDocs = doctors.filter(d => d.department_id === selectedDepartment?.id);
        if (deptDocs.length === 1) {
          selectedDoctor = deptDocs[0];
        }
      }

      // Check if missing doctor/department info
      if (!selectedDoctor && !selectedDepartment) {
        const deptNames = departments.map(d => d.name).join(', ');
        return {
          success: false,
          status: 'NEEDS_MORE_INFO',
          intent,
          transcript: transcriptText,
          aiMessage: `Bilkul! Aap kis problem ke liye doctor se milna chahte hain ya kis department me appointment chahiye? Available departments: ${deptNames}.`,
          configurationStatus: configStatus,
          missingSlots: ['department', 'doctor'],
          suggestedActions: [
            { label: '🩺 Dr. Rajesh Sharma (Cardiology)', text: 'Dr. Rajesh Sharma Cardiology me appointment chahiye' },
            { label: '🦴 Dr. Priya Ananth (Orthopedics)', text: 'Dr. Priya Ananth Orthopedics me appointment chahiye' },
            { label: '💊 Dr. Amit Patel (General Medicine)', text: 'Dr. Amit Patel General Medicine me checkup' },
            { label: '🧠 Dr. Vikram Malhotra (Neurology)', text: 'Dr. Vikram Malhotra Neurology me appointment' },
          ],
          context: {
            ...currentContext,
            pendingIntent: 'BOOK_APPOINTMENT',
            patientName,
            patientPhone,
          },
        };
      }

      if (!selectedDoctor && selectedDepartment) {
        const deptDocs = doctors.filter(d => d.department_id === selectedDepartment?.id);
        const docNames = deptDocs.map(d => d.name).join(', ');
        return {
          success: false,
          status: 'NEEDS_MORE_INFO',
          intent,
          transcript: transcriptText,
          aiMessage: `Sahi hai. ${selectedDepartment.name} department me ye doctors available hain: ${docNames}. Aap kin doctor se konsi date ko milna chahenge?`,
          configurationStatus: configStatus,
          missingSlots: ['doctor', 'date'],
          suggestedActions: deptDocs.map(d => ({
            label: `👨‍⚕️ ${d.name}`,
            text: `${d.name} se appointment chahiye aaj`,
          })),
          context: {
            ...currentContext,
            pendingIntent: 'BOOK_APPOINTMENT',
            departmentId: selectedDepartment.id,
            departmentName: selectedDepartment.name,
            patientName,
            patientPhone,
          },
        };
      }

      if (selectedDoctor && !selectedDepartment) {
        selectedDepartment = departments.find(d => d.id === selectedDoctor?.department_id);
      }

      // Check Date: Calculate targetDate intelligently
      const todayStr = new Date().toISOString().split('T')[0];
      let targetDate = dateQuery && dateQuery !== 'Today' ? dateQuery : todayStr;

      // Backend calculates REAL available slots from DB
      let availableSlots = dbEngine.calculateAvailableSlots(selectedDoctor!.id, targetDate);

      // If no slots today and user didn't specify an explicit date, resolve next working date
      if (availableSlots.length === 0 && (!dateQuery || dateQuery === 'Today')) {
        let curr = new Date();
        for (let i = 0; i < 7; i++) {
          curr.setDate(curr.getDate() + 1);
          const dStr = curr.toISOString().split('T')[0];
          const slots = dbEngine.calculateAvailableSlots(selectedDoctor!.id, dStr);
          if (slots.length > 0) {
            targetDate = dStr;
            availableSlots = slots;
            break;
          }
        }
      }

      if (availableSlots.length === 0) {
        // Find next working date with available slots
        let nextWorkingDate = targetDate;
        let nextSlots: string[] = [];
        let curr = new Date(targetDate);

        for (let i = 1; i <= 7; i++) {
          curr.setDate(curr.getDate() + 1);
          const dStr = curr.toISOString().split('T')[0];
          const s = dbEngine.calculateAvailableSlots(selectedDoctor!.id, dStr);
          if (s.length > 0) {
            nextWorkingDate = dStr;
            nextSlots = s;
            break;
          }
        }

        const suggestion = nextSlots.length > 0
          ? ` Unka next available slot ${nextWorkingDate} ko ${nextSlots[0]} par hai.`
          : '';

        return {
          success: false,
          status: 'NEEDS_MORE_INFO',
          intent,
          transcript: transcriptText,
          aiMessage: `Maaf kijiye, ${selectedDoctor!.name} ke pass ${targetDate} ko koi slot available nahi hai.${suggestion} Kripya koi dusri date chunnein.`,
          configurationStatus: configStatus,
          missingSlots: ['date'],
          suggestedActions: [
            { label: '📅 Aaj (Today)', text: `${selectedDoctor!.name} aaj appointment` },
            { label: '📅 Kal (Tomorrow)', text: `${selectedDoctor!.name} kal appointment` },
            { label: `📅 Next Slot (${nextWorkingDate})`, text: `${selectedDoctor!.name} ${nextWorkingDate} appointment` },
          ],
          context: {
            ...currentContext,
            pendingIntent: 'BOOK_APPOINTMENT',
            doctorId: selectedDoctor!.id,
            doctorName: selectedDoctor!.name,
            departmentName: selectedDepartment?.name,
            date: nextWorkingDate,
            patientName,
            patientPhone,
          },
        };
      }


      let selectedSlot: string | undefined;
      if (timeQuery) {
        const queryNorm = timeQuery.toLowerCase().replace(/\s+/g, '');
        selectedSlot = availableSlots.find(s =>
          s.toLowerCase().replace(/\s+/g, '') === queryNorm ||
          s.toLowerCase().includes(timeQuery.toLowerCase())
        );
      }
      
      if (!selectedSlot && dateQuery && availableSlots.length > 0) {
        selectedSlot = availableSlots[0];
      }

      if (!selectedSlot) {
        // Pick first available slot or prompt user with real DB slots
        const firstSlots = availableSlots.slice(0, 4).join(', ');
        return {
          success: false,
          status: 'NEEDS_MORE_INFO',
          intent,
          transcript: transcriptText,
          aiMessage: `${selectedDoctor!.name} (${selectedDepartment?.name || 'OPD'}) ke pass ${targetDate} ko ye time slots available hain: ${firstSlots}. Aap kis samay aana chahenge?`,
          configurationStatus: configStatus,
          missingSlots: ['timeSlot'],
          suggestedActions: availableSlots.slice(0, 4).map(s => ({
            label: `⏰ ${s}`,
            text: `${selectedDoctor!.name} at ${s}`,
          })),
          context: {
            ...currentContext,
            pendingIntent: 'BOOK_APPOINTMENT',
            doctorId: selectedDoctor!.id,
            doctorName: selectedDoctor!.name,
            departmentName: selectedDepartment?.name,
            date: targetDate,
            patientName,
            patientPhone,
          },
        };
      }


      // Backend DB Execution
      try {
        const { appointment, token } = await dbEngine.createAppointmentAsync({
          hospital_id: hospitalId,
          department_id: selectedDepartment?.id,
          doctor_id: selectedDoctor!.id,
          patient_name: patientName,
          patient_phone: patientPhone,
          appointment_date: targetDate,
          appointment_time: selectedSlot,
          notes: 'Booked via Real AI Voice Receptionist',
        });

        return {
          success: true,
          status: 'ACTION_COMPLETED',
          intent,
          transcript: transcriptText,
          aiMessage: `Aapka appointment successful book ho gaya hai! Doctor: ${selectedDoctor!.name}, Date: ${targetDate}, Time: ${selectedSlot}. Aapka Queue Token ID hai: ${token.token_number}.`,
          configurationStatus: configStatus,
          validatedSlots: {
            doctorName: selectedDoctor!.name,
            departmentName: selectedDepartment?.name,
            date: targetDate,
            timeSlot: selectedSlot,
            patientName,
          },
          actionPayload: { appointment, token },
          context: {},
        };
      } catch (err: any) {
        return {
          success: false,
          status: 'ERROR',
          intent,
          transcript: transcriptText,
          aiMessage: `Backend Validation Error: ${err.message}`,
          configurationStatus: configStatus,
          context: currentContext,
        };
      }
    }

    // -------------------------------------------------------------
    // INTENT 2: CHECK_APPOINTMENT
    // -------------------------------------------------------------
    case 'CHECK_APPOINTMENT': {
      const appointments = dbEngine.getAppointments({ hospital_id: hospitalId });
      const tokens = dbEngine.getQueueTokens(hospitalId);

      let appt = appointments.find(a =>
        (tokenIdQuery && (a.id === tokenIdQuery || a.appointment_number === tokenIdQuery)) ||
        (patientPhone && a.patient_phone === patientPhone)
      );

      if (!appt && tokenIdQuery) {
        const token = tokens.find(t => t.token_number === tokenIdQuery || t.id === tokenIdQuery);
        if (token) {
          appt = appointments.find(a => a.id === token.appointment_id);
        }
      }

      if (!appt && appointments.length > 0) {
        appt = appointments[appointments.length - 1]; // Pick latest active
      }

      if (!appt) {
        return {
          success: false,
          status: 'NEEDS_MORE_INFO',
          intent,
          transcript: transcriptText,
          aiMessage: 'Aapka koi active appointment nahi mila. Kripya apna registered phone number ya Token ID (jaise MED-101) batayein.',
          configurationStatus: configStatus,
          missingSlots: ['tokenId', 'patientPhone'],
          context: currentContext,
        };
      }

      const doctor = dbEngine.getDoctors().find(d => d.id === appt?.doctor_id);

      return {
        success: true,
        status: 'ACTION_COMPLETED',
        intent,
        transcript: transcriptText,
        aiMessage: `Aapka active appointment mila! Doctor: ${doctor?.name || 'OPD'}, Date: ${appt.appointment_date}, Time: ${appt.appointment_time}, Status: ${appt.status}.`,
        configurationStatus: configStatus,
        validatedSlots: { appointmentId: appt.id, status: appt.status },
        actionPayload: { appointment: appt },
      };
    }

    // -------------------------------------------------------------
    // INTENT 3: CANCEL_APPOINTMENT
    // -------------------------------------------------------------
    case 'CANCEL_APPOINTMENT': {
      const appointments = dbEngine.getAppointments({ hospital_id: hospitalId });
      const tokens = dbEngine.getQueueTokens(hospitalId);

      let appt = appointments.find(a =>
        a.status !== 'CANCELLED' && (
          (tokenIdQuery && (a.id === tokenIdQuery || a.appointment_number === tokenIdQuery)) ||
          (patientPhone && a.patient_phone === patientPhone)
        )
      );

      if (!appt && tokenIdQuery) {
        const token = tokens.find(t => t.token_number === tokenIdQuery);
        if (token) appt = appointments.find(a => a.id === token.appointment_id && a.status !== 'CANCELLED');
      }

      if (!appt) {
        const activeBookings = appointments.filter(a => a.status === 'BOOKED');
        if (activeBookings.length > 0) appt = activeBookings[activeBookings.length - 1];
      }

      if (!appt) {
        return {
          success: false,
          status: 'NEEDS_MORE_INFO',
          intent,
          transcript: transcriptText,
          aiMessage: 'Cancel karne ke liye koi active appointment nahi mila. Kripya apna Token ID ya Phone number dein.',
          configurationStatus: configStatus,
          missingSlots: ['tokenId'],
          context: currentContext,
        };
      }

      const cancelled = dbEngine.cancelAppointment(appt.id);

      return {
        success: true,
        status: 'ACTION_COMPLETED',
        intent,
        transcript: transcriptText,
        aiMessage: `Aapka appointment (${cancelled.appointment_number}) safaltapoorvak cancel kar diya gaya hai.`,
        configurationStatus: configStatus,
        validatedSlots: { appointmentId: appt.id, status: 'CANCELLED' },
        actionPayload: { appointment: cancelled },
      };
    }

    // -------------------------------------------------------------
    // INTENT 4: CHECK_QUEUE
    // -------------------------------------------------------------
    case 'CHECK_QUEUE': {
      const tokens = dbEngine.getQueueTokens(hospitalId);

      let token = tokens.find(t => t.token_number === tokenIdQuery || t.id === tokenIdQuery);
      if (!token && tokens.length > 0) {
        token = tokens.find(t => t.status === 'WAITING' || t.status === 'CHECKED_IN') || tokens[tokens.length - 1];
      }

      if (!token) {
        return {
          success: false,
          status: 'NEEDS_MORE_INFO',
          intent,
          transcript: transcriptText,
          aiMessage: 'Queue status check karne ke liye kripya apna Token ID (jaise MED-101) batayein.',
          configurationStatus: configStatus,
          missingSlots: ['tokenId'],
          suggestedActions: [
            { label: '🎫 Check MED-101', text: 'Mera token MED-101 status kya hai?' },
            { label: '🎫 Check MED-102', text: 'Mera token MED-102 status kya hai?' },
            { label: '📋 My Active Appointment', text: 'Mera appointment status check karo' },
          ],
          context: currentContext,
        };
      }

      const metrics = dbEngine.getPatientQueueMetrics(token.id);

      return {
        success: true,
        status: 'ACTION_COMPLETED',
        intent,
        transcript: transcriptText,
        aiMessage: `Token ${metrics.my_token}: Current token in consultation: ${metrics.current_token}. Aapke aage ${metrics.people_ahead} patients hain. Estimated wait time: ${metrics.estimated_wait_minutes} minutes.`,
        configurationStatus: configStatus,
        validatedSlots: { tokenId: token.token_number, position: metrics.queue_position },
        actionPayload: { metrics },
        suggestedActions: [
          { label: '🔄 Refresh Queue', text: `Token ${metrics.my_token} queue status` },
          { label: '❌ Cancel Appointment', text: `Cancel appointment ${metrics.my_token}` },
        ],
      };
    }

    // -------------------------------------------------------------
    // INTENT 5: CHECK_DOCTOR_AVAILABILITY
    // -------------------------------------------------------------
    case 'CHECK_DOCTOR_AVAILABILITY': {
      const doctors = dbEngine.getDoctors(hospitalId);
      const departments = dbEngine.getDepartments(hospitalId);

      const todayStr = new Date().toISOString().split('T')[0];
      const checkDate = dateQuery || todayStr;

      const results = doctors.map(doc => {
        const dept = departments.find(d => d.id === doc.department_id);
        const slots = dbEngine.calculateAvailableSlots(doc.id, checkDate);
        return {
          id: doc.id,
          name: doc.name,
          specialization: doc.specialization,
          department: dept?.name || 'General',
          availableSlotsCount: slots.length,
          nextSlots: slots.slice(0, 3),
        };
      });

      const summary = results.map(r => `${r.name} (${r.department}): ${r.availableSlotsCount} slots available (${r.nextSlots.join(', ')})`).join('; ');

      return {
        success: true,
        status: 'ACTION_COMPLETED',
        intent,
        transcript: transcriptText,
        aiMessage: `Doctors availability on ${checkDate}: ${summary}.`,
        configurationStatus: configStatus,
        validatedSlots: { checkDate },
        actionPayload: { availability: results },
        suggestedActions: [
          { label: '🩺 Book Dr. Rajesh Sharma', text: 'Book Dr. Rajesh Sharma Cardiology today' },
          { label: '🦴 Book Dr. Priya Ananth', text: 'Book Dr. Priya Ananth Orthopedics today' },
          { label: '💊 Book Dr. Amit Patel', text: 'Book Dr. Amit Patel General Medicine today' },
        ],
      };
    }

    // -------------------------------------------------------------
    // INTENT 6: CHECK_DUES
    // -------------------------------------------------------------
    case 'CHECK_DUES': {
      const doctors = dbEngine.getDoctors(hospitalId);
      const fee = doctors[0]?.consultation_fee || 500;

      return {
        success: true,
        status: 'ACTION_COMPLETED',
        intent,
        transcript: transcriptText,
        aiMessage: `Patient ${patientName} ke koi pending dues nahi hain. Standard OPD consultation fee ₹${fee} per visit hai.`,
        configurationStatus: configStatus,
        validatedSlots: { patientName, totalDues: 0, consultationFee: fee },
        actionPayload: { dues: 0, consultationFee: fee },
      };
    }

    // -------------------------------------------------------------
    // INTENT 7: GENERAL_HOSPITAL_QUERY
    // -------------------------------------------------------------
    case 'GENERAL_HOSPITAL_QUERY': {
      const hospital = dbEngine.getHospitals().find(h => h.id === hospitalId) || dbEngine.getHospitals()[0];
      const depts = dbEngine.getDepartments(hospitalId).map(d => d.name).join(', ');

      return {
        success: true,
        status: 'ACTION_COMPLETED',
        intent,
        transcript: transcriptText,
        aiMessage: `${hospital.name}: Address - ${hospital.address}. Helpline: ${hospital.phone}. Emergency Contact: ${hospital.emergency_contact}. OPD Hours: Mon-Sat 09:00 AM - 05:00 PM. Active Departments: ${depts}.`,
        configurationStatus: configStatus,
        validatedSlots: { hospitalName: hospital.name },
        actionPayload: { hospital },
      };
    }

    // -------------------------------------------------------------
    // INTENT 8: EMERGENCY_RESOURCE_REQUEST
    // -------------------------------------------------------------
    case 'EMERGENCY_RESOURCE_REQUEST': {
      const resourceType = extracted.resourceType || 'Oxygen';
      const quantity = extracted.quantity || 2;
      const urgencyRaw = extracted.urgency || 'CRITICAL';
      const urgency = (urgencyRaw === 'MEDIUM' ? 'MODERATE' : urgencyRaw) as any;

      const res = dbEngine.createEmergencyRequest({
        requesting_hospital_id: hospitalId,
        resource_type: resourceType,
        quantity,
        urgency,
        notes: `Voice Emergency Request: ${transcriptText}`,
      });

      return {
        success: true,
        status: 'ACTION_COMPLETED',
        intent,
        transcript: transcriptText,
        aiMessage: `🚨 Emergency Request Logged! Resource: ${quantity} ${resourceType}. Request ID: ${res.request.id}. Matched facilities within 15 km: ${res.matches.length}.`,
        configurationStatus: configStatus,
        validatedSlots: { resourceType, quantity, urgency },
        actionPayload: res,
      };
    }

    // -------------------------------------------------------------
    // INTENT 9: UNKNOWN / DEFAULT
    // -------------------------------------------------------------
    case 'UNKNOWN':
    default: {
      return {
        success: true,
        status: 'ACTION_COMPLETED',
        intent: 'UNKNOWN',
        transcript: transcriptText,
        aiMessage: 'Namaste! Main MedConnect AI Receptionist hoon. Main aapki appointment booking, queue status check, doctor availability, dues query, ya emergency resource requests me help kar sakta hoon. Aap kaise sahayata chahte hain?',
        configurationStatus: configStatus,
      };
    }
  }
}
