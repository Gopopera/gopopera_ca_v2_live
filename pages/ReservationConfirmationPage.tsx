import React, { useMemo } from 'react';
import { Event, ViewState } from '../types';
import { ChevronLeft, Share2, Calendar, Clock, MapPin, Download, CheckCircle2, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate } from '../utils/dateFormatter';

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
  // Generate Order ID from reservation ID (first 10 chars, uppercase)
  const orderId = useMemo(() => {
    return `#${reservationId.substring(0, 10).toUpperCase()}`;
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
        a.download = `popera-pass-${orderId.replace('#', '')}.png`;
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

  const handleShare = async () => {
    const url = `${window.location.origin}/event/${event.id}?reservation=${reservationId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My reservation for ${event.title}`,
          text: `I've reserved a spot for ${event.title}!`,
          url,
        });
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        alert('Reservation link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Format date for display
  const formattedDate = useMemo(() => {
    if (!event.date) return 'TBD';
    try {
      const date = new Date(event.date);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return event.date;
    }
  }, [event.date]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafb] to-white font-sans">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm">
        <button
          onClick={() => setViewState(ViewState.DETAIL)}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors active:scale-95 touch-manipulation shadow-sm"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base sm:text-lg font-heading font-bold text-[#15383c]">Reservation</h1>
        <button
          onClick={handleShare}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors active:scale-95 touch-manipulation shadow-sm"
          aria-label="Share"
        >
          <Share2 size={20} />
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6 sm:pt-8">
        {/* Success Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-[#e35e25] to-[#d14e1a] rounded-full mb-4 sm:mb-6 shadow-lg relative">
            <CheckCircle2 size={40} className="sm:w-12 sm:h-12 text-white" strokeWidth={2.5} />
            <div className="absolute -top-1 -right-1">
              <Sparkles size={24} className="text-[#e35e25] animate-pulse" />
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[#15383c] mb-2 sm:mb-3">
            You're All Set! 🎉
          </h2>
          <p className="text-gray-600 text-base sm:text-lg">
            Your reservation has been confirmed
          </p>
        </div>

        {/* QR Code Section */}
        <div className="mb-8 sm:mb-10">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#15383c] via-[#1a4a4f] to-[#1f4d52] p-6 sm:p-8 md:p-10 shadow-xl">
            {/* Decorative elements */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-50"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#e35e25]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
            
            {/* QR Code */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="bg-white p-4 sm:p-5 rounded-2xl mb-5 sm:mb-6 shadow-2xl ring-4 ring-white/20">
                <QRCodeSVG
                  value={qrData}
                  size={220}
                  level="H"
                  includeMargin={true}
                  fgColor="#15383c"
                  bgColor="#ffffff"
                />
              </div>
              
              {/* Order ID */}
              <div className="bg-white/15 backdrop-blur-md rounded-2xl px-6 sm:px-8 py-3 sm:py-4 border border-white/20 shadow-lg">
                <div className="text-xs sm:text-sm text-white/80 uppercase tracking-wider mb-1.5 font-medium">Reservation ID</div>
                <div className="text-2xl sm:text-3xl font-heading font-bold text-white">{orderId}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6 sm:mb-8">
          {/* Event Title */}
          <h3 className="text-2xl sm:text-3xl font-heading font-bold text-[#15383c] mb-6 sm:mb-8 text-center">
            {event.title}
          </h3>

          {/* Event Details */}
          <div className="space-y-4 sm:space-y-5 mb-6 sm:mb-8">
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-[#f8fafb] to-white rounded-2xl border border-gray-100">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#e35e25] to-[#d14e1a] rounded-xl flex items-center justify-center shrink-0 shadow-md">
                <Calendar size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Date</div>
                <div className="text-lg sm:text-xl font-heading font-bold text-[#15383c]">{formattedDate}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-[#f8fafb] to-white rounded-2xl border border-gray-100">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#e35e25] to-[#d14e1a] rounded-xl flex items-center justify-center shrink-0 shadow-md">
                <Clock size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Time</div>
                <div className="text-lg sm:text-xl font-heading font-bold text-[#15383c]">{event.time || 'TBD'}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-[#f8fafb] to-white rounded-2xl border border-gray-100">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#e35e25] to-[#d14e1a] rounded-xl flex items-center justify-center shrink-0 shadow-md">
                <MapPin size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Location</div>
                <div className="text-lg sm:text-xl font-heading font-bold text-[#15383c] break-words">{event.location || `${event.address}, ${event.city}`}</div>
              </div>
            </div>
          </div>

          {/* Event Description */}
          {event.description && (
            <div className="pt-6 border-t border-gray-100">
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                {event.description}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 sm:space-y-4">
          <button
            onClick={handleDownloadPass}
            className="w-full bg-gradient-to-r from-[#e35e25] to-[#d14e1a] text-white rounded-full py-4 sm:py-5 font-bold text-base sm:text-lg hover:from-[#d14e1a] hover:to-[#c03e0a] transition-all flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl active:scale-[0.98] touch-manipulation"
          >
            <Download size={22} />
            Download Pass
          </button>
          
          <button
            onClick={() => setViewState(ViewState.MY_POPS)}
            className="w-full bg-white text-[#15383c] rounded-full py-4 sm:py-5 font-bold text-base sm:text-lg hover:bg-gray-50 transition-colors border-2 border-[#15383c] active:scale-[0.98] touch-manipulation shadow-sm"
          >
            View My Pop-Ups
          </button>
        </div>

        {/* Helpful Note */}
        <div className="mt-8 sm:mt-10 p-4 sm:p-5 bg-gradient-to-r from-[#f0f9fa] to-[#e8f4f5] rounded-2xl border border-[#15383c]/10">
          <p className="text-sm sm:text-base text-[#15383c] text-center leading-relaxed">
            <strong className="font-semibold">💡 Tip:</strong> Show your QR code at the event entrance for quick check-in!
          </p>
        </div>
      </div>
    </div>
  );
};

