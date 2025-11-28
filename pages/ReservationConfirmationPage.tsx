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
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafb] via-white to-[#f8fafb] font-sans">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm">
        <button
          onClick={() => setViewState(ViewState.DETAIL)}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#15383c] hover:bg-gray-50 hover:border-[#15383c] transition-all active:scale-95 touch-manipulation shadow-sm"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base sm:text-lg font-heading font-bold text-[#15383c]">Reservation</h1>
        <button
          onClick={handleShare}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#15383c] hover:bg-gray-50 hover:border-[#15383c] transition-all active:scale-95 touch-manipulation shadow-sm"
          aria-label="Share"
        >
          <Share2 size={20} />
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 pt-6 sm:pt-8 lg:pt-12">
        {/* Success Header - Enhanced */}
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 bg-gradient-to-br from-[#e35e25] via-[#e35e25] to-[#d14e1a] rounded-full mb-5 sm:mb-6 lg:mb-8 shadow-xl shadow-[#e35e25]/20 relative animate-fade-in">
            <CheckCircle2 size={48} className="sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-white" strokeWidth={2.5} />
            <div className="absolute -top-2 -right-2 sm:-top-1 sm:-right-1">
              <Sparkles size={28} className="sm:w-8 sm:h-8 text-[#e35e25] animate-pulse" />
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-[#15383c] mb-3 sm:mb-4 leading-tight">
            You're All Set! 🎉
          </h2>
          <p className="text-gray-600 text-base sm:text-lg lg:text-xl max-w-xl mx-auto leading-relaxed">
            Your reservation has been confirmed and you're ready to join the experience
          </p>
        </div>

        {/* QR Code Section - Enhanced */}
        <div className="mb-8 sm:mb-10 lg:mb-12">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#15383c] via-[#1a4a4f] to-[#1f4d52] p-6 sm:p-8 md:p-10 lg:p-12 shadow-2xl">
            {/* Enhanced decorative elements */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
            <div className="absolute top-0 right-0 w-72 h-72 sm:w-96 sm:h-96 bg-[#e35e25]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-56 h-56 sm:w-72 sm:h-72 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#e35e25]/5 rounded-full blur-3xl"></div>
            
            {/* QR Code */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="bg-white p-5 sm:p-6 lg:p-7 rounded-3xl mb-6 sm:mb-8 shadow-2xl ring-4 ring-white/30 transform hover:scale-[1.02] transition-transform duration-300">
                <QRCodeSVG
                  value={qrData}
                  size={240}
                  level="H"
                  includeMargin={true}
                  fgColor="#15383c"
                  bgColor="#ffffff"
                />
              </div>
              
              {/* Order ID - Enhanced */}
              <div className="bg-white/20 backdrop-blur-lg rounded-2xl px-6 sm:px-8 lg:px-10 py-4 sm:py-5 border border-white/30 shadow-xl">
                <div className="text-xs sm:text-sm text-white/90 uppercase tracking-wider mb-2 font-semibold">Reservation ID</div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white tracking-tight">{orderId}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Card - Enhanced */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 lg:p-10 mb-6 sm:mb-8 lg:mb-10 overflow-hidden relative">
          {/* Subtle background pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#e35e25]/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10">
            {/* Event Title */}
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-[#15383c] mb-6 sm:mb-8 lg:mb-10 text-center leading-tight">
              {event.title}
            </h3>

            {/* Event Details - Enhanced */}
            <div className="space-y-4 sm:space-y-5 lg:space-y-6 mb-6 sm:mb-8">
              <div className="flex items-start gap-4 sm:gap-5 p-5 sm:p-6 bg-gradient-to-br from-[#f8fafb] via-white to-[#f8fafb] rounded-2xl border border-gray-100 hover:border-[#15383c]/20 transition-all shadow-sm hover:shadow-md">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#e35e25] to-[#d14e1a] rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                  <Calendar size={26} className="sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wider mb-2 font-semibold">Date</div>
                  <div className="text-lg sm:text-xl lg:text-2xl font-heading font-bold text-[#15383c]">{formattedDate}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-4 sm:gap-5 p-5 sm:p-6 bg-gradient-to-br from-[#f8fafb] via-white to-[#f8fafb] rounded-2xl border border-gray-100 hover:border-[#15383c]/20 transition-all shadow-sm hover:shadow-md">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#e35e25] to-[#d14e1a] rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                  <Clock size={26} className="sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wider mb-2 font-semibold">Time</div>
                  <div className="text-lg sm:text-xl lg:text-2xl font-heading font-bold text-[#15383c]">{event.time || 'TBD'}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-4 sm:gap-5 p-5 sm:p-6 bg-gradient-to-br from-[#f8fafb] via-white to-[#f8fafb] rounded-2xl border border-gray-100 hover:border-[#15383c]/20 transition-all shadow-sm hover:shadow-md">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#e35e25] to-[#d14e1a] rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                  <MapPin size={26} className="sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="text-xs sm:text-sm text-gray-500 uppercase tracking-wider mb-2 font-semibold">Location</div>
                  <div className="text-lg sm:text-xl lg:text-2xl font-heading font-bold text-[#15383c] break-words leading-snug">{event.location || `${event.address}, ${event.city}`}</div>
                </div>
              </div>
            </div>

            {/* Event Description */}
            {event.description && (
              <div className="pt-6 sm:pt-8 border-t border-gray-100">
                <p className="text-gray-600 text-sm sm:text-base lg:text-lg leading-relaxed">
                  {event.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Enhanced */}
        <div className="space-y-3 sm:space-y-4">
          <button
            onClick={handleDownloadPass}
            className="w-full bg-gradient-to-r from-[#e35e25] to-[#d14e1a] text-white rounded-full py-4 sm:py-5 lg:py-6 font-bold text-base sm:text-lg lg:text-xl hover:from-[#d14e1a] hover:to-[#c03e0a] transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl active:scale-[0.98] touch-manipulation transform hover:-translate-y-0.5"
          >
            <Download size={24} className="sm:w-6 sm:h-6" />
            <span>Download Pass</span>
          </button>
          
          <button
            onClick={() => setViewState(ViewState.MY_POPS)}
            className="w-full bg-white text-[#15383c] rounded-full py-4 sm:py-5 lg:py-6 font-bold text-base sm:text-lg lg:text-xl hover:bg-[#f8fafb] transition-all border-2 border-[#15383c] active:scale-[0.98] touch-manipulation shadow-md hover:shadow-lg"
          >
            View My Pop-Ups
          </button>
        </div>

        {/* Helpful Note - Enhanced */}
        <div className="mt-8 sm:mt-10 lg:mt-12 p-5 sm:p-6 lg:p-7 bg-gradient-to-br from-[#f0f9fa] via-[#e8f4f5] to-[#f0f9fa] rounded-2xl border border-[#15383c]/10 shadow-sm">
          <p className="text-sm sm:text-base lg:text-lg text-[#15383c] text-center leading-relaxed">
            <strong className="font-semibold">💡 Tip:</strong> Show your QR code at the event entrance for quick check-in!
          </p>
        </div>
      </div>
    </div>
  );
};

