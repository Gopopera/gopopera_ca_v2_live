import React, { useState, useEffect } from 'react';
import { Phone, X, ChevronDown } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { createOrUpdateUserProfile } from '../../firebase/db';
import { parseToE164 } from '../../utils/phoneVerification';
import type { CountryCode } from 'libphonenumber-js';

// Supported countries for phone collection
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

interface PhoneCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PhoneCollectionModal: React.FC<PhoneCollectionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const user = useUserStore((state) => state.user);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(detectDefaultCountry());
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const currentCountry = SUPPORTED_COUNTRIES.find(c => c.code === selectedCountry) || SUPPORTED_COUNTRIES[0];

  useEffect(() => {
    if (!isOpen) {
      setPhoneNumber('');
      setError(null);
      setShowCountryDropdown(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    // Parse and validate phone with country
    const formattedPhone = parseToE164(phoneNumber, selectedCountry);
    if (!formattedPhone) {
      setError(`Please enter a valid phone number for ${currentCountry.name}`);
      return;
    }

    if (!user?.uid) {
      setError('User not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update user profile with phone number and region info
      await createOrUpdateUserProfile(user.uid, {
        phone_number: formattedPhone,
        countryCode: selectedCountry,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currency: ['BE', 'FR', 'DE', 'NL', 'ES', 'IT'].includes(selectedCountry) ? 'eur' : 'cad',
      });

      // Update local store
      useUserStore.getState().updateUser(user.uid, {
        phone_number: formattedPhone,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('[PHONE_COLLECTION] Error saving phone:', err);
      setError('Failed to save phone number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-fade-in" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-heading font-bold text-[#15383c]">
            Add Your Phone Number
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#eef4f5] rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone size={32} className="text-[#e35e25]" />
            </div>
            <p className="text-gray-600 text-sm">
              Add your phone number to receive SMS notifications about your events, 
              including reminders and important updates from hosts.
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
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
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!phoneNumber.trim() || loading}
              className="w-full px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Phone Number'}
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gray-100 text-[#15383c] rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              Skip for Now
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center pt-2">
            We'll only use your phone for event-related notifications.
          </p>
        </div>
      </div>
    </div>
  );
};
