/**
 * Migration Script: Add senderId field to message documents
 * 
 * This script adds the senderId field to all messages in event subcollections:
 * - Adds senderId = userId where senderId is missing
 * - Keeps userId for backward compatibility
 * 
 * Run this script ONCE after updating the TypeScript interfaces.
 * 
 * To run:
 * 1. Install dependencies: npm install firebase-admin
 * 2. Set up Firebase Admin SDK credentials (see instructions below)
 * 3. Run: npx tsx scripts/migrateMessageDocuments.ts
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

async function migrateMessageDocuments() {
  console.log('🔄 Starting message documents migration...');
  
  try {
    // Use the custom database ID
    const eventsRef = dbWithId.collection('events');
    const eventsSnapshot = await eventsRef.get();
    
    if (eventsSnapshot.empty) {
      console.log('ℹ️  No events found in database');
      return;
    }
    
    console.log(`📊 Found ${eventsSnapshot.size} events to check for messages`);
    
    let totalMessages = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const allUpdates: Array<{ eventId: string; messageId: string; senderId: string }> = [];
    
    // Iterate through all events to find messages subcollections
    for (const eventDoc of eventsSnapshot.docs) {
      const eventId = eventDoc.id;
      const messagesRef = eventDoc.ref.collection('messages');
      const messagesSnapshot = await messagesRef.get();
      
      if (messagesSnapshot.empty) {
        continue; // Skip events with no messages
      }
      
      totalMessages += messagesSnapshot.size;
      
      messagesSnapshot.forEach((msgDoc) => {
        const data = msgDoc.data();
        
        // Add senderId if userId exists but senderId doesn't
        if (data.userId && !data.senderId) {
          allUpdates.push({
            eventId,
            messageId: msgDoc.id,
            senderId: data.userId,
          });
        } else {
          totalSkipped++;
        }
      });
    }
    
    console.log(`📝 Found ${totalMessages} total messages across ${eventsSnapshot.size} events`);
    console.log(`📝 Preparing to update ${allUpdates.length} messages...`);
    console.log(`⏭️  Skipping ${totalSkipped} messages (already have senderId or missing userId)`);
    
    if (allUpdates.length === 0) {
      console.log('✅ No messages need migration');
      return;
    }
    
    // Process updates in batches
    let batch = dbWithId.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    for (let i = 0; i < allUpdates.length; i++) {
      const { eventId, messageId, senderId } = allUpdates[i];
      const messageRef = dbWithId.collection('events').doc(eventId).collection('messages').doc(messageId);
      batch.update(messageRef, { senderId });
      batchCount++;
      totalUpdated++;
      
      // Log first few updates for verification
      if (i < 5) {
        console.log(`   - Event ${eventId}/messages/${messageId}: Adding senderId = ${senderId}`);
      }
      
      // Commit batch when it reaches the limit or at the end
      if (batchCount >= BATCH_SIZE || i === allUpdates.length - 1) {
        await batch.commit();
        console.log(`✅ Committed batch of ${batchCount} updates (${totalUpdated}/${allUpdates.length} total)`);
        batch = dbWithId.batch(); // Create new batch
        batchCount = 0;
      }
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   - Total events checked: ${eventsSnapshot.size}`);
    console.log(`   - Total messages found: ${totalMessages}`);
    console.log(`   - Messages updated: ${totalUpdated}`);
    console.log(`   - Messages skipped: ${totalSkipped}`);
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateMessageDocuments()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

