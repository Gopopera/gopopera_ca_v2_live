import React, { useMemo, useEffect, useCallback } from 'react';
import { Event, ViewState } from '../../types';
import { X, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate } from '../../utils/dateFormatter';
import { getMainCategoryLabelFromEvent } from '../../utils/categoryMapper';
import { useLanguage } from '../../contexts/LanguageContext';

interface ReservationConfirmationPageProps {
  event: Event;
  reservationId: string;
  setViewState: (view: ViewState) => void;
}

export const ReservationConfirmationPage: React.FC<ReservationConfirmationPageProps> = ({
  event,
  reservationId,
  setViewState,
}) => {
  const { language } = useLanguage();
  // Generate Order ID from reservation ID (first 10 chars, uppercase)
  const orderId = useMemo(() => {
    return reservationId.substring(0, 10).toUpperCase();
  }, [reservationId]);

  // QR Code data - contains reservation ID and event ID for scanning
  const qrData = useMemo(() => {
    return JSON.stringify({
      reservationId,
      eventId: event.id,
      userId: '', // Will be filled by host scanner
      timestamp: Date.now(),
    });
  }, [reservationId, event.id]);

  const handleClose = useCallback(() => {
    // Return to event detail page or previous view
    setViewState(ViewState.DETAIL);
  }, [setViewState]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleClose]);

  const handleDownloadPass = async () => {
    try {
      // Create a canvas to generate downloadable pass
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size (optimized for mobile wallets and printing)
      canvas.width = 1200;
      canvas.height = 1800;

      // Background gradient (Popera brand colors)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#1f4d52');
      gradient.addColorStop(0.5, '#15383c');
      gradient.addColorStop(1, '#0f2a2d');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add decorative elements
      ctx.fillStyle = 'rgba(227, 94, 37, 0.1)';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, -200, 400, 0, Math.PI * 2);
      ctx.fill();

      // Popera logo text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POPERA', canvas.width / 2, 120);

      // Success icon (checkmark circle)
      ctx.strokeStyle = '#e35e25';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, 250, 60, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 30, 250);
      ctx.lineTo(canvas.width / 2 - 10, 270);
      ctx.lineTo(canvas.width / 2 + 30, 240);
      ctx.stroke();

      // Confirmation text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.fillText('Reservation Confirmed!', canvas.width / 2, 380);

      // Event title (with word wrap)
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      const maxTitleWidth = canvas.width - 120;
      const titleWords = event.title.split(' ');
      let titleY = 480;
      let currentLine = '';
      
      for (const word of titleWords) {
        const testLine = currentLine + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxTitleWidth && currentLine !== '') {
          ctx.fillText(currentLine, canvas.width / 2, titleY);
          currentLine = word + ' ';
          titleY += 45;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        ctx.fillText(currentLine, canvas.width / 2, titleY);
      }

      // Order ID section
      const orderY = titleY + 80;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(canvas.width / 2 - 200, orderY - 30, 400, 60);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.fillText('Reservation ID', canvas.width / 2, orderY);
      ctx.font = 'bold 28px monospace';
      ctx.fillText(orderId, canvas.width / 2, orderY + 35);

      // Event details section
      const detailsY = orderY + 120;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(60, detailsY, canvas.width - 120, 400);

      // Date
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Date', 100, detailsY + 40);
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.fillText(formattedDate, 100, detailsY + 70);

      // Time
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.fillText('Time', 100, detailsY + 130);
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.fillText(event.time || 'TBD', 100, detailsY + 160);

      // Location
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.fillText('Location', 100, detailsY + 220);
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      const locationText = event.location || `${event.address || ''}, ${event.city || ''}`.trim();
      const maxLocationWidth = canvas.width - 200;
      const locationMetrics = ctx.measureText(locationText);
      if (locationMetrics.width > maxLocationWidth) {
        // Wrap location if too long
        const words = locationText.split(' ');
        let locY = detailsY + 250;
        let locLine = '';
        for (const word of words) {
          const testLine = locLine + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxLocationWidth && locLine !== '') {
            ctx.fillText(locLine, 100, locY);
            locLine = word + ' ';
            locY += 30;
          } else {
            locLine = testLine;
          }
        }
        if (locLine) {
          ctx.fillText(locLine, 100, locY);
        }
      } else {
        ctx.fillText(locationText, 100, detailsY + 250);
      }

      // QR Code placeholder area (white background)
      const qrY = detailsY + 480;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(canvas.width / 2 - 200, qrY, 400, 400);

      // QR Code text
      ctx.fillStyle = '#15383c';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan for Check-in', canvas.width / 2, qrY + 430);

      // Footer
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText('Show this pass at the event entrance', canvas.width / 2, canvas.height - 40);
      ctx.fillText('gopopera.ca', canvas.width / 2, canvas.height - 20);

      // Convert to image and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `popera-pass-${orderId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png', 0.95);
    } catch (error) {
      console.error('Error generating pass:', error);
      alert('Failed to generate pass. Please try again.');
    }
  };

  // Format date for display
  const formattedDate = useMemo(() => {
    if (!event.date) return 'TBD';
    try {
      const date = new Date(event.date);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return event.date;
    }
  }, [event.date]);

  // Get event image URL
  const eventImageUrl = useMemo(() => {
    if (event.imageUrls && event.imageUrls.length > 0) {
      return event.imageUrls[0];
    }
    if (event.imageUrl) {
      return event.imageUrl;
    }
    // Fallback placeholder
    return `https://picsum.photos/seed/${event.id}/800/450`;
  }, [event.imageUrls, event.imageUrl, event.id]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md" onClick={handleClose}>
      <div 
        className="bg-white/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white/60 max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with X button */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0">
          <h1 className="text-lg sm:text-xl font-heading font-bold text-[#15383c] flex-1">
            {event.title}
          </h1>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-white/80 backdrop-blur-sm border border-gray-200/60 transition-all active:scale-95 touch-manipulation shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 min-h-0">
          {/* Event Image */}
          <div className="mb-5">
            <img
              src={eventImageUrl}
              alt={event.title}
              className="w-full h-auto rounded-2xl shadow-lg border border-white/20 object-cover"
              style={{ aspectRatio: '16/9' }}
            />
          </div>

          {/* QR Code in Glass Panel */}
          <div className="mb-5">
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-6 flex flex-col items-center shadow-lg">
              <QRCodeSVG
                value={qrData}
                size={180}
                level="H"
                includeMargin={true}
                fgColor="#15383c"
                bgColor="#ffffff"
              />
              <p className="text-xs text-[#e35e25] text-center font-medium mt-4 max-w-xs leading-relaxed">
                Show this QR code at check-in
              </p>
            </div>
          </div>

          {/* Minimal Details Grid */}
          <div className="bg-white/60 backdrop-blur-sm border border-gray-200/40 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Date</p>
                <p className="text-sm font-semibold text-[#15383c]">{formattedDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Time</p>
                <p className="text-sm font-semibold text-[#15383c]">{event.time || 'TBD'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1 font-medium">Location</p>
                <p className="text-sm font-semibold text-[#15383c] break-words">
                  {event.location || `${event.address || ''}, ${event.city || ''}`.trim() || 'TBD'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Reservation ID</p>
                <p className="text-sm font-semibold text-[#15383c] font-mono">{orderId}</p>
              </div>
              {event.price && event.price !== 'Free' ? (
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Price</p>
                  <p className="text-sm font-semibold text-[#e35e25]">{event.price}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200/60 flex gap-3 flex-shrink-0 bg-white/80 backdrop-blur-sm">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-300/60 text-[#15383c] rounded-full font-semibold text-sm hover:bg-white hover:border-[#15383c] transition-all active:scale-95 touch-manipulation"
          >
            Close
          </button>
          <button
            onClick={handleDownloadPass}
            className="flex-1 px-4 py-3 bg-[#15383c] text-white rounded-full font-semibold text-sm hover:bg-[#1f4d52] transition-all active:scale-95 touch-manipulation shadow-md flex items-center justify-center gap-2"
          >
            <Download size={18} />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
