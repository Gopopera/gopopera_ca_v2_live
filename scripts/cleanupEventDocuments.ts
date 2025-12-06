/**
 * Migration Script: Remove deprecated fields from event documents
 * 
 * This script removes deprecated cached fields from events:
 * - hostPhotoURL (host data now fetched from /users/{hostId})
 * - hostName (host data now fetched from /users/{hostId})
 * - attendeesCount (now computed from reservations in real-time)
 * 
 * ⚠️ IMPORTANT: Only run this AFTER all components have been updated to use
 * real-time subscriptions. This is an optional cleanup script.
 * 
 * Run this script ONCE after confirming all components use real-time data.
 * 
 * To run:
 * 1. Install dependencies: npm install firebase-admin
 * 2. Set up Firebase Admin SDK credentials (see instructions below)
 * 3. Run: npx tsx scripts/cleanupEventDocuments.ts
 * 
 * OR use Firebase Functions (recommended for production)
 */

import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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

async function cleanupEventDocuments() {
  console.log('🔄 Starting event documents cleanup...');
  console.log('⚠️  This will remove deprecated fields: hostPhotoURL, hostName, attendeesCount');
  
  try {
    // Use the custom database ID
    const eventsRef = dbWithId.collection('events');
    const snapshot = await eventsRef.get();
    
    if (snapshot.empty) {
      console.log('ℹ️  No events found in database');
      return;
    }
    
    console.log(`📊 Found ${snapshot.size} events to check`);
    
    let batch = dbWithId.batch();
    let batchCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    const allUpdates: Array<{ id: string; updates: any }> = [];
    
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const updates: any = {};
      let needsUpdate = false;
      
      // Remove hostPhotoURL if present
      if (data.hostPhotoURL !== undefined) {
        updates.hostPhotoURL = FieldValue.delete();
        needsUpdate = true;
      }
      
      // Remove hostName if present
      if (data.hostName !== undefined) {
        updates.hostName = FieldValue.delete();
        needsUpdate = true;
      }
      
      // Remove attendeesCount if present
      if (data.attendeesCount !== undefined) {
        updates.attendeesCount = FieldValue.delete();
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        allUpdates.push({ id: docSnapshot.id, updates });
      } else {
        skippedCount++;
      }
    });
    
    console.log(`📝 Preparing to update ${allUpdates.length} events...`);
    console.log(`⏭️  Skipping ${skippedCount} events (no deprecated fields to remove)`);
    
    if (allUpdates.length === 0) {
      console.log('✅ No events need cleanup');
      return;
    }
    
    // Process updates in batches
    for (let i = 0; i < allUpdates.length; i++) {
      const { id, updates } = allUpdates[i];
      const docRef = eventsRef.doc(id);
      batch.update(docRef, updates);
      batchCount++;
      updatedCount++;
      
      // Log first few updates for verification
      if (i < 5) {
        const removedFields = Object.keys(updates).join(', ');
        console.log(`   - Event ${id}: Removing ${removedFields}`);
      }
      
      // Commit batch when it reaches the limit or at the end
      if (batchCount >= BATCH_SIZE || i === allUpdates.length - 1) {
        await batch.commit();
        console.log(`✅ Committed batch of ${batchCount} updates (${updatedCount}/${allUpdates.length} total)`);
        batch = dbWithId.batch(); // Create new batch
        batchCount = 0;
      }
    }
    
    // Summary statistics
    const cleanupStats = {
      hostPhotoURL: 0,
      hostName: 0,
      attendeesCount: 0,
    };
    
    allUpdates.forEach(({ updates }) => {
      if (updates.hostPhotoURL === FieldValue.delete()) cleanupStats.hostPhotoURL++;
      if (updates.hostName === FieldValue.delete()) cleanupStats.hostName++;
      if (updates.attendeesCount === FieldValue.delete()) cleanupStats.attendeesCount++;
    });
    
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   - Total events: ${snapshot.size}`);
    console.log(`   - Events updated: ${updatedCount}`);
    console.log(`   - Events skipped: ${skippedCount}`);
    console.log(`\n📊 Fields removed:`);
    console.log(`   - hostPhotoURL: ${cleanupStats.hostPhotoURL}`);
    console.log(`   - hostName: ${cleanupStats.hostName}`);
    console.log(`   - attendeesCount: ${cleanupStats.attendeesCount}`);
    
  } catch (error: any) {
    console.error('❌ Cleanup failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run cleanup
cleanupEventDocuments()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

