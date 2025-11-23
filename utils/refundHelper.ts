/**
 * Refund Helper - Reuses existing cancellation logic
 * Called when host removes an attendee
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { cancelReservation } from '../firebase/db';

/**
 * Process refund for removed attendee
 * Reuses existing cancelReservation logic
 */
export async function processRefundForRemovedUser(
  userId: string,
  eventId: string
): Promise<void> {
  try {
    const db = getDbSafe();
    if (!db) {
      console.error('Database not available for refund processing');
      return;
    }

    // Find the reservation
    const reservationsRef = collection(db, 'reservations');
    const q = query(
      reservationsRef,
      where('userId', '==', userId),
      where('eventId', '==', eventId),
      where('status', '==', 'reserved')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('No reservation found for refund');
      return;
    }

    // Cancel the reservation (this handles the refund logic)
    const reservation = snapshot.docs[0];
    await cancelReservation(reservation.id);

    // Log the refund action (for audit trail)
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      refundActions: arrayUnion({
        userId,
        reservationId: reservation.id,
        timestamp: Date.now(),
        reason: 'host_removal',
      }),
    });
  } catch (error) {
    console.error('Error processing refund for removed user:', error);
    // Don't throw - refund processing shouldn't block user removal
  }
}

