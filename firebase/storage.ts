/**
 * CYCLES DETECTED BY MADGE: None
 * 
 * Static imports only from src/lib/firebase.ts
 * No imports from stores or App
 */

import { getStorageSafe } from "../src/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadImage(path: string, file: File | Blob, options?: { retries?: number }): Promise<string> {
  const storage = getStorageSafe();
  if (!storage) {
    throw new Error('Firebase Storage is not initialized. Please check your Firebase configuration.');
  }
  
  // Increased file size limit to 50MB (images will be compressed client-side before reaching this)
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Image file is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 50MB. Please use a smaller image or compress it.`);
  }
  
  // Validate file type - accept common image formats
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    if (file instanceof File && !file.type.startsWith('image/')) {
      throw new Error(`File is not an image. Please select an image file (JPEG, PNG, GIF, WebP, etc.).`);
    }
    if (file instanceof File) {
      console.warn(`[UPLOAD_IMAGE] Unusual image type: ${file.type}, proceeding anyway`);
    }
  }
  
  const maxRetries = options?.retries ?? 2; // 2 retries = 3 total attempts
  let lastError: unknown = null;
  
  // Retry logic with exponential backoff - NO Promise.race timeouts
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const storageRef = ref(storage, path);
      
      if (attempt > 0) {
        console.log(`[UPLOAD_IMAGE] Retry attempt ${attempt + 1}/${maxRetries + 1} for: ${path}`);
        // Exponential backoff: wait 500ms, 1s, 2s...
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      } else {
        const fileSize = file.size / 1024 / 1024;
        const fileType = file instanceof File ? file.type : 'blob';
        console.log(`[UPLOAD_IMAGE] Starting upload: ${path} (${fileSize.toFixed(2)}MB, type: ${fileType})`);
      }
      
      // Upload bytes - NO timeout wrapper, let Firebase handle it
      console.log(`[UPLOAD_IMAGE] Starting uploadBytes for: ${path}`);
      const snapshot = await uploadBytes(storageRef, file);
      console.log(`[UPLOAD_IMAGE] uploadBytes snapshot received for: ${path}`);
      console.log(`[UPLOAD_IMAGE] Upload complete, getting download URL...`);
      
      // Get download URL - separate try/catch to handle URL retrieval failures
      let downloadUrl: string;
      try {
        console.log(`[UPLOAD_IMAGE] Starting getDownloadURL for: ${path}`);
        downloadUrl = await getDownloadURL(snapshot.ref);
        console.log(`[UPLOAD_IMAGE] getDownloadURL resolved for: ${path} - ${downloadUrl.substring(0, 50)}...`);
      } catch (urlError: any) {
        console.error(`[UPLOAD_IMAGE] getDownloadURL failed for: ${path}`, urlError);
        // Treat URL retrieval failure as a failed upload
        throw new Error(`Failed to get image URL after upload: ${urlError?.message || 'Unknown error'}`);
      }
      
      console.log(`[UPLOAD_IMAGE] ✅ Successfully uploaded: ${path}`);
      return downloadUrl;
      
    } catch (error: any) {
      lastError = error;
      const isLastAttempt = attempt === maxRetries;
      
      console.error(`[UPLOAD_IMAGE] Upload attempt ${attempt + 1}/${maxRetries + 1} failed:`, {
        path,
        fileName: file instanceof File ? file.name : 'blob',
        fileSize: file.size,
        fileType: file instanceof File ? file.type : 'blob',
        error: error?.message,
        code: error?.code,
        isLastAttempt
      });
      
      // If it's a CORS, network, or permission error, don't retry - it won't help
      if (error?.message?.includes('CORS') || 
          error?.message?.includes('network') || 
          error?.code === 'storage/unauthorized' ||
          error?.code === 'storage/canceled') {
        throw error; // Fail immediately for these errors
      }
      
      // If last attempt, throw the error with a helpful message
      if (isLastAttempt) {
        if (error?.code === 'storage/unauthorized') {
          throw new Error('Permission denied. You may not have permission to upload images. Please check Firebase Storage security rules.');
        } else if (error?.code === 'storage/canceled') {
          throw new Error('Upload was canceled.');
        } else if (error?.message?.includes('CORS') || error?.message?.includes('network')) {
          throw new Error('Network error: Unable to connect to Firebase Storage. This may be a CORS configuration issue. Please contact support or try again later.');
        }
        
        throw new Error(`Failed to upload image after ${maxRetries + 1} attempts: ${error?.message || 'Unknown error'}`);
      }
      
      // Continue to next retry
    }
  }
  
  // Should never reach here, but guarantee we always throw
  throw lastError || new Error('Upload failed for unknown reason');
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
