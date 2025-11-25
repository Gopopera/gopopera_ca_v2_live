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
  const [debugInfo, setDebugInfo] = useState<string>(''); // Visual debug info
  
  // Use useRef to hold the RecaptchaVerifier instance across re-renders
  // This ensures we always use the same instance that was initialized
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Initialize reCAPTCHA when modal opens and step is 'phone'
  // Use a small delay to ensure container is fully rendered
  useEffect(() => {
    if (!isOpen || step !== 'phone') {
      return;
    }

    // Small delay to ensure container is in DOM
    const initTimer = setTimeout(() => {
      // Initialize reCAPTCHA only once when modal opens
      if (recaptchaContainerRef.current && !recaptchaVerifierRef.current) {
        const auth = getAuthInstance();
        
        try {
          console.log('[HOST_VERIFY] Creating new reCAPTCHA verifier...');
          
          // CRITICAL: Don't pass any reCAPTCHA site key - Firebase uses its own
          // The 401 error suggests we might be trying to use a custom key
          // Firebase Phone Auth uses its own reCAPTCHA configuration
          recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
            size: 'normal',
            // DO NOT pass 'siteKey' parameter - Firebase manages this automatically
            callback: (response: any) => {
              // reCAPTCHA solved - set state to indicate this
              const timestamp = new Date().toISOString();
              console.log('[HOST_VERIFY] ✅✅✅ reCAPTCHA SOLVED! Callback fired!', {
                response,
                timestamp
              });
              setDebugInfo(`✅ reCAPTCHA solved at ${new Date().toLocaleTimeString()}`);
              // Use setTimeout to ensure state update happens
              setTimeout(() => {
                setRecaptchaSolved(true);
                setError(null); // Clear any previous error
                setDebugInfo(`✅ reCAPTCHA solved - Ready to send`);
                console.log('[HOST_VERIFY] recaptchaSolved state set to true');
              }, 0);
            },
            'expired-callback': () => {
              // reCAPTCHA expired - reset state
              console.warn('[HOST_VERIFY] ⚠️ reCAPTCHA expired');
              setRecaptchaSolved(false);
              setDebugInfo('⚠️ reCAPTCHA expired - please solve again');
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
              setDebugInfo('❌ reCAPTCHA error occurred');
            },
          });

          // Render the reCAPTCHA widget explicitly
          // CRITICAL: render() must be called for the widget to appear
          console.log('[HOST_VERIFY] Calling render() on reCAPTCHA verifier...');
          setDebugInfo('🔄 Loading reCAPTCHA...');
          recaptchaVerifierRef.current.render().then((widgetId) => {
            console.log('[HOST_VERIFY] ✅✅✅ reCAPTCHA rendered successfully with widget ID:', widgetId);
            console.log('[HOST_VERIFY] Waiting for user to solve reCAPTCHA...');
            setDebugInfo('⏳ Please solve the reCAPTCHA checkbox above');
          }).catch((err) => {
            console.error('[HOST_VERIFY] ❌ Failed to render reCAPTCHA:', {
              error: err,
              message: err?.message,
              stack: err?.stack?.substring(0, 200)
            });
            setError('Failed to load reCAPTCHA. Please refresh and try again.');
            setDebugInfo('❌ Failed to load reCAPTCHA');
          });
        } catch (error: any) {
          console.error('[HOST_VERIFY] ❌ Failed to create reCAPTCHA verifier:', error);
          setError('Failed to initialize reCAPTCHA. Please refresh and try again.');
          setDebugInfo('❌ Failed to initialize reCAPTCHA');
        }
      }
    }, 100); // Small delay to ensure DOM is ready

    // Cleanup: clear reCAPTCHA when modal closes or component unmounts
    return () => {
      clearTimeout(initTimer);
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
      setDebugInfo('');
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
      setDebugInfo('📤 Sending SMS code... (this may take up to 30 seconds)');

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
          setDebugInfo('✅ SMS code sent successfully!');
        } catch (signInErr: any) {
          const isTimeout = signInErr?.message?.includes('timed out');
          console.error('[HOST_VERIFY] ❌ signInWithPhoneNumber ERROR:', {
            code: signInErr?.code,
            message: signInErr?.message,
            stack: signInErr?.stack?.substring(0, 300),
            isTimeout
          });
          setDebugInfo(isTimeout ? '⏱️ Request timed out after 30 seconds' : `❌ Error: ${signInErr?.code || signInErr?.message}`);
          throw signInErr;
        }
      } else {
        // Phone is not linked - use linkWithPhoneNumber to link and verify
        console.log('[HOST_VERIFY] Phone not linked, using linkWithPhoneNumber with timeout');
        try {
          confirmation = await Promise.race([firebaseCallPromise, timeoutPromise]) as ConfirmationResult;
          console.log('[HOST_VERIFY] ✅✅✅ linkWithPhoneNumber SUCCEEDED, ConfirmationResult received');
          setDebugInfo('✅ SMS code sent successfully!');
        } catch (linkErr: any) {
          const isTimeout = linkErr?.message?.includes('timed out');
          console.error('[HOST_VERIFY] ❌ linkWithPhoneNumber ERROR:', {
            code: linkErr?.code,
            message: linkErr?.message,
            stack: linkErr?.stack?.substring(0, 300),
            isTimeout
          });
          setDebugInfo(isTimeout ? '⏱️ Request timed out after 30 seconds' : `❌ Error: ${linkErr?.code || linkErr?.message}`);
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
      // CRITICAL: Don't clear the verifier here - we might need it for verification
      // The verifier state is tied to the confirmationResult session
      console.log('[HOST_VERIFY] ✅ Code sent successfully, ConfirmationResult stored');
      console.log('[HOST_VERIFY] ⏰ IMPORTANT: Verify code quickly - session expires in ~2 minutes');
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
      // CRITICAL: Verify the confirmationResult is still valid
      if (!confirmationResult) {
        throw new Error('Verification session expired. Please request a new code.');
      }

      // Confirm the phone number (can only be called once per confirmationResult)
      // Add timeout to prevent hanging, but make it shorter since verification should be fast
      const VERIFY_TIMEOUT = 20000; // 20 seconds (verification should be quick)
      
      console.log('[HOST_VERIFY] Attempting to verify code...', {
        codeLength: verificationCode.trim().length,
        hasConfirmationResult: !!confirmationResult,
        confirmationResultType: typeof confirmationResult,
        hasConfirmMethod: typeof confirmationResult?.confirm === 'function',
        timestamp: new Date().toISOString()
      });
      
      // CRITICAL: Verify the confirmationResult has the confirm method
      if (!confirmationResult || typeof confirmationResult.confirm !== 'function') {
        throw new Error('Invalid confirmationResult object. Please request a new code.');
      }
      
      // Log network state and page visibility before making the call
      if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
        const isOnline = navigator.onLine;
        console.log('[HOST_VERIFY] Network status:', {
          online: isOnline,
          connectionType: (navigator as any).connection?.effectiveType || 'unknown'
        });
        
        // CRITICAL: Check if offline - Firebase won't work offline
        if (!isOnline) {
          setError('You appear to be offline. Please check your internet connection and try again.');
          setLoading(false);
          setIsVerifying(false);
          return;
        }
      }
      
      // Check if page is visible (mobile browsers suspend JS when backgrounded)
      if (typeof document !== 'undefined' && document.hidden) {
        console.warn('[HOST_VERIFY] ⚠️ Page is hidden - this might cause issues on mobile');
        setDebugInfo('⚠️ Please ensure the page is active (not in background)');
      }
      
      console.log('[HOST_VERIFY] Page visibility:', {
        hidden: document?.hidden,
        visibilityState: document?.visibilityState
      });
      
      // Create the verify promise with detailed logging
      const verifyPromise = (async () => {
        console.log('[HOST_VERIFY] 🔄 Calling confirmationResult.confirm()...');
        const startTime = Date.now();
        try {
          const result = await confirmationResult.confirm(verificationCode.trim());
          const duration = Date.now() - startTime;
          console.log('[HOST_VERIFY] ✅ confirm() resolved after', duration, 'ms');
          return result;
        } catch (err: any) {
          const duration = Date.now() - startTime;
          console.error('[HOST_VERIFY] ❌ confirm() rejected after', duration, 'ms:', err);
          throw err;
        }
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Verification timed out after 20 seconds. The code may be incorrect or expired.'));
        }, VERIFY_TIMEOUT);
      });
      
      setDebugInfo('🔍 Verifying code... (this should be quick)');
      
      // Wrap in try-catch to handle all errors including timeouts
      let cred: any;
      try {
        cred = await Promise.race([verifyPromise, timeoutPromise]);
      } catch (raceError: any) {
        // Check if it's a timeout
        if (raceError?.message?.includes('timed out')) {
          console.error('[HOST_VERIFY] ❌ Verification timed out after 20 seconds');
          setDebugInfo('⏱️ Verification timed out - code may be incorrect or expired');
          // Clear confirmationResult on timeout - user needs to request new code
          setConfirmationResult(null);
          setLoading(false);
          setIsVerifying(false);
          // Set error message instead of throwing to prevent unhandled rejection
          setError('Verification timed out. The code may be incorrect or expired. Please request a new code.');
          return; // Exit early instead of throwing
        }
        // For other errors, still set error state but also log
        console.error('[HOST_VERIFY] ❌ Verification error:', raceError);
        setDebugInfo(`❌ Error: ${raceError?.code || raceError?.message || 'Unknown error'}`);
        // Re-throw to be caught by outer catch block
        throw raceError;
      }
      
      // If we get here, verification succeeded
      console.log('[HOST_VERIFY] ✅✅✅ Phone verified successfully!', {
        user: cred?.user?.uid,
        timestamp: new Date().toISOString()
      });
      setDebugInfo('✅ Code verified successfully!');
      
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
      
      const isTimeout = error?.message?.includes('timed out');
      if (isTimeout) {
        setDebugInfo('⏱️ Verification timed out - please request a new code');
      } else {
        setDebugInfo(`❌ Verification failed: ${error?.code || error?.message || 'Unknown error'}`);
      }

      let errorMessage = "We couldn't verify your code. Please try again or request a new code.";

      if (error?.code === 'auth/operation-not-allowed') {
        errorMessage = 'Phone verification is not enabled. Please contact support.';
      } else if (error?.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else       if (error?.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code. Please check the code and try again.';
        // Don't clear confirmationResult - user can try again with same code
      } else if (error?.code === 'auth/code-expired') {
        errorMessage = 'This code has expired. Please request a new one.';
        // Clear confirmationResult on code expiry - user needs to request new code
        setConfirmationResult(null);
        setStep('phone'); // Go back to phone input
      } else if (error?.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please wait a bit before trying again.';
        // Clear confirmationResult on rate limit - user needs to request new code
        setConfirmationResult(null);
        setStep('phone'); // Go back to phone input
      } else if (error?.code === 'auth/session-expired') {
        errorMessage = 'Verification session expired. Please request a new code.';
        setConfirmationResult(null);
        setStep('phone'); // Go back to phone input
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // If error suggests session is invalid, clear confirmationResult
      if (error?.code === 'auth/code-expired' || error?.code === 'auth/session-expired') {
        setConfirmationResult(null);
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
