import crypto from 'node:crypto';
import { getAdminFirestore, getAdminAuth } from '../_lib/firebaseAdmin.js';

function hashEmail(email: string): string {
    return crypto.createHash('sha256').update(email).digest('hex');
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

/**
 * Link guest reservations to a user account after they sign up/sign in.
 * 
 * POST /api/reservations/link-guest
 * Headers: Authorization: Bearer <Firebase ID Token>
 * 
 * This endpoint:
 * 1. Verifies the Firebase ID token
 * 2. Extracts email from the token
 * 3. Finds reservations with matching guestEmailHash AND isGuestReservation: true
 * 4. Updates them to set userId and isGuestReservation: false
 */
export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Extract and verify auth token
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const idToken = authHeader.slice(7);

    try {
        const db = getAdminFirestore();
        if (!db) {
            console.error('[LINK_GUEST] Firestore not configured');
            return res.status(500).json({ error: 'Database not configured' });
        }

        // Verify Firebase ID token
        const auth = getAdminAuth();
        if (!auth) {
            console.error('[LINK_GUEST] Auth not configured');
            return res.status(500).json({ error: 'Auth not configured' });
        }

        const decodedToken = await auth.verifyIdToken(idToken);
        if (!decodedToken || !decodedToken.uid) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const userId = decodedToken.uid;
        const userEmail = decodedToken.email;

        if (!userEmail) {
            console.log('[LINK_GUEST] User has no email in token:', { userId });
            return res.status(200).json({ linked: 0, message: 'No email associated with account' });
        }

        const normalizedEmail = normalizeEmail(userEmail);
        const emailHash = hashEmail(normalizedEmail);

        console.log('[LINK_GUEST] Searching for guest reservations:', { userId, emailHash: emailHash.slice(0, 8) + '...' });

        // Find all reservations with matching guestEmailHash that are still guest reservations
        const guestReservationsSnapshot = await db
            .collection('reservations')
            .where('guestEmailHash', '==', emailHash)
            .where('isGuestReservation', '==', true)
            .get();

        if (guestReservationsSnapshot.empty) {
            console.log('[LINK_GUEST] No guest reservations found to link:', { userId });
            return res.status(200).json({ linked: 0, message: 'No guest reservations to link' });
        }

        // Batch update all matching reservations
        const batch = db.batch();
        const now = Date.now();
        let linkedCount = 0;

        guestReservationsSnapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
                userId: userId,
                isGuestReservation: false,
                linkedToUserAt: now,
            });
            linkedCount++;
        });

        await batch.commit();

        console.log('[LINK_GUEST] Successfully linked guest reservations:', {
            userId,
            linkedCount,
            reservationIds: guestReservationsSnapshot.docs.map(d => d.id)
        });

        return res.status(200).json({
            linked: linkedCount,
            message: `Successfully linked ${linkedCount} guest reservation(s) to your account`
        });

    } catch (error: any) {
        console.error('[LINK_GUEST] Error:', error?.message || error);

        // Don't expose internal errors
        if (error?.code === 'auth/id-token-expired' || error?.code === 'auth/argument-error') {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        return res.status(500).json({ error: 'Failed to link guest reservations' });
    }
}
