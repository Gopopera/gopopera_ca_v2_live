/**
 * Generate Instagram Story image from event data
 * Creates a 1080x1920px image matching the event info page design
 */

import QRCode from 'qrcode';

export interface StoryImageOptions {
  eventImageUrl: string;
  eventTitle: string;
  eventCategory: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventPrice?: string;
}

/**
 * Analyze background brightness to determine logo color
 * Returns true if background is dark (use white logo), false if light (use orange logo)
 */
async function analyzeBackgroundBrightness(imageUrl: string, x: number, y: number, width: number, height: number): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(true); // Default to white (dark background assumption)
          return;
        }
        
        // Draw the area where logo will be (top-left)
        ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
        
        // Get image data and calculate average brightness
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        let totalBrightness = 0;
        let pixelCount = 0;
        
        // Calculate brightness for each pixel (skip transparent pixels)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          if (a > 0) {
            // Calculate relative luminance (perceived brightness)
            const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
            totalBrightness += brightness;
            pixelCount++;
          }
        }
        
        const averageBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 128;
        
        // If average brightness is below 128 (midpoint), background is dark -> use white logo
        // If above 128, background is light -> use orange logo
        resolve(averageBrightness < 128);
      } catch (error) {
        console.warn('[STORY_IMAGE] Error analyzing background:', error);
        resolve(true); // Default to white on error
      }
    };
    
    img.onerror = () => {
      console.warn('[STORY_IMAGE] Error loading image for analysis:', imageUrl);
      resolve(true); // Default to white on error
    };
    
    img.src = imageUrl;
  });
}

/**
 * Generate Instagram Story image (1080x1920px)
 */
export async function generateStoryImage(options: StoryImageOptions): Promise<Blob> {
  const { eventImageUrl, eventTitle, eventCategory, eventDate, eventTime, eventLocation, eventPrice } = options;
  
  // Story dimensions: 1080x1920 (9:16 aspect ratio)
  const width = 1080;
  const height = 1920;
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Load event image
  const eventImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback to placeholder if image fails to load
      const placeholder = new Image();
      placeholder.src = `https://picsum.photos/${width}/${height}`;
      placeholder.onload = () => resolve(placeholder);
      placeholder.onerror = () => reject(new Error('Failed to load event image'));
    };
    
    img.src = eventImageUrl;
  });
  
  // Calculate proper aspect ratio to fill canvas without deformation
  // Story format is 9:16 (1080x1920)
  const storyAspectRatio = width / height; // 0.5625
  const imageAspectRatio = eventImage.width / eventImage.height;
  
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = eventImage.width;
  let sourceHeight = eventImage.height;
  
  // If image is wider than story format, crop sides
  if (imageAspectRatio > storyAspectRatio) {
    sourceWidth = eventImage.height * storyAspectRatio;
    sourceX = (eventImage.width - sourceWidth) / 2;
  } 
  // If image is taller than story format, crop top/bottom
  else if (imageAspectRatio < storyAspectRatio) {
    sourceHeight = eventImage.width / storyAspectRatio;
    sourceY = (eventImage.height - sourceHeight) / 2;
  }
  
  // Draw event image as background (properly cropped and scaled to fill canvas)
  ctx.drawImage(
    eventImage,
    sourceX, sourceY, sourceWidth, sourceHeight, // Source (cropped)
    0, 0, width, height // Destination (full canvas)
  );
  
  // Analyze top-left area (where logo will be) to determine logo color
  // Analyze a 200x200px area in the top-left corner
  const logoAreaSize = 200;
  const isDarkBackground = await analyzeBackgroundBrightness(
    eventImageUrl,
    0,
    0,
    logoAreaSize,
    logoAreaSize
  );
  
  const logoColor = isDarkBackground ? '#FFFFFF' : '#e35e25';
  
  // Add gradient overlay (same as event info page)
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(21, 56, 60, 0.4)');
  gradient.addColorStop(0.3, 'rgba(21, 56, 60, 0.6)');
  gradient.addColorStop(1, 'rgba(21, 56, 60, 0.9)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add Popera logo in top-left corner (72px - 3x bigger, conditional color)
  ctx.fillStyle = logoColor;
  ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const logoPadding = 40;
  ctx.fillText('Popera', logoPadding, logoPadding);
  
  // Add category badge (top-left, below logo) - 3x bigger
  const categoryY = logoPadding + 100; // More spacing (was 40, now 100)
  ctx.fillStyle = '#e35e25';
  ctx.font = 'bold 54px system-ui, -apple-system, sans-serif'; // 3x bigger (was 18px)
  const categoryPadding = 24; // 3x bigger padding
  const categoryText = eventCategory.toUpperCase();
  const categoryMetrics = ctx.measureText(categoryText);
  const categoryWidth = categoryMetrics.width + categoryPadding * 2;
  const categoryHeight = 96; // 3x bigger (was 32)
  
  // Draw category badge background
  ctx.fillStyle = 'rgba(227, 94, 37, 0.9)';
  ctx.fillRect(logoPadding, categoryY, categoryWidth, categoryHeight);
  
  // Draw category text
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(categoryText, logoPadding + categoryPadding, categoryY + 24); // Adjusted padding
  
  // Add event title (large, bold, white)
  const titleY = height - 400; // Position from bottom
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  
  // Word wrap title if too long
  const maxTitleWidth = width - logoPadding * 2;
  const words = eventTitle.split(' ');
  let line = '';
  let currentY = titleY;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxTitleWidth && i > 0) {
      ctx.fillText(line, logoPadding, currentY);
      line = words[i] + ' ';
      currentY -= 80; // Line height
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, logoPadding, currentY);
  
  // Add event details (date, time, location) - 2x bigger with more spacing
  const detailsY = currentY - 120; // More space from title
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '48px system-ui, -apple-system, sans-serif'; // 2x bigger (was 24px)
  
  // Date and time
  ctx.fillText(`${eventDate} • ${eventTime}`, logoPadding, detailsY);
  
  // Location (more spacing - was 40, now 80)
  ctx.fillText(eventLocation, logoPadding, detailsY + 80);
  
  // Price (if not free) - more spacing (was 80, now 160)
  if (eventPrice && eventPrice.toLowerCase() !== 'free' && eventPrice !== '$0' && eventPrice !== '0') {
    ctx.fillText(eventPrice, logoPadding, detailsY + 160);
  }
  
  // Add QR code and URL at bottom for deep linking
  if (options.eventUrl) {
    try {
      // Generate QR code as data URL
      const QRCode = (await import('qrcode')).default;
      const qrDataUrl = await QRCode.toDataURL(options.eventUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      
      // Load QR code image
      const qrImage = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load QR code'));
        img.src = qrDataUrl;
      });
      
      // Draw QR code in bottom-right corner
      const qrSize = 200;
      const qrPadding = 30;
      const qrX = width - qrSize - qrPadding;
      const qrY = height - qrSize - qrPadding;
      
      // Draw white background for QR code
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30);
      
      // Draw QR code
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
      
      // Add "Scan to view event" text above QR code
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      // Add background for text readability
      const scanText = 'Scan QR to view event';
      const textMetrics = ctx.measureText(scanText);
      const textBgWidth = textMetrics.width + 30;
      const textBgHeight = 40;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(
        qrX + qrSize / 2 - textBgWidth / 2,
        qrY - textBgHeight - 10,
        textBgWidth,
        textBgHeight
      );
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(scanText, qrX + qrSize / 2, qrY - 15);
      
      // Add URL text below QR code (smaller, for reference)
      const urlY = height - 15;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '24px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      const urlText = options.eventUrl.replace(/^https?:\/\//, ''); // Remove https://
      const urlMetrics = ctx.measureText(urlText);
      const urlBgWidth = urlMetrics.width + 20;
      const urlBgHeight = 35;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(
        width / 2 - urlBgWidth / 2,
        urlY - urlBgHeight - 5,
        urlBgWidth,
        urlBgHeight
      );
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(urlText, width / 2, urlY - 10);
    } catch (error) {
      console.warn('[STORY_IMAGE] Failed to generate QR code:', error);
      // Continue without QR code if generation fails
    }
  }
  
  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to generate story image'));
      }
    }, 'image/png', 0.95);
  });
}

/**
 * Share image to Instagram Story (mobile only)
 */
export async function shareToInstagramStory(imageBlob: Blob, eventUrl: string): Promise<void> {
  // Check if we're on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (!isMobile) {
    // Desktop: Download the image
    const url = URL.createObjectURL(imageBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `popera-story-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  
  // Mobile: Try Web Share API first
  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([imageBlob], 'popera-story.png', { type: 'image/png' });
      
      // Check if Web Share API supports files
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Share to Instagram Story',
          text: 'Check out this Popera event!',
        });
        return;
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.warn('[STORY_SHARE] Web Share API failed, trying URL scheme:', error);
      } else {
        return; // User cancelled
      }
    }
  }
  
  // Fallback: Try Instagram URL scheme (iOS/Android)
  try {
    // Create a data URL from the blob
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(imageBlob);
    });
    
    // For iOS: Use instagram-stories:// URL scheme
    // Note: Instagram doesn't officially support direct sharing via URL scheme
    // So we'll download the image and show instructions
    const url = URL.createObjectURL(imageBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `popera-story-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show alert with instructions
    alert('Image downloaded! Open Instagram, create a new story, and select this image from your photos.');
  } catch (error) {
    console.error('[STORY_SHARE] Failed to share:', error);
    throw error;
  }
}

