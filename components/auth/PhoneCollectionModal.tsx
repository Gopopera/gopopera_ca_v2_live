import React, { useState, useEffect } from 'react';
import { Phone, X } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { createOrUpdateUserProfile } from '../../firebase/db';

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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPhoneNumber('');
      setError(null);
    }
  }, [isOpen]);

  const formatPhoneNumber = (input: string): string => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, '');
    // Add country code if not present
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    if (input.startsWith('+')) {
      return input;
    }
    return `+1${digits}`;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  };

  const handleSubmit = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    if (!user?.uid) {
      setError('User not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      // Update user profile with phone number
      await createOrUpdateUserProfile(user.uid, {
        phone_number: formattedPhone,
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15383c] focus:border-transparent"
              autoFocus
            />
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

