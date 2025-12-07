/**
 * Host Phone Verification Modal
 * 
 * This modal handles one-time phone verification for users who want to host events.
 * Uses Twilio SMS via our serverless function (no Firebase Phone Auth needed).
 * 
 * After successful verification:
 * - Updates user profile: phoneVerifiedForHosting = true, hostPhoneNumber = phoneNumber
 * - User can then create events without being asked again
 * 
 * This verification is idempotent - if already verified, the modal should not be shown.
 */

import React, { useState, useEffect } from 'react';
import { Phone, X, CheckCircle2 } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { sendVerificationCode, verifyPhoneCode, formatPhoneNumber, validatePhoneNumber } from '../../utils/phoneVerification';
import { createOrUpdateUserProfile } from '../../firebase/db';

interface HostPhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  required?: boolean; // If true, user cannot bypass
}

export const HostPhoneVerificationModal: React.FC<HostPhoneVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  required = true,
}) => {
  const user = useUserStore((state) => state.user);
  const refreshUserProfile = useUserStore((state) => state.refreshUserProfile);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPhoneNumber('');
      setVerificationCode('');
      setStep('phone');
      setError(null);
      setSuccess(false);
      setIsSendingCode(false);
      setIsVerifying(false);
    }
  }, [isOpen]);

  const handleSendCode = async () => {
    if (isSendingCode || loading) {
      return;
    }

    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    if (!validatePhoneNumber(formatPhoneNumber(phoneNumber))) {
      setError('Please enter a valid 10-digit phone number (US or Canada)');
      return;
    }

    if (!user?.uid) {
      setError('You must be logged in to verify your phone.');
      return;
    }

    setLoading(true);
    setIsSendingCode(true);
    setError(null);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const result = await sendVerificationCode(user.uid, formattedPhone);

      if (!result.success) {
        setError(result.error || 'Failed to send verification code. Please try again.');
        setLoading(false);
        setIsSendingCode(false);
        return;
      }

      // Code sent successfully - move to code entry step
      setStep('code');
      setError(null);
    } catch (error: any) {
      console.error('[HOST_VERIFY] Error sending code:', error);
      setError(error.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (isVerifying || loading) {
      return;
    }

    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    if (!user?.uid) {
      setError('You must be logged in to verify your phone.');
      return;
    }

    setLoading(true);
    setIsVerifying(true);
    setError(null);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const result = await verifyPhoneCode(user.uid, formattedPhone, verificationCode);

      if (!result.success) {
        setError(result.error || 'Invalid verification code. Please try again.');
        setLoading(false);
        setIsVerifying(false);
        return;
      }

      // Code verified successfully - update user profile
      await createOrUpdateUserProfile(user.uid, {
        phoneVerifiedForHosting: true,
        hostPhoneNumber: formattedPhone,
      });

      // Update user store
      useUserStore.getState().updateUser(user.uid, {
        phone_verified: true,
        phone_number: formattedPhone,
      });

      // Refresh user profile to get latest data
      await refreshUserProfile();

      // Show success and close modal
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('[HOST_VERIFY] Error verifying code:', error);
      setError(error.message || 'Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
      setIsVerifying(false);
    }
  };

  const handleBypass = () => {
    if (required) return; // Cannot bypass if required
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={!required ? handleBypass : undefined}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-heading font-bold text-[#15383c]">
            {step === 'phone' ? 'Verify Phone to Host Events' : 'Enter Verification Code'}
          </h2>
          {!required && (
            <button
              onClick={handleBypass}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {success ? (
          <div className="text-center py-8">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Phone verified successfully!</p>
            <p className="text-gray-500 text-sm mt-2">You can now create events.</p>
          </div>
        ) : step === 'phone' ? (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#eef4f5] rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone size={32} className="text-[#e35e25]" />
              </div>
              <p className="text-gray-600 text-sm">
                Verify your phone number to host events. This helps ensure safety and trust in our community.
                You'll only need to do this once.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="(123) 456-7890 or 123-456-7890"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15383c] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a US or Canada phone number. Country code (+1) will be added automatically.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleSendCode}
                disabled={!phoneNumber.trim() || loading || isSendingCode}
                className="w-full px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || isSendingCode ? 'Sending...' : 'Send Verification Code'}
              </button>
              {!required && (
                <button
                  onClick={handleBypass}
                  className="w-full px-6 py-3 bg-gray-100 text-[#15383c] rounded-full font-medium hover:bg-gray-200 transition-colors"
                >
                  Skip for Now
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#eef4f5] rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone size={32} className="text-[#e35e25]" />
              </div>
              <p className="text-gray-600 text-sm">
                Enter the 6-digit code sent to {phoneNumber}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15383c] focus:border-transparent text-center text-2xl tracking-widest"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6 || loading || isVerifying}
                className="w-full px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || isVerifying ? 'Verifying...' : 'Verify Code'}
              </button>
              <button
                onClick={() => {
                  setStep('phone');
                  setVerificationCode('');
                  setError(null);
                }}
                className="w-full px-6 py-3 bg-gray-100 text-[#15383c] rounded-full font-medium hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
