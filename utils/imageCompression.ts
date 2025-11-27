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

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
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
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Use JPEG for better compression (unless it's already WebP or PNG with transparency)
        const outputType = file.type === 'image/png' && file.size > 500000 ? 'image/jpeg' : (file.type || 'image/jpeg');
        
        // Convert to blob with quality settings
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
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
                    resolve(compressedFile);
                    return;
                  }
                  
                  const compressedFile = new File([smallerBlob], file.name, {
                    type: outputType,
                    lastModified: Date.now()
                  });
                  resolve(compressedFile);
                },
                outputType,
                lowerQuality
              );
            } else {
              const compressedFile = new File([blob], file.name, {
                type: outputType,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            }
          },
          outputType,
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Check if image needs compression
 * Lowered threshold to 1MB for faster uploads
 */
export function shouldCompressImage(file: File, maxSizeMB: number = 1): boolean {
  return file.size > maxSizeMB * 1024 * 1024;
}

