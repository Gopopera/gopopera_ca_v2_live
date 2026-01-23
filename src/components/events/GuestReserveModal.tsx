import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

type GuestInfo = {
  attendeeName: string;
  attendeeEmail: string;
  attendeePhoneE164: string;
  smsOptIn: boolean;
};

type GuestSuccess = {
  email: string;
  ticketUrl: string;
  claimLink: string;
};

type GuestReserveModalProps = {
  isOpen: boolean;
  eventTitle: string;
  loading?: boolean;
  error?: string | null;
  success?: GuestSuccess | null;
  onClose: () => void;
  onSignIn: () => void;
  onSubmit: (data: GuestInfo) => void;
};

function normalizePhone(input: string): string {
  const stripped = input.trim().replace(/[\s\-().]/g, '');
  if (stripped.startsWith('00')) return `+${stripped.slice(2)}`;
  return stripped;
}

function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

export const GuestReserveModal: React.FC<GuestReserveModalProps> = ({
  isOpen,
  eventTitle,
  loading,
  error,
  success,
  onClose,
  onSignIn,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneRaw, setPhoneRaw] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setEmail('');
      setPhoneRaw('');
      setSmsOptIn(false);
      setLocalError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const phone = normalizePhone(phoneRaw);
    if (!name.trim() || !email.trim() || !phone) {
      setLocalError('Please fill out all required fields.');
      return;
    }
    if (!isValidE164(phone)) {
      setLocalError('Please enter a valid phone number in E.164 format (e.g. +14165551234).');
      return;
    }
    setLocalError(null);
    onSubmit({
      attendeeName: name.trim(),
      attendeeEmail: email.trim(),
      attendeePhoneE164: phone,
      smsOptIn,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        {!success ? (
          <>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-2">Reserve your spot</h2>
            <p className="text-sm text-gray-600 mb-6">{eventTitle}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#15383c] mb-2">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#e35e25] focus:outline-none"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#15383c] mb-2">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#e35e25] focus:outline-none"
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#15383c] mb-2">Phone (E.164)</label>
                <input
                  value={phoneRaw}
                  onChange={(e) => setPhoneRaw(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#e35e25] focus:outline-none"
                  placeholder="+14165551234"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={smsOptIn}
                  onChange={(e) => setSmsOptIn(e.target.checked)}
                />
                SMS updates for host announcements (optional)
              </label>

              {(localError || error) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {localError || error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3 bg-[#e35e25] text-white rounded-full font-semibold hover:bg-[#cf4d1d] disabled:opacity-50"
              >
                {loading ? 'Reserving...' : 'Reserve spot'}
              </button>

              <button
                onClick={onSignIn}
                className="w-full py-2 text-sm text-[#15383c] underline"
              >
                Already have an account? Sign in
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-2">Ticket sent!</h2>
            <p className="text-sm text-gray-600 mb-6">We emailed your ticket to <strong>{success.email}</strong>.</p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.assign(success.ticketUrl)}
                className="w-full py-3 bg-[#15383c] text-white rounded-full font-semibold hover:bg-[#1f4d52]"
              >
                View ticket
              </button>
              <button
                onClick={() => window.location.assign(success.claimLink)}
                className="w-full py-3 bg-white border border-[#15383c] text-[#15383c] rounded-full font-semibold hover:bg-gray-50"
              >
                Claim your account
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

