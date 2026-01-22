/**
 * Cookie Consent Banner
 * Simple GDPR-compliant cookie consent UI
 */

import React, { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

const CONSENT_KEY = 'popera_cookie_consent';

export const CookieConsentBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if consent has already been given
    try {
      const consent = localStorage.getItem(CONSENT_KEY);
      if (!consent) {
        // Small delay to prevent flash on page load
        const timer = setTimeout(() => setShowBanner(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage not available, don't show banner
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch {
      // Ignore storage errors
    }
    setShowBanner(false);
  };

  const handleDismiss = () => {
    // Dismiss without storing consent - will show again next visit
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#15383c] rounded-2xl shadow-2xl border border-white/10 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Icon */}
            <div className="hidden sm:flex w-12 h-12 bg-white/10 rounded-xl items-center justify-center flex-shrink-0">
              <Cookie className="w-6 h-6 text-[#e35e25]" />
            </div>
            
            {/* Text */}
            <div className="flex-1">
              <p className="text-white text-sm sm:text-base">
                We use cookies to improve your experience. By continuing to use Popera, you agree to our use of cookies.{' '}
                <a 
                  href="/privacy" 
                  className="text-[#e35e25] hover:underline font-medium"
                >
                  Learn more
                </a>
              </p>
            </div>
            
            {/* Buttons */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleAccept}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors text-sm"
              >
                Accept
              </button>
              <button
                onClick={handleDismiss}
                className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

