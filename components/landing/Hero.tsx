import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ViewState } from '@/types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserStore } from '../../stores/userStore';
import { trackEvent } from '../../src/lib/ga4';

/** GA4 CTA tracking for landing page hero section */
interface LandingCTAParams {
  cta_id: string;
  cta_text: string;
  section: string;
  destination: string;
  is_external: boolean;
}

function trackLandingCTA(params: LandingCTAParams): void {
  trackEvent('landing_cta_click', params);
}

interface HeroProps {
    setViewState: (view: ViewState) => void;
}

export const Hero: React.FC<HeroProps> = ({ setViewState }) => {
  const { t } = useLanguage();
  const user = useUserStore((state) => state.user);
  const setRedirectAfterLogin = useUserStore((state) => state.setRedirectAfterLogin);
  
  const handleNav = (view: ViewState, ctaId: string, ctaText: string, destination: string) => {
      trackLandingCTA({
        cta_id: ctaId,
        cta_text: ctaText,
        section: 'hero',
        destination,
        is_external: false,
      });
      setViewState(view);
      window.scrollTo({ top: 0, behavior: 'instant' });
  };
  
  // Handle protected navigation - requires auth
  const handleProtectedNav = (view: ViewState, ctaId: string, ctaText: string, destination: string) => {
    trackLandingCTA({
      cta_id: ctaId,
      cta_text: ctaText,
      section: 'hero',
      destination,
      is_external: false,
    });
    if (user) {
      // User is logged in, navigate directly
      setViewState(view);
    } else {
      // User not logged in, redirect to auth first and set redirect for after login
      setRedirectAfterLogin(view);
      setViewState(ViewState.AUTH);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Hero image URL - coffee circle gathering
  const heroImageUrl = '/hero-circle-gathering.png';

  return (
    <section className="relative min-h-[90vh] sm:min-h-[85vh] md:min-h-[80vh] lg:min-h-[70vh] xl:min-h-[75vh] flex items-center overflow-hidden bg-[#15383c] pt-20 sm:pt-24 md:pt-28 lg:pt-20 xl:pt-24 pb-12 sm:pb-16 lg:pb-0 w-full">
      
      {/* MOBILE/TABLET: Right-side image layer (absolute, flush to right edge) */}
      <div 
        className="lg:hidden absolute inset-y-0 right-0 w-[52%] sm:w-[50%] overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {/* The image with left-edge fade using mask-image */}
        <img 
          src={heroImageUrl}
          alt=""
          className="w-full h-full object-cover"
          style={{ 
            objectPosition: '35% 40%',
            WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 25%, rgba(0,0,0,1) 100%)',
            maskImage: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 25%, rgba(0,0,0,1) 100%)',
          }}
          loading="eager"
        />
      </div>
      
      {/* Main content wrapper */}
      <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        
        {/* MOBILE/TABLET: Text content on left with right padding to avoid image */}
        <div className="lg:hidden pr-[48%] sm:pr-[46%]">
          
          {/* Badge */}
          <div className="mb-3 sm:mb-4 animate-fade-in-up">
            <span className="inline-block py-1.5 sm:py-2 px-3 sm:px-4 rounded-full bg-white/5 border border-white/10 text-[#e35e25] text-[9px] sm:text-[10px] font-bold tracking-[0.12em] uppercase backdrop-blur-sm">
              {t('hero.badge')}
            </span>
          </div>
          
          {/* Title */}
          <h1 className="text-[1.65rem] sm:text-[2rem] md:text-4xl font-heading font-bold text-white mb-3 sm:mb-4 leading-[1.12] tracking-tight">
            {t('hero.title')}
          </h1>
          
          {/* Description */}
          <p className="text-xs sm:text-sm text-gray-300/90 mb-5 sm:mb-6 font-light leading-relaxed">
            {t('hero.description')}
          </p>
          
          {/* CTAs - stacked on very small, side-by-side on sm+ */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            {/* Primary CTA */}
            <button 
              onClick={() => handleNav(ViewState.FEED, 'hero_browse_circles', t('hero.startBrowsing'), '/explore')}
              className="px-5 sm:px-6 py-3 sm:py-3.5 bg-[#e35e25] text-white rounded-full font-bold text-xs sm:text-sm shadow-lg shadow-[#e35e25]/25 hover:shadow-xl transition-all duration-300 flex items-center justify-center touch-manipulation active:scale-[0.98]"
            >
              {t('hero.startBrowsing')}
            </button>
            
            {/* Secondary CTA */}
            <button 
              onClick={() => handleProtectedNav(ViewState.CREATE_EVENT, 'hero_become_host', t('hero.becomeHost'), '/create-event')}
              className="px-5 sm:px-6 py-3 sm:py-3.5 bg-transparent border-2 border-white/20 text-white rounded-full font-bold text-xs sm:text-sm hover:bg-white/5 transition-all duration-300 flex items-center justify-center gap-1.5 touch-manipulation active:scale-[0.98]"
            >
              {t('hero.becomeHost')} <ArrowRight size={14} className="opacity-70" />
            </button>
          </div>
          
          {/* Micro-proof */}
          <p className="mt-4 sm:mt-5 text-[10px] sm:text-xs text-gray-400/70 font-medium tracking-wide">
            {t('hero.microline')}
          </p>
          
        </div>
        
        {/* DESKTOP: Text content on left, image is absolutely positioned */}
        <div className="hidden lg:block lg:w-[48%] xl:w-[45%]">
          
          {/* Text Content */}
          <div className="text-left flex flex-col items-start">
            
            {/* Badge */}
            <div className="mb-5 md:mb-6 animate-fade-in-up">
              <span className="inline-block py-2 px-5 rounded-full bg-white/5 border border-white/10 text-[#e35e25] text-xs font-bold tracking-[0.15em] uppercase backdrop-blur-sm">
                {t('hero.badge')}
              </span>
            </div>
            
            {/* Title */}
            <h1 className="text-[3.25rem] xl:text-6xl font-heading font-bold text-white mb-7 leading-[1.12] tracking-tight">
              {t('hero.title')}
            </h1>
            
            {/* Description */}
            <p className="text-lg text-gray-300/90 mb-10 max-w-xl font-light leading-relaxed">
              {t('hero.description')}
            </p>
            
            {/* CTAs */}
            <div className="flex flex-row items-center gap-4">
              {/* Primary CTA */}
              <button 
                onClick={() => handleNav(ViewState.FEED, 'hero_browse_circles', t('hero.startBrowsing'), '/explore')}
                className="px-8 py-4 bg-[#e35e25] text-white rounded-full font-bold text-base shadow-lg shadow-[#e35e25]/25 hover:shadow-xl hover:shadow-[#e35e25]/35 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center touch-manipulation active:scale-[0.98]"
              >
                {t('hero.startBrowsing')}
              </button>
              
              {/* Secondary CTA */}
              <button 
                onClick={() => handleProtectedNav(ViewState.CREATE_EVENT, 'hero_become_host', t('hero.becomeHost'), '/create-event')}
                className="px-8 py-4 bg-transparent border-2 border-white/20 text-white rounded-full font-bold text-base hover:bg-white/5 hover:border-white/30 transition-all duration-300 flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] whitespace-nowrap"
              >
                {t('hero.becomeHost')} <ArrowRight size={18} className="opacity-70" />
              </button>
            </div>
            
            {/* Micro-proof */}
            <p className="mt-8 text-sm text-gray-400/80 font-medium tracking-wide">
              {t('hero.microline')}
            </p>
          </div>
          
        </div>
      </div>
      
      {/* DESKTOP: Right image panel - flush to right edge with left fade */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden lg:block lg:w-[52%]">
        <img
          src={heroImageUrl}
          alt="People enjoying a circle gathering"
          className="h-full w-full object-cover object-center"
          style={{
            WebkitMaskImage:
              "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 22%, rgba(0,0,0,1) 100%)",
            maskImage:
              "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 22%, rgba(0,0,0,1) 100%)",
          }}
          loading="eager"
        />
      </div>
    </section>
  );
};
