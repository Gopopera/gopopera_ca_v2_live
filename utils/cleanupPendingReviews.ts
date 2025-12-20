import { getDbSafe } from '../src/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

/**
 * Delete all pending reviews for a specific host
 * Keeps only accepted reviews (or reviews without status for backward compatibility)
 */
export async function deletePendingReviewsForHost(hostId: string): Promise<{
  deleted: number;
  kept: number;
  errors: number;
}> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    // First, get all events hosted by this user
    const eventsCol = collection(db, 'events');
    const eventsQuery = query(eventsCol, where('hostId', '==', hostId));
    const eventsSnapshot = await getDocs(eventsQuery);
    const eventIds = eventsSnapshot.docs.map(doc => doc.id);

    console.log(`[CLEANUP] Found ${eventIds.length} events for host ${hostId}`);

    let deleted = 0;
    let kept = 0;
    let errors = 0;

    // FIXED: Get reviews from subcollection under each event (events/{eventId}/reviews)
    for (const eventId of eventIds) {
      const reviewsSubCol = collection(db, 'events', eventId, 'reviews');
      const reviewsSnapshot = await getDocs(reviewsSubCol);

      for (const reviewDoc of reviewsSnapshot.docs) {
        const reviewData = reviewDoc.data();
        const status = reviewData.status;

        // Delete if status is 'pending' or 'contested'
        // Keep if status is 'accepted' or undefined (backward compatibility)
        if (status === 'pending' || status === 'contested') {
          try {
            await deleteDoc(doc(db, 'events', eventId, 'reviews', reviewDoc.id));
            deleted++;
            console.log(`[CLEANUP] Deleted pending review ${reviewDoc.id} for event ${eventId}`);
          } catch (error) {
            console.error(`[CLEANUP] Error deleting review ${reviewDoc.id}:`, error);
            errors++;
          }
        } else {
          kept++;
        }
      }
    }

    console.log(`[CLEANUP] Complete: ${deleted} deleted, ${kept} kept, ${errors} errors`);
    return { deleted, kept, errors };
  } catch (error) {
    console.error('[CLEANUP] Error cleaning up reviews:', error);
    throw error;
  }
}

