/**
 * Sarvam AI STT Integration Service (saaras:v1)
 * Supports real API calls when SARVAM_API_KEY is configured,
 * with clear credential status reporting and Indic NLP fallback.
 *
 * Sarvam STT docs: https://docs.sarvam.ai/api-reference-docs/endpoints/speech-to-text
 */

export interface SarvamSTTResult {
  text: string;
  detectedLang: string;
  confidence: number;
  isConfigured: boolean;
  status: string;
}

// Full Sarvam API language code map (all supported Indic languages)
const LANGUAGE_CODE_MAP: Record<string, string> = {
  Hinglish: 'hi-IN',
  Hindi:    'hi-IN',
  English:  'en-IN',
  Tamil:    'ta-IN',
  Telugu:   'te-IN',
  Bengali:  'bn-IN',
  Marathi:  'mr-IN',
  Punjabi:  'pa-IN',
  Gujarati: 'gu-IN',
  Kannada:  'kn-IN',
  Odia:     'or-IN',
};

export function getSarvamCredentials(): { apiKey: string; isConfigured: boolean } {
  let apiKey = '';
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = window.localStorage.getItem('MEDCONNECT_SARVAM_API_KEY');
    if (stored && stored.trim()) apiKey = stored.trim();
  }
  if (!apiKey && typeof process !== 'undefined' && process.env) {
    apiKey = process.env.SARVAM_API_KEY || '';
  }
  if (!apiKey && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    apiKey = (import.meta as any).env.VITE_SARVAM_API_KEY || (import.meta as any).env.SARVAM_API_KEY || '';
  }
  const trimmed = apiKey.trim();
  return { apiKey: trimmed, isConfigured: Boolean(trimmed) };
}

// Realistic Indic fallback transcriptions for demo / non-mic environments
const MOCK_TRANSCRIPTIONS: Record<string, string[]> = {
  Hinglish: [
    'Hi, mujhe Dr. Rajesh Sharma se Cardiology department me appointment chahiye today around 11 AM.',
    'Doctor Priya Ananth se Orthopedics me consultation slot book karna hai.',
    'Mujhe Dr. Amit Patel se General Medicine me OPD checkup chahiye.',
    'Dr. Vikram Malhotra se Neurology department me consultation book kar do.',
    'Mujhe Dr. Sunita Rao se Dermatology me appointment chahiye skin checkup ke liye.',
  ],
  Hindi: [
    'नमस्ते, मुझे आज डॉक्टर राजेश शर्मा से कार्डियोलॉजी में अपॉइंटमेंट बुक करना है।',
    'नमस्ते, मुझे डॉक्टर प्रिया अनंत से ऑर्थोपेडिक्स में चेकअप के लिए अपॉइंटमेंट चाहिए।',
    'मुझे डॉक्टर अमित पटेल से जनरल मेडिसिन में आज ही मिलना है।',
    'कृपया डॉक्टर विक्रम मल्होत्रा से न्यूरोलॉजी विभाग में अपॉइंटमेंट बुक कर दें।',
  ],
  English: [
    'Hello, I would like to schedule an OPD appointment with Dr. Rajesh Sharma in Cardiology for today at 11:00 AM.',
    'Can you please book me an appointment with Dr. Priya Ananth in Orthopedics?',
    'I want to schedule a visit with Dr. Amit Patel in General Medicine this afternoon.',
    'Please book an appointment with Dr. Vikram Malhotra in Neurology.',
  ],
  Tamil: [
    'வணக்கம், இன்று காலை 11 மணிக்கு டாக்டர் ராஜேஷ் சர்மாவுடன் கார்டியாலஜி சந்திப்பை பதிவு செய்ய விரும்புகிறேன்.',
    'டாக்டர் பிரியா அனந்துடன் எலும்பியல் சந்திப்பை பதிவு செய்யவும்.',
  ],
  Telugu: [
    'నమస్కారం, ఈ రోజు ఉదయం 11 గంటలకు కార్డియాలజీ విభాగంలో డాక్టర్ రాజేష్ శర్మతో అపాయింట్‌మెంట్ బుక్ చేయండి.',
    'డాక్టర్ ప్రియా అనంత్‌తో ఆర్థోపెడిక్స్‌లో అపాయింట్‌మెంట్ బుక్ చేయండి.',
  ],
  Bengali: [
    'নমস্কার, আজ সকাল ১১টায় কার্ডিওলজি বিভাগে ডাক্তার রাজেশ শর্মার সাথে অ্যাপয়েন্টমেন্ট বুক করতে চাই।',
    'ডাক্তার প্রিয়া অনন্তর সাথে অর্থোপেডিকসে অ্যাপয়েন্টমেন্ট বুক করুন।',
  ],
  Marathi: [
    'नमस्कार, आज सकाळी ११ वाजता कार्डिओलॉजी विभागात डॉ. राजेश शर्मा यांच्याशी अपॉइंटमेंट बुक करायची आहे.',
    'डॉ. प्रिया अनंत यांच्याशी ऑर्थोपेडिक्स विभागात अपॉइंटमेंट हवी आहे.',
  ],
};

export async function transcribeAudio(
  audioBlob?: Blob | ArrayBuffer | string,
  language: string = 'Hinglish'
): Promise<SarvamSTTResult> {
  const { apiKey, isConfigured } = getSarvamCredentials();

  if (!isConfigured) {
    console.error('SARVAM_NOT_CONFIGURED: Missing SARVAM_API_KEY in .env (server-side env var).');
  }

  // ── Real Sarvam API Call ─────────────────────────────────────────────────
  if (audioBlob && isConfigured) {
    try {
      const formData = new FormData();

      // Normalize audio input to a Blob
      if (audioBlob instanceof Blob) {
        formData.append('file', audioBlob, 'audio.wav');
      } else if (audioBlob instanceof ArrayBuffer) {
        formData.append('file', new Blob([audioBlob], { type: 'audio/wav' }), 'audio.wav');
      } else if (typeof audioBlob === 'string') {
        formData.append('file', new Blob([audioBlob], { type: 'audio/wav' }), 'audio.wav');
      }

      const languageCode = LANGUAGE_CODE_MAP[language] || 'hi-IN';
      formData.append('language_code', languageCode);
      formData.append('model', 'saaras:v1');

      const response = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: { 'api-subscription-key': apiKey },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const transcript: string = data.transcript || data.text || '';

        if (transcript) {
          return {
            text: transcript,
            detectedLang: data.language_code || languageCode,
            confidence: typeof data.confidence === 'number' ? data.confidence : 0.96,
            isConfigured: true,
            status: 'SUCCESS',
          };
        }

        // API responded 200 but returned no transcript text
        console.warn('SARVAM_EMPTY_TRANSCRIPT: API returned 200 but no transcript. Falling back to demo.');
      } else {
        const errBody = await response.text().catch(() => '(no body)');
        console.error(`SARVAM_API_ERROR: HTTP ${response.status} ${response.statusText} — ${errBody}`);
      }
    } catch (err: any) {
      console.error('SARVAM_NETWORK_ERROR:', err?.message || String(err));
    }
  }

  // ── Demo / Fallback Simulation ────────────────────────────────────────────
  await new Promise<void>((res) => setTimeout(res, 200));

  const list = MOCK_TRANSCRIPTIONS[language] || MOCK_TRANSCRIPTIONS['Hinglish'];
  const text = list[Math.floor(Math.random() * list.length)];

  return {
    text,
    detectedLang: language,
    confidence: isConfigured ? 0.88 : 0.82,
    isConfigured,
    status: isConfigured ? 'SARVAM_FALLBACK_DEMO' : 'SARVAM_NOT_CONFIGURED',
  };
}
