/**
 * Reservation Smoke Test
 * 
 * One-off script to verify reservation write/read consistency.
 * Checks if a reservation exists in Firestore after RSVP.
 * 
 * Usage:
 *   npx tsx scripts/reservationSmokeTest.ts <userId> <eventId>
 * 
 * Example:
 *   npx tsx scripts/reservationSmokeTest.ts yDt2rFMadrWvN0IEgE1C8WPRFeK2 YWNZUGSf0VCczFVGs1lR
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get command line arguments
const userId = process.argv[2];
const eventId = process.argv[3];

if (!userId || !eventId) {
  console.error('❌ Usage: npx tsx scripts/reservationSmokeTest.ts <userId> <eventId>');
  console.error('   Example: npx tsx scripts/reservationSmokeTest.ts yDt2rFMadrWvN0IEgE1C8WPRFeK2 YWNZUGSf0VCczFVGs1lR');
  process.exit(1);
}

// Initialize Firebase Admin SDK
let db;
try {
  const serviceAccountPath = join(__dirname, '..', 'firebase-service-account.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  const app = initializeApp({ credential: cert(serviceAccount) });
  db = getFirestore(app, 'gopopera2028');
  console.log('✅ Connected to Firestore\n');
} catch (error: any) {
  console.error('❌ Failed to initialize Firestore:', error.message);
  console.error('   Make sure firebase-service-account.json exists in project root');
  process.exit(1);
}

async function smokeTest() {
  console.log('🔍 Reservation Smoke Test');
  console.log(`   userId: ${userId}`);
  console.log(`   eventId: ${eventId}\n`);

  try {
    // 1. Check if reservation exists for this user + event
    const reservationsRef = db.collection('reservations');
    const userEventQuery = reservationsRef
      .where('userId', '==', userId)
      .where('eventId', '==', eventId);
    
    const userEventSnapshot = await userEventQuery.get();
    
    if (userEventSnapshot.empty) {
      console.log('❌ RESERVATION NOT FOUND');
      console.log('   No reservation document found for userId + eventId combination\n');
    } else {
      const reservation = userEventSnapshot.docs[0].data();
      console.log('✅ RESERVATION FOUND');
      console.log(`   Document ID: ${userEventSnapshot.docs[0].id}`);
      console.log(`   Status: ${reservation.status || 'NOT SET'}`);
      console.log(`   Reserved At: ${reservation.reservedAt ? new Date(reservation.reservedAt).toISOString() : 'NOT SET'}`);
      console.log(`   Attendee Count: ${reservation.attendeeCount || 1}`);
      console.log('');
    }

    // 2. Count all reserved reservations for this event
    const eventReservationsQuery = reservationsRef
      .where('eventId', '==', eventId)
      .where('status', '==', 'reserved');
    
    const eventReservationsSnapshot = await eventReservationsQuery.get();
    const totalReserved = eventReservationsSnapshot.size;
    const totalAttendees = eventReservationsSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + (data.attendeeCount || 1);
    }, 0);

    console.log('📊 Event Reservation Stats:');
    console.log(`   Total reserved reservations: ${totalReserved}`);
    console.log(`   Total attendees (sum of attendeeCount): ${totalAttendees}`);
    console.log('');

    // 3. Check event document attendeeCount field
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (eventDoc.exists) {
      const eventData = eventDoc.data();
      const eventAttendeeCount = eventData?.attendeeCount || 0;
      console.log('📋 Event Document:');
      console.log(`   Title: ${eventData?.title || 'NOT SET'}`);
      console.log(`   attendeeCount field: ${eventAttendeeCount}`);
      console.log(`   Match with reservations: ${eventAttendeeCount === totalAttendees ? '✅ YES' : '❌ NO'}`);
      if (eventAttendeeCount !== totalAttendees) {
        console.log(`   ⚠️  Mismatch: event.attendeeCount (${eventAttendeeCount}) != sum of reservations (${totalAttendees})`);
      }
    } else {
      console.log('⚠️  Event document not found');
    }

    console.log('\n✅ Smoke test complete');
  } catch (error: any) {
    console.error('❌ Smoke test failed:', error.message);
    console.error('   Error code:', error.code);
    process.exit(1);
  }
}

smokeTest()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

