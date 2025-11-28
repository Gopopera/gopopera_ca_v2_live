/**
 * Migration script to update all existing user accounts
 * Adds userName field (displayName) to all users if not present
 * This ensures all accounts have a publicly visible username
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, getDocs, doc, updateDoc, query } from 'firebase/firestore';

export async function migrateUserNames(): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    console.error('[MIGRATE_USER_NAMES] Firestore not initialized');
    return;
  }

  try {
    console.log('[MIGRATE_USER_NAMES] Starting migration...');
    const usersCol = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCol);
    
    let updated = 0;
    let skipped = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Check if user already has displayName or name
      const hasDisplayName = userData.displayName && userData.displayName.trim() !== '';
      const hasName = userData.name && userData.name.trim() !== '';
      
      if (hasDisplayName || hasName) {
        // User already has a name - ensure it's set in both fields
        const userName = userData.displayName || userData.name || 'User';
        
        const updates: any = {};
        
        // Ensure displayName is set
        if (!hasDisplayName && hasName) {
          updates.displayName = userName;
        }
        
        // Ensure name is set
        if (!hasName && hasDisplayName) {
          updates.name = userName;
        }
        
        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, 'users', userId), updates);
          updated++;
          console.log(`[MIGRATE_USER_NAMES] Updated user ${userId}:`, updates);
        } else {
          skipped++;
        }
      } else {
        // User has no name - set default based on email or 'User'
        const defaultName = userData.email 
          ? userData.email.split('@')[0] || 'User'
          : 'User';
        
        await updateDoc(doc(db, 'users', userId), {
          displayName: defaultName,
          name: defaultName,
        });
        updated++;
        console.log(`[MIGRATE_USER_NAMES] Set default name for user ${userId}: ${defaultName}`);
      }
    }
    
    console.log(`[MIGRATE_USER_NAMES] Migration complete: ${updated} updated, ${skipped} skipped`);
  } catch (error) {
    console.error('[MIGRATE_USER_NAMES] Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateUserNames()
    .then(() => {
      console.log('[MIGRATE_USER_NAMES] Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[MIGRATE_USER_NAMES] Migration failed:', error);
      process.exit(1);
    });
}

