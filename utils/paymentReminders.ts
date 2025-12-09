/**
 * Payment Reminder System
 * Handles reminders for recurring event subscriptions (2 days before event)
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { sendComprehensiveNotification } from './notificationHelpers';
import { getNextEventDate } from './stripeHelpers';
import type { Event } from '../types';
import type { FirestoreReservation } from '../firebase/types';

/**
 * Schedule reminder for a subscription reservation
 * This should be called when a subscription is created
 */
export async function scheduleSubscriptionReminder(
  eventId: string,
  userId: string,
  nextEventDate: Date
): Promise<void> {
  // Reminders are sent 2 days before the event
  // The actual reminder sending is handled by a scheduled function/cron job
  // This function just ensures the reservation has the next charge date set
  // The scheduled job will query reservations and send reminders
  
  // The reminder logic is in processUpcomingEventReminders()
  // which should be called daily by a Cloud Function or scheduled task
}

/**
 * Process upcoming event reminders
 * This should be called daily (via Cloud Function or scheduled task)
 * Sends reminders to users 2 days before their recurring event
 */
export async function processUpcomingEventReminders(): Promise<void> {
  const db = getDbSafe();
  if (!db) {
    console.error('[PAYMENT_REMINDERS] Firestore not initialized');
    return;
  }

  try {
    // Get all active reservations with subscriptions
    const reservationsCol = collection(db, 'reservations');
    const activeReservationsQuery = query(
      reservationsCol,
      where('status', '==', 'reserved'),
      where('subscriptionId', '!=', null)
    );

    const reservationsSnapshot = await getDocs(activeReservationsQuery);
    const now = Date.now();
    const twoDaysFromNow = now + (2 * 24 * 60 * 60 * 1000); // 2 days in milliseconds

    const remindersToSend: Array<{
      userId: string;
      eventId: string;
      reservationId: string;
      eventTitle: string;
      eventDate: Date;
    }> = [];

    // Process each reservation
    for (const reservationDoc of reservationsSnapshot.docs) {
      const reservation = reservationDoc.data() as FirestoreReservation;
      
      // Skip if already opted out
      if (reservation.optOutRequested || reservation.optOutProcessed) {
        continue;
      }

      // Get the event to calculate next date
      const eventDoc = await getDocs(query(
        collection(db, 'events'),
        where('__name__', '==', reservation.eventId)
      ));

      if (eventDoc.empty) {
        continue;
      }

      const eventData = eventDoc.docs[0].data() as any;
      const event: Event = {
        ...eventData,
        id: eventData.id || eventDoc.docs[0].id,
        sessionFrequency: eventData.sessionFrequency,
      };

      // Calculate next event date
      const nextDate = getNextEventDate(event);
      if (!nextDate) {
        continue;
      }

      const nextDateTimestamp = nextDate.getTime();

      // Check if event is 2 days away (within a 24-hour window)
      const twoDaysBefore = nextDateTimestamp - (2 * 24 * 60 * 60 * 1000);
      const oneDayBefore = nextDateTimestamp - (1 * 24 * 60 * 60 * 1000);

      if (now >= twoDaysBefore && now < oneDayBefore) {
        // Check if we've already sent a reminder for this event date
        // You might want to add a field to track sent reminders
        remindersToSend.push({
          userId: reservation.userId,
          eventId: reservation.eventId,
          reservationId: reservationDoc.id,
          eventTitle: event.title || 'Event',
          eventDate: nextDate,
        });
      }
    }

    // Send reminders
    for (const reminder of remindersToSend) {
      try {
        await sendComprehensiveNotification(
          reminder.userId,
          {
            type: 'subscription-reminder',
            title: `Upcoming Event: ${reminder.eventTitle}`,
            body: `Your recurring event is coming up in 2 days! Don't forget to attend.`,
            eventId: reminder.eventId,
          },
          {
            subject: `Reminder: ${reminder.eventTitle} is in 2 days`,
            body: `Your recurring event "${reminder.eventTitle}" is scheduled for ${reminder.eventDate.toLocaleDateString()}. We're looking forward to seeing you there!`,
          },
          {
            message: `Reminder: ${reminder.eventTitle} is in 2 days. See you there!`,
          }
        );
      } catch (error) {
        console.error(`[PAYMENT_REMINDERS] Error sending reminder to ${reminder.userId}:`, error);
        // Continue with other reminders even if one fails
      }
    }

    console.log(`[PAYMENT_REMINDERS] Processed ${remindersToSend.length} reminders`);
  } catch (error) {
    console.error('[PAYMENT_REMINDERS] Error processing reminders:', error);
  }
}

/**
 * Get upcoming events for a user (for reminder preview)
 */
export async function getUserUpcomingSubscriptions(userId: string): Promise<Array<{
  reservationId: string;
  eventId: string;
  eventTitle: string;
  nextDate: Date;
}>> {
  const db = getDbSafe();
  if (!db) {
    return [];
  }

  try {
    const reservationsCol = collection(db, 'reservations');
    const userReservationsQuery = query(
      reservationsCol,
      where('userId', '==', userId),
      where('status', '==', 'reserved'),
      where('subscriptionId', '!=', null)
    );

    const snapshot = await getDocs(userReservationsQuery);
    const upcoming: Array<{
      reservationId: string;
      eventId: string;
      eventTitle: string;
      nextDate: Date;
    }> = [];

    for (const doc of snapshot.docs) {
      const reservation = doc.data() as FirestoreReservation;
      
      if (reservation.optOutRequested || reservation.optOutProcessed) {
        continue;
      }

      // Get event
      const eventDoc = await getDocs(query(
        collection(db, 'events'),
        where('__name__', '==', reservation.eventId)
      ));

      if (eventDoc.empty) continue;

      const eventData = eventDoc.docs[0].data() as any;
      const event: Event = {
        ...eventData,
        id: eventData.id || eventDoc.docs[0].id,
        sessionFrequency: eventData.sessionFrequency,
      };

      const nextDate = getNextEventDate(event);
      if (nextDate && nextDate.getTime() > Date.now()) {
        upcoming.push({
          reservationId: doc.id,
          eventId: reservation.eventId,
          eventTitle: event.title || 'Event',
          nextDate,
        });
      }
    }

    return upcoming.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  } catch (error) {
    console.error('[PAYMENT_REMINDERS] Error fetching user subscriptions:', error);
    return [];
  }
}

