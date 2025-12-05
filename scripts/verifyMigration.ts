import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(readFileSync(join(__dirname, '..', 'firebase-service-account.json'), 'utf8'));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app, 'gopopera2028');

async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');
  
  const eventsRef = db.collection('events');
  const snapshot = await eventsRef.limit(3).get();
  
  if (snapshot.empty) {
    console.log('⚠️  No events found to verify');
    return;
  }
  
  console.log(`✅ Found ${snapshot.size} event(s) to check:\n`);
  
  snapshot.forEach((doc) => {
    const event = doc.data();
    console.log(`📋 Event: ${event.title || doc.id}`);
    console.log(`   - vibes: ${Array.isArray(event.vibes) ? JSON.stringify(event.vibes) : '❌ NOT SET'}`);
    console.log(`   - sessionFrequency: ${event.sessionFrequency || '❌ NOT SET'}`);
    console.log(`   - sessionMode: ${event.sessionMode || '❌ NOT SET'}`);
    console.log(`   - country: ${event.country || '❌ NOT SET'}`);
    console.log('');
  });
  
  console.log('✅ Verification complete!');
}

verifyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });

