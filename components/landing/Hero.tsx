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

  return (
    <section className="relative min-h-[40vh] sm:min-h-[45vh] md:min-h-[50vh] lg:min-h-[55vh] xl:min-h-[60vh] flex items-center justify-center overflow-hidden bg-[#15383c] pt-20 sm:pt-24 md:pt-28 lg:pt-32 xl:pt-36 pb-8 sm:pb-10 md:pb-12 lg:pb-16 xl:pb-20 w-full">
      {/* Abstract Background Elements for Depth (No Image) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Subtle top gradient for light source */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[60%] bg-[#15383c] blur-[120px] rounded-full opacity-50" />
        
        {/* Bottom right accent glow */}
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#15383c] blur-[100px] rounded-full opacity-40" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 text-center flex flex-col items-center justify-center">
        
        <div className="mb-4 sm:mb-5 md:mb-6 lg:mb-7 animate-fade-in-up mt-4 sm:mt-6 md:mt-8">
          <span className="inline-block py-1 sm:py-1.5 md:py-2 px-3.5 sm:px-4 md:px-5 rounded-full bg-white/5 border border-white/10 text-[#e35e25] text-[9px] sm:text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase backdrop-blur-sm">
            {t('hero.badge')}
          </span>
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold text-white mb-5 sm:mb-6 md:mb-7 lg:mb-8 leading-[1.15] sm:leading-[1.1] md:leading-[1.05] tracking-tight px-2 sm:px-4">
          {/* Mobile: Two lines */}
          <span className="sm:hidden">
            {t('hero.titleMobileLine1')}<br />{t('hero.titleMobileLine2')}
          </span>
          {/* Desktop: Single line */}
          <span className="hidden sm:inline">
            {t('hero.title')}
          </span>
        </h1>
        
        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-300 mb-8 sm:mb-10 md:mb-12 lg:mb-14 max-w-3xl mx-auto font-light leading-[1.6] sm:leading-relaxed opacity-90 text-center">
          {t('hero.description')}
        </p>
        
        <div className="flex flex-row sm:flex-row items-center justify-center gap-2.5 sm:gap-4 w-full sm:w-auto px-4">
          {/* First CTA: Browse Circles - Primary Orange */}
          <button 
            onClick={() => handleNav(ViewState.FEED)}
            className="flex-1 sm:flex-none sm:w-auto px-6 sm:px-8 md:px-10 py-3.5 sm:py-3 md:py-3.5 min-h-[48px] sm:min-h-0 bg-[#e35e25] text-white rounded-full font-bold text-sm sm:text-base md:text-lg shadow-lg shadow-[#e35e25]/30 hover:shadow-xl hover:shadow-[#e35e25]/40 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group touch-manipulation active:scale-[0.97]"
          >
            {t('hero.startBrowsing')}
          </button>
          
          {/* Second CTA: Become a Host - Glass Style */}
          <button 
            onClick={() => handleNav(ViewState.CREATE_EVENT)}
            className="flex-1 sm:flex-none sm:w-auto px-6 sm:px-8 md:px-10 py-3.5 sm:py-3 md:py-3.5 min-h-[48px] sm:min-h-0 bg-white/10 backdrop-blur-sm border border-white/30 text-white rounded-full font-bold text-sm sm:text-base md:text-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2 touch-manipulation active:scale-[0.97] whitespace-nowrap"
          >
            {t('hero.becomeHost')} <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px] group-hover:translate-x-1 transition-transform shrink-0" />
          </button>
        </div>
        
        {/* Micro-proof line */}
        <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-gray-400 font-medium tracking-wide">
          {t('hero.microline')}
        </p>
      </div>
    </section>
  );
};