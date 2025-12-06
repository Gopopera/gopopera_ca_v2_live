/**
 * Migration Script: Migrate user document fields to standardized schema
 * 
 * This script migrates deprecated user fields to the new unified schema:
 * - imageUrl → photoURL (if photoURL doesn't exist)
 * - name → displayName (if displayName doesn't exist)
 * - phone_verified → phoneVerified (if phoneVerified doesn't exist)
 * 
 * Run this script ONCE after updating the TypeScript interfaces.
 * 
 * To run:
 * 1. Install dependencies: npm install firebase-admin
 * 2. Set up Firebase Admin SDK credentials (see instructions below)
 * 3. Run: npx tsx scripts/migrateUserDocuments.ts
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

async function migrateUserDocuments() {
  console.log('🔄 Starting user documents migration...');
  
  try {
    // Use the custom database ID
    const usersRef = dbWithId.collection('users');
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) {
      console.log('ℹ️  No users found in database');
      return;
    }
    
    console.log(`📊 Found ${snapshot.size} users to migrate`);
    
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
      
      // Migrate imageUrl to photoURL (only if photoURL doesn't exist)
      if (data.imageUrl && !data.photoURL) {
        updates.photoURL = data.imageUrl;
        needsUpdate = true;
      }
      
      // Migrate name to displayName (only if displayName doesn't exist)
      if (data.name && !data.displayName) {
        updates.displayName = data.name;
        needsUpdate = true;
      }
      
      // Migrate phone_verified to phoneVerified (only if phoneVerified doesn't exist)
      if (data.phone_verified !== undefined && data.phoneVerified === undefined) {
        updates.phoneVerified = data.phone_verified;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        allUpdates.push({ id: docSnapshot.id, updates });
      } else {
        skippedCount++;
      }
    });
    
    console.log(`📝 Preparing to update ${allUpdates.length} users...`);
    console.log(`⏭️  Skipping ${skippedCount} users (already have standardized fields)`);
    
    // Process updates in batches
    for (let i = 0; i < allUpdates.length; i++) {
      const { id, updates } = allUpdates[i];
      const docRef = usersRef.doc(id);
      batch.update(docRef, updates);
      batchCount++;
      updatedCount++;
      
      // Log first few updates for verification
      if (i < 5) {
        const updateFields = Object.keys(updates).join(', ');
        console.log(`   - User ${id}: Migrating ${updateFields}`);
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
    const migrationStats = {
      photoURL: 0,
      displayName: 0,
      phoneVerified: 0,
    };
    
    allUpdates.forEach(({ updates }) => {
      if (updates.photoURL) migrationStats.photoURL++;
      if (updates.displayName) migrationStats.displayName++;
      if (updates.phoneVerified !== undefined) migrationStats.phoneVerified++;
    });
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   - Total users: ${snapshot.size}`);
    console.log(`   - Users updated: ${updatedCount}`);
    console.log(`   - Users skipped: ${skippedCount}`);
    console.log(`\n📊 Migration statistics:`);
    console.log(`   - photoURL migrated: ${migrationStats.photoURL}`);
    console.log(`   - displayName migrated: ${migrationStats.displayName}`);
    console.log(`   - phoneVerified migrated: ${migrationStats.phoneVerified}`);
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateUserDocuments()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

