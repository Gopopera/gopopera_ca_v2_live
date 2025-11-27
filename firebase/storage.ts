/**
 * CYCLES DETECTED BY MADGE: None
 * 
 * Static imports only from src/lib/firebase.ts
 * No imports from stores or App
 */

import { getStorageSafe } from "../src/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadImage(path: string, file: File, options?: { timeout?: number }): Promise<string> {
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
  if (!file.type.startsWith('image/') || !validImageTypes.includes(file.type.toLowerCase())) {
    // Still allow if it starts with image/ but warn
    if (!file.type.startsWith('image/')) {
      throw new Error(`File is not an image. Please select an image file (JPEG, PNG, GIF, WebP, etc.).`);
    }
    console.warn(`[UPLOAD_IMAGE] Unusual image type: ${file.type}, proceeding anyway`);
  }
  
  const uploadTimeout = options?.timeout || 90000; // 90 seconds (reduced from 120s for faster feedback)
  
  try {
    const storageRef = ref(storage, path);
    console.log(`[UPLOAD_IMAGE] Starting upload: ${path} (${(file.size / 1024 / 1024).toFixed(2)}MB, type: ${file.type})`);
    
    // Add timeout to upload operation with proper cleanup
    let timeoutId: NodeJS.Timeout | null = null;
    const uploadPromise = uploadBytes(storageRef, file).catch((error) => {
      if (timeoutId) clearTimeout(timeoutId);
      throw error;
    });
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Image upload timed out after ${uploadTimeout / 1000} seconds. The file may be too large or your connection is slow.`));
      }, uploadTimeout);
    });
    
    const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    
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
    console.error("[UPLOAD_IMAGE] Error uploading image:", {
      path,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      error: error?.message,
      code: error?.code,
      stack: error?.stack?.substring(0, 200)
    });
    
    // Provide more specific error messages
    if (error?.code === 'storage/unauthorized') {
      throw new Error('Permission denied. You may not have permission to upload images.');
    } else if (error?.code === 'storage/canceled') {
      throw new Error('Upload was canceled.');
    } else if (error?.code === 'storage/unknown') {
      throw new Error('An unknown error occurred during upload. Please try again.');
    } else if (error?.message?.includes('timed out')) {
      throw error; // Re-throw timeout errors as-is
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
