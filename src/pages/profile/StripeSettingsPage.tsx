
import React, { useState, useEffect } from 'react';
import { ViewState } from '../../../types';
import { X, DollarSign, ArrowRight, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { useUserStore } from '../../../stores/userStore';
import { getDbSafe } from '../../../src/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface StripeSettingsPageProps {
  setViewState: (view: ViewState) => void;
}

export const StripeSettingsPage: React.FC<StripeSettingsPageProps> = ({ setViewState }) => {
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  const refreshUserProfile = useUserStore((state) => state.refreshUserProfile);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);

  const stripeAccountId = userProfile?.stripeAccountId;
  const onboardingStatus = userProfile?.stripeOnboardingStatus;
  const accountEnabled = userProfile?.stripeAccountEnabled;
  const [verifying, setVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  // Verify Stripe account status directly with Stripe API
  const verifyStripeAccountStatus = async () => {
    const accountId = userProfile?.stripeAccountId;
    if (!accountId || !user?.uid) {
      console.log('[STRIPE_SETTINGS] No account ID to verify, refreshing profile');
      await refreshUserProfile();
      return;
    }
    
    console.log('[STRIPE_SETTINGS] Verifying Stripe account status:', accountId);
    setVerifying(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stripe/verify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify account');
      }
      
      const { chargesEnabled, payoutsEnabled, detailsSubmitted } = await response.json();
      
      console.log('[STRIPE_SETTINGS] Stripe account status:', {
        chargesEnabled,
        payoutsEnabled,
        detailsSubmitted,
      });
      
      // Update Firestore with the verified status
      const db = getDbSafe();
      if (db && user.uid) {
        const newStatus = detailsSubmitted ? 'complete' : 'incomplete';
        const newEnabled = chargesEnabled && payoutsEnabled;
        
        console.log('[STRIPE_SETTINGS] Updating Firestore with status:', { newStatus, newEnabled });
        
        await updateDoc(doc(db, 'users', user.uid), {
          stripeOnboardingStatus: newStatus,
          stripeAccountEnabled: newEnabled,
        });
        
        // Show success if account is now complete
        if (newStatus === 'complete' && newEnabled) {
          setVerificationSuccess(true);
          setTimeout(() => setVerificationSuccess(false), 3000);
        }
      }
      
      // Refresh the profile to get updated data
      await refreshUserProfile();
      
    } catch (err: any) {
      console.error('[STRIPE_SETTINGS] Error verifying Stripe account:', err);
      setError(err.message || 'Failed to verify Stripe account status');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    // Check if we have returned from Stripe onboarding
    const urlParams = new URLSearchParams(window.location.search);
    const returnedFromStripe = urlParams.get('stripe_return');
    
    if (returnedFromStripe === 'true') {
      console.log('[STRIPE_SETTINGS] Returned from Stripe, verifying account status...');
      
      // Clear the URL parameter to prevent re-verification on refresh
      window.history.replaceState({}, '', window.location.pathname);
      
      // Wait a moment for any webhooks to process, then verify
      setTimeout(() => {
        verifyStripeAccountStatus();
      }, 1000);
    }
  }, []); // Run only on mount

  // Also verify when we have an account ID but status is still pending/incomplete
  useEffect(() => {
    if (stripeAccountId && (onboardingStatus === 'pending' || onboardingStatus === 'incomplete')) {
      // Auto-verify on page load if status seems outdated
      verifyStripeAccountStatus();
    }
  }, [stripeAccountId, onboardingStatus]);

  const handleCreateAccount = async () => {
    console.log('[STRIPE_SETTINGS] handleCreateAccount called', { 
      hasUser: !!user, 
      userId: user?.uid, 
      email: user?.email 
    });

    if (!user?.uid) {
      const errorMsg = 'You must be logged in to set up Stripe';
      console.error('[STRIPE_SETTINGS]', errorMsg);
      setError(errorMsg);
      return;
    }

    if (!user.email) {
      const errorMsg = 'You must have an email address to set up Stripe';
      console.error('[STRIPE_SETTINGS]', errorMsg);
      setError(errorMsg);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use current pathname to ensure we return to the stripe settings page
      const currentPath = window.location.pathname;
      const requestBody = {
        userId: user.uid,
        email: user.email,
        returnUrl: `${window.location.origin}${currentPath}?stripe_return=true`,
        existingAccountId: userProfile?.stripeAccountId || undefined, // Pass existing account if available
      };
      console.log('[STRIPE_SETTINGS] Return URL:', `${window.location.origin}${currentPath}?stripe_return=true`);

      console.log('[STRIPE_SETTINGS] Calling API:', {
        url: '/api/stripe/create-account-link',
        body: requestBody,
      });

      // Call backend API to create Stripe Connect account
      const response = await fetch('/api/stripe/create-account-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[STRIPE_SETTINGS] API response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('[STRIPE_SETTINGS] API error:', errorData);
        throw new Error(errorData.error || `Failed to create Stripe account (${response.status})`);
      }

      const data = await response.json();
      console.log('[STRIPE_SETTINGS] API success:', data);

      const { accountId, onboardingUrl: url } = data;

      if (!accountId || !url) {
        throw new Error('Invalid response from server: missing accountId or onboardingUrl');
      }

      // Save account ID to user profile
      const db = getDbSafe();
      if (db && user.uid) {
        console.log('[STRIPE_SETTINGS] Saving account ID to Firestore:', accountId);
        await updateDoc(doc(db, 'users', user.uid), {
          stripeAccountId: accountId,
          stripeOnboardingStatus: 'pending',
        });
        
        // Refresh profile
        await refreshUserProfile();
      }

      // Redirect to Stripe onboarding
      console.log('[STRIPE_SETTINGS] Redirecting to Stripe onboarding:', url);
      if (url) {
        window.location.href = url;
      } else {
        setOnboardingUrl(url);
        setError('Onboarding URL not received. Please try again.');
      }
    } catch (err: any) {
      console.error('[STRIPE_SETTINGS] Error creating Stripe account:', err);
      const errorMessage = err.message || 'Failed to create Stripe account. Please try again.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = () => {
    console.log('[STRIPE_SETTINGS] handleCompleteOnboarding called', { hasOnboardingUrl: !!onboardingUrl });
    if (onboardingUrl) {
      console.log('[STRIPE_SETTINGS] Using existing onboarding URL');
      window.location.href = onboardingUrl;
    } else {
      console.log('[STRIPE_SETTINGS] No existing URL, creating new account');
      handleCreateAccount();
    }
  };

  const getStatusDisplay = () => {
    if (!stripeAccountId) {
      return {
        status: 'not_setup',
        title: 'Set Up Stripe Account',
        description: 'Connect your Stripe account to receive payouts from your events. It\'s secure, fast, and trusted by millions.',
        action: 'Connect Stripe Account',
      };
    }

    if (onboardingStatus === 'pending' || onboardingStatus === 'incomplete') {
      return {
        status: 'incomplete',
        title: 'Complete Stripe Setup',
        description: 'You\'ve started setting up your Stripe account but haven\'t finished. Click below to complete the process - it only takes a few minutes. Once done, you\'ll be able to charge fees for your events.',
        action: 'Complete Setup',
      };
    }

    if (onboardingStatus === 'complete' && accountEnabled) {
      return {
        status: 'complete',
        title: 'Stripe Account Connected',
        description: 'Your Stripe account is set up and ready to receive payouts. You\'ll receive payments 24 hours after each event.',
        action: null,
      };
    }

    return {
      status: 'pending_approval',
      title: 'Account Pending Approval',
      description: 'Your Stripe account is being reviewed. You\'ll be able to receive payouts once approved.',
      action: null,
    };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-20 sm:pt-24 pb-8 sm:pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c] mb-2">Stripe Payout Settings</h1>
            <p className="text-sm text-gray-500">Manage your payment and payout preferences</p>
          </div>
          <button 
            onClick={() => setViewState(ViewState.PROFILE)} 
            className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors touch-manipulation active:scale-95 shadow-sm"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {verifying && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">Verifying your Stripe account...</p>
              <p className="text-xs text-blue-700">Please wait while we confirm your account setup.</p>
            </div>
          </div>
        )}

        {verificationSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900">Stripe account verified successfully!</p>
              <p className="text-xs text-green-700">You can now charge fees for your events.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900 mb-1">Error</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ${
              statusDisplay.status === 'complete' 
                ? 'bg-green-100 text-green-600' 
                : 'bg-white text-[#635bff]'
            }`}>
              {statusDisplay.status === 'complete' ? (
                <CheckCircle2 size={40} />
              ) : (
                <DollarSign size={40} />
              )}
            </div>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4">
              {statusDisplay.title}
            </h2>
            <p className="text-gray-600 max-w-lg mx-auto mb-8">
              {statusDisplay.description}
            </p>

            {statusDisplay.status === 'complete' && (
              <div className="space-y-4 max-w-md mx-auto mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800 mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="text-sm font-semibold">Account Active & Ready</p>
                  </div>
                  <p className="text-xs text-green-700">
                    Your Stripe account is fully set up. You can now charge fees for your events and receive payouts automatically.
                  </p>
                  <p className="text-xs text-green-600 mt-2 font-mono">
                    ID: {stripeAccountId?.substring(0, 20)}...
                  </p>
                </div>
                
                {/* Quick actions for completed setup */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href="https://dashboard.stripe.com/express"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Manage Stripe Account
                  </a>
                  <button
                    onClick={() => setViewState(ViewState.CREATE_EVENT)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#e35e25] text-white rounded-full text-sm font-medium hover:bg-[#d14e1a] transition-colors"
                  >
                    <DollarSign size={14} />
                    Create Paid Event
                  </button>
                </div>
              </div>
            )}

            {/* Show refresh button and tips for pending/incomplete accounts */}
            {stripeAccountId && (onboardingStatus === 'pending' || onboardingStatus === 'incomplete' || onboardingStatus === undefined) && (
              <div className="space-y-4 mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-yellow-800 mb-2">
                    <strong>Just completed Stripe setup?</strong>
                  </p>
                  <p className="text-xs text-yellow-700 mb-3">
                    If you've just finished the Stripe onboarding, click the button below to verify your account status. It may take a few seconds for Stripe to confirm your account.
                  </p>
                  <button
                    onClick={verifyStripeAccountStatus}
                    disabled={verifying}
                    className="w-full py-2 bg-yellow-600 text-white font-semibold rounded-full hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Verify My Account
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {statusDisplay.action && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[STRIPE_SETTINGS] Button clicked', { loading, action: statusDisplay.action });
                  if (!loading) {
                    handleCompleteOnboarding();
                  }
                }}
                disabled={loading}
                type="button"
                className="px-8 py-4 bg-[#635bff] text-white font-bold rounded-full hover:bg-[#544dc9] transition-colors flex items-center gap-2 mx-auto shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {statusDisplay.action}
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Information Section */}
          <div className="border-t border-gray-200 pt-8 mt-8">
            <h3 className="font-semibold text-[#15383c] mb-4">How It Works</h3>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#15383c] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  1
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1">Set Up Your Account</p>
                  <p>Complete Stripe's secure onboarding process. It takes just a few minutes.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#15383c] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  2
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1">Add Fees to Events</p>
                  <p>When creating events, you can choose to charge a fee. The platform fee is 10% (including Stripe fees).</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#15383c] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  3
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1">Receive Payouts</p>
                  <p>For one-time events, you'll receive your payout 24 hours after the event ends. For recurring events, you'll be paid immediately after each session.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 mb-1">Secure & Trusted</p>
                <p className="text-xs text-blue-800">
                  Stripe is PCI-DSS compliant and used by millions of businesses worldwide. Your financial information is secure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
