/**
 * Debug Reservation State
 * 
 * One-off script to inspect reservation state for a user + event.
 * Helps diagnose stale state, duplicate reservations, or status mismatches.
 * 
 * Usage:
 *   npx tsx scripts/debugReservationState.ts <userId> <eventId>
 * 
 * Example:
 *   npx tsx scripts/debugReservationState.ts yDt2rFMadrWvN0IEgE1C8WPRFeK2 YWNZUGSf0VCczFVGs1lR
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
  console.error('❌ Usage: npx tsx scripts/debugReservationState.ts <userId> <eventId>');
  console.error('   Example: npx tsx scripts/debugReservationState.ts yDt2rFMadrWvN0IEgE1C8WPRFeK2 YWNZUGSf0VCczFVGs1lR');
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

async function debugReservationState() {
  console.log('🔍 Debug Reservation State');
  console.log(`   userId: ${userId}`);
  console.log(`   eventId: ${eventId}\n`);

  try {
    // 1. Get ALL reservations for this (userId, eventId) combination
    const reservationsRef = db.collection('reservations');
    const userEventQuery = reservationsRef
      .where('userId', '==', userId)
      .where('eventId', '==', eventId);
    
    const userEventSnapshot = await userEventQuery.get();
    
    console.log('📋 All Reservations for (userId, eventId):');
    if (userEventSnapshot.empty) {
      console.log('   ❌ NO RESERVATIONS FOUND\n');
    } else {
      console.log(`   Found ${userEventSnapshot.size} reservation(s):\n`);
      userEventSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   [${index + 1}] Document ID: ${doc.id}`);
        console.log(`       Status: ${data.status || 'NOT SET'}`);
        console.log(`       Reserved At: ${data.reservedAt ? new Date(data.reservedAt).toISOString() : 'NOT SET'}`);
        console.log(`       Cancelled At: ${data.cancelledAt ? new Date(data.cancelledAt.seconds * 1000).toISOString() : 'NOT SET'}`);
        console.log(`       Attendee Count: ${data.attendeeCount || 1}`);
        console.log(`       Payment Method: ${data.paymentMethod || 'N/A'}`);
        console.log('');
      });
    }

    // 2. Check for reserved status
    const reservedDocs = userEventSnapshot.docs.filter(doc => doc.data().status === 'reserved');
    const cancelledDocs = userEventSnapshot.docs.filter(doc => doc.data().status === 'cancelled');
    
    console.log('📊 Status Summary:');
    console.log(`   Reserved: ${reservedDocs.length}`);
    console.log(`   Cancelled: ${cancelledDocs.length}`);
    console.log(`   Other: ${userEventSnapshot.docs.length - reservedDocs.length - cancelledDocs.length}\n`);

    // 3. Check user document for rsvps array
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const rsvps = userData?.rsvps || [];
      const includesEvent = rsvps.includes(eventId);
      console.log('👤 User Document:');
      console.log(`   rsvps array length: ${rsvps.length}`);
      console.log(`   Includes eventId: ${includesEvent ? '✅ YES' : '❌ NO'}`);
      if (includesEvent) {
        console.log(`   ✅ user.rsvps includes this event`);
      } else {
        console.log(`   ⚠️  user.rsvps does NOT include this event (stale state?)`);
      }
      console.log('');
    } else {
      console.log('⚠️  User document not found\n');
    }

    // 4. Query MyPopsPage-style: where(userId==uid, status=='reserved')
    const myPopsQuery = reservationsRef
      .where('userId', '==', userId)
      .where('status', '==', 'reserved');
    
    const myPopsSnapshot = await myPopsQuery.get();
    const myPopsEventIds = myPopsSnapshot.docs.map(doc => doc.data().eventId).filter(Boolean);
    const appearsInMyPops = myPopsEventIds.includes(eventId);
    
    console.log('📱 My Circles → Attending Query:');
    console.log(`   Query: where(userId=='${userId}', status=='reserved')`);
    console.log(`   Total reserved events for user: ${myPopsSnapshot.size}`);
    console.log(`   This event appears: ${appearsInMyPops ? '✅ YES' : '❌ NO'}`);
    if (!appearsInMyPops && reservedDocs.length > 0) {
      console.log(`   ⚠️  MISMATCH: Reservation exists with status='reserved' but query doesn't return it`);
    }
    console.log('');

    // 5. Check event document
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (eventDoc.exists()) {
      const eventData = eventDoc.data();
      console.log('📅 Event Document:');
      console.log(`   Title: ${eventData?.title || 'NOT SET'}`);
      console.log(`   attendeeCount field: ${eventData?.attendeeCount || 0}`);
      
      // Count actual reservations
      const eventReservationsQuery = reservationsRef
        .where('eventId', '==', eventId)
        .where('status', '==', 'reserved');
      const eventReservationsSnapshot = await eventReservationsQuery.get();
      const actualReservedCount = eventReservationsSnapshot.size;
      const totalAttendees = eventReservationsSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.attendeeCount || 1);
      }, 0);
      
      console.log(`   Actual reserved count (from /reservations): ${actualReservedCount}`);
      console.log(`   Total attendees (sum of attendeeCount): ${totalAttendees}`);
      console.log(`   Match: ${eventData?.attendeeCount === totalAttendees ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log('⚠️  Event document not found');
    }

    console.log('\n✅ Debug complete');
  } catch (error: any) {
    console.error('❌ Debug failed:', error.message);
    console.error('   Error code:', error.code);
    process.exit(1);
  }
}

debugReservationState()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

