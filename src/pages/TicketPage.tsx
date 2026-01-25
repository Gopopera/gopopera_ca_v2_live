import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Event, ViewState } from '../../types';
import {
  Download, Share2, Calendar, MapPin, Clock,
  CheckCircle2, X, Loader2, AlertCircle, ArrowLeft
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate } from '../../utils/dateFormatter';
import { formatTicketDate } from '../utils/formatTicketText';
import { formatPaymentAmount, getEventPricingType, isPayAtDoor, getEventCurrency } from '../../utils/stripeHelpers';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserStore } from '../../stores/userStore';
import { AddToCalendarButton } from '../components/AddToCalendarButton';
import { getInitials, getAvatarBgColor } from '../../utils/avatarUtils';
import {
  getReservationById,
  getEventById,
  getUserProfile,
  updateReservationCheckIn,
  cancelReservation
} from '../../firebase/db';
import { TicketStoryExport } from '../components/ticket/TicketStoryExport';
import html2canvas from 'html2canvas';
import { getBaseUrl } from '../utils/baseUrl';
import { PhoneCollectionModal } from '../../components/auth/PhoneCollectionModal';

interface TicketData {
  reservation: {
    id: string;
    eventId: string;
    userId: string;
    status: string;
    reservedAt: number;
    attendeeCount?: number;
    totalAmount?: number;
    checkedInAt?: number;
    checkedInBy?: string;
    cancelledAt?: number;
    cancelledByUid?: string;
  };
  event: Event;
  host: {
    id: string;
    displayName: string;
    photoURL?: string;
  } | null;
}

interface TicketPageProps {
  reservationId?: string;
  setViewState: (view: ViewState) => void;
}

export const TicketPage: React.FC<TicketPageProps> = ({ reservationId: propReservationId, setViewState }) => {
  // Extract reservationId from URL if not provided via props
  const reservationId = useMemo(() => {
    if (propReservationId) return propReservationId;
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/ticket\/([^/?]+)/);
      return match ? match[1] : undefined;
    }
    return undefined;
  }, [propReservationId]);

  const publicToken = useMemo(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('t');
    }
    return null;
  }, []);

  // Check for check-in mode from URL
  const isCheckInMode = useMemo(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'checkin';
    }
    return false;
  }, []);

  // Export failsafe modes: ?export=debug or ?export=plain
  const exportMode = useMemo(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('export') as 'debug' | 'plain' | null;
    }
    return null;
  }, []);

  const { t } = useLanguage();

  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);

  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Helper: wait for export component to be ready with timeout
  const waitForExportReady = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const timeout = 5000; // 5 second timeout

      const check = () => {
        if (exportRef.current?.dataset.ready === 'true') {
          resolve();
          return;
        }
        if (Date.now() - startTime > timeout) {
          reject(new Error('Export component timed out'));
          return;
        }
        requestAnimationFrame(check);
      };

      requestAnimationFrame(check);
    });
  }, []);

  // Load ticket data
  useEffect(() => {
    const loadTicketData = async () => {
      if (!reservationId) {
        setError('Invalid reservation ID');
        setLoading(false);
        return;
      }

      try {
        if (publicToken) {
          const response = await fetch(`/api/tickets/get?reservationId=${reservationId}&t=${encodeURIComponent(publicToken)}`);
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to load ticket');
          }
          const data = await response.json();
          setTicketData({
            reservation: {
              id: reservationId,
              ...data.reservation,
            },
            event: data.event,
            host: data.host || null,
          });
        } else {
          // Get reservation
          const reservation = await getReservationById(reservationId);
          if (!reservation) {
            setError('Reservation not found');
            setLoading(false);
            return;
          }

          // Get event
          const event = await getEventById(reservation.eventId);
          if (!event) {
            setError('Event not found');
            setLoading(false);
            return;
          }

          // Get host profile
          let host = null;
          if (event.hostId) {
            try {
              const hostProfile = await getUserProfile(event.hostId);
              if (hostProfile) {
                host = {
                  id: event.hostId,
                  displayName: hostProfile.displayName || hostProfile.name || 'Unknown Host',
                  photoURL: hostProfile.photoURL || hostProfile.imageUrl,
                };
              }
            } catch (err) {
              console.warn('Failed to load host profile:', err);
            }
          }

          setTicketData({
            reservation: {
              id: reservationId,
              ...reservation,
            },
            event,
            host,
          });
        }
      } catch (err) {
        console.error('Error loading ticket:', err);
        setError('Failed to load ticket');
      } finally {
        setLoading(false);
      }
    };

    loadTicketData();
  }, [reservationId, publicToken]);

  // Check if user needs to add phone number after ticket is loaded
  useEffect(() => {
    if (!loading && ticketData && user?.uid && !publicToken) {
      const hasPhoneNumber = userProfile?.phone_number || user?.phone_number;
      if (!hasPhoneNumber) {
        // Small delay to let the user see their ticket first
        const timer = setTimeout(() => {
          setShowPhoneModal(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, ticketData, user?.uid, userProfile?.phone_number, user?.phone_number]);

  // Check if current user is the host
  const isHost = useMemo(() => {
    if (!user?.uid || !ticketData?.event?.hostId) return false;
    return user.uid === ticketData.event.hostId;
  }, [user?.uid, ticketData?.event?.hostId]);

  // Check if already checked in
  const isCheckedIn = useMemo(() => {
    return !!ticketData?.reservation?.checkedInAt;
  }, [ticketData?.reservation?.checkedInAt]);

  // Check if cancelled
  const isCancelled = useMemo(() => {
    return ticketData?.reservation?.status === 'cancelled';
  }, [ticketData?.reservation?.status]);

  // Generate Order ID from reservation ID
  const orderId = useMemo(() => {
    if (!reservationId) return '';
    return reservationId.substring(0, 10).toUpperCase();
  }, [reservationId]);

  // QR Code URL - encodes the ticket URL with check-in mode
  // Uses getBaseUrl() to ensure we never encode vercel.app preview URLs
  const qrUrl = useMemo(() => {
    if (!reservationId) return '';
    const tokenParam = publicToken ? `&t=${encodeURIComponent(publicToken)}` : '';
    return `${getBaseUrl()}/ticket/${reservationId}?mode=checkin${tokenParam}`;
  }, [reservationId, publicToken]);

  // Format date for display
  const formattedDate = useMemo(() => {
    if (!ticketData?.event?.date) return 'TBD';
    try {
      return formatDate(ticketData.event.date);
    } catch {
      return ticketData.event.date;
    }
  }, [ticketData?.event?.date]);

  // Format date for export (with proper spacing: "Fri, January 30th 2026")
  const formattedDateForExport = useMemo(() => {
    if (!ticketData?.event?.date) return 'TBD';
    try {
      const dateObj = new Date(ticketData.event.date);
      if (isNaN(dateObj.getTime())) return ticketData.event.date;
      return formatTicketDate(dateObj);
    } catch {
      return ticketData.event.date;
    }
  }, [ticketData?.event?.date]);

  // Get event image URL
  const eventImageUrl = useMemo(() => {
    if (!ticketData?.event) return '';
    if (ticketData.event.imageUrls && ticketData.event.imageUrls.length > 0) {
      return ticketData.event.imageUrls[0];
    }
    if (ticketData.event.imageUrl) {
      return ticketData.event.imageUrl;
    }
    return `https://picsum.photos/seed/${ticketData.event.id}/800/450`;
  }, [ticketData?.event]);

  // Transaction summary - use event currency for proper formatting
  const transactionSummary = useMemo(() => {
    if (!ticketData?.reservation) return 'Free';
    if (!ticketData.event) return 'Free';

    const pricingType = getEventPricingType(ticketData.event);
    const currency = getEventCurrency(ticketData.event);
    const reservationPricingMode = (ticketData.reservation as any).pricingMode;

    // Check for door payment using both event pricingType and reservation pricingMode
    const isDoorPayment = pricingType === 'door' || reservationPricingMode === 'door';

    if (isDoorPayment) {
      const amount = ticketData.reservation.totalAmount || 0;
      const doorPaymentStatus = (ticketData.reservation as any).doorPaymentStatus;

      if (doorPaymentStatus === 'paid') {
        return amount > 0 ? `${formatPaymentAmount(amount, currency)} (Paid)` : 'Paid';
      }
      // Unpaid door payment - clear "Payment due" phrasing
      return amount > 0
        ? `${formatPaymentAmount(amount, currency)} — Payment due at door`
        : 'Payment due at door';
    }

    if (ticketData.reservation.totalAmount && ticketData.reservation.totalAmount > 0) {
      return formatPaymentAmount(ticketData.reservation.totalAmount, currency);
    }
    return 'Free';
  }, [ticketData?.reservation, ticketData?.event]);

  // Handle check-in
  const handleCheckIn = async () => {
    if (!reservationId || !user?.uid || !isHost || isCheckedIn) return;

    setCheckingIn(true);
    try {
      await updateReservationCheckIn(reservationId, user.uid);
      setCheckInSuccess(true);
      // Refresh ticket data
      const updatedReservation = await getReservationById(reservationId);
      if (updatedReservation && ticketData) {
        setTicketData({
          ...ticketData,
          reservation: {
            id: reservationId,
            ...updatedReservation,
          },
        });
      }
    } catch (err) {
      console.error('Error checking in:', err);
      alert('Failed to check in. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  };

  // Handle share
  const handleShare = async () => {
    const tokenParam = publicToken ? `?t=${encodeURIComponent(publicToken)}` : '';
    const ticketUrl = `${getBaseUrl()}/ticket/${reservationId}${tokenParam}`;
    const shareText = `My ticket for ${ticketData?.event?.title || 'Event'}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: ticketData?.event?.title || 'Event Ticket',
          text: shareText,
          url: ticketUrl,
        });
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        copyToClipboard(ticketUrl);
      }
    } else {
      copyToClipboard(ticketUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Link copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('Link copied to clipboard!');
    });
  };

  // Handle download - generate high-quality IG Story image using html2canvas
  const handleDownload = async () => {
    if (!ticketData) return;

    setIsExporting(true);
    setShowExport(true);

    try {
      // Wait for export component to signal ready
      await waitForExportReady();

      if (!exportRef.current) {
        throw new Error('Export component not mounted');
      }

      // Wait for fonts
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      // Small delay to ensure paint
      await new Promise(resolve => setTimeout(resolve, 150));

      // Capture using html2canvas
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#15383c',
        scale: 2,
        width: 1080,
        height: 1920,
        useCORS: false,
        allowTaint: true,
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');

      // Trigger download
      const link = document.createElement('a');
      link.download = `popera-ticket-${orderId}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating ticket image:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to download ticket: ${message}`);
    } finally {
      setIsExporting(false);
      setShowExport(false);
    }
  };

  // Handle cancel reservation
  const handleCancelReservation = async () => {
    if (!reservationId || !user?.uid || isCancelled) return;

    setCancelling(true);
    try {
      await cancelReservation(reservationId, user.uid);
      setCancelSuccess(true);
      setShowCancelModal(false);
      // Refresh ticket data
      const updatedReservation = await getReservationById(reservationId);
      if (updatedReservation && ticketData) {
        setTicketData({
          ...ticketData,
          reservation: {
            id: reservationId,
            ...updatedReservation,
          },
        });
      }
    } catch (err) {
      console.error('Error cancelling reservation:', err);
      alert('Failed to cancel reservation. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setViewState(ViewState.MY_POPS);
      window.history.replaceState({ viewState: ViewState.MY_POPS }, '', '/my-pops');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#15383c] via-[#1a4347] to-[#15383c] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading ticket...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !ticketData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#15383c] via-[#1a4347] to-[#15383c] flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full text-center border border-white/20">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Ticket Not Found</h2>
          <p className="text-white/70 mb-6">{error || 'Unable to load ticket information.'}</p>
          <button
            onClick={() => {
              setViewState(ViewState.MY_POPS);
              window.history.replaceState({ viewState: ViewState.MY_POPS }, '', '/my-pops');
            }}
            className="px-6 py-3 bg-[#e35e25] text-white rounded-full font-semibold hover:bg-[#d14e1a] transition-all"
          >
            Go to My Circles
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#15383c] via-[#1a4347] to-[#15383c] py-8 px-4">
      {/* Back button */}
      <div className="max-w-lg mx-auto mb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
      </div>

      {/* Ticket Card */}
      <div
        ref={ticketRef}
        className="max-w-lg mx-auto bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/60"
      >
        {/* Event Image */}
        <div className="relative">
          <img
            src={eventImageUrl}
            alt={ticketData.event.title}
            className="w-full aspect-[16/9] object-cover"
          />
          {/* Popera logo overlay */}
          <div className="absolute top-4 left-4 flex items-baseline">
            <span className="text-white font-bold text-lg drop-shadow-lg">P</span>
            <span className="w-1.5 h-1.5 bg-[#e35e25] rounded-full ml-0.5 mb-1"></span>
          </div>
          {/* Status badges */}
          {isCancelled && (
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-red-500 text-white text-sm font-bold rounded-full">
              Cancelled
            </div>
          )}
          {isCheckedIn && !isCancelled && (
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-green-500 text-white text-sm font-bold rounded-full flex items-center gap-1">
              <CheckCircle2 size={14} />
              Checked In
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Event Title */}
          <h1 className="text-2xl font-heading font-bold text-[#15383c] mb-3">
            {ticketData.event.title}
          </h1>

          {/* Host Info */}
          {ticketData.host && (
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
              <div className={`w-10 h-10 rounded-full overflow-hidden ${getAvatarBgColor(ticketData.host.displayName, ticketData.host.id)}`}>
                {ticketData.host.photoURL ? (
                  <img
                    src={ticketData.host.photoURL}
                    alt={ticketData.host.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {getInitials(ticketData.host.displayName)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Hosted by</p>
                <p className="font-semibold text-[#15383c]">{ticketData.host.displayName}</p>
              </div>
            </div>
          )}

          {/* Event Details */}
          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar size={18} className="text-[#e35e25] shrink-0" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Clock size={18} className="text-[#e35e25] shrink-0" />
              <span>{ticketData.event.time || 'TBD'}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <MapPin size={18} className="text-[#e35e25] shrink-0" />
              <span className="line-clamp-2">
                {(() => {
                  // Format location with proper separators
                  if (ticketData.event.location) return ticketData.event.location;
                  const parts = [ticketData.event.address, ticketData.event.city].filter(Boolean);
                  return parts.length > 0 ? parts.join(', ') : 'TBD';
                })()}
              </span>
            </div>
          </div>

          {/* Reservation Info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Reservation ID</span>
              <span className="font-mono font-semibold text-[#15383c]">#{orderId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Transaction</span>
              <span className="font-semibold text-[#15383c]">{transactionSummary}</span>
            </div>
            {ticketData.reservation.attendeeCount && ticketData.reservation.attendeeCount > 1 && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-500">Attendees</span>
                <span className="font-semibold text-[#15383c]">{ticketData.reservation.attendeeCount}</span>
              </div>
            )}
          </div>

          {/* QR Code */}
          {!isCancelled && (
            <div className="flex flex-col items-center py-6 border-t border-b border-gray-100 mb-5">
              <QRCodeSVG
                value={qrUrl}
                size={180}
                level="H"
                includeMargin={true}
                fgColor="#15383c"
                bgColor="#ffffff"
              />
              <p className="text-sm text-[#e35e25] font-medium mt-3">
                Show this QR code at check-in
              </p>
            </div>
          )}

          {/* Host Check-in Button (only in check-in mode for hosts) */}
          {isCheckInMode && isHost && !isCheckedIn && !isCancelled && (
            <div className="mb-5">
              {checkInSuccess ? (
                <div className="flex items-center justify-center gap-2 py-4 bg-green-50 text-green-700 rounded-xl font-semibold">
                  <CheckCircle2 size={20} />
                  Successfully checked in!
                </div>
              ) : (
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {checkingIn ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Checking in...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      Confirm Check-in
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {!isCancelled && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="col-span-3">
                <AddToCalendarButton event={ticketData.event} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-3 bg-white border-2 border-[#15383c]/20 text-[#15383c] rounded-full font-semibold hover:border-[#15383c] transition-all"
            >
              <Share2 size={18} />
              Share
            </button>
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 py-3 bg-[#15383c] text-white rounded-full font-semibold hover:bg-[#1f4d52] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Download
                </>
              )}
            </button>
          </div>

          {/* Claim Account CTA - for guest users viewing via public token */}
          {publicToken && !user && (
            <div className="mt-5 p-5 bg-gradient-to-r from-[#15383c] to-[#1f4d52] rounded-xl text-center">
              <h3 className="text-white font-semibold text-lg mb-2">
                🚀 Create your Popera account
              </h3>
              <p className="text-white/70 text-sm mb-4">
                Sign up to access your tickets anytime, chat with hosts, and discover more events in your community.
              </p>
              <button
                onClick={() => {
                  setViewState(ViewState.AUTH);
                  window.history.replaceState({ viewState: ViewState.AUTH }, '', '/auth?mode=signup');
                }}
                className="w-full py-3 bg-[#e35e25] text-white rounded-full font-semibold hover:bg-[#d14e1a] transition-all shadow-lg"
              >
                Sign Up Now
              </button>
            </div>
          )}

          {/* Cancel Reservation Link (for ticket owner, not cancelled) */}
          {!isCancelled && ticketData.reservation.userId === user?.uid && (
            <div className="mt-5 pt-5 border-t border-gray-100 text-center">
              <button
                onClick={() => setShowCancelModal(true)}
                className="text-sm text-gray-500 hover:text-red-600 underline transition-colors"
              >
                Cancel reservation
              </button>
            </div>
          )}

          {/* Cancelled State Message */}
          {isCancelled && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl text-center">
              <p className="text-red-700 font-medium">This reservation has been cancelled.</p>
              <p className="text-red-600 text-sm mt-1">
                Cancelled on {new Date(ticketData.reservation.cancelledAt || 0).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#15383c]">Cancel Reservation?</h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel your reservation for <strong>{ticketData.event.title}</strong>?
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>Cancellation Policy:</strong> Cancellations are processed immediately.
                For paid events, refunds are subject to our refund policy and may take 5-10 business days to process.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 bg-gray-100 text-[#15383c] rounded-full font-semibold hover:bg-gray-200 transition-all"
              >
                Keep Reservation
              </button>
              <button
                onClick={handleCancelReservation}
                disabled={cancelling}
                className="flex-1 py-3 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Yes, Cancel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export component rendered via Portal when download is triggered or in debug mode */}
      {(showExport || exportMode === 'debug') && ticketData && createPortal(
        <TicketStoryExport
          ref={exportRef}
          event={ticketData.event}
          hostName={ticketData.host?.displayName || 'Host'}
          qrUrl={qrUrl}
          formattedDate={formattedDateForExport}
          eventImageUrl={eventImageUrl}
          debugMode={exportMode === 'debug'}
          plainMode={exportMode === 'plain'}
        />,
        document.body
      )}

      {/* Phone Collection Modal - shows if user doesn't have phone number */}
      <PhoneCollectionModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={() => {
          console.log('[TICKET_PAGE] Phone number added successfully');
        }}
      />
    </div>
  );
};

export default TicketPage;

