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
  // Replace with your own image: save to /public/hero-coffee-circle.jpg and use '/hero-coffee-circle.jpg'
  const heroImageUrl = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80';

  return (
    <section className="relative min-h-[85vh] sm:min-h-[80vh] md:min-h-[75vh] lg:min-h-[70vh] xl:min-h-[75vh] flex items-center overflow-hidden bg-[#15383c] pt-20 sm:pt-24 md:pt-28 lg:pt-20 xl:pt-24 pb-0 w-full">
      
      {/* Main content wrapper */}
      <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <div className="flex flex-col lg:flex-row items-center lg:items-center justify-between gap-6 lg:gap-4">
          
          {/* Left Column - Text Content */}
          <div className="w-full lg:w-[48%] xl:w-[45%] text-center lg:text-left flex flex-col items-center lg:items-start pt-4 sm:pt-6 lg:pt-0">
            
            {/* Badge */}
            <div className="mb-4 sm:mb-5 md:mb-6 animate-fade-in-up">
              <span className="inline-block py-1.5 sm:py-2 px-4 sm:px-5 rounded-full bg-white/5 border border-white/10 text-[#e35e25] text-[10px] sm:text-xs font-bold tracking-[0.15em] uppercase backdrop-blur-sm">
                {t('hero.badge')}
              </span>
            </div>
            
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-6xl font-heading font-bold text-white mb-5 sm:mb-6 md:mb-7 leading-[1.12] tracking-tight">
              {t('hero.title')}
            </h1>
            
            {/* Description */}
            <p className="text-sm sm:text-base md:text-lg text-gray-300/90 mb-7 sm:mb-8 md:mb-10 max-w-xl font-light leading-relaxed">
              {t('hero.description')}
            </p>
            
            {/* CTAs */}
            <div className="flex flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {/* Primary CTA */}
              <button 
                onClick={() => handleNav(ViewState.FEED)}
                className="flex-1 sm:flex-none px-6 sm:px-8 py-3.5 sm:py-4 bg-[#e35e25] text-white rounded-full font-bold text-sm sm:text-base shadow-lg shadow-[#e35e25]/25 hover:shadow-xl hover:shadow-[#e35e25]/35 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center touch-manipulation active:scale-[0.98]"
              >
                {t('hero.startBrowsing')}
              </button>
              
              {/* Secondary CTA */}
              <button 
                onClick={() => handleNav(ViewState.CREATE_EVENT)}
                className="flex-1 sm:flex-none px-6 sm:px-8 py-3.5 sm:py-4 bg-transparent border-2 border-white/20 text-white rounded-full font-bold text-sm sm:text-base hover:bg-white/5 hover:border-white/30 transition-all duration-300 flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] whitespace-nowrap"
              >
                {t('hero.becomeHost')} <ArrowRight size={18} className="opacity-70" />
              </button>
            </div>
            
            {/* Micro-proof */}
            <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-gray-400/80 font-medium tracking-wide">
              {t('hero.microline')}
            </p>
          </div>
          
          {/* Right Column - Hero Image with Pill Mask (Desktop only) */}
          <div className="hidden lg:block w-full lg:w-[50%] xl:w-[52%] relative">
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
          
          {/* Mobile/Tablet Image - Visible below text */}
          <div className="w-full lg:hidden mt-6 sm:mt-8">
            <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] overflow-hidden rounded-2xl sm:rounded-3xl">
              {/* Subtle gradient overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#15383c]/40 via-transparent to-[#15383c]/20 z-10 pointer-events-none" />
              
              <img 
                src={heroImageUrl}
                alt="People enjoying a circle gathering"
                className="w-full h-full object-cover object-center"
                loading="eager"
              />
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};
