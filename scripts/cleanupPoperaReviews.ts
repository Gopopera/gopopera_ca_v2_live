/**
 * Cleanup script for Popera reviews
 * - Removes duplicate reviews from same users
 * - Keeps only 25 unique reviews
 * - Removes numbers from reviewer names
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { POPERA_EMAIL } from '../src/constants/popera';
import { getAuthInstance } from '../src/lib/firebaseAuth';

export async function cleanupPoperaReviews() {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    // Get the logged-in user's UID (must be Popera account)
    const auth = getAuthInstance();
    const currentUser = auth?.currentUser;
    
    if (!currentUser || currentUser.email?.toLowerCase().trim() !== POPERA_EMAIL) {
      throw new Error('Only the Popera account (eatezca@gmail.com) can run this cleanup');
    }

    const poperaUid = currentUser.uid;
    console.log('[CLEANUP] Starting Popera reviews cleanup for user:', poperaUid);

    // 1. Get all events hosted by Popera (using the actual user UID)
    const eventsCol = collection(db, 'events');
    const eventsQuery = query(eventsCol, where('hostId', '==', poperaUid));
    const eventsSnapshot = await getDocs(eventsQuery);
    const eventIds = eventsSnapshot.docs.map(doc => doc.id);

    console.log(`[CLEANUP] Found ${eventIds.length} Popera events`);

    // 2. Get all reviews from all Popera events
    const allReviews: Array<{ eventId: string; reviewId: string; userId: string; userName: string; data: any; createdAt: number }> = [];
    
    for (const eventId of eventIds) {
      const reviewsCol = collection(db, 'events', eventId, 'reviews');
      const reviewsSnapshot = await getDocs(reviewsCol);
      
      reviewsSnapshot.docs.forEach(reviewDoc => {
        const data = reviewDoc.data();
        const createdAt = typeof data.createdAt === 'number' 
          ? data.createdAt 
          : (data.createdAt as any)?.toMillis?.() || 0;
        
        allReviews.push({
          eventId,
          reviewId: reviewDoc.id,
          userId: data.userId || '',
          userName: data.userName || '',
          data,
          createdAt,
        });
      });
    }

    console.log(`[CLEANUP] Found ${allReviews.length} total reviews`);

    // 3. Remove numbers from reviewer names
    const batch = writeBatch(db);
    let updateCount = 0;
    
    for (const review of allReviews) {
      if (review.userName && /\d/.test(review.userName)) {
        // Remove numbers from userName
        const cleanedName = review.userName.replace(/\d+/g, '').trim();
        if (cleanedName !== review.userName && cleanedName.length > 0) {
          const reviewRef = doc(db, 'events', review.eventId, 'reviews', review.reviewId);
          batch.update(reviewRef, { userName: cleanedName });
          updateCount++;
        }
      }
    }
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`[CLEANUP] ✅ Updated ${updateCount} reviewer names (removed numbers)`);
    }

    // 4. Find and remove duplicate reviews (same userId)
    const userReviewMap = new Map<string, Array<{ eventId: string; reviewId: string; createdAt: number; userName: string }>>();
    
    for (const review of allReviews) {
      // Use cleaned name for grouping
      const cleanedName = review.userName.replace(/\d+/g, '').trim();
      const key = review.userId || cleanedName; // Use userId if available, otherwise use name
      
      if (!userReviewMap.has(key)) {
        userReviewMap.set(key, []);
      }
      userReviewMap.get(key)!.push({
        eventId: review.eventId,
        reviewId: review.reviewId,
        createdAt: review.createdAt,
        userName: cleanedName,
      });
    }

    // 5. Keep only the most recent review per user, mark others for deletion
    const reviewsToDelete: Array<{ eventId: string; reviewId: string }> = [];
    
    userReviewMap.forEach((reviews, userId) => {
      if (reviews.length > 1) {
        // Sort by createdAt (newest first)
        reviews.sort((a, b) => b.createdAt - a.createdAt);
        // Keep the first (most recent), delete the rest
        reviewsToDelete.push(...reviews.slice(1));
      }
    });

    console.log(`[CLEANUP] Found ${reviewsToDelete.length} duplicate reviews to remove`);

    // 6. Delete duplicate reviews in batches (Firestore batch limit is 500)
    const BATCH_SIZE = 500;
    for (let i = 0; i < reviewsToDelete.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchReviews = reviewsToDelete.slice(i, i + BATCH_SIZE);
      
      for (const { eventId, reviewId } of batchReviews) {
        const reviewRef = doc(db, 'events', eventId, 'reviews', reviewId);
        batch.delete(reviewRef);
      }
      
      await batch.commit();
      console.log(`[CLEANUP] Deleted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batchReviews.length} reviews)`);
    }

    if (reviewsToDelete.length > 0) {
      console.log(`[CLEANUP] ✅ Deleted ${reviewsToDelete.length} duplicate reviews`);
    }

    // 7. Get remaining unique reviews after cleanup
    const remainingReviews: Array<{ eventId: string; reviewId: string; createdAt: number }> = [];
    
    // Re-fetch reviews after cleanup
    for (const eventId of eventIds) {
      const reviewsCol = collection(db, 'events', eventId, 'reviews');
      const reviewsSnapshot = await getDocs(reviewsCol);
      
      reviewsSnapshot.docs.forEach(reviewDoc => {
        const data = reviewDoc.data();
        const createdAt = typeof data.createdAt === 'number' 
          ? data.createdAt 
          : (data.createdAt as any)?.toMillis?.() || 0;
        
        remainingReviews.push({
          eventId,
          reviewId: reviewDoc.id,
          createdAt,
        });
      });
    }

    // 8. If more than 25, keep only the 25 most recent
    if (remainingReviews.length > 25) {
      remainingReviews.sort((a, b) => b.createdAt - a.createdAt);
      const toDelete = remainingReviews.slice(25);
      
      console.log(`[CLEANUP] Found ${remainingReviews.length} unique reviews, keeping 25 most recent`);
      console.log(`[CLEANUP] Deleting ${toDelete.length} older reviews`);

      // Delete older reviews in batches
      for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const batchReviews = toDelete.slice(i, i + BATCH_SIZE);
        
        for (const { eventId, reviewId } of batchReviews) {
          const reviewRef = doc(db, 'events', eventId, 'reviews', reviewId);
          batch.delete(reviewRef);
        }
        
        await batch.commit();
        console.log(`[CLEANUP] Deleted older reviews batch ${Math.floor(i / BATCH_SIZE) + 1} (${batchReviews.length} reviews)`);
      }

      console.log(`[CLEANUP] ✅ Deleted ${toDelete.length} older reviews, kept 25 most recent`);
    }

    const finalCount = Math.min(remainingReviews.length, 25);
    console.log(`[CLEANUP] ✅ Review cleanup complete! Final count: ${finalCount}`);
    
    return {
      success: true,
      updatedNames: updateCount,
      deletedDuplicates: reviewsToDelete.length,
      finalReviewCount: finalCount,
    };

  } catch (error) {
    console.error('[CLEANUP] ❌ Error cleaning up reviews:', error);
    throw error;
  }
}

// Run if called directly (for testing)
if (import.meta.url.endsWith(process.argv[1] || '')) {
  cleanupPoperaReviews()
    .then(result => {
      console.log('Cleanup result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

