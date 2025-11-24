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
    <section className="relative min-h-[40vh] sm:min-h-[45vh] md:min-h-[50vh] lg:min-h-[55vh] xl:min-h-[60vh] flex items-center justify-center overflow-hidden bg-[#15383c] section-padding-fluid w-full">
      {/* Abstract Background Elements for Depth (No Image) - Ambient radial gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Subtle top gradient for light source */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[60%] bg-[#15383c] blur-[120px] rounded-full opacity-50" />
        
        {/* Bottom right accent glow */}
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#15383c] blur-[100px] rounded-full opacity-40" />
        
        {/* Ambient radial gradient overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-[#15383c] via-[#15383c]/95 to-[#15383c] opacity-60" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-screen-xl mx-auto px-fluid text-center flex flex-col items-center justify-center">
        
        <div className="mb-fluid animate-fade-in-up mt-fluid">
          <span className="inline-block py-1 sm:py-1.5 md:py-2 px-3.5 sm:px-4 md:px-5 rounded-full bg-white/5 border border-white/10 text-[#e35e25] fluid-small font-bold tracking-[0.2em] uppercase backdrop-blur-sm">
            {t('hero.badge')}
          </span>
        </div>
        
        <h1 className="fluid-heading-1 font-heading font-bold text-white mb-fluid leading-[1.15] tracking-tight px-fluid">
          {t('hero.title')} <br />
          <span className="text-[#e35e25]">{t('hero.titleHighlight')}</span>
        </h1>
        
        <p className="fluid-paragraph text-gray-300 mb-fluid max-w-2xl mx-auto font-light leading-[1.6] opacity-90 px-fluid">
          {t('hero.description')}
        </p>
        
        <div className="flex flex-row sm:flex-row items-center justify-center gap-fluid w-full sm:w-auto px-fluid">
          {/* First CTA: Get Started → goes to onboarding (sign-up flow) */}
          <button 
            onClick={() => handleNav(ViewState.AUTH)}
            className="flex-1 sm:flex-none sm:w-auto px-6 sm:px-8 md:px-10 py-4 min-h-[48px] bg-transparent border-2 border-[#e35e25] text-white rounded-full font-bold fluid-paragraph hover:bg-[#e35e25] hover:shadow-xl hover:shadow-orange-900/20 hover:-translate-y-1 transition-base flex items-center justify-center group touch-manipulation active:scale-[0.97] active:bg-[#e35e25]"
          >
            {t('hero.getStarted')}
          </button>
          
          {/* Second CTA: Start Browsing → shows events / main feed */}
          <button 
            onClick={() => handleNav(ViewState.FEED)}
            className="flex-1 sm:flex-none sm:w-auto px-6 sm:px-8 md:px-10 py-4 min-h-[48px] bg-transparent border-2 border-white/20 text-white rounded-full font-bold fluid-paragraph hover:bg-white/5 transition-base flex items-center justify-center gap-2 touch-manipulation active:scale-[0.97] active:bg-white/10 whitespace-nowrap"
          >
            {t('hero.startBrowsing')} <ArrowRight size={18} className="sm:w-5 sm:h-5 group-hover:translate-x-1 transition-base shrink-0" />
          </button>
        </div>
      </div>
    </section>
  );
};