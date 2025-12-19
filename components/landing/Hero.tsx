import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ViewState } from '@/types';
import { useLanguage } from '../../contexts/LanguageContext';

interface HeroProps {
    setViewState: (view: ViewState) => void;
}

export const Hero: React.FC<HeroProps> = ({ setViewState }) => {
  const { t } = useLanguage();
  const handleNav = (view: ViewState) => {
      setViewState(view);
      window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Hero image URL - coffee circle gathering
  const heroImageUrl = '/hero-circle-gathering.png';

  return (
    <section className="relative min-h-[90vh] sm:min-h-[85vh] md:min-h-[80vh] lg:min-h-[70vh] xl:min-h-[75vh] flex items-center overflow-hidden bg-[#15383c] pt-20 sm:pt-24 md:pt-28 lg:pt-20 xl:pt-24 pb-12 sm:pb-16 lg:pb-0 w-full">
      
      {/* MOBILE/TABLET: Right-side image layer (absolute, flush to right edge) */}
      <div 
        className="lg:hidden absolute inset-y-0 right-0 w-[52%] sm:w-[50%] overflow-hidden pointer-events-none"
        style={{
          borderTopLeftRadius: '9999px',
          borderBottomLeftRadius: '9999px',
        }}
        aria-hidden="true"
      >
        {/* The image */}
        <img 
          src={heroImageUrl}
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: '35% 40%' }}
          loading="eager"
        />
        
        {/* Left fade gradient overlay (strong left → transparent right) */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, #15383c 0%, rgba(21,56,60,0.7) 20%, rgba(21,56,60,0.3) 40%, transparent 70%)',
          }}
        />
        
        {/* Subtle top fade */}
        <div 
          className="absolute inset-x-0 top-0 h-24 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, #15383c 0%, transparent 100%)',
          }}
        />
        
        {/* Subtle bottom fade */}
        <div 
          className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, #15383c 0%, transparent 100%)',
          }}
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
              onClick={() => handleNav(ViewState.FEED)}
              className="px-5 sm:px-6 py-3 sm:py-3.5 bg-[#e35e25] text-white rounded-full font-bold text-xs sm:text-sm shadow-lg shadow-[#e35e25]/25 hover:shadow-xl transition-all duration-300 flex items-center justify-center touch-manipulation active:scale-[0.98]"
            >
              {t('hero.startBrowsing')}
            </button>
            
            {/* Secondary CTA */}
            <button 
              onClick={() => handleNav(ViewState.CREATE_EVENT)}
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
        
        {/* DESKTOP: Original flex layout */}
        <div className="hidden lg:flex lg:flex-row items-center justify-between gap-4">
          
          {/* Left Column - Text Content */}
          <div className="w-full lg:w-[48%] xl:w-[45%] text-left flex flex-col items-start">
            
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
                onClick={() => handleNav(ViewState.FEED)}
                className="px-8 py-4 bg-[#e35e25] text-white rounded-full font-bold text-base shadow-lg shadow-[#e35e25]/25 hover:shadow-xl hover:shadow-[#e35e25]/35 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center touch-manipulation active:scale-[0.98]"
              >
                {t('hero.startBrowsing')}
              </button>
              
              {/* Secondary CTA */}
              <button 
                onClick={() => handleNav(ViewState.CREATE_EVENT)}
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
          
          {/* Right Column - Hero Image with Pill Mask */}
          <div className="w-full lg:w-[50%] xl:w-[52%] relative">
            <div className="relative w-full aspect-[4/3] xl:aspect-[5/4]">
              {/* Gradient fade on left edge to blend into background */}
              <div className="absolute inset-y-0 left-0 w-32 xl:w-40 bg-gradient-to-r from-[#15383c] to-transparent z-10 pointer-events-none" />
              
              {/* Image container with pill/rounded shape */}
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{
                  borderRadius: '0 40% 40% 0 / 0 50% 50% 0',
                }}
              >
                <img 
                  src={heroImageUrl}
                  alt="People enjoying a circle gathering"
                  className="w-full h-full object-cover object-center"
                  loading="eager"
                />
              </div>
              
              {/* Subtle inner shadow for depth */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: '0 40% 40% 0 / 0 50% 50% 0',
                  boxShadow: 'inset 0 0 60px rgba(21, 56, 60, 0.4)',
                }}
              />
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};
