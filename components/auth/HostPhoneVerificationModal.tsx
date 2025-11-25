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

import React, { useState, useEffect, useRef } from 'react';
import { Phone, X, CheckCircle2 } from 'lucide-react';
import { getAuthInstance } from '../../src/lib/firebaseAuth';
import { linkWithPhoneNumber, signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth';
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
  const [isVerifying, setIsVerifying] = useState(false); // Guard to prevent duplicate verification calls
  const [isSendingCode, setIsSendingCode] = useState(false); // Guard to prevent multiple simultaneous send attempts
  const [recaptchaSolved, setRecaptchaSolved] = useState(false); // Track when reCAPTCHA is solved
  
  // Use useRef to hold the RecaptchaVerifier instance across re-renders
  // This ensures we always use the same instance that was initialized
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Initialize reCAPTCHA when modal opens and step is 'phone'
  useEffect(() => {
    if (!isOpen || step !== 'phone') {
      return;
    }

    // Initialize reCAPTCHA only once when modal opens
    if (recaptchaContainerRef.current && !recaptchaVerifierRef.current) {
      const auth = getAuthInstance();
      
      try {
        console.log('[HOST_VERIFY] Creating new reCAPTCHA verifier...');
        
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          size: 'normal',
          callback: (response: any) => {
            // reCAPTCHA solved - set state to indicate this
            console.log('[HOST_VERIFY] ✅✅✅ reCAPTCHA SOLVED! Callback fired!', {
              response,
              timestamp: new Date().toISOString()
            });
            // Use setTimeout to ensure state update happens
            setTimeout(() => {
              setRecaptchaSolved(true);
              setError(null); // Clear any previous error
              console.log('[HOST_VERIFY] recaptchaSolved state set to true');
            }, 0);
          },
          'expired-callback': () => {
            // reCAPTCHA expired - reset state
            console.warn('[HOST_VERIFY] ⚠️ reCAPTCHA expired');
            setRecaptchaSolved(false);
            // Re-render reCAPTCHA after expiration
            if (recaptchaVerifierRef.current) {
              recaptchaVerifierRef.current.render().then(() => {
                console.log('[HOST_VERIFY] reCAPTCHA re-rendered after expiration');
              }).catch((err) => {
                console.error('[HOST_VERIFY] Failed to re-render reCAPTCHA:', err);
              });
            }
          },
          'error-callback': (err: any) => {
            // Handle reCAPTCHA errors
            console.error('[HOST_VERIFY] ❌ reCAPTCHA error:', err);
            setError(`reCAPTCHA Error: ${err?.message || 'Unknown error'}`);
            setRecaptchaSolved(false);
          },
        });

      // Render the reCAPTCHA widget explicitly
      // CRITICAL: render() must be called for the widget to appear
      console.log('[HOST_VERIFY] Calling render() on reCAPTCHA verifier...');
      recaptchaVerifierRef.current.render().then((widgetId) => {
        console.log('[HOST_VERIFY] ✅✅✅ reCAPTCHA rendered successfully with widget ID:', widgetId);
        console.log('[HOST_VERIFY] Waiting for user to solve reCAPTCHA...');
      }).catch((err) => {
        console.error('[HOST_VERIFY] ❌ Failed to render reCAPTCHA:', {
          error: err,
          message: err?.message,
          stack: err?.stack?.substring(0, 200)
        });
        setError('Failed to load reCAPTCHA. Please refresh and try again.');
      });
      } catch (error: any) {
        console.error('[HOST_VERIFY] ❌ Failed to create reCAPTCHA verifier:', error);
        setError('Failed to initialize reCAPTCHA. Please refresh and try again.');
      }
    }

    // Cleanup: clear reCAPTCHA when modal closes or component unmounts
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          console.log('[HOST_VERIFY] reCAPTCHA verifier cleared');
        } catch (error) {
          console.warn('[HOST_VERIFY] Error clearing verifier:', error);
        }
        recaptchaVerifierRef.current = null;
      }
      setRecaptchaSolved(false);
    };
  }, [isOpen, step]);

  // Reset state when modal closes
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
      setRecaptchaSolved(false);
    }
  }, [isOpen]);

  const handleSendCode = async () => {
    // Guard: prevent multiple simultaneous send attempts
    if (isSendingCode || loading) {
      console.log('[HOST_VERIFY] Send code already in progress, ignoring duplicate call');
      return;
    }

    // CRITICAL: Only proceed if reCAPTCHA is solved
    console.log('[HOST_VERIFY] handleSendCode called', {
      recaptchaSolved,
      hasVerifier: !!recaptchaVerifierRef.current,
      phoneNumber: phoneNumber.trim()
    });
    
    if (!recaptchaSolved) {
      setError('Please solve the reCAPTCHA first. Make sure the checkbox is checked.');
      console.warn('[HOST_VERIFY] ⚠️ Attempted to send code but reCAPTCHA not solved');
      return;
    }
    
    if (!recaptchaVerifierRef.current) {
      setError('reCAPTCHA verifier is not initialized. Please refresh and try again.');
      console.error('[HOST_VERIFY] ❌ No verifier instance');
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

    // CRITICAL: Ensure verifier exists and is valid
    if (!recaptchaVerifierRef.current) {
      setError('reCAPTCHA is not initialized. Please refresh and try again.');
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

      console.log('[HOST_VERIFY] ✅ reCAPTCHA solved, calling Firebase phone auth...', {
        formattedPhone,
        hasVerifier: !!recaptchaVerifierRef.current,
        currentUserPhone: currentUser.phoneNumber
      });

      let confirmation: ConfirmationResult;

      // CRITICAL: Add timeout to detect if Firebase call is hanging
      const FIREBASE_TIMEOUT = 30000; // 30 seconds
      const firebaseCallPromise = currentUser.phoneNumber
        ? signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current)
        : linkWithPhoneNumber(currentUser, formattedPhone, recaptchaVerifierRef.current);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Firebase phone auth call timed out after 30 seconds'));
        }, FIREBASE_TIMEOUT);
      });

      // Check if phone number is already linked to the user
      if (currentUser.phoneNumber) {
        // Phone is already linked - use signInWithPhoneNumber to verify (returns ConfirmationResult)
        console.log('[HOST_VERIFY] Phone already linked, using signInWithPhoneNumber with timeout');
        try {
          confirmation = await Promise.race([firebaseCallPromise, timeoutPromise]) as ConfirmationResult;
          console.log('[HOST_VERIFY] ✅✅✅ signInWithPhoneNumber SUCCEEDED, ConfirmationResult received');
        } catch (signInErr: any) {
          console.error('[HOST_VERIFY] ❌ signInWithPhoneNumber ERROR:', {
            code: signInErr?.code,
            message: signInErr?.message,
            stack: signInErr?.stack?.substring(0, 300),
            isTimeout: signInErr?.message?.includes('timed out')
          });
          throw signInErr;
        }
      } else {
        // Phone is not linked - use linkWithPhoneNumber to link and verify
        console.log('[HOST_VERIFY] Phone not linked, using linkWithPhoneNumber with timeout');
        try {
          confirmation = await Promise.race([firebaseCallPromise, timeoutPromise]) as ConfirmationResult;
          console.log('[HOST_VERIFY] ✅✅✅ linkWithPhoneNumber SUCCEEDED, ConfirmationResult received');
        } catch (linkErr: any) {
          console.error('[HOST_VERIFY] ❌ linkWithPhoneNumber ERROR:', {
            code: linkErr?.code,
            message: linkErr?.message,
            stack: linkErr?.stack?.substring(0, 300),
            isTimeout: linkErr?.message?.includes('timed out')
          });
          throw linkErr;
        }
      }

      // CRITICAL: Store ConfirmationResult immediately - we need it for verification step
      if (!confirmation) {
        throw new Error('No ConfirmationResult returned from Firebase');
      }
      
      setConfirmationResult(confirmation);
      setStep('code');
      setRecaptchaSolved(false); // Reset for next time
      console.log('[HOST_VERIFY] ✅ Code sent successfully, ConfirmationResult stored');
    } catch (error: any) {
      // Log detailed error information for debugging
      console.error('[HOST_VERIFY] ❌ Send code failed:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack?.substring(0, 300),
        errorObject: error
      });

      // Reset reCAPTCHA status on error so user can try again
      setRecaptchaSolved(false);
      
      // Re-render reCAPTCHA after error
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.render().then(() => {
            console.log('[HOST_VERIFY] reCAPTCHA re-rendered after error');
          }).catch((err) => {
            console.error('[HOST_VERIFY] Failed to re-render reCAPTCHA:', err);
          });
        } catch (renderErr) {
          console.warn('[HOST_VERIFY] Could not re-render reCAPTCHA:', renderErr);
        }
      }

      // Check for specific error codes that indicate configuration issues
      if (error?.code === 'auth/captcha-check-failed') {
        setError('reCAPTCHA verification failed. Please solve it again and try.');
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

      // Note: We don't clear the verifier here - it's managed by useRef and useEffect

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

        {/* reCAPTCHA container - use ref to ensure it's available for verifier */}
        {step === 'phone' && (
          <div ref={recaptchaContainerRef} id="host-phone-recaptcha-container" className="my-4 flex justify-center" />
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
                disabled={!phoneNumber.trim() || loading || isSendingCode || !recaptchaSolved}
                className="w-full px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || isSendingCode ? 'Sending...' : recaptchaSolved ? 'Send Verification Code' : 'Solve reCAPTCHA First'}
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
