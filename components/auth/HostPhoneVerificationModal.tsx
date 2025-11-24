/**
 * Host Phone Verification Modal
 * 
 * This modal handles one-time phone verification for users who want to host events.
 * It uses Firebase Phone Auth (linkWithPhoneNumber) to verify the phone number,
 * NOT multi-factor authentication. This is a simple verification gate.
 * 
 * After successful verification:
 * - Updates user profile: phoneVerifiedForHosting = true, hostPhoneNumber = phoneNumber
 * - User can then create events without being asked again
 * 
 * This verification is idempotent - if already verified, the modal should not be shown.
 */

import React, { useState, useEffect } from 'react';
import { Phone, X, CheckCircle2 } from 'lucide-react';
import { getAuthInstance } from '../../src/lib/firebaseAuth';
import { linkWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth';
import { getDbSafe } from '../../src/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useUserStore } from '../../stores/userStore';
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
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setPhoneNumber('');
      setVerificationCode('');
      setStep('phone');
      setError(null);
      setSuccess(false);
      setConfirmationResult(null);
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch {
          // ignore cleanup errors
        }
        setRecaptchaVerifier(null);
      }
    }
  }, [isOpen, recaptchaVerifier]);

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    if (!user?.uid) {
      setError('You must be signed in to verify your phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const auth = getAuthInstance();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;
      
      // Create reCAPTCHA verifier
      const containerId = 'host-phone-recaptcha-container';
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.display = 'none';
        document.body.appendChild(container);
      }

      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          console.log('[HOST_VERIFY] reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('[HOST_VERIFY] reCAPTCHA expired');
          if (recaptchaVerifier) {
            try {
              recaptchaVerifier.clear();
            } catch {
              // ignore
            }
          }
          setRecaptchaVerifier(null);
        },
      });
      setRecaptchaVerifier(verifier);

      // Send SMS using linkWithPhoneNumber (not MFA)
      const confirmation = await linkWithPhoneNumber(currentUser, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setStep('code');
      console.log('[HOST_VERIFY] Code sent');
    } catch (error: any) {
      console.error('[HOST_VERIFY] Error sending verification code:', error);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Failed to send verification code. Please try again.';
      if (error?.code === 'auth/operation-not-allowed') {
        errorMessage = 'Phone verification is disabled. Please contact support.';
      } else if (error?.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number. Please enter a valid phone number.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch {
          // ignore
        }
        setRecaptchaVerifier(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || !confirmationResult || !user?.uid) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Confirm the phone number
      await confirmationResult.confirm(verificationCode.trim());
      console.log('[HOST_VERIFY] Phone verified successfully');

      // Update user profile in Firestore
      const db = getDbSafe();
      if (db && user) {
        const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;
        
        // Update Firestore user document
        await setDoc(
          doc(db, 'users', user.uid),
          {
            phoneVerifiedForHosting: true,
            hostPhoneNumber: formattedPhone,
          },
          { merge: true }
        );

        // Update user profile via db helper
        await createOrUpdateUserProfile(user.uid, {
          phoneVerifiedForHosting: true,
          hostPhoneNumber: formattedPhone,
        });

        // Update user store
        useUserStore.getState().updateUser(user.uid, {
          phone_verified: true,
          phone_number: formattedPhone,
        });

        // Refresh user profile to get updated data
        await refreshUserProfile();
      }

      setSuccess(true);
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch {
          // ignore
        }
        setRecaptchaVerifier(null);
      }
      setConfirmationResult(null);
      
      // Show success for 2 seconds, then close and call onSuccess
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('[HOST_VERIFY] Error verifying code:', error);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'We couldn't verify your code. Please try again or request a new code.';
      if (error?.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (error?.code === 'auth/code-expired') {
        errorMessage = 'Verification code has expired. Please request a new code.';
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

        {/* reCAPTCHA container (invisible) */}
        <div id="host-phone-recaptcha-container"></div>

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

