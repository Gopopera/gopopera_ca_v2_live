import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const Pillars: React.FC = () => {
  const { t } = useLanguage();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  
  const pillars = [
    {
      id: "01",
      title: t('pillars.makeCreate.title'),
      category: t('pillars.makeCreate.category'),
      description: t('pillars.makeCreate.description'),
      image: "/justin-lim-sale.webp",
    },
    {
      id: "02",
      title: t('pillars.eatDrink.title'),
      category: t('pillars.eatDrink.category'),
      description: t('pillars.eatDrink.description'),
      image: "/corey-oconnell-crowd.webp",
    },
    {
      id: "03",
      title: t('pillars.moveFlow.title'),
      category: t('pillars.moveFlow.category'),
      description: t('pillars.moveFlow.description'),
      image: "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?q=80&w=2074&auto=format&fit=crop",
    },
    {
      id: "04",
      title: t('pillars.talkThink.title'),
      category: t('pillars.talkThink.category'),
      description: t('pillars.talkThink.description'),
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop",
    },
    {
      id: "05",
      title: t('pillars.communitySupport.title'),
      category: t('pillars.communitySupport.category'),
      description: t('pillars.communitySupport.description'),
      image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2074&auto=format&fit=crop",
    }
  ];

  // Check scroll position to show/hide arrows
  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollWidth - clientWidth - scrollLeft > 10); // 10px threshold for smooth UX
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Initial check
    checkScrollPosition();

    // Listen to scroll events
    container.addEventListener('scroll', checkScrollPosition);
    
    // Check on resize
    const handleResize = () => {
      setTimeout(checkScrollPosition, 100);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const scrollLeft = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cardWidth = container.clientWidth * 0.35; // Approximate card width
    container.scrollBy({ left: -cardWidth, behavior: 'smooth' });
  };

  const scrollRight = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cardWidth = container.clientWidth * 0.35; // Approximate card width
    container.scrollBy({ left: cardWidth, behavior: 'smooth' });
  };

  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-28 bg-white relative w-full">
      {/* Section Header - Constrained */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 relative z-10">
        <div className="text-center mb-10 sm:mb-12 md:mb-16 lg:mb-20">
          <span className="inline-block py-2 sm:py-2.5 md:py-3 px-4 sm:px-5 md:px-6 rounded-full bg-[#15383c]/5 border border-[#15383c]/10 text-[#e35e25] text-[10px] sm:text-[11px] md:text-xs font-bold tracking-[0.2em] uppercase mb-4 sm:mb-5 md:mb-6">
            {t('pillars.badge')}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-6xl font-heading font-bold text-[#15383c] mb-4 sm:mb-5 md:mb-6 lg:mb-8">
            <span className="block">{t('pillars.sectionTitle')}</span>
            <span className="block md:mt-0">{t('pillars.sectionTitleLine2')}</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed px-4">
            {t('pillars.description')}
          </p>
        </div>
      </div>

      {/* Cards Container - Full width for edge-to-edge scroll */}
      <div className="relative w-full">
        {/* Soft fade overlays on edges */}
        <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none" />
        <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none" />
        
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-5 md:gap-6 lg:gap-8 hide-scrollbar w-full scroll-smooth overscroll-x-contain px-6 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32"
          style={{ 
            touchAction: 'pan-x pan-y',
            scrollPaddingLeft: '1.5rem',
            scrollPaddingRight: '1.5rem'
          }}
        >
          {pillars.map((pillar) => (
            <div 
              key={pillar.id}
              className="group relative h-auto min-h-[425px] sm:min-h-[560px] md:min-h-[550px] lg:min-h-[600px] xl:min-h-[650px] flex-none w-[280px] sm:w-[300px] md:w-[320px] lg:w-[340px] xl:w-[360px] snap-start rounded-3xl sm:rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-3"
              style={{ touchAction: 'pan-x pan-y' }}
            >
              {/* Background Image - No filters, crisp and clean */}
              <img 
                src={pillar.image} 
                alt={pillar.title} 
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110 pointer-events-none"
                style={{ filter: 'none', touchAction: 'none' }}
                loading="lazy"
                draggable="false"
              />
              
              {/* Enhanced gradient for better text readability on desktop */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 pointer-events-none"></div>
              
              {/* Content - Tag and Description at bottom */}
              <div className="absolute inset-0 p-6 sm:p-7 md:p-6 lg:p-8 xl:p-10 flex flex-col justify-end z-20">
                {/* Wrapper for tag and description to ensure consistent positioning */}
                <div className="flex flex-col gap-3 sm:gap-3 md:gap-4">
                  {/* Title Tag - Positioned directly above body text */}
                  <div className="flex justify-start z-30">
                    <h3 className="inline-block py-0.5 sm:py-1 md:py-1 px-2.5 sm:px-3 md:px-3.5 rounded-full bg-[#e35e25]/95 border-2 border-[#e35e25] text-white text-[9px] sm:text-[10px] md:text-[10px] font-bold tracking-[0.1em] uppercase whitespace-nowrap shadow-lg">
                      {pillar.title}
                    </h3>
                  </div>
                  
                  {/* Description - Flexible height with proper text sizing */}
                  <p className="text-white text-xs sm:text-sm md:text-sm lg:text-base xl:text-lg font-sans font-normal leading-relaxed mb-0 border-l-4 border-[#e35e25] pl-3 sm:pl-4 md:pl-4 lg:pl-5 xl:pl-6 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] bg-black/40 backdrop-blur-md py-2.5 sm:py-3 md:py-3 lg:py-4 xl:py-5 pr-2.5 sm:pr-3 md:pr-3 lg:pr-4 xl:pr-5 rounded-r-xl min-h-[70px] sm:min-h-[80px] md:min-h-[85px] lg:min-h-[90px] xl:min-h-[95px] flex items-center">
                    {pillar.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scroll Indicators - Desktop only */}
        <div className="hidden md:flex absolute bottom-6 right-12 lg:right-16 xl:right-24 2xl:right-32 gap-2 z-30">
          {showLeftArrow && (
            <button
              onClick={scrollLeft}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-[#15383c]/20 text-[#15383c] flex items-center justify-center hover:bg-white hover:border-[#15383c]/40 transition-all shadow-lg"
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {showRightArrow && (
            <button
              onClick={scrollRight}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-[#15383c]/20 text-[#15383c] flex items-center justify-center hover:bg-white hover:border-[#15383c]/40 transition-all shadow-lg"
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
