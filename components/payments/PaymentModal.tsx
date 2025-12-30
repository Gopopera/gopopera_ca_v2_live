/**
 * Payment Modal Component
 * Handles Stripe payment for event reservations
 * Modern liquid glass UI design
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2, Shield, Lock } from 'lucide-react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import type { StripeCardElement } from '@stripe/stripe-js';
import { formatPaymentAmount, calculateTotalAmount, calculatePlatformFee } from '../../utils/stripeHelpers';

// Initialize Stripe (you'll need to set VITE_STRIPE_PUBLISHABLE_KEY in your .env)
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
console.log('[PAYMENT_MODAL] Stripe publishable key configured:', stripeKey ? `${stripeKey.substring(0, 12)}...` : 'NOT SET');
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

// Stripe text logo component (using official Stripe purple color)
const StripeText = ({ className = "" }: { className?: string }) => (
  <span className={`font-bold text-[#635BFF] ${className}`} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
    stripe
  </span>
);

// Powered by Stripe badge
const PoweredByStripe = () => (
  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
    <Lock className="w-3 h-3" />
    <span>Secured by</span>
    <StripeText className="text-sm" />
  </div>
);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentIntentId: string, subscriptionId?: string) => void;
  eventTitle: string;
  feeAmount: number; // Fee in cents
  currency?: string;
  attendeeCount?: number;
  isRecurring?: boolean;
  eventId?: string;
  hostId?: string;
  userId?: string;
  userEmail?: string;
  subscriptionInterval?: 'week' | 'month';
}

interface PaymentFormProps {
  onSuccess: (paymentIntentId: string, subscriptionId?: string) => void;
  onError: (error: string) => void;
  feeAmount: number;
  currency: string;
  attendeeCount: number;
  isRecurring: boolean;
  eventTitle: string;
  eventId?: string;
  hostId?: string;
  userId?: string;
  userEmail?: string;
  subscriptionInterval?: 'week' | 'month';
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  onSuccess,
  onError,
  feeAmount,
  currency,
  attendeeCount,
  isRecurring,
  eventTitle,
  eventId,
  hostId,
  userId,
  userEmail,
  subscriptionInterval,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = calculateTotalAmount(feeAmount, attendeeCount);
  const platformFee = calculatePlatformFee(totalAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[PAYMENT_FORM] Submit clicked', { 
      hasStripe: !!stripe, 
      hasElements: !!elements,
      totalAmount,
      isRecurring,
      eventId,
      hostId,
      userId,
    });

    if (!stripe || !elements) {
      console.error('[PAYMENT_FORM] Stripe or elements not loaded - cannot process payment');
      setError('Payment system not loaded. Please refresh and try again.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // For recurring events, create subscription; otherwise create payment intent
      const endpoint = isRecurring ? '/api/stripe/create-subscription' : '/api/stripe/create-payment-intent';
      console.log('[PAYMENT_FORM] Calling endpoint:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalAmount,
          currency: currency || 'cad',
          isRecurring,
          eventId,
          hostId,
          userId,
          interval: isRecurring ? (subscriptionInterval || 'week') : undefined,
          customerEmail: userEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[PAYMENT_FORM] API error:', errorData);
        throw new Error(errorData.error || 'Failed to create payment');
      }

      const data = await response.json();
      console.log('[PAYMENT_FORM] API response:', { 
        hasClientSecret: !!data.clientSecret, 
        paymentIntentId: data.paymentIntentId,
        subscriptionId: data.subscriptionId 
      });
      const { clientSecret, paymentIntentId, subscriptionId } = data;

      // Confirm payment with Stripe
      // Type assertion needed due to Stripe types mismatch
      const cardElement = elements.getElement(CardElement) as unknown as StripeCardElement | null;
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      if (isRecurring && subscriptionId) {
        // For subscriptions, confirm the payment intent from the invoice
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: {
              card: cardElement,
            },
          }
        );

        if (confirmError) {
          throw new Error(confirmError.message);
        }

        if (paymentIntent?.status === 'succeeded') {
          onSuccess(paymentIntentId, subscriptionId);
        } else {
          throw new Error('Payment was not successful');
        }
      } else {
        // One-time payment
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: {
              card: cardElement,
            },
          }
        );

        if (confirmError) {
          throw new Error(confirmError.message);
        }

        if (paymentIntent?.status === 'succeeded') {
          onSuccess(paymentIntentId);
        } else {
          throw new Error('Payment was not successful');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      onError(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#15383c',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSmoothing: 'antialiased',
        '::placeholder': {
          color: '#9ca3af',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Price Breakdown - Liquid Glass Card */}
      <div className="relative overflow-hidden rounded-2xl">
        {/* Glass background */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/60 to-white/40 backdrop-blur-xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#15383c]/5 to-[#e35e25]/5" />
        <div className="absolute inset-0 border border-white/50 rounded-2xl" />
        
        <div className="relative p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Event Fee ({attendeeCount} {attendeeCount === 1 ? 'attendee' : 'attendees'})</span>
            <span className="font-semibold text-[#15383c]">{formatPaymentAmount(totalAmount, currency)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Platform Fee (10%)</span>
            <span className="text-gray-400">{formatPaymentAmount(platformFee, currency)}</span>
          </div>
          <div className="border-t border-white/60 pt-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#15383c]">Total</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-[#15383c] to-[#1f4d52] bg-clip-text text-transparent">
                {formatPaymentAmount(totalAmount, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {isRecurring && (
        <div className="relative overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 backdrop-blur-sm" />
          <div className="absolute inset-0 border border-blue-200/50 rounded-xl" />
          <div className="relative p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Recurring Subscription
            </p>
            <p className="text-blue-600/80">You'll be automatically charged for future sessions. Cancel anytime.</p>
          </div>
        </div>
      )}

      {/* Card Input - Liquid Glass Style */}
      <div className="relative overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm" />
        <div className="absolute inset-0 border border-gray-200/80 rounded-xl" />
        <div className="absolute inset-0 shadow-inner rounded-xl" />
        
        <div className="relative p-4">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Card Information
          </label>
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {error && (
        <div className="relative overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-red-50/90 backdrop-blur-sm" />
          <div className="absolute inset-0 border border-red-200/50 rounded-xl" />
          <div className="relative p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Pay Button - Gradient with glow effect */}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="relative w-full py-4 rounded-2xl font-bold text-white overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
      >
        {/* Button background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#e35e25] via-[#f06a30] to-[#e35e25] bg-[length:200%_100%] group-hover:animate-shimmer" />
        {/* Glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        {/* Shadow */}
        <div className="absolute -inset-1 bg-[#e35e25]/30 blur-lg rounded-2xl -z-10 group-hover:bg-[#e35e25]/40 transition-colors" />
        
        <span className="relative flex items-center justify-center gap-2">
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Pay {formatPaymentAmount(totalAmount, currency)}
            </>
          )}
        </span>
      </button>

      {/* Security & Trust Indicators */}
      <div className="space-y-3 pt-2">
        <PoweredByStripe />
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            256-bit encryption
          </span>
          <span>•</span>
          <span>PCI compliant</span>
        </div>
      </div>
    </form>
  );
};

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  eventTitle,
  feeAmount,
  currency = 'cad',
  attendeeCount = 1,
  isRecurring = false,
  eventId,
  hostId,
  userId,
  userEmail,
  subscriptionInterval,
}) => {
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      console.log('[PAYMENT_MODAL] Modal opened', {
        eventTitle,
        feeAmount,
        currency,
        eventId,
        hostId,
        userId,
        isRecurring,
        stripeConfigured: !!stripePromise,
      });
    } else {
      setPaymentSuccess(false);
    }
  }, [isOpen, eventTitle, feeAmount, currency, eventId, hostId, userId, isRecurring]);

  if (!isOpen) return null;

  // Check if Stripe is configured
  if (!stripePromise) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="relative overflow-hidden rounded-3xl max-w-md w-full">
          {/* Glass background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/90 to-white/85 backdrop-blur-2xl" />
          <div className="absolute inset-0 border border-white/60 rounded-3xl" />
          
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#15383c]">Payment Error</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900 mb-1">Payment system not configured</p>
                <p className="text-sm text-red-700">Please contact support or try again later.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-4 py-3 bg-gray-100/80 backdrop-blur-sm text-gray-700 font-semibold rounded-xl hover:bg-gray-200/80 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSuccess = (paymentIntentId: string, subscriptionId?: string) => {
    setPaymentSuccess(true);
    setTimeout(() => {
      onSuccess(paymentIntentId, subscriptionId);
      onClose();
    }, 2000);
  };

  const handleError = (error: string) => {
    console.error('Payment error:', error);
  };

  const elementsOptions: StripeElementsOptions = {
    mode: 'payment',
    amount: calculateTotalAmount(feeAmount, attendeeCount),
    currency: currency.toLowerCase(),
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
      {/* Modal Container with Liquid Glass Effect */}
      <div className="relative overflow-hidden rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
        {/* Layered glass background */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/90 to-white/85" />
        <div className="absolute inset-0 backdrop-blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#15383c]/3 via-transparent to-[#e35e25]/3" />
        <div className="absolute inset-0 border border-white/60 rounded-3xl" />
        {/* Subtle inner glow */}
        <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]" />
        
        {/* Header */}
        <div className="relative sticky top-0 z-10 px-6 py-5 border-b border-white/40">
          <div className="absolute inset-0 bg-white/60 backdrop-blur-xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#15383c]">Complete Payment</h2>
              <p className="text-xs text-gray-500 mt-0.5">Secure checkout</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-black/5 hover:bg-black/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative p-6">
          {paymentSuccess ? (
            <div className="text-center py-12">
              <div className="relative inline-flex">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-[#15383c] mt-6 mb-2">Payment Successful!</h3>
              <p className="text-gray-600">Your reservation is confirmed.</p>
              <div className="mt-6">
                <PoweredByStripe />
              </div>
            </div>
          ) : (
            <>
              {/* Event Info */}
              <div className="mb-6">
                <h3 className="font-semibold text-[#15383c] text-lg">{eventTitle}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <StripeText className="text-sm" />
                  <span className="text-xs text-gray-500">Secure payment</span>
                </div>
              </div>

              <Elements stripe={stripePromise} options={elementsOptions}>
                <PaymentForm
                  onSuccess={handleSuccess}
                  onError={handleError}
                  feeAmount={feeAmount}
                  currency={currency}
                  attendeeCount={attendeeCount}
                  isRecurring={isRecurring}
                  eventTitle={eventTitle}
                  eventId={eventId}
                  hostId={hostId}
                  userId={userId}
                  userEmail={userEmail}
                  subscriptionInterval={subscriptionInterval}
                />
              </Elements>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
