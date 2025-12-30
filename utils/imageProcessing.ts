/**
 * Image processing utility - handles HEIC conversion and compression
 * Based on Gemini recommendations for robust image handling
 * 
 * PERFORMANCE OPTIMIZATION: Outputs WebP format for ~30% smaller files
 */

import heic2any from 'heic2any';
import { compressImage, shouldCompressImage } from './imageCompression';

export interface ProcessedImage {
  file: File;
  originalName: string;
  wasConverted: boolean;
}

/**
 * Process image for upload: convert HEIC to JPEG, then compress if needed
 * Returns a processed File ready for upload
 */
export async function processImageForUpload(
  file: File,
  compressionOptions?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeMB?: number;
  }
): Promise<ProcessedImage> {
  let processedFile = file;
  let wasConverted = false;
  const originalName = file.name;

  // Step 1: Detect and Convert HEIC
  const fileExtension = file.name.toLowerCase().split('.').pop();
  const isHEIC = fileExtension === 'heic' || fileExtension === 'heif' || file.type === 'image/heic';

  if (isHEIC) {
    try {
      console.log(`[IMAGE_PROCESSING] Converting HEIC file: ${file.name}`);
      
      // heic2any returns an array of Blobs (usually one)
      const convertedBlobs = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8 // Good quality JPEG
      });

      // Get the first blob (heic2any can return multiple for multi-page HEIC, but we only need one)
      const jpegBlob = Array.isArray(convertedBlobs) ? convertedBlobs[0] : convertedBlobs;
      
      if (!jpegBlob) {
        throw new Error('HEIC conversion returned no result');
      }

      // Convert Blob to File
      processedFile = new File(
        [jpegBlob],
        file.name.replace(/\.(heic|heif)$/i, '.jpeg'),
        {
          type: 'image/jpeg',
          lastModified: Date.now()
        }
      );

      wasConverted = true;
      console.log(`[IMAGE_PROCESSING] ✅ Converted HEIC to JPEG: ${file.name} → ${processedFile.name} (${(processedFile.size / 1024 / 1024).toFixed(2)}MB)`);
    } catch (error: any) {
      console.error(`[IMAGE_PROCESSING] ❌ Failed to convert HEIC file ${file.name}:`, error);
      throw new Error(`Failed to convert HEIC image "${file.name}". Please convert it to JPEG or PNG manually, or change your iOS camera settings to "Most Compatible" format.`);
    }
  }

  // Step 2: Compress if needed
  const shouldCompress = shouldCompressImage(processedFile, compressionOptions?.maxSizeMB || 1);
  
  if (shouldCompress) {
    try {
      console.log(`[IMAGE_PROCESSING] Compressing image: ${processedFile.name} (${(processedFile.size / 1024 / 1024).toFixed(2)}MB)`);
      
      processedFile = await compressImage(processedFile, {
        maxWidth: compressionOptions?.maxWidth || 1600,
        maxHeight: compressionOptions?.maxHeight || 1600,
        quality: compressionOptions?.quality || 0.80,
        maxSizeMB: compressionOptions?.maxSizeMB || 2
      });

      console.log(`[IMAGE_PROCESSING] ✅ Compressed: ${processedFile.name} (${(processedFile.size / 1024 / 1024).toFixed(2)}MB)`);
    } catch (compressError: any) {
      console.error(`[IMAGE_PROCESSING] ❌ Compression failed for ${processedFile.name}:`, compressError);
      // Don't throw - proceed with uncompressed file
      // Compression is an optimization, not a requirement
      console.warn(`[IMAGE_PROCESSING] Continuing with uncompressed file: ${processedFile.name}`);
    }
  } else {
    console.log(`[IMAGE_PROCESSING] Skipping compression for ${processedFile.name} (under threshold)`);
  }

  return {
    file: processedFile,
    originalName,
    wasConverted
  };
}

/**
 * Process multiple images in parallel
 */
export async function processImagesForUpload(
  files: File[],
  compressionOptions?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeMB?: number;
  }
): Promise<ProcessedImage[]> {
  console.log(`[IMAGE_PROCESSING] Processing ${files.length} image(s)...`);

  // Process all images in parallel
  const processPromises = files.map(file => 
    processImageForUpload(file, compressionOptions)
      .catch((error: any) => {
        // Return error info instead of throwing to allow Promise.allSettled to work
        console.error(`[IMAGE_PROCESSING] Failed to process ${file.name}:`, error);
        return {
          file: file, // Return original file as fallback
          originalName: file.name,
          wasConverted: false,
          error: error.message || 'Unknown error'
        } as ProcessedImage & { error?: string };
      })
  );

  const results = await Promise.allSettled(processPromises);
  
  const processed: ProcessedImage[] = [];
  const errors: Array<{ fileName: string; error: string }> = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if ('error' in result.value) {
        errors.push({ fileName: result.value.originalName, error: result.value.error! });
      } else {
        processed.push(result.value);
      }
    } else {
      errors.push({ fileName: files[index].name, error: result.reason?.message || 'Unknown error' });
    }
  });

  if (errors.length > 0) {
    console.warn(`[IMAGE_PROCESSING] ⚠️ ${errors.length} image(s) failed to process:`, errors);
  }

  console.log(`[IMAGE_PROCESSING] ✅ Successfully processed ${processed.length}/${files.length} image(s)`);
  
  return processed;
}

