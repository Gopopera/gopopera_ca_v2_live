import React, { useState, useMemo } from 'react';
import { Event, ViewState } from '../../types';
import { ChevronLeft, Calendar, MapPin, User, Minus, Plus, CreditCard, Banknote, Phone } from 'lucide-react';
import { formatDate } from '../../utils/dateFormatter';
import { getUserProfile } from '../../firebase/db';
import { formatPaymentAmount, getEventPricingType, isPayAtDoor, isEventFree, getEventFeeAmount, getEventCurrency } from '../../utils/stripeHelpers';
import { useLanguage } from '../../contexts/LanguageContext';

interface ConfirmReservationPageProps {
  event: Event;
  setViewState: (view: ViewState) => void;
  onHostClick?: (hostName: string, hostId?: string) => void;
  onConfirm: (attendeeCount: number, supportContribution: number, paymentMethod: string, attendeePhone?: string) => Promise<string>;
}

export const ConfirmReservationPage: React.FC<ConfirmReservationPageProps> = ({
  event,
  setViewState,
  onHostClick,
  onConfirm,
}) => {
  const { t, language } = useLanguage();
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [supportContribution, setSupportContribution] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [hostName, setHostName] = useState(event.hostName || event.host);

  // Get pricing type using helper
  const pricingType = useMemo(() => getEventPricingType(event), [event]);
  const isFree = useMemo(() => isEventFree(event), [event]);
  const isDoorPayment = useMemo(() => isPayAtDoor(event), [event]);

  // Extract price per attendee (in dollars) using centralized helper
  const pricePerAttendee = useMemo(() => {
    if (isFree) return 0;
    const feeAmountCents = getEventFeeAmount(event);
    return feeAmountCents / 100; // Convert cents to dollars
  }, [event, isFree]);

  // Calculate totals (in dollars)
  const subtotal = pricePerAttendee * attendeeCount;
  const total = subtotal + supportContribution;
  
  // Get currency from event using centralized helper
  const currency = getEventCurrency(event);
  
  // Get currency symbol for display
  const currencySymbol = currency.toLowerCase() === 'eur' ? '€' : currency.toLowerCase() === 'gbp' ? '£' : '$';

  // Support contribution options
  const contributionOptions = [5, 10, 15, 20, 25];

  // Fetch host name
  React.useEffect(() => {
    if (event.hostId) {
      getUserProfile(event.hostId)
        .then((profile) => {
          if (profile) {
            setHostName(profile.name || profile.displayName || event.hostName || event.host);
          }
        })
        .catch(() => {
          // Keep default hostName
        });
    }
  }, [event.hostId, event.hostName, event.host]);

  // Format date for display
  const formattedDate = useMemo(() => {
    if (!event.date) return 'TBD';
    try {
      const formatted = formatDate(event.date);
      const match = formatted.match(/^(\w+),\s+(\w+\s+\d+)/);
      return match ? `${match[1]}, ${match[2]}` : formatted;
    } catch {
      return event.date;
    }
  }, [event.date]);

  const handleConfirm = async () => {
    // Only require payment method for online (Stripe) payments, not for free or door
    if (!isFree && !isDoorPayment && !paymentMethod) {
      alert('Please select a payment method.');
      return;
    }

    if (attendeeCount < 1) {
      alert('Please select at least 1 attendee.');
      return;
    }

    // Validate capacity if event has a limit
    if (event.capacity) {
      const { getReservationCountForEvent } = await import('../../firebase/db');
      try {
        const currentReservations = await getReservationCountForEvent(event.id);
        if (currentReservations + attendeeCount > event.capacity) {
          const remaining = event.capacity - currentReservations;
          alert(`This event has a capacity limit of ${event.capacity}. Only ${remaining} spot${remaining !== 1 ? 's' : ''} remaining.`);
          return;
        }
      } catch (error) {
        console.error('Error checking capacity:', error);
        // Continue anyway - capacity check failed but don't block user
      }
    }

    setProcessing(true);
    try {
      // Pass phone (trimmed) for door payments; pass undefined for other flows
      const phoneTrimmed = attendeePhone.trim() || undefined;
      const reservationId = await onConfirm(attendeeCount, supportContribution, paymentMethod, phoneTrimmed);
      // Navigation to confirmation page will be handled by parent
    } catch (error) {
      console.error('Error confirming reservation:', error);
      alert('Failed to confirm reservation. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleIncrement = () => {
    if (event.capacity) {
      // Check if we're at capacity
      const currentReservations = event.attendeesCount || 0;
      if (currentReservations + attendeeCount >= event.capacity) {
        alert(`This event has a capacity limit of ${event.capacity}. Only ${event.capacity - currentReservations} spots remaining.`);
        return;
      }
    }
    setAttendeeCount(prev => prev + 1);
  };

  const handleDecrement = () => {
    if (attendeeCount > 1) {
      setAttendeeCount(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-4">
        <button
          onClick={() => setViewState(ViewState.DETAIL)}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-heading font-bold text-[#15383c]">
          {isFree 
            ? (language === 'fr' ? 'Confirmer la réservation' : 'Confirm Reservation')
            : isDoorPayment
              ? (language === 'fr' ? 'Réserver (paiement sur place)' : 'Reserve (Pay at door)')
              : (language === 'fr' ? 'Confirmer & Payer' : 'Confirm & Pay')}
        </h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Event Details */}
        <div className="flex gap-4 pb-6 border-b border-gray-200">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-heading font-bold text-[#15383c] mb-3 line-clamp-2">
              {event.title}
            </h2>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400 shrink-0" />
                <span>{formattedDate} • {event.time || 'TBD'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gray-400 shrink-0" />
                <span className="truncate">{event.location || `${event.address}, ${event.city}`}</span>
              </div>
              <div className="flex items-center gap-2">
                <User size={16} className="text-gray-400 shrink-0" />
                <span>Hosted by </span>
                <button
                  onClick={() => {
                    if (onHostClick) {
                      onHostClick(hostName, event.hostId);
                    } else {
                      setViewState(ViewState.HOST_PROFILE);
                    }
                  }}
                  className="text-[#e35e25] hover:underline font-medium"
                >
                  {hostName}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation / Expulsion Policy */}
        <div className="pb-6 border-b border-gray-200">
          <h3 className="text-lg font-heading font-bold text-[#15383c] mb-3">
            Cancellation / Expulsion policy
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Change of plans? You can cancel your reservation in the app. Please do it early so someone else can attend. When you cancel, your access to the event details and chat ends. Refunds (if offered) are set by the host for each event and handled under those settings; Popera reflects the refund status in your account once processed. Hosts reserve the right to expel attendees who violate event rules, engage in abusive behavior, spam, impersonate others, ignore moderator warnings, or break event chat rules. Expelled attendees will not receive refunds and may be banned from future events.
          </p>
        </div>

        {/* Number of Attendees */}
        <div className="pb-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <label className="text-base font-medium text-gray-700">No. of attendees</label>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDecrement}
                disabled={attendeeCount <= 1}
                className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#15383c] hover:text-[#15383c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="text-lg font-bold text-[#15383c] min-w-[2rem] text-center">{attendeeCount}</span>
              <button
                onClick={handleIncrement}
                className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#15383c] hover:text-[#15383c] transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          {!isFree && (
            <p className="text-sm text-gray-500 mt-1">
              {formatPaymentAmount(pricePerAttendee * 100, currency)} per attendee
            </p>
          )}
        </div>

        {/* Support Contribution */}
        <div className="pb-6 border-b border-gray-200">
          <h3 className="text-lg font-heading font-bold text-[#15383c] mb-2">
            Add a Support Contribution
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Pay a little extra to support local creators or a social cause connected to this event.
          </p>
          <div className="flex flex-wrap gap-3">
            {contributionOptions.map((amount) => (
              <button
                key={amount}
                onClick={() => setSupportContribution(supportContribution === amount ? 0 : amount)}
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all ${
                  supportContribution === amount
                    ? 'border-[#15383c] bg-[#15383c] text-white'
                    : 'border-gray-300 text-gray-700 hover:border-[#15383c] hover:text-[#15383c]'
                }`}
              >
                {currencySymbol}{amount}
              </button>
            ))}
            <button
              onClick={() => {
                const customAmount = prompt(`Enter custom amount (${currencySymbol}):`);
                if (customAmount) {
                  const amount = parseFloat(customAmount);
                  if (!isNaN(amount) && amount > 0) {
                    setSupportContribution(amount);
                  }
                }
              }}
              className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-700 hover:border-[#15383c] hover:text-[#15383c] transition-all"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Total */}
        <div className="pb-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-heading font-bold text-[#15383c] mb-1">Total</h3>
              {!isFree && (
                <p className="text-sm text-gray-500">
                  {attendeeCount} attendee(s) × {formatPaymentAmount(pricePerAttendee * 100, currency)}
                  {supportContribution > 0 && ` + ${formatPaymentAmount(supportContribution * 100, currency)} support`}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-heading font-bold text-[#15383c]">
                {formatPaymentAmount(total * 100, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Pay at Door Info */}
        {isDoorPayment && (
          <div className="pb-6 border-b border-gray-200">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Banknote className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-heading font-bold text-amber-800 mb-1">
                    {language === 'fr' ? 'Paiement sur place' : 'Pay at the door'}
                  </h3>
                  <p className="text-sm text-amber-700">
                    {language === 'fr' 
                      ? `Réservez maintenant, payez ${formatPaymentAmount((pricePerAttendee * attendeeCount) * 100, currency)} en espèces à l'arrivée. Votre billet confirme votre place.`
                      : `Reserve now, pay ${formatPaymentAmount((pricePerAttendee * attendeeCount) * 100, currency)} cash at the door. Your ticket confirms your spot.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phone Input (optional) - shown for door payments */}
        {isDoorPayment && (
          <div className="pb-6 border-b border-gray-200">
            <label className="block text-base font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-2">
                <Phone size={16} className="text-gray-400" />
                {language === 'fr' ? 'Téléphone (optionnel)' : 'Phone (optional)'}
              </span>
            </label>
            <input
              type="tel"
              value={attendeePhone}
              onChange={(e) => setAttendeePhone(e.target.value)}
              placeholder={language === 'fr' ? 'Ex: 514-555-1234' : 'e.g. 514-555-1234'}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#15383c]/20 focus:border-[#15383c] transition-colors"
            />
            <p className="text-xs text-gray-500 mt-2">
              {language === 'fr' 
                ? "L'hôte pourra vous contacter si nécessaire."
                : 'The host may contact you if needed.'}
            </p>
          </div>
        )}

        {/* Payment Method - Only show for online paid events */}
        {!isFree && !isDoorPayment && (
          <div className="pb-6 border-b border-gray-200">
            <h3 className="text-lg font-heading font-bold text-[#15383c] mb-4">Payment Method</h3>
            <div className="space-y-3">
              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'google-pay' 
                  ? 'border-[#e35e25] bg-[#e35e25]/5' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <div className="relative">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="google-pay"
                    checked={paymentMethod === 'google-pay'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-5 h-5 text-[#e35e25] focus:ring-[#e35e25] cursor-pointer"
                  />
                </div>
                <span className="text-base font-medium text-gray-700">Google Pay</span>
              </label>
              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'stripe' 
                  ? 'border-[#e35e25] bg-[#e35e25]/5' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <div className="relative">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="stripe"
                    checked={paymentMethod === 'stripe'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-5 h-5 text-[#e35e25] focus:ring-[#e35e25] cursor-pointer"
                  />
                </div>
                <span className="text-base font-medium text-gray-700 flex items-center gap-2">
                  <CreditCard size={18} className="text-gray-500" />
                  Stripe
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={processing || (!isFree && !isDoorPayment && !paymentMethod)}
          className="w-full py-4 bg-[#15383c] text-white rounded-full font-bold text-base hover:bg-[#1f4d52] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {processing 
            ? (language === 'fr' ? 'Traitement...' : 'Processing...') 
            : isFree 
              ? (language === 'fr' ? 'Confirmer & Réserver' : 'Confirm & Reserve')
              : isDoorPayment
                ? (language === 'fr' ? 'Réserver (paiement sur place)' : 'Reserve (Pay at door)')
                : (language === 'fr' ? 'Confirmer & Payer' : 'Confirm & Pay')}
        </button>
      </div>
    </div>
  );
};

