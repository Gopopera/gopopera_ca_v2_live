/**
 * Host Payout Pages
 * 
 * PayoutSetupPage - Interstitial before Stripe onboarding
 * PayoutsPage - Return handling after Stripe onboarding
 */

import React, { useState, useEffect } from 'react';
import { ViewState } from '../../types';
import { X, ArrowRight, CheckCircle2, AlertCircle, Loader2, ExternalLink, RefreshCw, DollarSign } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { getDbSafe } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface PageProps {
  setViewState: (view: ViewState) => void;
}

// Analytics helper (emit events if analytics available)
const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  try {
    // If you have analytics (e.g., Mixpanel, Amplitude, GA), call it here
    if (typeof window !== 'undefined' && (window as any).analytics?.track) {
      (window as any).analytics.track(eventName, properties);
    }
    // Also log to console in dev
    console.log(`[ANALYTICS] ${eventName}`, properties);
  } catch (e) {
    // Silently ignore analytics errors
  }
};

// ============================================================================
// PAYOUT SETUP PAGE (Interstitial)
// Route: /host/payouts/setup
// ============================================================================
export const PayoutSetupPage: React.FC<PageProps> = ({ setViewState }) => {
  const { t } = useLanguage();
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  const refreshUserProfile = useUserStore((state) => state.refreshUserProfile);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleContinue = async () => {
    if (!user?.uid || !user?.email) {
      setError('Please log in to set up payouts.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Track analytics event
    trackEvent('stripe_onboarding_started', {
      userId: user.uid,
      hasExistingAccount: !!userProfile?.stripeAccountId,
    });
    
    try {
      // Get canonical app URL from env or default
      const appUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'https://gopopera.ca';
      
      const response = await fetch('/api/stripe/connect/onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          existingAccountId: userProfile?.stripeAccountId || undefined,
          returnUrl: `${appUrl}/host/payouts?stripe=return`,
          refreshUrl: `${appUrl}/host/payouts?stripe=refresh`,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create onboarding link');
      }
      
      const { url, accountId } = await response.json();
      
      // Save account ID to user profile if new
      if (accountId && accountId !== userProfile?.stripeAccountId) {
        const db = getDbSafe();
        if (db && user.uid) {
          await updateDoc(doc(db, 'users', user.uid), {
            stripeAccountId: accountId,
            stripeOnboardingStatus: 'pending',
          });
          await refreshUserProfile();
        }
      }
      
      // Redirect to Stripe onboarding
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No onboarding URL received');
      }
      
    } catch (err: any) {
      console.error('[PAYOUT_SETUP] Error:', err);
      setError(err.message || 'Failed to start setup. Please try again.');
      setLoading(false);
    }
  };
  
  const handleNotNow = () => {
    // Go back to previous page (profile)
    setViewState(ViewState.PROFILE);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-20 sm:pt-24 pb-8 sm:pb-12 font-sans">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="w-9 h-9"></div> {/* Spacer */}
          <button 
            onClick={handleNotNow}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-[#e35e25]/10 to-[#e35e25]/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <DollarSign size={32} className="text-[#e35e25]" />
          </div>
          
          {/* Title */}
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c] mb-4">
            Set up payouts
          </h1>
          
          {/* Description */}
          <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-8">
            To receive payments from your circles, you'll complete a quick Stripe verification step. 
            You'll return to Popera right after.
          </p>
          
          {/* Stripe badge */}
          <div className="flex items-center justify-center gap-2 mb-8 text-sm text-gray-500">
            <span>Powered by</span>
            <span className="font-semibold text-[#635bff]">Stripe</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Secure</span>
          </div>
          
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-start gap-2">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 text-left">{error}</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleContinue}
              disabled={loading}
              className="w-full bg-[#15383c] text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-[#1a4549] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Setting up...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            
            <button
              onClick={handleNotNow}
              disabled={loading}
              className="w-full text-gray-500 font-medium py-3 px-6 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        
        {/* Footer info */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Your information is encrypted and securely handled by Stripe.
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// PAYOUTS PAGE (Return Handling)
// Route: /host/payouts
// Query params: ?stripe=return or ?stripe=refresh
// ============================================================================
export const PayoutsPage: React.FC<PageProps> = ({ setViewState }) => {
  const { t } = useLanguage();
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  const refreshUserProfile = useUserStore((state) => state.refreshUserProfile);
  
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [accountStatus, setAccountStatus] = useState<{
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripeMode, setStripeMode] = useState<'return' | 'refresh' | null>(null);
  
  // Check URL params on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const stripeParam = urlParams.get('stripe');
    
    if (stripeParam === 'return') {
      setStripeMode('return');
      trackEvent('stripe_onboarding_returned', { userId: user?.uid });
    } else if (stripeParam === 'refresh') {
      setStripeMode('refresh');
      trackEvent('stripe_onboarding_refresh', { userId: user?.uid });
    }
    
    // Clear URL params
    if (stripeParam) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user?.uid]);
  
  // Check account status
  useEffect(() => {
    const checkAccountStatus = async () => {
      if (!user?.uid || !userProfile?.stripeAccountId) {
        setLoading(false);
        return;
      }
      
      setCheckingStatus(true);
      
      try {
        const response = await fetch(`/api/stripe/connect/account-status?accountId=${userProfile.stripeAccountId}`);
        
        if (response.ok) {
          const data = await response.json();
          setAccountStatus({
            chargesEnabled: data.chargesEnabled,
            payoutsEnabled: data.payoutsEnabled,
            detailsSubmitted: data.detailsSubmitted,
          });
          
          // Update Firestore if status changed
          const db = getDbSafe();
          if (db && user.uid) {
            const newStatus = data.chargesEnabled && data.payoutsEnabled ? 'complete' : 
                             data.detailsSubmitted ? 'pending_verification' : 'incomplete';
            
            await updateDoc(doc(db, 'users', user.uid), {
              stripeOnboardingStatus: newStatus,
              stripeAccountEnabled: data.chargesEnabled && data.payoutsEnabled,
            });
            await refreshUserProfile();
          }
          
          // Track completion
          if (data.chargesEnabled && data.payoutsEnabled) {
            trackEvent('stripe_onboarding_completed', { userId: user.uid });
          }
        }
      } catch (err: any) {
        console.error('[PAYOUTS] Error checking status:', err);
        setError('Could not verify account status.');
      } finally {
        setLoading(false);
        setCheckingStatus(false);
      }
    };
    
    checkAccountStatus();
  }, [user?.uid, userProfile?.stripeAccountId, stripeMode]);
  
  const handleContinueSetup = async () => {
    if (!user?.uid || !user?.email) return;
    
    setLoading(true);
    setError(null);
    
    trackEvent('stripe_onboarding_started', {
      userId: user.uid,
      resuming: true,
    });
    
    try {
      const appUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'https://gopopera.ca';
      
      const response = await fetch('/api/stripe/connect/onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          existingAccountId: userProfile?.stripeAccountId || undefined,
          returnUrl: `${appUrl}/host/payouts?stripe=return`,
          refreshUrl: `${appUrl}/host/payouts?stripe=refresh`,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create onboarding link');
      }
      
      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No onboarding URL received');
      }
    } catch (err: any) {
      console.error('[PAYOUTS] Error:', err);
      setError(err.message || 'Failed to continue setup.');
      setLoading(false);
    }
  };
  
  const handleBack = () => {
    setViewState(ViewState.PROFILE);
  };
  
  // Determine display state
  const isComplete = accountStatus?.chargesEnabled && accountStatus?.payoutsEnabled;
  const isAlmostDone = accountStatus?.detailsSubmitted && !isComplete;
  const needsSetup = !userProfile?.stripeAccountId;
  const isPaused = stripeMode === 'refresh';
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-20 sm:pt-24 pb-8 sm:pb-12 font-sans">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading font-bold text-xl sm:text-2xl text-[#15383c]">Payouts</h1>
          <button 
            onClick={handleBack}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Loading state */}
        {loading && !stripeMode && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <Loader2 size={32} className="animate-spin text-[#e35e25] mx-auto mb-4" />
            <p className="text-gray-600">Loading payout settings...</p>
          </div>
        )}
        
        {/* Success state */}
        {!loading && isComplete && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 size={28} className="text-green-600" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-xl text-[#15383c]">Payouts ready</h2>
                <p className="text-sm text-gray-500">Your Stripe account is fully set up</p>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-2">
                <CheckCircle2 size={16} />
                <span>Payments enabled</span>
              </div>
              <p className="text-sm text-green-600">
                You can now receive payments from your circles. Payouts are processed automatically.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-xs text-gray-500 font-medium mb-1">STRIPE ACCOUNT</p>
              <p className="text-sm text-gray-700 font-mono">{userProfile?.stripeAccountId}</p>
            </div>
            
            <a
              href="https://dashboard.stripe.com/express"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#635bff] text-white font-medium rounded-xl hover:bg-[#5750e6] transition-colors"
            >
              <span>Open Stripe Dashboard</span>
              <ExternalLink size={16} />
            </a>
          </div>
        )}
        
        {/* Almost done state (details submitted, awaiting verification) */}
        {!loading && isAlmostDone && !isPaused && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle size={28} className="text-amber-600" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-xl text-[#15383c]">Almost done</h2>
                <p className="text-sm text-gray-500">A few more steps to complete setup</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Stripe is reviewing your information. You may need to provide additional details to enable payouts.
            </p>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-start gap-2">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            <button
              onClick={handleContinueSetup}
              disabled={checkingStatus}
              className="w-full bg-[#15383c] text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-[#1a4549] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {checkingStatus ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>Continue setup</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Paused/refresh state */}
        {!loading && isPaused && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                <RefreshCw size={28} className="text-gray-500" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-xl text-[#15383c]">Setup paused</h2>
                <p className="text-sm text-gray-500">Continue when you're ready</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Your payout setup was paused. You can continue where you left off whenever you're ready.
            </p>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-start gap-2">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            <button
              onClick={handleContinueSetup}
              disabled={checkingStatus}
              className="w-full bg-[#15383c] text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-[#1a4549] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {checkingStatus ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>Continue setup</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Needs setup state (no account yet) */}
        {!loading && needsSetup && !isPaused && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#e35e25]/10 to-[#e35e25]/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <DollarSign size={32} className="text-[#e35e25]" />
            </div>
            
            <h2 className="font-heading font-bold text-xl text-[#15383c] mb-3">
              Set up payouts
            </h2>
            
            <p className="text-gray-600 mb-6">
              Connect your Stripe account to receive payments from your circles.
            </p>
            
            <button
              onClick={() => setViewState(ViewState.PAYOUT_SETUP)}
              className="w-full bg-[#15383c] text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-[#1a4549] transition-all flex items-center justify-center gap-2"
            >
              <span>Get started</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
        
        {/* Incomplete setup (has account but not complete) */}
        {!loading && !needsSetup && !isComplete && !isAlmostDone && !isPaused && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle size={28} className="text-amber-600" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-xl text-[#15383c]">Complete setup</h2>
                <p className="text-sm text-gray-500">Finish setting up your payouts</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Your payout setup isn't complete yet. Please continue to enable payments for your circles.
            </p>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-start gap-2">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            <button
              onClick={handleContinueSetup}
              disabled={checkingStatus}
              className="w-full bg-[#15383c] text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-[#1a4549] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {checkingStatus ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>Continue setup</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

