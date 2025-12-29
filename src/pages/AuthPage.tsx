import React, { useEffect, useState } from 'react';
import { ChevronLeft, Eye, EyeOff, X } from 'lucide-react';
import { ViewState } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserStore } from '../../stores/userStore';
import { loginWithGoogle } from '../lib/authHelpers';
import { sendPasswordReset } from '../lib/firebaseAuth';

interface AuthPageProps {
  setViewState: (view: ViewState) => void;
  onLogin: (email: string, password: string) => Promise<void>;
}

type AuthStep = 'create-account' | 'email-signup' | 'preferences' | 'sign-in';

export const AuthPage: React.FC<AuthPageProps> = ({ setViewState, onLogin }) => {
  // ALL HOOKS MUST BE DECLARED AT THE TOP LEVEL - BEFORE ANY CONDITIONAL LOGIC
  const { t } = useLanguage();
  const [step, setStep] = useState<AuthStep>('create-account');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPreference, setSelectedPreference] = useState<'attend' | 'host' | 'both' | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // REMOVED: Duplicate getRedirectResult() call that was consuming redirect results
  // before userStore.init() could process them. userStore.init() handles redirect results
  // properly, so we don't need to check here. This was causing mobile login to fail.

  // Regular functions can be declared after all hooks
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEmailSignup = () => {
    if (formData.name && formData.email && formData.password) {
      setStep('preferences');
    }
  };

  const handleGoogleSignIn = async () => {
    // Run immediately on click - use universal handler
    setGoogleError(null);
    setIsGoogleLoading(true);
    setEmailError(null);
    console.log('[AUTH_UI] Google button clicked');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthPage.tsx:56',message:'Google button clicked',data:{timestamp:Date.now(),url:typeof window!=='undefined'?window.location.href:'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // Check COOP header
    if (typeof window !== 'undefined') {
      fetch(window.location.href, { method: 'HEAD' }).then(r => {
        const coopHeader = r.headers.get('Cross-Origin-Opener-Policy');
        fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthPage.tsx:58',message:'COOP header check',data:{coopHeader:coopHeader||'NOT_SET',allHeaders:Object.fromEntries(r.headers.entries())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      }).catch(()=>{});
    }
    // #endregion
    
    try {
      const userStore = useUserStore.getState();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthPage.tsx:67',message:'About to call userStore.signInWithGoogle',data:{hasUserStore:!!userStore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const result = await userStore.signInWithGoogle();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthPage.tsx:70',message:'userStore.signInWithGoogle returned',data:{hasResult:!!result,isNull:result===null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // If redirect was used, result will be null and page should navigate away
      if (result === null) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthPage.tsx:75',message:'Redirect used, should navigate away',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        // Don't clear loading state - redirect should navigate away
        return;
      }
      
      // Clear loading state quickly - auth listener will handle state update
      setTimeout(() => {
        setIsGoogleLoading(false);
      }, 100);
    } catch (error: any) {
      console.error("[AUTH] Google sign-in error:", error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f7065768-27bb-48d1-b0ad-1695bbe5dd63',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthPage.tsx:86',message:'ERROR caught in handleGoogleSignIn',data:{errorCode:error?.code,errorMessage:error?.message,errorStack:error?.stack?.substring(0,200),errorName:error?.name,fullError:JSON.stringify(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setGoogleError(error?.message || "Something went wrong signing you in. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (selectedPreference && formData.email && formData.password && formData.name) {
      try {
        setSignupError(null);
        const userStore = useUserStore.getState();
        await userStore.signUp(formData.email, formData.password, formData.name, selectedPreference);
        // Auth listener will handle redirect
      } catch (error: any) {
        console.error("Signup failed:", error);
        setSignupError(error?.message || 'We could not sign you up. Please try again.');
      }
    }
  };

  const handleBack = () => {
    if (step === 'email-signup') {
      setStep('create-account');
    } else if (step === 'preferences') {
      setStep('email-signup');
    } else if (step === 'sign-in') {
      setStep('create-account');
    } else {
      setViewState(ViewState.LANDING);
    }
  };

  const handleSignIn = async () => {
    if (formData.email && formData.password) {
      setEmailError(null);
      try {
        await onLogin(formData.email, formData.password);
      } catch (error: any) {
        const errorMessage = error?.message || 'We could not sign you in. Please try again.';
        setEmailError(errorMessage);
        
        // Show modal for password errors
        if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential' || error?.code === 'auth/too-many-requests') {
          // Error message is already set with remaining attempts info
          // The error will be displayed in the UI
        }
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setResetError('Please enter your email address first.');
      return;
    }

    setIsResetting(true);
    setResetError(null);
    
    try {
      await sendPasswordReset(formData.email);
      setResetEmailSent(true);
      setShowForgotPassword(false);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setResetError(error?.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafb] flex flex-col">
      {/* Back Button */}
      <div className="p-4 sm:p-5 md:p-6">
        <button 
          onClick={handleBack}
          className="flex items-center text-[#15383c] font-bold hover:opacity-80 transition-opacity touch-manipulation active:scale-95"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 border border-gray-200 rounded-full flex items-center justify-center bg-white mr-2 sm:mr-3 shadow-sm hover:shadow-md transition-shadow">
            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
          </div>
          <span className="text-sm sm:text-base">{t('common.back')}</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 md:pb-20">
        {/* Screen 1: Create an Account */}
        {step === 'create-account' && (
          <div className="space-y-5 sm:space-y-6 w-full max-w-md">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-[#15383c] text-center mb-2">
              {t('auth.createAccount')}
            </h1>
            <p className="text-sm sm:text-base text-gray-500 text-center mb-6 sm:mb-8">
              {t('auth.createAccountSubtitle')}
            </p>

            {/* Google Sign-In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full py-3.5 sm:py-4 bg-white border-2 border-gray-200 text-[#15383c] font-bold rounded-full shadow-sm hover:shadow-md hover:border-[#e35e25] transition-all flex items-center justify-center gap-3 touch-manipulation text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <span>Signing you in...</span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t('auth.googleSignIn')}
                </>
              )}
            </button>
            {googleError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {googleError}
              </div>
            )}
            {signupError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {signupError}
              </div>
            )}
            {emailError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {emailError}
              </div>
            )}

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[#f8fafb] text-gray-500">{t('auth.or')}</span>
              </div>
            </div>

            {/* Email Sign-Up Button - Primary CTA */}
            <button
              onClick={() => setStep('email-signup')}
              className="w-full py-3.5 sm:py-4 bg-[#15383c] text-white font-bold rounded-full shadow-lg shadow-[#15383c]/25 hover:shadow-xl hover:shadow-[#15383c]/30 transition-all touch-manipulation text-sm sm:text-base"
            >
              {t('auth.emailSignUp')}
            </button>

            {/* Sign In Link */}
            <p className="text-center text-gray-600 text-sm mt-6">
              {t('auth.alreadyHaveAccount')}{' '}
              <button
                onClick={() => {
                  setStep('sign-in');
                  setFormData({ name: '', email: '', password: '' });
                }}
                className="text-[#e35e25] font-semibold hover:underline"
              >
                {t('auth.signIn')}
              </button>
            </p>
          </div>
        )}

        {/* Screen 2: Email Sign-Up Form */}
        {step === 'email-signup' && (
          <div className="space-y-5 sm:space-y-6 w-full max-w-md">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-[#15383c] text-center mb-2">
              {t('auth.createAccount')}
            </h1>
            <p className="text-sm sm:text-base text-gray-500 text-center mb-6 sm:mb-8">
              {t('auth.enterDetails')}
            </p>

            {/* Name Field - Glass Style Input */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#15383c] mb-2">
                {t('auth.name')}
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={t('auth.namePlaceholder')}
                className="w-full px-4 py-3 text-base bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-xl focus:border-[#e35e25] focus:bg-white focus:outline-none transition-all shadow-sm"
              />
            </div>

            {/* Email Field - Glass Style Input */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#15383c] mb-2">
                {t('auth.email')}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder={t('auth.emailPlaceholder')}
                className="w-full px-4 py-3 text-base bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-xl focus:border-[#e35e25] focus:bg-white focus:outline-none transition-all shadow-sm"
              />
            </div>

            {/* Password Field - Glass Style Input */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#15383c] mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="w-full px-4 py-3 text-base bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-xl focus:border-[#e35e25] focus:bg-white focus:outline-none transition-all pr-12 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#15383c] transition-colors touch-manipulation p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Create Account Button */}
            <button
              onClick={handleEmailSignup}
              disabled={!formData.name || !formData.email || !formData.password}
              className="w-full py-3.5 sm:py-4 bg-[#e35e25] text-white font-bold rounded-full shadow-lg hover:bg-[#cf4d1d] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6 touch-manipulation text-sm sm:text-base"
            >
              {t('auth.createMyAccount')}
            </button>
          </div>
        )}

        {/* Screen 3: Preferences Selection */}
        {step === 'preferences' && (
          <div className="space-y-5 sm:space-y-6 w-full max-w-md">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-[#15383c] text-center mb-2">
              {t('auth.choosePreference')}
            </h1>
            <p className="text-sm sm:text-base text-gray-500 text-center mb-6 sm:mb-8">
              {t('auth.preferenceSubtitle')}
            </p>

            <div className="space-y-3 sm:space-y-4">
              {/* Attend Events */}
              <button
                onClick={() => setSelectedPreference('attend')}
                className={`w-full p-5 sm:p-6 border-2 rounded-xl sm:rounded-2xl text-left transition-all touch-manipulation ${
                  selectedPreference === 'attend'
                    ? 'border-[#e35e25] bg-[#e35e25]/5 shadow-md'
                    : 'border-gray-200 bg-white hover:border-[#e35e25]/50'
                }`}
              >
                <div className="font-heading font-bold text-base sm:text-lg text-[#15383c] mb-2">
                  {t('auth.attendEvents')}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t('auth.attendEventsDesc')}
                </div>
              </button>

              {/* Host Events */}
              <button
                onClick={() => setSelectedPreference('host')}
                className={`w-full p-5 sm:p-6 border-2 rounded-xl sm:rounded-2xl text-left transition-all touch-manipulation ${
                  selectedPreference === 'host'
                    ? 'border-[#e35e25] bg-[#e35e25]/5 shadow-md'
                    : 'border-gray-200 bg-white hover:border-[#e35e25]/50'
                }`}
              >
                <div className="font-heading font-bold text-base sm:text-lg text-[#15383c] mb-2">
                  {t('auth.hostEvents')}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t('auth.hostEventsDesc')}
                </div>
              </button>

              {/* Both */}
              <button
                onClick={() => setSelectedPreference('both')}
                className={`w-full p-5 sm:p-6 border-2 rounded-xl sm:rounded-2xl text-left transition-all touch-manipulation ${
                  selectedPreference === 'both'
                    ? 'border-[#e35e25] bg-[#e35e25]/5 shadow-md'
                    : 'border-gray-200 bg-white hover:border-[#e35e25]/50'
                }`}
              >
                <div className="font-heading font-bold text-base sm:text-lg text-[#15383c] mb-2">
                  {t('auth.both')}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t('auth.bothDesc')}
                </div>
              </button>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleFinalSubmit}
              disabled={!selectedPreference}
              className="w-full py-3.5 sm:py-4 bg-[#e35e25] text-white font-bold rounded-full shadow-lg hover:bg-[#cf4d1d] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6 touch-manipulation text-sm sm:text-base"
            >
              {t('auth.continue')}
            </button>
          </div>
        )}

        {/* Screen: Sign In */}
        {step === 'sign-in' && (
          <div className="space-y-5 sm:space-y-6 w-full max-w-md">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-[#15383c] text-center mb-2">
              {t('auth.signIn')}
            </h1>
            <p className="text-sm sm:text-base text-gray-500 text-center mb-6 sm:mb-8">
              {t('auth.signInSubtitle')}
            </p>

            {/* Google Sign-In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full py-3.5 sm:py-4 bg-white border-2 border-gray-200 text-[#15383c] font-bold rounded-full shadow-sm hover:shadow-md hover:border-[#e35e25] transition-all flex items-center justify-center gap-3 touch-manipulation text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <span>Signing you in...</span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t('auth.googleSignIn')}
                </>
              )}
            </button>
            {googleError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {googleError}
              </div>
            )}
            {emailError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {emailError}
              </div>
            )}

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[#f8fafb] text-gray-500">{t('auth.or')}</span>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#15383c] mb-2">
                {t('auth.email')}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder={t('auth.emailPlaceholder')}
                className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-[#e35e25] focus:outline-none transition-colors"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs sm:text-sm font-semibold text-[#15383c]">
                  {t('auth.password')}
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs sm:text-sm text-[#e35e25] hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-[#e35e25] focus:outline-none transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#15383c] transition-colors touch-manipulation p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              onClick={handleSignIn}
              disabled={!formData.email || !formData.password}
              className="w-full py-3.5 sm:py-4 bg-[#e35e25] text-white font-bold rounded-full shadow-lg hover:bg-[#cf4d1d] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6 touch-manipulation text-sm sm:text-base"
            >
              {t('auth.signIn')}
            </button>
            
            {/* Reset Email Sent Success Message */}
            {resetEmailSent && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                <p className="font-semibold mb-1">Password reset email sent!</p>
                <p>Check your inbox for instructions to reset your password.</p>
              </div>
            )}
            
            {/* Forgot Password Modal */}
            {showForgotPassword && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForgotPassword(false)}>
                <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#15383c]">Reset Password</h2>
                    <button
                      onClick={() => setShowForgotPassword(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                  
                  <div className="mb-4">
                    <label className="block text-xs sm:text-sm font-semibold text-[#15383c] mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-[#e35e25] focus:outline-none transition-colors"
                    />
                  </div>
                  
                  {resetError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {resetError}
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowForgotPassword(false)}
                      className="flex-1 py-3 px-4 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleForgotPassword}
                      disabled={!formData.email || isResetting}
                      className="flex-1 py-3 px-4 bg-[#e35e25] text-white font-bold rounded-xl hover:bg-[#cf4d1d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isResetting ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sign Up Link */}
            <p className="text-center text-gray-600 text-sm mt-6">
              {t('auth.dontHaveAccount')}{' '}
              <button
                onClick={() => {
                  setStep('create-account');
                  setFormData({ name: '', email: '', password: '' });
                }}
                className="text-[#e35e25] font-semibold hover:underline"
              >
                {t('auth.createAccount')}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
