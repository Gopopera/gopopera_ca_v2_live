/**
 * Migration Script: Add new fields to existing Firestore events
 * 
 * This script adds the following optional fields to all events:
 * - vibes (array)
 * - sessionFrequency (string)
 * - sessionMode (string)
 * - country (string)
 * 
 * Run this script ONCE after updating the TypeScript interfaces.
 * 
 * To run:
 * 1. Install dependencies: npm install firebase-admin
 * 2. Set up Firebase Admin SDK credentials (see instructions below)
 * 3. Run: npx tsx scripts/migrateEventFields.ts
 * 
 * OR use Firebase Functions (recommended for production)
 */

import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to get project ID from environment variables
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  try {
    // Option 1: Use GOOGLE_APPLICATION_CREDENTIALS environment variable
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      try {
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        initializeApp({ 
          credential: cert(serviceAccount as ServiceAccount),
          projectId: projectId || serviceAccount.project_id
        });
        console.log('✅ Initialized Firebase Admin SDK using service account key');
      } catch (error: any) {
        console.error('❌ Failed to load service account key:', error.message);
        throw error;
      }
    }
    // Option 2: Try to use Application Default Credentials (if running on GCP)
    else if (process.env.GCLOUD_PROJECT || projectId) {
      initializeApp({ projectId: projectId || process.env.GCLOUD_PROJECT });
      console.log('✅ Initialized Firebase Admin SDK using Application Default Credentials');
    }
    // Option 3: Try to find service account key in common locations
    else {
      const possiblePaths = [
        join(__dirname, '..', 'firebase-service-account.json'),
        join(process.cwd(), 'firebase-service-account.json'),
        join(process.env.HOME || '', 'firebase-service-account.json'),
      ];
      
      let found = false;
      for (const path of possiblePaths) {
        try {
          const serviceAccount = JSON.parse(readFileSync(path, 'utf8'));
          initializeApp({ 
            credential: cert(serviceAccount as ServiceAccount),
            projectId: projectId || serviceAccount.project_id
          });
          console.log(`✅ Initialized Firebase Admin SDK using key at: ${path}`);
          found = true;
          break;
        } catch {
          // Continue to next path
        }
      }
      
      if (!found) {
        throw new Error('No credentials found');
      }
    }
  } catch (error: any) {
    console.error('\n❌ Failed to initialize Firebase Admin SDK');
    console.error('\n📋 Please set up Firebase Admin SDK credentials:');
    console.error('\n1. Go to Firebase Console > Project Settings > Service Accounts');
    console.error('2. Click "Generate New Private Key"');
    console.error('3. Save the JSON file (e.g., firebase-service-account.json)');
    console.error('4. Choose one of these options:');
    console.error('   a) Place the file in the project root and name it: firebase-service-account.json');
    console.error('   b) Set environment variable: export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"');
    console.error('\n💡 The script will automatically look for the file in the project root.');
    process.exit(1);
  }
}

const db = getFirestore();
const databaseId = 'gopopera2028'; // Your custom database ID
const dbWithId = getFirestore(undefined, databaseId);

async function migrateEvents() {
  console.log('🔄 Starting event migration...');
  
  try {
    // Use the custom database ID
    const eventsRef = dbWithId.collection('events');
    const snapshot = await eventsRef.get();
    
    if (snapshot.empty) {
      console.log('ℹ️  No events found in database');
      return;
    }
    
    console.log(`📊 Found ${snapshot.size} events to migrate`);
    
    let batch = dbWithId.batch();
    let batchCount = 0;
    let updatedCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    const allUpdates: Array<{ id: string; updates: any }> = [];
    
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const updates: any = {};
      let needsUpdate = false;
      
      // Only add fields if they don't exist
      if (!data.vibes) {
        updates.vibes = []; // Default empty array
        needsUpdate = true;
      }
      
      if (!data.sessionFrequency) {
        updates.sessionFrequency = 'one-time'; // Default value (Flexible is no longer supported)
        needsUpdate = true;
      } else if (data.sessionFrequency.toLowerCase() === 'flexible') {
        // Migrate old "flexible" values to "one-time"
        updates.sessionFrequency = 'one-time';
        needsUpdate = true;
      }
      
      if (!data.sessionMode) {
        updates.sessionMode = 'In-Person'; // Default value
        needsUpdate = true;
      }
      
      if (!data.country) {
        // Try to infer from city (e.g., "Montreal, CA" → "Canada")
        const city = data.city || '';
        if (city.includes(', CA') || city.toLowerCase().includes('canada')) {
          updates.country = 'Canada';
        } else if (city.includes(', US') || city.toLowerCase().includes('united states')) {
          updates.country = 'United States';
        } else {
          updates.country = 'Canada'; // Default
        }
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        allUpdates.push({ id: docSnapshot.id, updates });
      }
    });
    
    console.log(`📝 Preparing to update ${allUpdates.length} events...`);
    
    // Process updates in batches
    for (let i = 0; i < allUpdates.length; i++) {
      const { id, updates } = allUpdates[i];
      const docRef = eventsRef.doc(id);
      batch.update(docRef, updates);
      batchCount++;
      updatedCount++;
      
      // Commit batch when it reaches the limit or at the end
      if (batchCount >= BATCH_SIZE || i === allUpdates.length - 1) {
        await batch.commit();
        console.log(`✅ Committed batch of ${batchCount} updates (${updatedCount}/${allUpdates.length} total)`);
        batch = dbWithId.batch(); // Create new batch
        batchCount = 0;
      }
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   - Total events: ${snapshot.size}`);
    console.log(`   - Events updated: ${updatedCount}`);
    console.log(`   - Events skipped (already had fields): ${snapshot.size - updatedCount}`);
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateEvents()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

