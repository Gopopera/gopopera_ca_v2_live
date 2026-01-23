/**
 * Backfill Event coverImageUrl
 *
 * How to run:
 * 1) Ensure Firebase Admin credentials are available (recommended):
 *    export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
 * 2) Run:
 *    npx tsx scripts/backfillCoverImages.ts
 *
 * Dry run (no writes):
 *    npx tsx scripts/backfillCoverImages.ts --dry-run
 */

import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const databaseId = 'gopopera2028';
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const isDryRun = process.argv.includes('--dry-run');

function initAdmin() {
  if (getApps().length > 0) return;

  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      initializeApp({
        credential: cert(serviceAccount as ServiceAccount),
        projectId: projectId || serviceAccount.project_id,
      });
      console.log('✅ Initialized Firebase Admin SDK using service account key');
      return;
    }

    if (process.env.GCLOUD_PROJECT || projectId) {
      initializeApp({ projectId: projectId || process.env.GCLOUD_PROJECT });
      console.log('✅ Initialized Firebase Admin SDK using Application Default Credentials');
      return;
    }

    const possiblePaths = [
      join(__dirname, '..', 'firebase-service-account.json'),
      join(process.cwd(), 'firebase-service-account.json'),
      join(process.env.HOME || '', 'firebase-service-account.json'),
    ];

    for (const path of possiblePaths) {
      try {
        const serviceAccount = JSON.parse(readFileSync(path, 'utf8'));
        initializeApp({
          credential: cert(serviceAccount as ServiceAccount),
          projectId: projectId || serviceAccount.project_id,
        });
        console.log(`✅ Initialized Firebase Admin SDK using key at: ${path}`);
        return;
      } catch {
        // Try next path
      }
    }

    throw new Error('No credentials found');
  } catch (error: any) {
    console.error('\n❌ Failed to initialize Firebase Admin SDK');
    console.error('\n📋 Please set up Firebase Admin SDK credentials:');
    console.error('\n1. Go to Firebase Console > Project Settings > Service Accounts');
    console.error('2. Click "Generate New Private Key"');
    console.error('3. Save the JSON file (e.g., firebase-service-account.json)');
    console.error('4. Set env var: export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"');
    console.error('\n💡 The script will also look for firebase-service-account.json in the repo root.');
    process.exit(1);
  }
}

async function backfillCoverImages() {
  initAdmin();
  const db = getFirestore(undefined, databaseId);
  const eventsRef = db.collection('events');

  console.log(`🔎 Searching for events missing coverImageUrl${isDryRun ? ' (dry run)' : ''}...`);

  const [missingSnapshot, emptySnapshot] = await Promise.all([
    eventsRef.where('coverImageUrl', '==', null).get(),
    eventsRef.where('coverImageUrl', '==', '').get(),
  ]);

  if (missingSnapshot.empty && emptySnapshot.empty) {
    console.log('✅ No events found with missing coverImageUrl');
    return;
  }

  const updates: Array<{ id: string; coverImageUrl: string }> = [];
  const seen = new Set<string>();

  const processSnapshot = (snap: FirebaseFirestore.QuerySnapshot) => {
    snap.forEach((docSnap) => {
      if (seen.has(docSnap.id)) return;
      seen.add(docSnap.id);

    const data = docSnap.data() || {};
    const imageUrls = Array.isArray(data.imageUrls) ? data.imageUrls.filter((url: unknown) => typeof url === 'string' && url.trim()) : [];
    const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl.trim() : '';
    const coverCandidate = imageUrls[0] || imageUrl;

    if (coverCandidate) {
      updates.push({ id: docSnap.id, coverImageUrl: coverCandidate });
    }
    });
  };

  processSnapshot(missingSnapshot);
  processSnapshot(emptySnapshot);

  if (updates.length === 0) {
    console.log('✅ No events with images require backfill');
    return;
  }

  console.log(`📝 Prepared ${updates.length} updates`);

  if (isDryRun) {
    console.log('🚫 Dry run enabled; no writes executed.');
    return;
  }

  const BATCH_SIZE = 400;
  let batch = db.batch();
  let batchCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < updates.length; i++) {
    const { id, coverImageUrl } = updates[i];
    batch.update(eventsRef.doc(id), { coverImageUrl });
    batchCount++;
    updatedCount++;

    if (batchCount >= BATCH_SIZE || i === updates.length - 1) {
      await batch.commit();
      console.log(`✅ Committed batch of ${batchCount} updates (${updatedCount}/${updates.length})`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  console.log(`🎉 Backfill complete. Updated ${updatedCount} events.`);
}

backfillCoverImages().catch((error) => {
  console.error('❌ Backfill failed:', error);
  process.exit(1);
});

