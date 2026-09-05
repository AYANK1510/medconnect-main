import { processReceptionistTurn } from '../src/services/receptionistService';

async function testLanguageTranslation() {
  console.log('--- TESTING MULTI-LANGUAGE RECEPTIONIST TRANSLATION ---');

  const langs = ['Hindi', 'English', 'Hinglish', 'Bengali', 'Tamil', 'Telugu', 'Marathi'];

  for (const lang of langs) {
    const res = await processReceptionistTurn({
      channel: 'text',
      text: 'Book Cardiology appointment with Dr. Rajesh Sharma tomorrow at 10:00 AM for patient Aarav',
      hospitalId: 'hosp-101',
      language: lang,
    });

    console.log(`\n[Language: ${lang}]`);
    console.log(`Intent: ${res.intent}`);
    console.log(`Status: ${res.status}`);
    console.log(`AI Message: ${res.aiMessage}`);
  }
}

testLanguageTranslation();
