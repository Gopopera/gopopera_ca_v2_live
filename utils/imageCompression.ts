/**
 * Client-side image compression utility
 * Compresses images before upload to reduce file size and upload time
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  maxSizeMB?: number; // Target max size in MB
}

/**
 * Compress an image file using canvas
 * Returns a compressed Blob that can be used as a File
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1600, // Reduced from 1920 for faster uploads
    maxHeight = 1600, // Reduced from 1920 for faster uploads
    quality = 0.80, // Slightly lower quality for faster compression and smaller files
    maxSizeMB = 2 // Reduced from 5MB for faster uploads
  } = options;

  // Check for HEIC files (browsers can't read them)
  const fileExtension = file.name.toLowerCase().split('.').pop();
  const isHEIC = fileExtension === 'heic' || fileExtension === 'heif';
  if (isHEIC) {
    throw new Error('HEIC files are not supported. Please convert to JPEG or PNG before uploading.');
  }
  
  console.log(`[COMPRESS_IMAGE] Starting compression for "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  
  // Add timeout to compression (30 seconds max)
  const COMPRESSION_TIMEOUT = 30000;
  
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isResolved = false;
    let isRejected = false;
    
    // Safety: ensure promise always settles
    const safeResolve = (value: File) => {
      if (isResolved || isRejected) return;
      isResolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      console.log(`[COMPRESS_IMAGE] ✅ Compression resolved for "${file.name}"`);
      resolve(value);
    };
    
    const safeReject = (error: Error) => {
      if (isResolved || isRejected) return;
      isRejected = true;
      if (timeoutId) clearTimeout(timeoutId);
      console.error(`[COMPRESS_IMAGE] ❌ Compression rejected for "${file.name}":`, error);
      reject(error);
    };
    
    timeoutId = setTimeout(() => {
      safeReject(new Error('Image compression timed out. The image may be too large or corrupted.'));
    }, COMPRESSION_TIMEOUT);
    
    const reader = new FileReader();
    
    reader.onerror = (error) => {
      console.error(`[COMPRESS_IMAGE] FileReader error for "${file.name}":`, error);
      safeReject(new Error('Failed to read image file'));
    };
    
    reader.onload = (e) => {
      try {
        const img = new Image();
        
        img.onerror = (error) => {
          console.error(`[COMPRESS_IMAGE] Image load error for "${file.name}":`, error);
          safeReject(new Error('Failed to load image for compression'));
        };
        
        img.onload = () => {
          try {
            if (timeoutId) clearTimeout(timeoutId);
            // Calculate new dimensions
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = width * ratio;
              height = height * ratio;
            }
            
            // Create canvas and compress
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              safeReject(new Error('Failed to get canvas context'));
              return;
            }
            
            // Draw image to canvas
            ctx.drawImage(img, 0, 0, width, height);
            
            // Use JPEG for better compression (unless it's already WebP or PNG with transparency)
            const outputType = file.type === 'image/png' && file.size > 500000 ? 'image/jpeg' : (file.type || 'image/jpeg');
            
            // Convert to blob with quality settings - CRITICAL: use safeResolve/safeReject
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  safeReject(new Error('Failed to compress image - toBlob returned null'));
                  return;
                }
                
                // If still too large, reduce quality further (more aggressive)
                if (blob.size > maxSizeMB * 1024 * 1024) {
                  // Recursively compress with lower quality
                  const lowerQuality = Math.max(0.4, quality - 0.25);
                  canvas.toBlob(
                    (smallerBlob) => {
                      if (!smallerBlob) {
                        // Fallback: use original blob even if large
                        const compressedFile = new File([blob], file.name, {
                          type: outputType,
                          lastModified: Date.now()
                        });
                        safeResolve(compressedFile);
                        return;
                      }
                      
                      const compressedFile = new File([smallerBlob], file.name, {
                        type: outputType,
                        lastModified: Date.now()
                      });
                      safeResolve(compressedFile);
                    },
                    outputType,
                    lowerQuality
                  );
                } else {
                  const compressedFile = new File([blob], file.name, {
                    type: outputType,
                    lastModified: Date.now()
                  });
                  safeResolve(compressedFile);
                }
              },
              outputType,
              quality
            );
          } catch (error: any) {
            console.error(`[COMPRESS_IMAGE] Error in img.onload for "${file.name}":`, error);
            safeReject(new Error(`Compression error: ${error?.message || 'Unknown error'}`));
          }
        };
        
        img.onerror = (error) => {
          console.error(`[COMPRESS_IMAGE] Image load error for "${file.name}":`, error);
          safeReject(new Error('Failed to load image for compression'));
        };
        
        img.src = e.target?.result as string;
      } catch (error: any) {
        console.error(`[COMPRESS_IMAGE] Error in reader.onload for "${file.name}":`, error);
        safeReject(new Error(`File read error: ${error?.message || 'Unknown error'}`));
      }
    };
    
    reader.onerror = (error) => {
      console.error(`[COMPRESS_IMAGE] FileReader error for "${file.name}":`, error);
      safeReject(new Error('Failed to read image file'));
    };
    
    try {
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error(`[COMPRESS_IMAGE] Error calling readAsDataURL for "${file.name}":`, error);
      safeReject(new Error('Failed to read file: ' + (error instanceof Error ? error.message : 'Unknown error')));
    }
  });
}

/**
 * Check if image needs compression
 * Lowered threshold to 1MB for faster uploads
 */
export function shouldCompressImage(file: File, maxSizeMB: number = 1): boolean {
  return file.size > maxSizeMB * 1024 * 1024;
}

