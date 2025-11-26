/**
 * CYCLES DETECTED BY MADGE: None
 * 
 * Static imports only from src/lib/firebase.ts
 * No imports from stores or App
 */

import { getStorageSafe } from "../src/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadImage(path: string, file: File): Promise<string> {
  const storage = getStorageSafe();
  if (!storage) {
    throw new Error('Firebase Storage is not initialized. Please check your Firebase configuration.');
  }
  
  // Validate file size before upload (5MB limit)
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Image file is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 5MB.`);
  }
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error(`File is not an image. Please select an image file.`);
  }
  
  try {
    const storageRef = ref(storage, path);
    console.log(`[UPLOAD_IMAGE] Starting upload: ${path} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    const uploadResult = await uploadBytes(storageRef, file);
    console.log(`[UPLOAD_IMAGE] Upload complete, getting download URL...`);
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    console.log(`[UPLOAD_IMAGE] ✅ Successfully uploaded: ${path}`);
    return downloadUrl;
  } catch (error: any) {
    console.error("[UPLOAD_IMAGE] Error uploading image:", {
      path,
      fileName: file.name,
      fileSize: file.size,
      error: error?.message,
      code: error?.code
    });
    
    // Provide more specific error messages
    if (error?.code === 'storage/unauthorized') {
      throw new Error('Permission denied. You may not have permission to upload images.');
    } else if (error?.code === 'storage/canceled') {
      throw new Error('Upload was canceled.');
    } else if (error?.code === 'storage/unknown') {
      throw new Error('An unknown error occurred during upload. Please try again.');
    }
    
    throw new Error(`Failed to upload image: ${error?.message || 'Unknown error'}`);
  }
}

export async function getImageUrl(path: string): Promise<string | null> {
  const storage = getStorageSafe();
  if (!storage) {
    console.error("Firebase Storage is not initialized");
    return null;
  }
  
  try {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Error getting image URL:", error);
    return null;
  }
}
