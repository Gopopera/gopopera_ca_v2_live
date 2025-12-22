/**
 * Lazy loader for image processing utilities.
 * 
 * This module provides thin async wrappers that dynamically import the heavy
 * image processing code (heic2any, compression utilities) only when needed.
 * 
 * Benefits:
 * - The ~1.35MB image-processing chunk loads only when user actually uploads an image
 * - CreateEventPage and EditEventPage can mount instantly without waiting for the chunk
 * 
 * IMPORTANT: Do NOT import from '../../utils/imageProcessing' at the top level,
 * even for types. That would cause Vite to include the heavy chunk in the
 * dependency graph, defeating lazy loading.
 */

/**
 * Result of processing an image for upload.
 * Duplicated from utils/imageProcessing to avoid static import.
 */
export interface ProcessedImage {
  file: File;
  originalName: string;
  wasConverted: boolean;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
}

/**
 * Lazy wrapper for processImageForUpload.
 * Dynamically imports the heavy image processing module on first call.
 * 
 * @param file - The image file to process
 * @param options - Compression options
 * @returns Promise<ProcessedImage> - The processed image ready for upload
 */
export async function processImageForUploadLazy(
  file: File,
  options?: CompressionOptions
): Promise<ProcessedImage> {
  const { processImageForUpload } = await import('../../utils/imageProcessing');
  return processImageForUpload(file, options);
}

/**
 * Lazy wrapper for processImagesForUpload (batch processing).
 * Dynamically imports the heavy image processing module on first call.
 * 
 * @param files - Array of image files to process
 * @param options - Compression options
 * @returns Promise<ProcessedImage[]> - Array of processed images
 */
export async function processImagesForUploadLazy(
  files: File[],
  options?: CompressionOptions
): Promise<ProcessedImage[]> {
  const { processImagesForUpload } = await import('../../utils/imageProcessing');
  return processImagesForUpload(files, options);
}

/**
 * Prefetch the image processing chunk without blocking.
 * Call this on component mount to warm the cache before user needs it.
 * 
 * Example usage:
 *   useEffect(() => { prefetchImageProcessing(); }, []);
 */
export function prefetchImageProcessing(): void {
  // Non-blocking prefetch - fire and forget
  void import('../../utils/imageProcessing');
}

