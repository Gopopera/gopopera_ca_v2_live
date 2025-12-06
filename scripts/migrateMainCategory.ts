/**
 * Migration Script: Populate mainCategory field for existing Firestore events
 * 
 * This script maps old category values to the new 4-pillar mainCategory system:
 * - social → connectAndPromote
 * - experiences → learnAndGrow
 * - shopping → curatedSales
 * - gatherings → mobilizeAndSupport
 * - (no category) → connectAndPromote (default)
 * 
 * Run this script ONCE after updating the TypeScript interfaces.
 * 
 * To run:
 * 1. Install dependencies: npm install firebase-admin
 * 2. Set up Firebase Admin SDK credentials (see instructions below)
 * 3. Run: npx tsx scripts/migrateMainCategory.ts
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

/**
 * Map old category values to new mainCategory system
 */
function mapOldCategoryToMainCategory(oldCategory?: string | null): string {
  if (!oldCategory) {
    return 'connectAndPromote'; // Default
  }

  const normalized = oldCategory.toLowerCase().trim();

  // Map old categories to new system
  const categoryMap: Record<string, string> = {
    'social': 'connectAndPromote',
    'experiences': 'learnAndGrow',
    'shopping': 'curatedSales',
    'gatherings': 'mobilizeAndSupport',
    // Also handle old mainCategory format (if any exist)
    'connectpromote': 'connectAndPromote',
    'mobilizesupport': 'mobilizeAndSupport',
    'curatedsales': 'curatedSales',
    'learnandgrow': 'learnAndGrow',
    // Handle new format (already correct)
    'connectandpromote': 'connectAndPromote',
    'mobilizeandsupport': 'mobilizeAndSupport',
  };

  return categoryMap[normalized] || 'connectAndPromote';
}

async function migrateMainCategory() {
  console.log('🔄 Starting mainCategory migration...');
  
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
    let skippedCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    const allUpdates: Array<{ id: string; oldCategory: string | null; newMainCategory: string }> = [];
    
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const eventId = docSnapshot.id;
      
      // Skip if mainCategory already exists and is valid
      if (data.mainCategory && 
          ['curatedSales', 'connectAndPromote', 'mobilizeAndSupport', 'learnAndGrow', 
           'connectPromote', 'mobilizeSupport'].includes(data.mainCategory)) {
        skippedCount++;
        return;
      }
      
      // Map from old category field
      const oldCategory = data.category || null;
      const newMainCategory = mapOldCategoryToMainCategory(oldCategory);
      
      allUpdates.push({ id: eventId, oldCategory, newMainCategory });
    });
    
    console.log(`📝 Preparing to update ${allUpdates.length} events...`);
    console.log(`⏭️  Skipping ${skippedCount} events (already have valid mainCategory)`);
    
    // Process updates in batches
    for (let i = 0; i < allUpdates.length; i++) {
      const { id, newMainCategory, oldCategory } = allUpdates[i];
      const docRef = eventsRef.doc(id);
      batch.update(docRef, { mainCategory: newMainCategory });
      batchCount++;
      updatedCount++;
      
      // Log first few updates for verification
      if (i < 5) {
        console.log(`   - Event ${id}: "${oldCategory || '(no category)'}" → "${newMainCategory}"`);
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
    const categoryStats: Record<string, number> = {};
    allUpdates.forEach(({ newMainCategory }) => {
      categoryStats[newMainCategory] = (categoryStats[newMainCategory] || 0) + 1;
    });
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   - Total events: ${snapshot.size}`);
    console.log(`   - Events updated: ${updatedCount}`);
    console.log(`   - Events skipped: ${skippedCount}`);
    console.log(`\n📊 Category distribution:`);
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count}`);
    });
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateMainCategory()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

