import React, { useState, useRef, useEffect } from 'react';
import { Phone, X, CheckCircle2 } from 'lucide-react';
import { getDbSafe } from '../../src/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useUserStore } from '../../stores/userStore';
import { finalizeMfaEnrollment, getRecaptchaVerifier, startMfaEnrollment } from '../../src/services/phoneVerification';
import { createOrUpdateUserProfile } from '../../firebase/db';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  required?: boolean; // If true, user cannot bypass
}

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  required = false,
}) => {
  const user = useUserStore((state) => state.user);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const recaptchaVerifierRef = useRef<ReturnType<typeof getRecaptchaVerifier> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setPhoneNumber('');
      setVerificationCode('');
      setVerificationId(null);
      setStep('phone');
      setError(null);
      setSuccess(false);
      // Clean up reCAPTCHA
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
        recaptchaVerifierRef.current = null;
      }
    }
  }, [isOpen]);

  const initializeRecaptcha = () => {
    if (recaptchaVerifierRef.current) return;
    try {
      recaptchaVerifierRef.current = getRecaptchaVerifier('phone-recaptcha-container');
    } catch (error) {
      console.error('Error initializing reCAPTCHA:', error);
      setError('Failed to initialize verification. Please refresh the page.');
    }
  };

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;
      initializeRecaptcha();
      const vid = await startMfaEnrollment(formattedPhone);
      setVerificationId(vid);
      setStep('code');
    } catch (error: any) {
      console.error('[MFA] Error sending verification code:', error);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Failed to send verification code. Please try again.';
      if (error?.code === 'auth/operation-not-allowed') {
        errorMessage = 'Phone verification is disabled for this project. Enable Phone Auth in Firebase Console > Authentication > Sign-in Method.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      // Clean up on error
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || !verificationId || !user?.uid) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await finalizeMfaEnrollment(verificationId, verificationCode);
      console.log('[MFA] Code verified');

      // Update user profile
      const db = getDbSafe();
      if (db && user) {
        const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;
        await setDoc(doc(db, 'users', user.uid), {
          phone_verified: true,
          phone_number: formattedPhone,
        }, { merge: true });
        await createOrUpdateUserProfile(user.uid, {
          phone_verified: true,
          phone_number: formattedPhone,
        });

        // Update user store
        useUserStore.getState().updateUser(user.uid, {
          phone_verified: true,
          phone_number: formattedPhone,
        });
      }

      setSuccess(true);
      
      // Show success for 2 seconds, then close
      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('[MFA] Error verifying code:', error);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Invalid verification code. Please try again.';
      if (error?.code === 'auth/operation-not-allowed') {
        errorMessage = 'Phone verification is disabled for this project. Enable Phone Auth in Firebase Console > Authentication > Sign-in Method.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
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
            {step === 'phone' ? 'Phone Verification' : 'Enter Verification Code'}
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

        {/* reCAPTCHA container (invisible) */}
        <div id="phone-recaptcha-container"></div>

        {success ? (
          <div className="text-center py-8">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Phone verified successfully!</p>
          </div>
        ) : step === 'phone' ? (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#eef4f5] rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone size={32} className="text-[#e35e25]" />
              </div>
              <p className="text-gray-600 text-sm">
                {required 
                  ? 'Phone verification is required to host events. This helps ensure safety and trust in our community.'
                  : 'Verify your phone number to enable SMS notifications and host events.'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15383c] focus:border-transparent"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleSendCode}
                disabled={!phoneNumber.trim() || loading}
                className="w-full px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
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
