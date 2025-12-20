/**
 * Set exactly 10 five-star reviews for eatezca@gmail.com
 * From 5 different reviewers (2 reviews each)
 * 
 * Run with: npx tsx scripts/setReviewsForEatezca.ts
 */

import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
let serviceAccount: any;
if (getApps().length === 0) {
  const serviceAccountPath = join(__dirname, '..', 'firebase-service-account.json');
  try {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({ 
      credential: cert(serviceAccount as ServiceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('✅ Initialized Firebase Admin SDK for project:', serviceAccount.project_id);
  } catch (error: any) {
    console.error('❌ Failed to load service account key:', error.message);
    process.exit(1);
  }
}

// Use the named database 'gopopera2028' (not the default)
const db = getFirestore('gopopera2028');
console.log('✅ Connected to Firestore database: gopopera2028');

// 10 fake reviewers with realistic profiles (all different people)
const REVIEWERS = [
  {
    id: 'reviewer-jessica-martinez',
    name: 'Jessica Martinez',
    photoURL: 'https://i.pravatar.cc/150?img=47',
  },
  {
    id: 'reviewer-david-chen',
    name: 'David Chen',
    photoURL: 'https://i.pravatar.cc/150?img=12',
  },
  {
    id: 'reviewer-sarah-johnson',
    name: 'Sarah Johnson',
    photoURL: 'https://i.pravatar.cc/150?img=20',
  },
  {
    id: 'reviewer-marcus-thompson',
    name: 'Marcus Thompson',
    photoURL: 'https://i.pravatar.cc/150?img=33',
  },
  {
    id: 'reviewer-emily-rodriguez',
    name: 'Emily Rodriguez',
    photoURL: 'https://i.pravatar.cc/150?img=28',
  },
  {
    id: 'reviewer-alex-nguyen',
    name: 'Alex Nguyen',
    photoURL: 'https://i.pravatar.cc/150?img=51',
  },
  {
    id: 'reviewer-olivia-patel',
    name: 'Olivia Patel',
    photoURL: 'https://i.pravatar.cc/150?img=23',
  },
  {
    id: 'reviewer-james-wilson',
    name: 'James Wilson',
    photoURL: 'https://i.pravatar.cc/150?img=59',
  },
  {
    id: 'reviewer-sophia-kim',
    name: 'Sophia Kim',
    photoURL: 'https://i.pravatar.cc/150?img=41',
  },
  {
    id: 'reviewer-michael-brown',
    name: 'Michael Brown',
    photoURL: 'https://i.pravatar.cc/150?img=68',
  },
];

// 10 unique five-star review comments
const FIVE_STAR_COMMENTS = [
  "Absolutely incredible experience! The host was so welcoming and the atmosphere was unmatched. Highly recommend to everyone!",
  "Best pop-up I've ever attended. The attention to detail and care put into this event was remarkable. 10/10!",
  "Amazing host, amazing vibes! Everything was perfectly organized and I made so many great connections.",
  "This was such a memorable experience. The host truly knows how to create magic. Can't wait for the next one!",
  "Exceeded all my expectations! The community here is fantastic and the host is incredibly talented.",
  "One of the best events I've been to all year. Professional, fun, and genuinely memorable. Thank you!",
  "The energy was incredible from start to finish. This host really understands how to create special moments.",
  "Perfect in every way! Great organization, wonderful people, and an atmosphere that was simply electric.",
  "I've been to many events but this one stands out. The host's passion and dedication really shows!",
  "An absolute gem of an experience. Everything was thoughtful, welcoming, and beautifully executed.",
];

const TARGET_EMAIL = 'eatezca@gmail.com';

async function setReviewsForEatezca() {
  console.log('🔍 Finding user with email:', TARGET_EMAIL);

  // Find user by email
  const usersSnapshot = await db.collection('users').where('email', '==', TARGET_EMAIL).get();
  
  if (usersSnapshot.empty) {
    console.error('❌ User not found with email:', TARGET_EMAIL);
    console.log('   Trying to find by lowercase...');
    
    // Try finding all users with similar emails
    const allUsers = await db.collection('users').get();
    console.log(`   Total users: ${allUsers.size}`);
    const matchingUsers = allUsers.docs.filter(d => {
      const email = d.data().email?.toLowerCase();
      return email && email.includes('eatezca');
    });
    
    if (matchingUsers.length > 0) {
      console.log('   Found similar users:', matchingUsers.map(d => d.data().email));
    }
    
    process.exit(1);
  }

  const hostId = usersSnapshot.docs[0].id;
  console.log('✅ Found host ID:', hostId);

  // Get all events for this host
  const eventsSnapshot = await db.collection('events').where('hostId', '==', hostId).get();
  
  if (eventsSnapshot.empty) {
    console.error('❌ No events found for this host. Create at least one event first.');
    process.exit(1);
  }

  const eventDocs = eventsSnapshot.docs;
  console.log(`✅ Found ${eventDocs.length} events for host`);

  // Step 1: Delete ALL existing reviews from ALL host's events
  console.log('\n🗑️  Deleting all existing reviews...');
  let deletedCount = 0;
  
  for (const eventDoc of eventDocs) {
    const eventId = eventDoc.id;
    const reviewsSnapshot = await db.collection('events').doc(eventId).collection('reviews').get();
    
    for (const reviewDoc of reviewsSnapshot.docs) {
      await reviewDoc.ref.delete();
      deletedCount++;
    }
  }
  
  console.log(`✅ Deleted ${deletedCount} existing reviews`);

  // Step 2: Create exactly 10 five-star reviews from 10 different people (1 each)
  console.log('\n⭐ Creating 10 five-star reviews from 10 different people...');
  let createdCount = 0;

  for (let i = 0; i < 10; i++) {
    // Each reviewer gets exactly 1 review
    const reviewer = REVIEWERS[i];
    
    // Distribute reviews across events (round-robin)
    const eventDoc = eventDocs[i % eventDocs.length];
    const eventId = eventDoc.id;
    
    const reviewData = {
      eventId,
      userId: reviewer.id,
      userName: reviewer.name,
      userPhotoURL: reviewer.photoURL,
      rating: 5, // Always 5 stars
      comment: FIVE_STAR_COMMENTS[i],
      createdAt: Date.now() - ((10 - i) * 3 * 24 * 60 * 60 * 1000), // Stagger dates (3 days apart)
      status: 'accepted', // Ensure reviews are visible
    };

    await db.collection('events').doc(eventId).collection('reviews').add(reviewData);
    createdCount++;
    const eventData = eventDoc.data();
    console.log(`   ✅ Created review ${i + 1}/10 by ${reviewer.name} on event: ${eventData?.title || eventId}`);
  }

  // Step 3: Recalculate ratings for all events
  console.log('\n📊 Recalculating event ratings...');
  
  for (const eventDoc of eventDocs) {
    const eventId = eventDoc.id;
    const reviewsSnapshot = await db.collection('events').doc(eventId).collection('reviews').get();
    
    const reviews = reviewsSnapshot.docs.map(doc => doc.data());
    const acceptedReviews = reviews.filter(r => !r.status || r.status === 'accepted');
    
    if (acceptedReviews.length > 0) {
      const avgRating = acceptedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / acceptedReviews.length;
      
      await db.collection('events').doc(eventId).update({
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: acceptedReviews.length,
      });
      
      const eventData = eventDoc.data();
      console.log(`   ✅ Event "${eventData?.title || eventId}": ${acceptedReviews.length} reviews, ${avgRating.toFixed(1)} avg rating`);
    }
  }

  console.log('\n✅ SUCCESS!');
  console.log(`   - Deleted ${deletedCount} old reviews`);
  console.log(`   - Created ${createdCount} new five-star reviews`);
  console.log(`   - From ${createdCount} different reviewers (each person reviewed once)`);
  console.log(`   - Distributed across ${eventDocs.length} events`);
  console.log('\n🎉 Your profile now shows 10 reviews with 5 stars average from 10 different people!');
}

// Run the script
setReviewsForEatezca()
  .then(() => {
    console.log('\nScript completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
