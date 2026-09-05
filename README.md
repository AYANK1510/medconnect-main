# MEDCONNECT PULSE

### *"Connecting Care When Seconds Count"*

An n8n-powered, event-driven regional healthcare safety network connecting hospitals, front desks, and emergency supply lines in real time.

---

## 🚀 Product Vision & Origin Concept

Designed around critical lessons from the 2021 oxygen crisis, **MedConnect Pulse** transforms isolated hospital silos into one connected, automated regional safety net. 

Front desk teams are overwhelmed by hundreds of repetitive appointment calls daily, while emergency doctors lose golden-hour minutes manually phoning neighboring facilities to locate blood, oxygen, or ICU beds. MedConnect Pulse bridges these gaps with two connected pillars:

1. **Multilingual AI Receptionist & Live Queue Engine**: Voice intake powered by Sarvam AI (`saaras:v1` STT) and OpenAI (`gpt-4o-mini`), automated OPD appointment booking (`#MED-4029`), and real-time WhatsApp queue updates.
2. **15 KM Emergency Hospital-to-Hospital Supply Dispatch**: Pure Haversine GPS distance math calculating 15 km geo-fences, inline Telegram emergency alerts, automated inventory locking, QR Dispatch Passes, and 3-minute Twilio voice fallback escalation.

---

## 🏆 Key Hackathon Performance & Impact Metrics

* **< 30s**: Emergency Match & Response Latency
* **80%**: Routine OPD Phone Inquiries Automated
* **15 KM**: Regional Safety-Net Radius (Haversine Geo-Fence)
* **10K+**: Daily Workflow Runs per Automation Node

---

## 🛠 Tech Stack Architecture

| Layer | Technology | Function |
| :--- | :--- | :--- |
| **Automation Engine** | **n8n** | Event-driven workflow orchestration, webhook triggers & escalation loops |
| **Speech-to-Text** | **Sarvam AI (`saaras:v1`)** | Indic language voice recognition (Hindi, Hinglish, English, Tamil, Telugu) |
| **Intent & Entities** | **OpenAI (`gpt-4o-mini`)** | Clinical slot filling (Patient Name, Doctor, Department, Slot) |
| **Database** | **Supabase / PostgreSQL** | Relational schema for hospitals, appointments, inventory & dispatches |
| **Frontend Dashboard** | **React 19 + Vite 6 + TS** | 3-in-1 role-based web dashboard (Patient, Reception, ER Staff, Admin) |
| **Styling & UI** | **Tailwind CSS v4 + Lucide** | Modern dark navy healthtech aesthetic with glassmorphism |
| **Alerts & Communication** | **Telegram Bot API** | Inline interactive emergency SOS cards with Accept & Supply actions |
| **Voice Escalation** | **Twilio Voice API** | Automated phone calls to Regional Coordinators after 3-minute timeout |
| **Geo Filtering** | **Haversine Formula** | Mathematical 15 km GPS distance calculation in n8n code node |

---

## ⚡ n8n Workflows

### Workflow 1: Multilingual Voice OPD Intake & Live Queue
`Voice Input / Webhook` ➔ `Sarvam AI saaras:v1 STT` ➔ `OpenAI gpt-4o-mini Intent Parsing` ➔ `Supabase DB Reservation` ➔ `Queue Code Node (#MED-4029)` ➔ `Twilio WhatsApp Alert`

### Workflow 2: 15 KM Emergency Supply Dispatch & Fallback Escalation
`ER SOS Webhook` ➔ `Haversine 15 KM Math Filter` ➔ `Telegram Emergency Alert` ➔ `Hospital Accept & Inventory Lock` ➔ `3-Min Delay Gate` ➔ `Twilio Voice Escalation Call / QR Pass`

---

## 💻 Local Setup & Running Instructions

### Prerequisites
* Node.js v18+ 
* npm v9+

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/ayankkumar/f1-hackathon.git
cd f1-hackathon-main
npm install
```

### 2. Configure Environment Variables (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Note: If API keys are omitted, MedConnect Pulse runs seamlessly in **DEMO MODE** with high-fidelity simulated responses).*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 👥 Team 4 Bit Minds (JEMS Engineering Management Technical Campus)

* **Ayank Kumar** (Team Leader) — n8n Workflows & Multilingual Voice AI
* **Ishan Varshney** — Supabase DB, Haversine 15 KM Engine, Telegram & Twilio
* **Ishaan Sama** — React / Vite 3-in-1 Dashboard & Voice AI Widget
* **Bhavya Gupta** — E2E System Testing, Demo Fail-Safes & Pitch Presentation

---

## 📄 License
MIT License. Built for Healthcare Innovation Hackathon 2026.
