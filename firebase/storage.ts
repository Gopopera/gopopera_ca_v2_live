/**
 * CYCLES DETECTED BY MADGE: None
 * 
 * Static imports only from src/lib/firebase.ts
 * No imports from stores or App
 * 
 * Updated to use uploadBytesResumable per Gemini recommendations for better error handling and progress tracking
 */

import { getStorageSafe } from "../src/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, UploadTask, StorageError } from "firebase/storage";

export interface UploadProgress {
  progress: number; // 0-100
  bytesTransferred: number;
  totalBytes: number;
}

export interface UploadImageOptions {
  retries?: number;
  onProgress?: (progress: UploadProgress) => void;
  maxUploadTime?: number; // Maximum time in ms before timeout (default: 60s)
}

export async function uploadImage(
  path: string, 
  file: File | Blob, 
  options?: UploadImageOptions
): Promise<string> {
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
  const maxUploadTime = options?.maxUploadTime ?? 60000; // 60 seconds default
  const onProgress = options?.onProgress;
  let lastError: unknown = null;
  
  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[UPLOAD_IMAGE] Retry attempt ${attempt + 1}/${maxRetries + 1} for: ${path}`);
        // Exponential backoff: wait 500ms, 1s, 2s...
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      } else {
        const fileSize = file.size / 1024 / 1024;
        const fileType = file instanceof File ? file.type : 'blob';
        console.log(`[UPLOAD_IMAGE] Starting resumable upload: ${path} (${fileSize.toFixed(2)}MB, type: ${fileType})`);
      }
      
      const storageRef = ref(storage, path);
      
      // Use uploadBytesResumable for better error handling and progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      // Wrap upload in a promise with timeout and progress tracking
      const downloadUrl = await new Promise<string>((resolve, reject) => {
        let uploadTimeout: NodeJS.Timeout | null = null;
        let hasResolved = false;
        let hasRejected = false;
        
        // Safety: ensure promise always settles
        const safeResolve = (url: string) => {
          if (hasResolved || hasRejected) return;
          hasResolved = true;
          if (uploadTimeout) clearTimeout(uploadTimeout);
          resolve(url);
        };
        
        const safeReject = (error: Error) => {
          if (hasResolved || hasRejected) return;
          hasRejected = true;
          if (uploadTimeout) clearTimeout(uploadTimeout);
          reject(error);
        };
        
        // Set overall timeout to prevent hanging
        uploadTimeout = setTimeout(() => {
          console.warn(`[UPLOAD_IMAGE] Upload timeout after ${maxUploadTime}ms for: ${path}`);
          uploadTask.cancel(); // Cancel the upload task
          safeReject(new Error(`Upload timeout after ${maxUploadTime / 1000}s. Please check your internet connection and try again.`));
        }, maxUploadTime);
        
        // Monitor upload progress and state changes
        uploadTask.on('state_changed',
          (snapshot) => {
            // Progress tracking
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            const uploadProgress: UploadProgress = {
              progress,
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes
            };
            
            if (onProgress) {
              onProgress(uploadProgress);
            }
            
            console.log(`[UPLOAD_IMAGE] Upload progress: ${progress.toFixed(1)}% (${(snapshot.bytesTransferred / 1024 / 1024).toFixed(2)}MB / ${(snapshot.totalBytes / 1024 / 1024).toFixed(2)}MB)`);
            
            // Log state changes for debugging
            switch (snapshot.state) {
              case 'paused':
                console.log(`[UPLOAD_IMAGE] Upload paused for: ${path}`);
                break;
              case 'running':
                console.log(`[UPLOAD_IMAGE] Upload running for: ${path}`);
                break;
            }
          },
          (error: StorageError) => {
            // Handle upload errors
            console.error(`[UPLOAD_IMAGE] Upload error for: ${path}`, {
              code: error.code,
              message: error.message,
              serverResponse: error.serverResponse
            });
            
            // Map Firebase Storage error codes to user-friendly messages
            let errorMessage = error.message || 'Unknown error';
            switch (error.code) {
              case 'storage/unauthorized':
                errorMessage = 'Permission denied. You may not have permission to upload images. Please check Firebase Storage security rules.';
                break;
              case 'storage/canceled':
                errorMessage = 'Upload was canceled.';
                break;
              case 'storage/unknown':
                errorMessage = 'An unknown error occurred. Please try again.';
                break;
              case 'storage/invalid-format':
                errorMessage = 'Invalid file format. Please select an image file.';
                break;
              case 'storage/retry-limit-exceeded':
                errorMessage = 'Upload failed after multiple retries. Please check your internet connection and try again.';
                break;
              case 'storage/invalid-checksum':
                errorMessage = 'File upload verification failed. Please try again.';
                break;
              case 'storage/quota-exceeded':
                errorMessage = 'Storage quota exceeded. Please contact support.';
                break;
            }
            
            safeReject(new Error(errorMessage));
          },
          async () => {
            // Upload completed successfully
            try {
              console.log(`[UPLOAD_IMAGE] Upload complete, getting download URL for: ${path}`);
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              console.log(`[UPLOAD_IMAGE] ✅ Successfully uploaded: ${path} - ${url.substring(0, 50)}...`);
              safeResolve(url);
            } catch (urlError: any) {
              console.error(`[UPLOAD_IMAGE] getDownloadURL failed for: ${path}`, urlError);
              safeReject(new Error(`Failed to get image URL after upload: ${urlError?.message || 'Unknown error'}`));
            }
          }
        );
      });
      
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
          error?.code === 'storage/canceled' ||
          error?.code === 'storage/quota-exceeded') {
        throw error; // Fail immediately for these errors
      }
      
      // If last attempt, throw the error
      if (isLastAttempt) {
        throw error;
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
