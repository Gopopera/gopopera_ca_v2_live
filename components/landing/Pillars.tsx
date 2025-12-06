import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export const Pillars: React.FC = () => {
  const { t } = useLanguage();
  
  const pillars = [
    {
      id: "01",
      title: t('pillars.curatedSales.title'),
      category: t('pillars.curatedSales.category'),
      description: t('pillars.curatedSales.description'),
      image: "/justin-lim-sale.webp",
    },
    {
      id: "02",
      title: t('pillars.connectPromote.title'),
      category: t('pillars.connectPromote.category'),
      description: t('pillars.connectPromote.description'),
      image: "/corey-oconnell-crowd.webp",
    },
    {
      id: "03",
      title: t('pillars.mobilizeSupport.title'),
      category: t('pillars.mobilizeSupport.category'),
      description: t('pillars.mobilizeSupport.description'),
      image: "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?q=80&w=2074&auto=format&fit=crop",
    },
    {
      id: "04",
      title: t('pillars.learningWorkshops.title'),
      category: t('pillars.learningWorkshops.category'),
      description: t('pillars.learningWorkshops.description'),
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop",
    }
  ];

  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-28 bg-white relative overflow-hidden w-full lg:w-screen lg:max-w-none lg:mx-0">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-12 md:mb-16 lg:mb-20">
          <span className="inline-block py-2 sm:py-2.5 md:py-3 px-4 sm:px-5 md:px-6 rounded-full bg-[#15383c]/5 border border-[#15383c]/10 text-[#e35e25] text-[10px] sm:text-[11px] md:text-xs font-bold tracking-[0.2em] uppercase mb-4 sm:mb-5 md:mb-6">
            {t('pillars.badge')}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-6xl font-heading font-bold text-[#15383c] mb-4 sm:mb-5 md:mb-6 lg:mb-8">
            {t('pillars.title')}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed px-4">
            {t('pillars.description')}
          </p>
        </div>

        {/* Cards Container - Horizontal scroll on mobile, grid on desktop */}
        <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-6 lg:gap-6 xl:gap-8 overflow-x-auto md:overflow-x-visible pb-8 sm:pb-10 md:pb-0 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 snap-x snap-mandatory scroll-smooth hide-scrollbar w-full overscroll-x-contain scroll-pl-4" style={{ touchAction: 'pan-x pan-y' }}>
          {pillars.map((pillar) => (
            <div 
              key={pillar.id}
              className="group relative h-auto min-h-[500px] sm:min-h-[560px] md:min-h-[550px] lg:min-h-[600px] xl:min-h-[650px] min-w-[85vw] sm:min-w-[70vw] md:min-w-0 lg:min-w-0 rounded-3xl sm:rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 snap-center flex-shrink-0"
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
              
              {/* Content */}
              <div className="absolute inset-0 p-6 sm:p-7 md:p-6 lg:p-8 xl:p-10 flex flex-col justify-end z-20">
                {/* Title - Styled with the badge styling (rounded-full, orange background) matching original category tag size */}
                <h3 className="inline-block py-1 sm:py-1.5 md:py-2 px-3.5 sm:px-4 md:px-5 rounded-full bg-[#e35e25]/95 border-2 border-[#e35e25] text-white text-[10px] sm:text-[11px] md:text-xs font-bold tracking-[0.2em] uppercase mb-4 sm:mb-5 md:mb-5 lg:mb-6 w-fit shadow-lg">
                  {pillar.title}
                </h3>
                
                {/* Description - High contrast body text optimized for desktop readability */}
                <p className="text-white text-sm sm:text-base md:text-sm lg:text-base xl:text-lg font-sans font-normal leading-relaxed mb-0 border-l-4 border-[#e35e25] pl-4 sm:pl-5 md:pl-4 lg:pl-5 xl:pl-6 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] bg-black/40 backdrop-blur-md py-3 sm:py-4 md:py-3 lg:py-4 xl:py-5 pr-3 sm:pr-4 md:pr-3 lg:pr-4 xl:pr-5 rounded-r-xl">
                  {pillar.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
