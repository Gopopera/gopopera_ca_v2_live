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
import { linkWithPhoneNumber, signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth';
import { getDbSafe } from '../../src/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useUserStore } from '../../stores/userStore';
import { createOrUpdateUserProfile } from '../../firebase/db';

// Module-level singleton for host phone reCAPTCHA verifier
// This prevents "reCAPTCHA has already been rendered" errors by reusing the same instance
let hostPhoneRecaptchaVerifier: RecaptchaVerifier | null = null;

function getHostPhoneRecaptchaVerifier(): RecaptchaVerifier {
  if (hostPhoneRecaptchaVerifier) return hostPhoneRecaptchaVerifier;

  const auth = getAuthInstance();
  hostPhoneRecaptchaVerifier = new RecaptchaVerifier(auth, 'host-phone-recaptcha-container', {
    size: 'invisible',
    callback: () => {
      // Called when reCAPTCHA is solved automatically; we don't need to do anything here.
      console.log('[HOST_VERIFY] reCAPTCHA solved');
    },
  });

  return hostPhoneRecaptchaVerifier;
}

function clearHostPhoneRecaptchaVerifier() {
  if (hostPhoneRecaptchaVerifier) {
    try {
      // For the Firebase web SDK, clear() is the public API to reset/destroy the widget.
      hostPhoneRecaptchaVerifier.clear();
    } catch {
      // Ignore any errors from clear()
    }
    hostPhoneRecaptchaVerifier = null;
  }
}

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
  const [isVerifying, setIsVerifying] = useState(false); // Guard to prevent duplicate verification calls

  // Cleanup verifier only on component unmount (not on modal open/close)
  useEffect(() => {
    return () => {
      // If the whole modal component is being unmounted (route change, etc.),
      // clear the verifier so React can remount cleanly later.
      clearHostPhoneRecaptchaVerifier();
    };
  }, []);

  // Reset state when modal closes (but don't clear the verifier)
  useEffect(() => {
    if (!isOpen) {
      setPhoneNumber('');
      setVerificationCode('');
      setStep('phone');
      setError(null);
      setSuccess(false);
      setConfirmationResult(null);
    }
  }, [isOpen]);

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    const auth = getAuthInstance();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('You need to be signed in to verify your phone.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Format phone number to E.164 format
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+1${phoneNumber.replace(/\D/g, '')}`;

      // Get the singleton verifier (reuses existing instance if available)
      const verifier = getHostPhoneRecaptchaVerifier();

      let confirmation: ConfirmationResult;

      // Check if phone number is already linked to the user
      if (currentUser.phoneNumber) {
        // Phone is already linked - use signInWithPhoneNumber to verify (returns ConfirmationResult)
        console.log('[HOST_VERIFY] Using verifyPhoneNumber');
        confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      } else {
        // Phone is not linked - use linkWithPhoneNumber to link and verify
        console.log('[HOST_VERIFY] Using linkWithPhoneNumber');
        confirmation = await linkWithPhoneNumber(currentUser, formattedPhone, verifier);
      }

      setConfirmationResult(confirmation);
      setStep('code');
      console.log('[HOST_VERIFY] Code sent');
    } catch (error: any) {
      // Handle Firebase auth errors without crashing reCAPTCHA
      console.error('[HOST PHONE] send code error', error);

      let msg = "We couldn't send the verification code. Please check your number and try again.";

      if (error?.code === 'auth/operation-not-allowed') {
        msg = 'Phone verification is not enabled. Please contact support.';
      } else if (error?.code === 'auth/provider-already-linked') {
        // This shouldn't happen with our logic, but handle it gracefully
        msg = 'This phone number is already linked to your account.';
      } else if (error?.code === 'auth/invalid-phone-number') {
        msg = 'That phone number looks invalid. Please double-check and try again.';
      } else if (error?.code === 'auth/too-many-requests') {
        msg = 'Too many attempts. Please wait a bit before trying again.';
      } else if (error?.code === 'auth/quota-exceeded') {
        msg = 'SMS quota exceeded. Please try again later.';
      } else if (error?.message) {
        msg = error.message;
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    // Guard: prevent multiple simultaneous verification attempts
    if (isVerifying || loading) {
      console.log('[HOST_VERIFY] Verification already in progress, ignoring duplicate call');
      return;
    }

    if (!confirmationResult) {
      setError('Please request a verification code first.');
      return;
    }

    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setIsVerifying(true);
    setError(null);

    try {
      // Confirm the phone number (can only be called once per confirmationResult)
      const cred = await confirmationResult.confirm(verificationCode.trim());
      console.log('[HOST_VERIFY] Phone verified successfully');
      
      // Clear confirmationResult immediately after successful use to prevent reuse
      setConfirmationResult(null);

      // cred.user is the same logged-in user with phone linked.
      // After successful confirmation, update Firestore user document:
      // Format phone number first (needed for both Firestore and store updates)
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+1${phoneNumber.replace(/\D/g, '')}`;
      
      const db = getDbSafe();
      if (db && user) {
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
      }

      // Immediately sync userProfile in store so gating logic sees the change on next submit
      const current = useUserStore.getState().userProfile;
      if (current) {
        // Update existing profile
        useUserStore.setState({
          userProfile: { ...current, phoneVerifiedForHosting: true, hostPhoneNumber: formattedPhone },
        });
      } else if (user) {
        // Create minimal profile if it doesn't exist yet (refreshUserProfile will fill in details)
        useUserStore.setState({
          userProfile: {
            uid: user.uid,
            phoneVerifiedForHosting: true,
            hostPhoneNumber: formattedPhone,
          } as any, // Type assertion needed for partial profile
        });
      }

      // Refresh user profile to get updated data from Firestore (this will merge with our update)
      await refreshUserProfile();

      setSuccess(true);
      
      // Show success for 2 seconds, then close and call onSuccess
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('[HOST PHONE] verify code error', error);

      let errorMessage = "We couldn't verify your code. Please try again or request a new code.";

      if (error?.code === 'auth/operation-not-allowed') {
        errorMessage = 'Phone verification is not enabled. Please contact support.';
      } else if (error?.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (error?.code === 'auth/code-expired') {
        errorMessage = 'This code has expired. Please request a new one.';
        // Clear confirmationResult on code expiry - user needs to request new code
        setConfirmationResult(null);
      } else if (error?.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please wait a bit before trying again.';
        // Clear confirmationResult on rate limit - user needs to request new code
        setConfirmationResult(null);
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      // Ensure loading is cleared - return early to prevent stuck "Verifying..." state
      setLoading(false);
      setIsVerifying(false);
      return;
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

        {/* reCAPTCHA container (invisible) - keep this hidden, just a div for Firebase reCAPTCHA to render into */}
        <div id="host-phone-recaptcha-container" style={{ display: 'none' }} />

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
