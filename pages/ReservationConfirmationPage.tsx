import React, { useMemo } from 'react';
import { Event, ViewState } from '../types';
import { ChevronLeft, Share2, Calendar, Clock, MapPin, Download } from 'lucide-react';
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

  const handleDownloadPass = () => {
    // Create a canvas to generate downloadable image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 1200;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1f4d52');
    gradient.addColorStop(1, '#15383c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Reservation Confirmed!', canvas.width / 2, 100);

    // Add event title
    ctx.font = 'bold 24px Arial';
    ctx.fillText(event.title, canvas.width / 2, 200);

    // Add order ID
    ctx.font = '18px Arial';
    ctx.fillText(`Order ID: ${orderId}`, canvas.width / 2, 250);

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
    });
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
    <div className="min-h-screen bg-[#1a1a1a] text-white font-sans">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#1a1a1a] border-b border-gray-800 px-4 py-4 flex items-center justify-between">
        <button
          onClick={() => setViewState(ViewState.DETAIL)}
          className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-heading font-bold text-[#15383c]">Reservation Confirmed!</h1>
        <button
          onClick={handleShare}
          className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          <Share2 size={20} />
        </button>
      </div>

      <div className="px-4 pb-8">
        {/* QR Code Section */}
        <div className="mt-6 mb-8">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#15383c] to-[#1f4d52] p-8">
            {/* Background image effect - using gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(21,56,60,0.3)_100%)]"></div>
            
            {/* QR Code */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl mb-4 shadow-2xl">
                <QRCodeSVG
                  value={qrData}
                  size={200}
                  level="H"
                  includeMargin={true}
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              </div>
              
              {/* Order ID */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/20">
                <div className="text-xs text-gray-300 uppercase tracking-wider mb-1">Order ID</div>
                <div className="text-xl font-heading font-bold text-white">{orderId}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Title */}
        <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-6 text-center">
          {event.title}
        </h2>

        {/* Event Details */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-[#e35e25] shrink-0" />
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Date</div>
                <div className="text-base font-medium text-white">{formattedDate}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-[#e35e25] shrink-0" />
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Time</div>
                <div className="text-base font-medium text-white">{event.time || 'TBD'}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <MapPin size={20} className="text-[#e35e25] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Location</div>
                <div className="text-base font-medium text-white truncate">{event.location || `${event.address}, ${event.city}`}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Description */}
        {event.description && (
          <p className="text-gray-400 text-sm leading-relaxed mb-8 px-2">
            {event.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleDownloadPass}
            className="w-full bg-white text-[#15383c] rounded-full py-4 font-bold text-base hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <Download size={20} />
            Download Pass
          </button>
          
          <button
            onClick={() => setViewState(ViewState.MY_POPS)}
            className="w-full bg-gray-800 text-gray-300 rounded-full py-4 font-bold text-base hover:bg-gray-700 transition-colors"
          >
            Go to My Pops
          </button>
        </div>
      </div>
    </div>
  );
};

