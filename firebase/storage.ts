/**
 * CYCLES DETECTED BY MADGE: None
 * 
 * Static imports only from src/lib/firebase.ts
 * No imports from stores or App
 */

import { getStorageSafe } from "../src/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadImage(path: string, file: File, options?: { timeout?: number; retries?: number }): Promise<string> {
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
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
  if (!file.type.startsWith('image/')) {
    // Still allow if it starts with image/ but warn
    if (!file.type.startsWith('image/')) {
      throw new Error(`File is not an image. Please select an image file (JPEG, PNG, GIF, WebP, etc.).`);
    }
    console.warn(`[UPLOAD_IMAGE] Unusual image type: ${file.type}, proceeding anyway`);
  }
  
  const uploadTimeout = options?.timeout || 60000; // 60 seconds per attempt
  const maxRetries = options?.retries || 2; // 2 retries = 3 total attempts
  
  // Retry logic with exponential backoff
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const storageRef = ref(storage, path);
      if (attempt > 0) {
        console.log(`[UPLOAD_IMAGE] Retry attempt ${attempt + 1}/${maxRetries + 1} for: ${path}`);
        // Exponential backoff: wait 2s, 4s, 8s...
        await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, attempt - 1)));
      } else {
        console.log(`[UPLOAD_IMAGE] Starting upload: ${path} (${(file.size / 1024 / 1024).toFixed(2)}MB, type: ${file.type})`);
      }
      
      // Add timeout to upload operation with proper cleanup
      let timeoutId: NodeJS.Timeout | null = null;
      let uploadAborted = false;
      
      const uploadPromise = uploadBytes(storageRef, file).catch((error) => {
        if (timeoutId) clearTimeout(timeoutId);
        // Check for CORS or network errors
        if (error?.message?.includes('CORS') || 
            error?.message?.includes('network') || 
            error?.code === 'storage/unknown' ||
            error?.message?.includes('ERR_FAILED')) {
          throw new Error(`Network error: ${error?.message || 'Connection failed'}. This may be a CORS configuration issue. Please check Firebase Storage settings.`);
        }
        throw error;
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          uploadAborted = true;
          reject(new Error(`Image upload timed out after ${uploadTimeout / 1000} seconds. The file may be too large or your connection is slow.`));
        }, uploadTimeout);
      });
      
      const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);
      
      if (uploadAborted) {
        throw new Error('Upload was aborted due to timeout');
      }
      
      console.log(`[UPLOAD_IMAGE] Upload complete, getting download URL...`);
      
      // Get download URL with timeout as well
      let urlTimeoutId: NodeJS.Timeout | null = null;
      const urlPromise = getDownloadURL(uploadResult.ref).catch((error) => {
        if (urlTimeoutId) clearTimeout(urlTimeoutId);
        throw error;
      });
      
      const urlTimeoutPromise = new Promise<never>((_, reject) => {
        urlTimeoutId = setTimeout(() => {
          reject(new Error('Failed to get download URL. The upload may have succeeded but retrieving the URL timed out.'));
        }, 10000); // 10 second timeout for URL retrieval
      });
      
      const downloadUrl = await Promise.race([urlPromise, urlTimeoutPromise]);
      if (urlTimeoutId) clearTimeout(urlTimeoutId);
      
      console.log(`[UPLOAD_IMAGE] ✅ Successfully uploaded: ${path}`);
      return downloadUrl;
    } catch (error: any) {
      lastError = error;
      const isLastAttempt = attempt === maxRetries;
      
      console.error(`[UPLOAD_IMAGE] Upload attempt ${attempt + 1}/${maxRetries + 1} failed:`, {
        path,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        error: error?.message,
        code: error?.code,
        isLastAttempt
      });
      
      // If it's a CORS or network error, don't retry - it won't help
      if (error?.message?.includes('CORS') || 
          error?.message?.includes('network') || 
          error?.code === 'storage/unauthorized') {
        throw error; // Fail immediately for these errors
      }
      
      // If last attempt, throw the error
      if (isLastAttempt) {
        // Provide more specific error messages
        if (error?.code === 'storage/unauthorized') {
          throw new Error('Permission denied. You may not have permission to upload images. Please check Firebase Storage security rules.');
        } else if (error?.code === 'storage/canceled') {
          throw new Error('Upload was canceled.');
        } else if (error?.message?.includes('timed out')) {
          throw new Error(`Image upload timed out after ${uploadTimeout / 1000} seconds. The file may be too large or your connection is slow. Please try a smaller image or check your internet connection.`);
        } else if (error?.message?.includes('CORS') || error?.message?.includes('network')) {
          throw new Error('Network error: Unable to connect to Firebase Storage. This may be a CORS configuration issue. Please contact support or try again later.');
        }
        
        throw new Error(`Failed to upload image after ${maxRetries + 1} attempts: ${error?.message || 'Unknown error'}`);
      }
      
      // Continue to next retry
    }
  }
  
  // Should never reach here, but just in case
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
