/**
 * CYCLES DETECTED BY MADGE: None
 * 
 * Static imports only from src/lib/firebase.ts
 * No imports from stores or App
 */

import { storage } from "../src/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadImage(path: string, file: File): Promise<string> {
  try {
    const storageRef = ref(storage, path);
    const uploadResult = await uploadBytes(storageRef, file);
    return await getDownloadURL(uploadResult.ref);
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

export async function getImageUrl(path: string): Promise<string | null> {
  try {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Error getting image URL:", error);
    return null;
  }
}
