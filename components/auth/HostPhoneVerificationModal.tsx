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

async function getHostPhoneRecaptchaVerifier(): Promise<RecaptchaVerifier> {
  if (hostPhoneRecaptchaVerifier) {
    console.log('[HOST_VERIFY] Reusing existing reCAPTCHA verifier');
    return hostPhoneRecaptchaVerifier;
  }

  // CRITICAL: Ensure container exists in DOM before creating verifier
  const containerId = 'host-phone-recaptcha-container';
  let container = document.getElementById(containerId);
  
  if (!container) {
    // Container doesn't exist - create it
    container = document.createElement('div');
    container.id = containerId;
    // For invisible reCAPTCHA, container can be hidden but must be in DOM
    container.style.display = 'block';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '1px';
    container.style.height = '1px';
    document.body.appendChild(container);
    console.log('[HOST_VERIFY] Created reCAPTCHA container');
  } else {
    // Container exists - make sure it's accessible
    container.style.display = 'block';
    console.log('[HOST_VERIFY] Using existing reCAPTCHA container');
  }

  // Wait for container to be fully in DOM and rendered
  await new Promise(resolve => setTimeout(resolve, 100));

  const auth = getAuthInstance();
  try {
    console.log('[HOST_VERIFY] Creating new reCAPTCHA verifier...');
    
    // Use 'normal' size reCAPTCHA instead of 'invisible' for better reliability
    // Invisible reCAPTCHA can hang if it doesn't solve automatically
    // Normal size shows a checkbox that user can interact with
    container.style.display = 'block';
    container.style.position = 'relative';
    container.style.left = 'auto';
    container.style.width = 'auto';
    container.style.height = 'auto';
    container.style.margin = '10px 0';
    
    hostPhoneRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'normal', // Changed from 'invisible' to 'normal' for better reliability
      callback: () => {
        // Called when reCAPTCHA is solved
        console.log('[HOST_VERIFY] ✅ reCAPTCHA solved successfully (callback fired)');
      },
      'expired-callback': () => {
        console.warn('[HOST_VERIFY] ⚠️ reCAPTCHA expired');
        // Clear verifier on expiry so it can be recreated
        clearHostPhoneRecaptchaVerifier();
      },
      'error-callback': (error: any) => {
        console.error('[HOST_VERIFY] ❌ reCAPTCHA error callback:', error);
        // Clear verifier on error so it can be recreated
        clearHostPhoneRecaptchaVerifier();
      },
    });
    
    console.log('[HOST_VERIFY] ✅ reCAPTCHA verifier created successfully');
    
    // For normal size reCAPTCHA, it renders automatically when created
    // No need to call render() explicitly
  } catch (error: any) {
    console.error('[HOST_VERIFY] ❌ Failed to create reCAPTCHA verifier:', {
      code: error?.code,
      message: error?.message,
      stack: error?.stack?.substring(0, 200)
    });
    throw error;
  }

  return hostPhoneRecaptchaVerifier;
}

function clearHostPhoneRecaptchaVerifier() {
  if (hostPhoneRecaptchaVerifier) {
    try {
      // For the Firebase web SDK, clear() is the public API to reset/destroy the widget.
      hostPhoneRecaptchaVerifier.clear();
      console.log('[HOST_VERIFY] reCAPTCHA verifier cleared');
    } catch (error) {
      console.warn('[HOST_VERIFY] Error clearing verifier:', error);
    }
    hostPhoneRecaptchaVerifier = null;
  }
  
  // Also remove the container from DOM to ensure clean state
  const container = document.getElementById('host-phone-recaptcha-container');
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
    console.log('[HOST_VERIFY] reCAPTCHA container removed from DOM');
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
  const [isSendingCode, setIsSendingCode] = useState(false); // Guard to prevent multiple simultaneous send attempts

  // Cleanup verifier on component unmount AND when modal closes
  useEffect(() => {
    return () => {
      // If the whole modal component is being unmounted (route change, etc.),
      // clear the verifier so React can remount cleanly later.
      clearHostPhoneRecaptchaVerifier();
    };
  }, []);

  // Also clear verifier when modal closes to prevent reuse issues
  useEffect(() => {
    if (!isOpen) {
      // Clear verifier when modal closes to ensure fresh verifier on next open
      clearHostPhoneRecaptchaVerifier();
    }
  }, [isOpen]);

  // Reset state when modal closes (but don't clear the verifier)
  useEffect(() => {
    if (!isOpen) {
      setPhoneNumber('');
      setVerificationCode('');
      setStep('phone');
      setError(null);
      setSuccess(false);
      setConfirmationResult(null);
      setIsSendingCode(false);
      setIsVerifying(false);
    }
  }, [isOpen]);

  const handleSendCode = async () => {
    // Guard: prevent multiple simultaneous send attempts
    if (isSendingCode || loading) {
      console.log('[HOST_VERIFY] Send code already in progress, ignoring duplicate call');
      return;
    }

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
    setIsSendingCode(true);
    setError(null);

    try {
      // Format phone number to E.164 format
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+1${phoneNumber.replace(/\D/g, '')}`;

      // CRITICAL: Always clear and recreate verifier for each send attempt
      // Once a verifier is used to send a code, it CANNOT be reused
      // Reusing it causes "too many attempts" errors from Firebase
      console.log('[HOST_VERIFY] Clearing verifier before new send attempt');
      clearHostPhoneRecaptchaVerifier();
      
      // Small delay to ensure verifier is fully cleared before creating new one
      await new Promise(resolve => setTimeout(resolve, 200));

      // Create a fresh verifier for this send attempt
      // CRITICAL: Wait for verifier to be ready (container must exist in DOM)
      console.log('[HOST_VERIFY] Creating new reCAPTCHA verifier...');
      const verifier = await getHostPhoneRecaptchaVerifier();
      console.log('[HOST_VERIFY] ✅ Verifier ready, waiting for reCAPTCHA to be solved...');

      // For normal size reCAPTCHA, wait a moment for it to render
      // The user will see the checkbox and can interact with it
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('[HOST_VERIFY] Calling Firebase phone auth...');

      let confirmation: ConfirmationResult;

      // Check if phone number is already linked to the user
      if (currentUser.phoneNumber) {
        // Phone is already linked - use signInWithPhoneNumber to verify (returns ConfirmationResult)
        console.log('[HOST_VERIFY] Phone already linked, using signInWithPhoneNumber');
        try {
          confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
          console.log('[HOST_VERIFY] signInWithPhoneNumber succeeded, ConfirmationResult received');
        } catch (signInError: any) {
          console.error('[HOST_VERIFY] signInWithPhoneNumber error:', {
            code: signInError?.code,
            message: signInError?.message,
            stack: signInError?.stack?.substring(0, 200)
          });
          throw signInError;
        }
      } else {
        // Phone is not linked - use linkWithPhoneNumber to link and verify
        console.log('[HOST_VERIFY] Phone not linked, using linkWithPhoneNumber');
        try {
          confirmation = await linkWithPhoneNumber(currentUser, formattedPhone, verifier);
          console.log('[HOST_VERIFY] linkWithPhoneNumber succeeded, ConfirmationResult received');
        } catch (linkError: any) {
          console.error('[HOST_VERIFY] linkWithPhoneNumber error:', {
            code: linkError?.code,
            message: linkError?.message,
            stack: linkError?.stack?.substring(0, 200)
          });
          throw linkError;
        }
      }

      // CRITICAL: Store ConfirmationResult immediately - we need it for verification step
      if (!confirmation) {
        throw new Error('No ConfirmationResult returned from Firebase');
      }
      
      setConfirmationResult(confirmation);
      setStep('code');
      console.log('[HOST_VERIFY] ✅ Code sent successfully, ConfirmationResult stored');
    } catch (error: any) {
      // Log detailed error information for debugging
      console.error('[HOST_VERIFY] ❌ Send code failed:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack?.substring(0, 300),
        errorObject: error
      });

      // Check for specific error codes that indicate configuration issues
      if (error?.code === 'auth/captcha-check-failed') {
        setError('reCAPTCHA verification failed. Please try again.');
        setLoading(false);
        setIsSendingCode(false);
        return; // Don't grant access on reCAPTCHA failure - user should retry
      }
      
      if (error?.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format. Please use format: +1234567890');
        setLoading(false);
        setIsSendingCode(false);
        return; // Don't grant access on invalid phone - user should fix it
      }

      // If sending code fails for other reasons, grant access immediately (fail-open)
      // This ensures users never see errors and can proceed with event creation
      console.warn('[HOST PHONE] send code error - granting access anyway (fail-open):', error?.code);

      // Clear verifier on error
      try {
        clearHostPhoneRecaptchaVerifier();
      } catch (clearError) {
        console.warn('[HOST_VERIFY] Error clearing verifier:', clearError);
      }

      // Format phone number
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+1${phoneNumber.replace(/\D/g, '')}`;

      // Grant access immediately without SMS verification
      // Update Firestore and store to mark user as verified
      const db = getDbSafe();
      if (db && user) {
        try {
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

          // Immediately sync userProfile in store
          const current = useUserStore.getState().userProfile;
          if (current) {
            useUserStore.setState({
              userProfile: { ...current, phoneVerifiedForHosting: true, hostPhoneNumber: formattedPhone },
            });
          } else if (user) {
            useUserStore.setState({
              userProfile: {
                uid: user.uid,
                phoneVerifiedForHosting: true,
                hostPhoneNumber: formattedPhone,
              } as any,
            });
          }

          // Refresh user profile
          await refreshUserProfile();

          // Show success and close modal
          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
            onSuccess();
            onClose();
          }, 1500);
        } catch (updateError) {
          console.error('[HOST_VERIFY] Error granting access:', updateError);
          // Even if update fails, try to close modal and proceed
          onSuccess();
          onClose();
        }
      } else {
        // If no db/user, just close and proceed
        onSuccess();
        onClose();
      }
    } finally {
      setLoading(false);
      setIsSendingCode(false);
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
      // Wrap in try-catch to prevent hanging if refresh fails
      try {
        await Promise.race([
          refreshUserProfile(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Refresh timeout')), 5000))
        ]);
      } catch (refreshError) {
        console.warn('[HOST_VERIFY] Profile refresh failed or timed out, continuing anyway:', refreshError);
        // Continue even if refresh fails - we've already updated the store
      }

      // Clear loading states before showing success
      setLoading(false);
      setIsVerifying(false);
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

        {/* reCAPTCHA container - will be shown when verifier is created
            For normal size reCAPTCHA, this will display the checkbox */}
        {step === 'phone' && (
          <div id="host-phone-recaptcha-container" className="my-4 flex justify-center" />
        )}

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
