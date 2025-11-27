/**
 * Firestore Write Helpers with Defensive Logging
 * Ensures all writes use getFirestore() from initialized app
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, addDoc, setDoc, updateDoc, doc, type DocumentReference } from 'firebase/firestore';

/**
 * Helper to write to Firestore with logging
 */
export async function writeToFirestore<T extends Record<string, any>>(
  collectionPath: string,
  data: T,
  docId?: string
): Promise<{ success: boolean; docId?: string; error?: string }> {
  const db = getDbSafe();
  
  if (!db) {
    const error = 'Firestore not available - missing Firebase configuration';
    console.error('Firestore write failed:', { collectionPath, error });
    return { success: false, error };
  }

  try {
    let docRef: DocumentReference;
    
    if (docId) {
      // Use setDoc for specific document ID
      const docRef = doc(db, collectionPath, docId);
      await setDoc(docRef, data);
      console.log('Firestore write success:', { path: `${collectionPath}/${docId}`, docId });
      return { success: true, docId };
    } else {
      // Use addDoc for auto-generated ID
      const colRef = collection(db, collectionPath);
      docRef = await addDoc(colRef, data);
      console.log('Firestore write success:', { path: collectionPath, docId: docRef.id });
      return { success: true, docId: docRef.id };
    }
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    // Don't log permission errors - they're expected for fake accounts and handled elsewhere
    if (error?.code !== 'permission-denied' && !error?.message?.includes('permission')) {
      console.error('Firestore write failed:', { collectionPath, error: errorMessage, data: Object.keys(data) });
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Helper to update Firestore document with logging
 */
export async function updateFirestoreDoc(
  collectionPath: string,
  docId: string,
  data: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const db = getDbSafe();
  
  if (!db) {
    const error = 'Firestore not available - missing Firebase configuration';
    console.error('Firestore write failed:', { collectionPath, docId, error });
    return { success: false, error };
  }

  try {
    const docRef = doc(db, collectionPath, docId);
    await updateDoc(docRef, data);
    console.log('Firestore write success:', { path: `${collectionPath}/${docId}`, docId });
    return { success: true };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    // Don't log permission errors - they're expected and handled elsewhere
    if (error?.code !== 'permission-denied' && !error?.message?.includes('permission')) {
      console.error('Firestore write failed:', { collectionPath, docId, error: errorMessage });
    }
    return { success: false, error: errorMessage };
  }
}

