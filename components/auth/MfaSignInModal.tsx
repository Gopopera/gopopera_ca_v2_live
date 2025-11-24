import React, { useState, useEffect } from 'react';
import { Phone, X, CheckCircle2 } from 'lucide-react';
import {
  sendMfaSignInCode,
  finishMfaSignIn,
  resetRecaptchaVerifier,
  createRecaptchaVerifier,
} from '../../src/lib/firebaseAuth';
import type { MultiFactorResolver } from 'firebase/auth';

interface MfaSignInModalProps {
  isOpen: boolean;
  resolver: MultiFactorResolver | null;
  phoneNumber: string;
  onSuccess: (credential: any) => void;
  onCancel: () => void;
}

export const MfaSignInModal: React.FC<MfaSignInModalProps> = ({
  isOpen,
  resolver,
  phoneNumber,
  onSuccess,
  onCancel,
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'sending' | 'code'>('sending');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && resolver && step === 'sending') {
      handleSendCode();
    }
  }, [isOpen, resolver]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setVerificationCode('');
      setStep('sending');
      setError(null);
      setVerificationId(null);
      resetRecaptchaVerifier();
    }
  }, [isOpen]);

  const handleSendCode = async () => {
    if (!resolver) {
      setError('MFA resolver not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      resetRecaptchaVerifier();
      const recaptcha = createRecaptchaVerifier('mfa-sign-in-recaptcha');
      const { verificationId: vid } = await sendMfaSignInCode(resolver, recaptcha);
      setVerificationId(vid);
      setStep('code');
      console.log('[MFA] SMS code sent for sign-in');
    } catch (error: any) {
      console.error('[MFA] Error sending verification code:', error);
      const errorMessage = error?.message || 'Failed to send verification code. Please try again.';
      setError(errorMessage);
      resetRecaptchaVerifier();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || !verificationId || !resolver) {
      setError('Please enter the verification code');
      return;
    }

    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userCredential = await finishMfaSignIn(resolver, verificationId, verificationCode);
      console.log('[MFA] MFA sign-in successful');
      resetRecaptchaVerifier();
      onSuccess(userCredential);
    } catch (error: any) {
      console.error('[MFA] Error verifying code:', error);
      const errorMessage = error?.message || 'Invalid verification code. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !resolver) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-heading font-bold text-[#15383c]">
            {step === 'sending' ? 'Sending Verification Code' : 'Enter Verification Code'}
          </h2>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* reCAPTCHA container (invisible) */}
        <div id="mfa-sign-in-recaptcha"></div>

        {step === 'sending' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-[#eef4f5] rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone size={32} className="text-[#e35e25]" />
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Sending verification code to {phoneNumber || 'your phone'}...
            </p>
            {loading && (
              <div className="text-gray-500 text-sm">Please wait...</div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#eef4f5] rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone size={32} className="text-[#e35e25]" />
              </div>
              <p className="text-gray-600 text-sm">
                Enter the 6-digit code sent to {phoneNumber || 'your phone'}
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
                disabled={verificationCode.length !== 6 || loading}
                className="w-full px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button
                onClick={handleSendCode}
                disabled={loading}
                className="w-full px-6 py-3 bg-gray-100 text-[#15383c] rounded-full font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Resend Code
              </button>
              <button
                onClick={onCancel}
                className="w-full px-6 py-3 bg-gray-100 text-[#15383c] rounded-full font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

