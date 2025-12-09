import { getDbSafe } from '../src/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Diagnose events for a specific user to find incorrect hostId values
 */
export async function diagnoseUserEvents(userId: string): Promise<{
  correctEvents: number;
  incorrectEvents: number;
  incorrectEventIds: string[];
  totalEvents: number;
  eventDetails: Array<{
    id: string;
    title: string;
    hostId: string;
    isDraft: boolean;
  }>;
}> {
  const db = getDbSafe();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    const eventsCol = collection(db, 'events');
    const q = query(eventsCol, where('hostId', '==', userId));
    const snapshot = await getDocs(q);

    const incorrectEventIds: string[] = [];
    let correctEvents = 0;
    const eventDetails: Array<{
      id: string;
      title: string;
      hostId: string;
      isDraft: boolean;
    }> = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const eventDetail = {
        id: doc.id,
        title: data.title || 'Untitled',
        hostId: data.hostId || 'missing',
        isDraft: data.isDraft === true
      };
      eventDetails.push(eventDetail);

      if (data.hostId === userId && data.isDraft !== true) {
        correctEvents++;
      } else {
        incorrectEventIds.push(doc.id);
      }
    });

    return {
      correctEvents,
      incorrectEvents: incorrectEventIds.length,
      incorrectEventIds,
      totalEvents: snapshot.docs.length,
      eventDetails
    };
  } catch (error) {
    console.error('[DIAGNOSE] Error diagnosing events:', error);
    throw error;
  }
}

