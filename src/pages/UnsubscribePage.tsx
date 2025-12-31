/**
 * Unsubscribe Page - Allows users to opt out of marketing emails
 * Accessed via /unsubscribe?uid=XXX&token=XXX
 */

import React, { useState, useEffect } from 'react';
import { ViewState } from '../../types';
import { MailX, CheckCircle, Loader2, AlertTriangle, Home } from 'lucide-react';

interface UnsubscribePageProps {
  setViewState: (view: ViewState) => void;
}

export const UnsubscribePage: React.FC<UnsubscribePageProps> = ({ setViewState }) => {
  const [status, setStatus] = useState<'loading' | 'confirming' | 'success' | 'error'>('confirming');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Get uid and token from URL
  const params = new URLSearchParams(window.location.search);
  const uid = params.get('uid');
  const token = params.get('token');
  
  const handleUnsubscribe = async () => {
    if (!uid || !token) {
      setError('Invalid unsubscribe link. Please check your email.');
      setStatus('error');
      return;
    }
    
    setProcessing(true);
    
    try {
      const response = await fetch('/api/marketing/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStatus('success');
      } else {
        throw new Error(result.error || 'Failed to unsubscribe');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    } finally {
      setProcessing(false);
    }
  };
  
  // Check for missing parameters on mount
  useEffect(() => {
    if (!uid || !token) {
      setError('Invalid unsubscribe link. Please check your email.');
      setStatus('error');
    }
  }, [uid, token]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#15383c] to-[#0d2426] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        {status === 'confirming' && (
          <>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MailX size={32} className="text-gray-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#15383c] mb-2">Unsubscribe from Emails?</h1>
            <p className="text-gray-600 mb-6">
              You'll no longer receive marketing emails from Popera. You can re-subscribe anytime from your profile settings.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleUnsubscribe}
                disabled={processing}
                className="w-full py-3 px-4 bg-[#e35e25] text-white rounded-lg font-semibold hover:bg-[#d54d1a] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Yes, Unsubscribe Me'
                )}
              </button>
              <button
                onClick={() => setViewState(ViewState.LANDING)}
                className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
              >
                No, Keep Me Subscribed
              </button>
            </div>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#15383c] mb-2">You're Unsubscribed</h1>
            <p className="text-gray-600 mb-6">
              You've been successfully unsubscribed from Popera marketing emails. You can re-subscribe anytime from your notification settings.
            </p>
            <button
              onClick={() => setViewState(ViewState.LANDING)}
              className="w-full py-3 px-4 bg-[#15383c] text-white rounded-lg font-semibold hover:bg-[#0d2426] flex items-center justify-center gap-2"
            >
              <Home size={18} />
              Go to Homepage
            </button>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#15383c] mb-2">Something Went Wrong</h1>
            <p className="text-gray-600 mb-6">
              {error || 'We couldn\'t process your request. Please try again or contact support.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleUnsubscribe}
                disabled={processing || !uid || !token}
                className="w-full py-3 px-4 bg-[#e35e25] text-white rounded-lg font-semibold hover:bg-[#d54d1a] disabled:opacity-50"
              >
                Try Again
              </button>
              <a
                href="mailto:support@gopopera.ca"
                className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 text-center"
              >
                Contact Support
              </a>
            </div>
          </>
        )}
        
        {status === 'loading' && (
          <div className="py-12">
            <Loader2 size={40} className="animate-spin mx-auto text-[#15383c]" />
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-baseline justify-center gap-0.5 text-[#15383c]">
            <span className="text-lg font-bold">Popera</span>
            <span className="w-1.5 h-1.5 bg-[#e35e25] rounded-full mb-0.5"></span>
          </div>
          <p className="text-xs text-gray-500 mt-2">© {new Date().getFullYear()} Popera. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

