/**
 * Payment Modal Component
 * Handles Stripe payment for event reservations
 */

import React, { useState, useEffect } from 'react';
import { X, CreditCard, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { formatPaymentAmount, calculateTotalAmount, calculatePlatformFee } from '../../utils/stripeHelpers';

// Initialize Stripe (you'll need to set VITE_STRIPE_PUBLISHABLE_KEY in your .env)
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
console.log('[PAYMENT_MODAL] Stripe publishable key configured:', stripeKey ? `${stripeKey.substring(0, 12)}...` : 'NOT SET');
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

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
  const amountAfterFee = totalAmount - platformFee;

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
      const cardElement = elements.getElement(CardElement);
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
        fontFamily: 'system-ui, sans-serif',
        '::placeholder': {
          color: '#a0a0a0',
        },
      },
      invalid: {
        color: '#e35e25',
        iconColor: '#e35e25',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Event Fee ({attendeeCount} {attendeeCount === 1 ? 'attendee' : 'attendees'})</span>
          <span className="font-semibold">{formatPaymentAmount(totalAmount, currency)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Platform Fee (10%)</span>
          <span>{formatPaymentAmount(platformFee, currency)}</span>
        </div>
        <div className="border-t border-gray-200 pt-2 mt-2">
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-[#15383c]">{formatPaymentAmount(totalAmount, currency)}</span>
          </div>
        </div>
      </div>

      {isRecurring && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <p className="font-semibold mb-1">Recurring Subscription</p>
          <p>You'll be automatically charged for future sessions. You can cancel anytime in the group conversation settings.</p>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <label className="block text-sm font-semibold text-[#15383c] mb-3">
          Card Information
        </label>
        <CardElement options={cardElementOptions} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-4 bg-[#e35e25] text-white font-bold rounded-full hover:bg-[#cf4d1d] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay {formatPaymentAmount(totalAmount, currency)}
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Your payment is secure and encrypted. We never store your card details.
      </p>
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-bold text-[#15383c]">Payment Error</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900 mb-1">Payment system not configured</p>
              <p className="text-sm text-red-800">
                The payment system is not available. Please contact support or try again later.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-full hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSuccess = (paymentIntentId: string, subscriptionId?: string) => {
    setPaymentSuccess(true);
    setTimeout(() => {
      onSuccess(paymentIntentId, subscriptionId);
      onClose();
    }, 1500);
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-heading font-bold text-[#15383c]">
            Complete Payment
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {paymentSuccess ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#15383c] mb-2">Payment Successful!</h3>
              <p className="text-gray-600">Your reservation is confirmed.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="font-semibold text-[#15383c] mb-1">{eventTitle}</h3>
                <p className="text-sm text-gray-600">Secure payment powered by Stripe</p>
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

