import React, { useState, useRef, useEffect } from 'react';
import { Phone, X, CheckCircle2, ChevronDown } from 'lucide-react';
import { getDbSafe } from '../../src/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useUserStore } from '../../stores/userStore';
import {
  startPhoneVerification,
  confirmPhoneVerification,
  resetPhoneRecaptcha,
} from '../../src/services/phoneVerification';
import {
  startPhoneMfaEnrollment,
  verifyPhoneMfaCode,
  resetRecaptchaVerifier,
  createRecaptchaVerifier,
} from '../../src/lib/firebaseAuth';
import { createOrUpdateUserProfile } from '../../firebase/db';
import { parseToE164 } from '../../utils/phoneVerification';
import type { ConfirmationResult } from 'firebase/auth';
import type { CountryCode } from 'libphonenumber-js';

// Supported countries for phone verification
const SUPPORTED_COUNTRIES = [
  { code: 'CA' as CountryCode, name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'US' as CountryCode, name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'BE' as CountryCode, name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { code: 'FR' as CountryCode, name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'DE' as CountryCode, name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'NL' as CountryCode, name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { code: 'GB' as CountryCode, name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'ES' as CountryCode, name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { code: 'IT' as CountryCode, name: 'Italy', dial: '+39', flag: '🇮🇹' },
];

/**
 * Detect default country from browser timezone
 */
function detectDefaultCountry(): CountryCode {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.startsWith('Europe/Brussels')) return 'BE';
    if (tz.startsWith('Europe/Paris')) return 'FR';
    if (tz.startsWith('Europe/Berlin')) return 'DE';
    if (tz.startsWith('Europe/Amsterdam')) return 'NL';
    if (tz.startsWith('Europe/London')) return 'GB';
    if (tz.startsWith('Europe/Madrid')) return 'ES';
    if (tz.startsWith('Europe/Rome')) return 'IT';
    if (tz.startsWith('America/')) {
      if (tz.includes('New_York') || tz.includes('Chicago') || tz.includes('Denver') || tz.includes('Los_Angeles')) {
        return 'US';
      }
      return 'CA';
    }
  } catch {
    // Ignore detection errors
  }
  return 'CA';
}

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  required?: boolean; // If true, user cannot bypass
  useMfaEnrollment?: boolean; // If true, use MFA enrollment instead of phone linking
}

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  required = false,
  useMfaEnrollment = false,
}) => {
  const user = useUserStore((state) => state.user);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(detectDefaultCountry());
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [mfaVerificationId, setMfaVerificationId] = useState<string | null>(null);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const recaptchaVerifierRef = useRef<boolean>(false);

  const currentCountry = SUPPORTED_COUNTRIES.find(c => c.code === selectedCountry) || SUPPORTED_COUNTRIES[0];

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setPhoneNumber('');
      setVerificationCode('');
      setMfaVerificationId(null);
      setConfirmationResult(null);
      setStep('phone');
      setError(null);
      setSuccess(false);
      setShowCountryDropdown(false);
      resetPhoneRecaptcha();
      resetRecaptchaVerifier();
    }
  }, [isOpen]);

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    // Parse phone with country
    const formattedPhone = parseToE164(phoneNumber, selectedCountry);
    if (!formattedPhone) {
      setError(`Please enter a valid phone number for ${currentCountry.name}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (useMfaEnrollment) {
        // Use MFA enrollment (official SDK methods only)
        resetRecaptchaVerifier();
        const recaptcha = createRecaptchaVerifier('phone-recaptcha-container');
        const verificationId = await startPhoneMfaEnrollment(formattedPhone, recaptcha);
        setMfaVerificationId(verificationId);
        setStep('code');
        console.log('[MFA_ENROLL] Code sent for MFA enrollment');
      } else {
        // Use regular phone verification (linking)
        const confirmation = await startPhoneVerification(formattedPhone);
        setConfirmationResult(confirmation);
        setStep('code');
        console.log('[PHONE_VERIFY] Code sent');
      }
    } catch (error: any) {
      console.error('[PHONE_VERIFY] Error sending verification code:', error);
      
      // Handle specific Firebase auth errors
      const errorMessage = error?.message || 'Failed to send verification code. Please try again.';
      
      setError(errorMessage);
      resetPhoneRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || !user?.uid) {
      setError('Please enter the verification code');
      return;
    }

    if (useMfaEnrollment && !mfaVerificationId) {
      setError('Verification ID not available');
      return;
    }

    if (!useMfaEnrollment && !confirmationResult) {
      setError('Confirmation result not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (useMfaEnrollment) {
        // Use MFA enrollment (official SDK methods only)
        await verifyPhoneMfaCode(mfaVerificationId!, verificationCode, 'Primary phone');
        console.log('[MFA_ENROLL] MFA enrollment successful');
        resetRecaptchaVerifier();
      } else {
        // Use regular phone verification (linking)
        await confirmPhoneVerification(confirmationResult!, verificationCode);
        console.log('[PHONE_VERIFY] Code verified');
      }

      // Update user profile
      const db = getDbSafe();
      if (db && user) {
        const formattedPhone = parseToE164(phoneNumber, selectedCountry);
        await setDoc(doc(db, 'users', user.uid), {
          phone_verified: true,
          phone_number: formattedPhone,
          countryCode: selectedCountry,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }, { merge: true });
        await createOrUpdateUserProfile(user.uid, {
          phone_verified: true,
          phone_number: formattedPhone,
          countryCode: selectedCountry,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });

        // Update user store
        useUserStore.getState().updateUser(user.uid, {
          phone_verified: true,
          phone_number: formattedPhone,
        });
      }

      setSuccess(true);
      resetPhoneRecaptcha();
      resetRecaptchaVerifier();
      setConfirmationResult(null);
      setMfaVerificationId(null);
      
      // Show success for 2 seconds, then close
      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('[PHONE_VERIFY] Error verifying code:', error);
      
      // Handle specific Firebase auth errors
      const errorMessage = error?.message || 'We couldn't verify your code. Please try again or request a new code.';
      
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

            {/* Country Selector */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <button
                type="button"
                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">{currentCountry.flag}</span>
                  <span>{currentCountry.name}</span>
                  <span className="text-gray-400">({currentCountry.dial})</span>
                </span>
                <ChevronDown size={20} className={`text-gray-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showCountryDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {SUPPORTED_COUNTRIES.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(country.code);
                        setShowCountryDropdown(false);
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left ${
                        selectedCountry === country.code ? 'bg-[#eef4f5]' : ''
                      }`}
                    >
                      <span className="text-xl">{country.flag}</span>
                      <span>{country.name}</span>
                      <span className="text-gray-400 text-sm">({country.dial})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phone Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <div className="flex">
                <span className="inline-flex items-center px-4 py-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm">
                  {currentCountry.dial}
                </span>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your number"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-[#15383c] focus:border-transparent"
                />
              </div>
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
                Enter the 6-digit code sent to {currentCountry.dial} {phoneNumber}
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
