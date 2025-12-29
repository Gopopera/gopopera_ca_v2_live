/**
 * Pre-Push Sanity Check
 * 
 * Verifies reservation consistency and event click stability before pushing to main.
 * 
 * Usage:
 *   READ-ONLY (default): npx tsx scripts/prePushSanity.ts --userId <UID> --eventId <EVENT_ID>
 *   FIX MODE:            npx tsx scripts/prePushSanity.ts --userId <UID> --eventId <EVENT_ID> --fix
 * 
 * Example:
 *   npx tsx scripts/prePushSanity.ts --userId yDt2rFMadrWvN0IEgE1C8WPRFeK2 --eventId YWNZUGSf0VCczFVGs1lR
 *   npx tsx scripts/prePushSanity.ts --userId yDt2rFMadrWvN0IEgE1C8WPRFeK2 --eventId YWNZUGSf0VCczFVGs1lR --fix
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
let userId: string | null = null;
let eventId: string | null = null;
let fixMode = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--userId' && i + 1 < args.length) {
    userId = args[i + 1];
    i++;
  } else if (args[i] === '--eventId' && i + 1 < args.length) {
    eventId = args[i + 1];
    i++;
  } else if (args[i] === '--fix') {
    fixMode = true;
  }
}

if (!userId || !eventId) {
  console.error('❌ Usage: npx tsx scripts/prePushSanity.ts --userId <UID> --eventId <EVENT_ID> [--fix]');
  console.error('   Example: npx tsx scripts/prePushSanity.ts --userId yDt2rFMadrWvN0IEgE1C8WPRFeK2 --eventId YWNZUGSf0VCczFVGs1lR');
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

interface ReservationDoc {
  id: string;
  status: string;
  reservedAt?: number;
  createdAt?: any;
  updatedAt?: any;
  cancelledAt?: any;
  userId: string;
  eventId: string;
}

async function prePushSanity() {
  console.log('🔍 Pre-Push Sanity Check');
  console.log(`   Mode: ${fixMode ? 'FIX MODE' : 'READ-ONLY'}`);
  console.log(`   userId: ${userId}`);
  console.log(`   eventId: ${eventId}\n`);

  let goStatus = true;
  const issues: string[] = [];

  try {
    const reservationsRef = db.collection('reservations');

    // Query 1: All reservations for (userId, eventId)
    console.log('📋 Query 1: All reservations for (userId, eventId)');
    const userEventQuery = reservationsRef
      .where('userId', '==', userId)
      .where('eventId', '==', eventId);
    
    let userEventSnapshot;
    try {
      userEventSnapshot = await userEventQuery.get();
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        console.error('❌ PERMISSION DENIED: Cannot read reservations');
        console.error(`   Error code: ${error.code}`);
        goStatus = false;
        issues.push('Permission denied reading reservations for (userId, eventId)');
      } else {
        throw error;
      }
      userEventSnapshot = { docs: [], empty: true };
    }

    const userEventReservations: ReservationDoc[] = userEventSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        status: data.status || 'unknown',
        reservedAt: data.reservedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        cancelledAt: data.cancelledAt,
        userId: data.userId,
        eventId: data.eventId,
      };
    });

    console.log(`   Found ${userEventReservations.length} reservation(s):\n`);
    userEventReservations.forEach((res, index) => {
      const reservedAt = res.reservedAt ? new Date(res.reservedAt).toISOString() : 'NOT SET';
      const createdAt = res.createdAt ? (res.createdAt.seconds ? new Date(res.createdAt.seconds * 1000).toISOString() : new Date(res.createdAt).toISOString()) : 'NOT SET';
      const updatedAt = res.updatedAt ? (res.updatedAt.seconds ? new Date(res.updatedAt.seconds * 1000).toISOString() : new Date(res.updatedAt).toISOString()) : 'NOT SET';
      const cancelledAt = res.cancelledAt ? (res.cancelledAt.seconds ? new Date(res.cancelledAt.seconds * 1000).toISOString() : new Date(res.cancelledAt).toISOString()) : 'NOT SET';
      
      console.log(`   [${index + 1}] Doc ID: ${res.id}`);
      console.log(`       Status: ${res.status}`);
      console.log(`       Reserved At: ${reservedAt}`);
      console.log(`       Created At: ${createdAt}`);
      console.log(`       Updated At: ${updatedAt}`);
      if (res.cancelledAt) {
        console.log(`       Cancelled At: ${cancelledAt}`);
      }
      console.log('');
    });

    // Check for duplicate ACTIVE reservations
    const activeReservations = userEventReservations.filter(r => r.status === 'reserved');
    if (activeReservations.length > 1) {
      console.log(`❌ DUPLICATE ACTIVE RESERVATIONS: Found ${activeReservations.length} reserved docs for same (userId, eventId)`);
      goStatus = false;
      issues.push(`${activeReservations.length} active reservations found for (userId, eventId)`);
    }

    // Query 2: All active reservations for event
    console.log('📊 Query 2: Active reservations for event');
    let eventReservationsSnapshot;
    try {
      const eventReservationsQuery = reservationsRef
        .where('eventId', '==', eventId)
        .where('status', '==', 'reserved');
      eventReservationsSnapshot = await eventReservationsQuery.get();
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        console.error('❌ PERMISSION DENIED: Cannot read event reservations');
        console.error(`   Error code: ${error.code}`);
        goStatus = false;
        issues.push('Permission denied reading active reservations for event');
      } else {
        throw error;
      }
      eventReservationsSnapshot = { docs: [], size: 0 };
    }

    const eventReservations = eventReservationsSnapshot.docs.map(doc => ({
      id: doc.id,
      userId: doc.data().userId,
      status: doc.data().status,
    }));

    const uniqueUserIds = new Set(eventReservations.map(r => r.userId));
    
    console.log(`   Active reservation count: ${eventReservations.length}`);
    console.log(`   Unique active attendees: ${uniqueUserIds.size}`);
    console.log('');

    // Query 3: Simulate MyPops query (userId + status='reserved')
    console.log('📱 Query 3: My Circles → Attending (simulated)');
    let myPopsSnapshot;
    try {
      const myPopsQuery = reservationsRef
        .where('userId', '==', userId)
        .where('status', '==', 'reserved');
      myPopsSnapshot = await myPopsQuery.get();
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        console.error('❌ PERMISSION DENIED: Cannot read MyPops query');
        console.error(`   Error code: ${error.code}`);
        goStatus = false;
        issues.push('Permission denied reading MyPops query (userId + status=reserved)');
      } else {
        throw error;
      }
      myPopsSnapshot = { docs: [], size: 0 };
    }

    const myPopsEventIds = myPopsSnapshot.docs.map(doc => doc.data().eventId).filter(Boolean);
    const appearsInMyPops = myPopsEventIds.includes(eventId);
    
    console.log(`   Total reserved events for user: ${myPopsSnapshot.size}`);
    console.log(`   This event appears: ${appearsInMyPops ? '✅ YES' : '❌ NO'}`);
    console.log('');

    // Check: If event has reserved docs but MyPops query doesn't return it
    if (eventReservations.length > 0 && !appearsInMyPops) {
      const userHasReservation = eventReservations.some(r => r.userId === userId);
      if (userHasReservation) {
        console.log('❌ MISMATCH: Event has reserved docs for this user but MyPops query would return none');
        goStatus = false;
        issues.push('Event has reserved docs but MyPops query would return none for user');
      }
    }

    // FIX MODE: Cancel duplicate active reservations
    if (fixMode && activeReservations.length > 1) {
      console.log('🔧 FIX MODE: Cancelling duplicate active reservations...\n');
      
      // Sort by newest: updatedAt > reservedAt > createdAt > doc.id
      const sorted = [...activeReservations].sort((a, b) => {
        const aTime = a.updatedAt?.seconds 
          ? a.updatedAt.seconds * 1000 
          : a.reservedAt 
          ? a.reservedAt 
          : a.createdAt?.seconds 
          ? a.createdAt.seconds * 1000 
          : 0;
        const bTime = b.updatedAt?.seconds 
          ? b.updatedAt.seconds * 1000 
          : b.reservedAt 
          ? b.reservedAt 
          : b.createdAt?.seconds 
          ? b.createdAt.seconds * 1000 
          : 0;
        return bTime - aTime; // Descending (newest first)
      });

      const newest = sorted[0];
      const duplicates = sorted.slice(1);
      
      console.log(`   Keeping newest: ${newest.id} (reservedAt: ${newest.reservedAt ? new Date(newest.reservedAt).toISOString() : 'N/A'})`);
      console.log(`   Cancelling ${duplicates.length} duplicate(s):\n`);

      const beforeCount = activeReservations.length;
      
      for (const dup of duplicates) {
        const reservationRef = db.collection('reservations').doc(dup.id);
        await reservationRef.update({
          status: 'cancelled',
          cancelledAt: FieldValue.serverTimestamp(),
        });
        console.log(`   ✅ Cancelled: ${dup.id}`);
      }

      console.log('\n   🔄 Re-running report after fix...\n');
      
      // Re-run the check
      const afterSnapshot = await userEventQuery.get();
      const afterReservations = afterSnapshot.docs.filter(doc => doc.data().status === 'reserved');
      const afterCount = afterReservations.length;

      console.log(`   Before: ${beforeCount} active reservation(s)`);
      console.log(`   After: ${afterCount} active reservation(s)`);
      console.log('   ✅ FIX APPLIED\n');
    }

    // Final GO/NO-GO decision
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (goStatus && issues.length === 0) {
      console.log('✅ GO: All checks passed');
    } else {
      console.log('❌ NO-GO: Issues found');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('❌ Sanity check failed:', error.message);
    console.error('   Error code:', error.code);
    process.exit(1);
  }
}

prePushSanity()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

