/**
 * Host Phone Verification Modal
 * 
 * This modal handles one-time phone verification for users who want to host events.
 * Uses Twilio SMS via our serverless function (no Firebase Phone Auth needed).
 * EU-compatible: supports international phone numbers with country selector.
 * 
 * After successful verification:
 * - Updates user profile: phoneVerifiedForHosting = true, hostPhoneNumber = phoneNumber
 * - User can then create events without being asked again
 * 
 * This verification is idempotent - if already verified, the modal should not be shown.
 */

import React, { useState, useEffect } from 'react';
import { Phone, X, CheckCircle2, ChevronDown } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { sendVerificationCode, verifyPhoneCode, parseToE164 } from '../../utils/phoneVerification';
import { createOrUpdateUserProfile } from '../../firebase/db';
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
      // Check for US timezones
      if (tz.includes('New_York') || tz.includes('Chicago') || tz.includes('Denver') || tz.includes('Los_Angeles')) {
        return 'US';
      }
      return 'CA'; // Default to Canada for other Americas
    }
  } catch {
    // Ignore detection errors
  }
  return 'CA'; // Default fallback
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
  
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(detectDefaultCountry());
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const currentCountry = SUPPORTED_COUNTRIES.find(c => c.code === selectedCountry) || SUPPORTED_COUNTRIES[0];

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
      setShowCountryDropdown(false);
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

    // Validate phone with selected country
    const e164 = parseToE164(phoneNumber, selectedCountry);
    if (!e164) {
      setError(`Please enter a valid phone number for ${currentCountry.name}`);
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
      const result = await sendVerificationCode(user.uid, phoneNumber, selectedCountry);

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
      const result = await verifyPhoneCode(user.uid, phoneNumber, verificationCode, selectedCountry);

      if (!result.success) {
        setError(result.error || 'Invalid verification code. Please try again.');
        setLoading(false);
        setIsVerifying(false);
        return;
      }

      const formattedPhone = parseToE164(phoneNumber, selectedCountry);
      
      // Update user profile with phone and region info
      await createOrUpdateUserProfile(user.uid, {
        phoneVerifiedForHosting: true,
        hostPhoneNumber: formattedPhone,
        phoneVerified: true,
        phone_verified: true,
        countryCode: selectedCountry,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currency: ['BE', 'FR', 'DE', 'NL', 'ES', 'IT'].includes(selectedCountry) ? 'eur' : 'cad',
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
              <p className="text-xs text-gray-500 mt-1">
                We'll send a verification code to this number
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
