/**
 * Subscription Opt-Out Modal
 * Allows users to cancel their recurring event subscription
 */

import React, { useState } from 'react';
import { X, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

interface SubscriptionOptOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  eventTitle: string;
  nextChargeDate?: Date;
}

export const SubscriptionOptOutModal: React.FC<SubscriptionOptOutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  eventTitle,
  nextChargeDate,
}) => {
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setProcessing(true);
    setError(null);

    try {
      await onConfirm();
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-heading font-bold text-[#15383c]">
            Cancel Subscription
          </h2>
          <button
            onClick={onClose}
            disabled={processing}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-[#15383c] mb-2">Subscription Cancelled</h3>
              <p className="text-gray-600">You will not be charged for future sessions.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-yellow-900 mb-1">What happens when you cancel?</p>
                      <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                        <li>You'll keep access until the current period ends</li>
                        <li>No future charges will be made</li>
                        <li>You can re-subscribe anytime</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Event:</span> {eventTitle}
                  </p>
                  {nextChargeDate && (
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Next charge would be:</span>{' '}
                      {nextChargeDate.toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={processing}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={processing}
                  className="flex-1 py-3 px-4 bg-[#e35e25] text-white font-semibold rounded-full hover:bg-[#cf4d1d] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Subscription'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

