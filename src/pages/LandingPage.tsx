import React, { useState, useMemo, useEffect } from 'react';
import { Hero } from '../../components/landing/Hero';
import { EventFeed } from '../../components/events/EventFeed';
import { EventCard } from '../../components/events/EventCard';
import { preloadImages } from '../../hooks/useImageCache';

// PERFORMANCE: Direct imports for instant scroll - no lazy loading
// These components are small (~200 lines each) and critical for scroll experience
import { Pillars } from '../../components/landing/Pillars';
import { ChatMockupSection } from '../../components/landing/ChatMockupSection';
import { CityInput } from '../../components/layout/CityInput';
import { FilterDrawer } from '../../components/filters/FilterDrawer';
import { SeoHelmet } from '../../components/seo/SeoHelmet';
import { Event, ViewState } from '../../types';
import { Sparkles, Check, ChevronDown, Search, CheckCircle2, ChevronRight, ChevronLeft, Filter, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSelectedCity, useSetCity, initializeGeoLocation, type City } from '../stores/cityStore';
import { useFilterStore } from '../../stores/filterStore';
import { applyEventFilters } from '../../utils/filterEvents';
import { matchesLocationFilter } from '../../utils/location';
import { MAIN_CATEGORIES, MAIN_CATEGORY_LABELS, MAIN_CATEGORY_LABELS_FR, type MainCategory } from '../../utils/categoryMapper';
// Firebase imports moved to dynamic import in newsletter handler for faster initial load
import { sendEmail } from '../lib/email';
import { trackEvent } from '../lib/ga4';
import { redditTrackCTA } from '../lib/redditPixel';

/** GA4 + Reddit CTA tracking for landing page */
interface LandingCTAParams {
  cta_id: string;
  cta_text: string;
  section: string;
  destination: string;
  is_external: boolean;
  [key: string]: unknown; // Index signature for Record<string, unknown> compatibility
}

function trackLandingCTA(params: LandingCTAParams): void {
  // GA4 tracking
  trackEvent('landing_cta_click', params);
  // Reddit Pixel tracking (also fires Lead if destination is /auth)
  redditTrackCTA(params.cta_id, params.cta_text, params.section, params.destination);
}

interface LandingPageProps {
  setViewState: (view: ViewState) => void;
  events: Event[];
  onEventClick: (event: Event) => void;
  onChatClick: (e: React.MouseEvent, event: Event) => void;
  onReviewsClick: (e: React.MouseEvent, event: Event) => void;
  onHostClick: (hostName: string, hostId?: string) => void;
  isLoggedIn?: boolean;
  favorites?: string[];
  onToggleFavorite?: (e: React.MouseEvent, eventId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  setViewState, 
  events, 
  onEventClick, 
  onChatClick, 
  onReviewsClick,
  isLoggedIn,
  favorites = [],
  onToggleFavorite
}) => {
  const { t, language } = useLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const city = useSelectedCity();
  const setCity = useSetCity();
  const location = city;
  const { filters, isFilterDrawerOpen, setFilterDrawerOpen, getActiveFilterCount, setFilter } = useFilterStore();
  
  // Initialize location from IP geolocation on mount
  useEffect(() => {
    initializeGeoLocation();
  }, []);

  // Preload key landing page images for instant scroll-back display
  // PERFORMANCE: Defer preloading until after initial render to not compete with hero LCP
  useEffect(() => {
    const preloadBelowFoldImages = () => {
      preloadImages([
        '/hero-private-chef-vertical.webp', // WebP version for better compression
        '/justin-lim-sale.webp',
        '/corey-oconnell-crowd.webp',
        '/images/pillars/yoga-class.webp',
        '/images/pillars/book-club.webp',
        '/images/pillars/community.webp',
      ]);
    };
    
    // Use requestIdleCallback to defer preloading until browser is idle
    // This prevents competition with hero image for bandwidth on initial load
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preloadBelowFoldImages, { timeout: 3000 });
    } else {
      // Fallback for Safari - defer by 2 seconds
      setTimeout(preloadBelowFoldImages, 2000);
    }
  }, []);
  
  // PERFORMANCE OPTIMIZED: Filter events based on location and vibes (logging removed)
  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    // Apply city filter using centralized helper (utils/location.ts)
    // Handles "All Locations", "Canada", "United States", and specific cities
    filtered = filtered.filter(event => matchesLocationFilter(event, location));
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.hostName.toLowerCase().includes(query) ||
        event.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply filter store filters (vibes, session frequency, mode, etc.)
    return applyEventFilters(filtered, filters);
  }, [events, location, searchQuery, filters]);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };



  const faqs = [
    {
      question: t('landingFaqs.whatIsPopera.question'),
      answer: t('landingFaqs.whatIsPopera.answer')
    },
    {
      question: t('landingFaqs.whatIsCircle.question'),
      answer: t('landingFaqs.whatIsCircle.answer')
    },
    {
      question: t('landingFaqs.whatIsSession.question'),
      answer: t('landingFaqs.whatIsSession.answer')
    },
    {
      question: t('landingFaqs.howRSVPWorks.question'),
      answer: t('landingFaqs.howRSVPWorks.answer')
    },
    {
      question: t('landingFaqs.whyCommitmentFee.question'),
      answer: t('landingFaqs.whyCommitmentFee.answer')
    },
    {
      question: t('landingFaqs.paymentSecurity.question'),
      answer: t('landingFaqs.paymentSecurity.answer')
    },
    {
      question: t('landingFaqs.whoCanHost.question'),
      answer: t('landingFaqs.whoCanHost.answer')
    }
  ];

  return (
    <main className="min-h-screen bg-[#FAFAFA] w-full max-w-full overflow-x-hidden">
      {/* SEO: Landing page meta tags for improved search visibility */}
      <SeoHelmet viewState={ViewState.LANDING} />
      
      {/* 1. Bring Your Crowd Anywhere (Hero section) */}
      <Hero setViewState={setViewState} />
      
      {/* 2. Upcoming Events (event feed section) */}
      <section className="section-padding md:container md:mx-auto md:px-6 lg:px-8 bg-[#FAFAFA] overflow-hidden">
        {/* Header Content */}
        <div className="flex flex-col gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8 md:mb-10 lg:mb-12">
          <div className="max-w-3xl">
            <div className="mb-3 sm:mb-4 px-4 sm:px-0">
               <span className="inline-flex items-center gap-2 py-1 sm:py-1.5 md:py-2 px-3.5 sm:px-4 md:px-5 rounded-full bg-[#15383c]/5 border border-[#15383c]/10 text-[#e35e25] text-[9px] sm:text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">
                  <Sparkles size={10} className="sm:w-3 sm:h-3 -mt-0.5" />
                  {t('feed.happeningNow')}
               </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl font-heading font-bold text-[#15383c] mb-2 sm:mb-3 md:mb-4 px-4 sm:px-0">{t('feed.upcomingPopups')}</h2>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 font-light leading-relaxed px-4 sm:px-0">{t('feed.seeWhereCrowd')}</p>
          </div>

          {/* SEARCH BAR & FILTERS */}
          <div className="mt-4 space-y-6 px-4 sm:px-0">
             {/* Search Inputs Row */}
             <div className="flex flex-col md:flex-row gap-3 w-full md:max-w-3xl relative z-30">
                
                {/* City Input with Autocomplete */}
                <div className="w-full md:w-1/3">
                  <CityInput />
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-2/3 group z-10">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Search size={20} className="text-gray-400 group-focus-within:text-[#e35e25] transition-colors" />
                    </div>
                    <input
                      type="text"
                      placeholder={t('feed.searchPlaceholder')}
                      className="w-full pl-12 pr-4 py-3.5 md:py-4 min-h-[48px] sm:min-h-0 bg-white border border-gray-200 rounded-full text-base sm:text-sm focus:outline-none focus:border-[#15383c] focus:ring-2 focus:ring-[#15383c]/10 shadow-sm hover:shadow-md transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
             </div>

             {/* Category Tabs + Filter Button */}
             <div className="mt-4">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="text-sm font-semibold text-gray-600">{t('landing.filterByCategory')}</h3>
                 <button
                   onClick={() => setFilterDrawerOpen(true)}
                   className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border-2 border-[#15383c] text-[#15383c] font-medium hover:bg-[#15383c] hover:text-white transition-colors flex-shrink-0 touch-manipulation active:scale-[0.95] text-xs sm:text-sm"
                 >
                   <Filter size={16} className="sm:w-[18px] sm:h-[18px]" />
                   <span className="hidden sm:inline">{t('landing.filters')}</span>
                   {getActiveFilterCount() > 0 && (
                     <span className="px-1.5 py-0.5 rounded-full bg-[#e35e25] text-white text-[10px] sm:text-xs font-bold">
                       {getActiveFilterCount()}
                     </span>
                   )}
                 </button>
               </div>
               <div className="relative z-10">
                 <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 hide-scrollbar scroll-smooth w-full touch-pan-x overscroll-x-contain scroll-pl-4 scroll-pr-32 md:scroll-pr-4">
                   {/* All tab */}
                   <button
                     onClick={() => setFilter('mainCategory', null)}
                     className={`shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all touch-manipulation active:scale-[0.95] ${
                       filters.mainCategory === null
                         ? 'bg-[#e35e25] text-white shadow-md'
                         : 'bg-white/20 backdrop-blur-md text-[#15383c] border border-[#15383c]/20 hover:border-[#e35e25] hover:text-[#e35e25]'
                     }`}
                   >
                     {language === 'fr' ? 'TOUT' : 'ALL'}
                   </button>
                   {/* Category tabs */}
                   {MAIN_CATEGORIES.map(category => (
                     <button
                       key={category}
                       onClick={() => setFilter('mainCategory', filters.mainCategory === category ? null : category)}
                       className={`shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all touch-manipulation active:scale-[0.95] whitespace-nowrap ${
                         filters.mainCategory === category
                           ? 'bg-[#e35e25] text-white shadow-md'
                           : 'bg-white/20 backdrop-blur-md text-[#15383c] border border-[#15383c]/20 hover:border-[#e35e25] hover:text-[#e35e25]'
                       }`}
                     >
                       {language === 'fr' ? MAIN_CATEGORY_LABELS_FR[category] : MAIN_CATEGORY_LABELS[category]}
                     </button>
                   ))}
                 </div>
                 <div className="absolute right-0 top-0 bottom-2 w-6 sm:w-8 bg-gradient-to-l from-[#FAFAFA] to-transparent pointer-events-none md:hidden"></div>
               </div>
             </div>
          </div>
        </div>
        
        {/* Single row with one event at a time, horizontally scrollable on all devices */}
        <div className="relative group">
          {/* Left Arrow - Desktop only */}
          <button
            onClick={() => {
              const container = document.getElementById('upcoming-circles-scroll');
              if (container) {
                container.scrollBy({ left: -400, behavior: 'smooth' });
              }
            }}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 items-center justify-center text-[#15383c] hover:bg-[#eef4f5] hover:border-[#15383c] transition-all opacity-0 group-hover:opacity-100 hidden lg:flex"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
          
          {/* Scrollable Row - One event at a time */}
          <div 
            id="upcoming-circles-scroll"
            className="flex overflow-x-auto gap-4 lg:gap-6 pb-2 snap-x snap-mandatory scroll-smooth hide-scrollbar w-full touch-pan-x overscroll-x-contain cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}
            onWheel={(e) => {
              // Allow horizontal scrolling with mouse wheel when hovering over the container
              const container = e.currentTarget;
              if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
                // Use requestAnimationFrame to avoid passive listener warning
                requestAnimationFrame(() => {
                  container.scrollLeft += e.deltaY;
                });
              }
            }}
            onMouseDown={(e) => {
              // Enable drag scrolling - only on non-touch devices
              if ('ontouchstart' in window) return;
              
              const container = e.currentTarget;
              const startX = e.pageX - container.offsetLeft;
              const scrollLeft = container.scrollLeft;
              let isDown = true;

              const handleMouseMove = (e: MouseEvent) => {
                if (!isDown) return;
                const x = e.pageX - container.offsetLeft;
                const walk = (x - startX) * 2;
                container.scrollLeft = scrollLeft - walk;
              };

              const handleMouseUp = () => {
                isDown = false;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove, { passive: true });
              document.addEventListener('mouseup', handleMouseUp, { passive: true });
            }}
          >
            {filteredEvents.map(event => (
              <div key={event.id} className="snap-start shrink-0 w-[85vw] sm:w-[70vw] md:w-[60vw] lg:w-[50vw] xl:w-[40vw] max-w-[500px] flex-shrink-0" style={{ touchAction: 'pan-x pan-y' }}>
                <EventCard 
                  event={event} 
                  onClick={onEventClick} 
                  onChatClick={onChatClick}
                  onReviewsClick={onReviewsClick}
                  isLoggedIn={isLoggedIn}
                  isFavorite={favorites.includes(event.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              </div>
            ))}
          </div>
          
          {/* Right Arrow - Desktop only */}
          <button
            onClick={() => {
              const container = document.getElementById('upcoming-circles-scroll');
              if (container) {
                container.scrollBy({ left: 400, behavior: 'smooth' });
              }
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 items-center justify-center text-[#15383c] hover:bg-[#eef4f5] hover:border-[#15383c] transition-all opacity-0 group-hover:opacity-100 hidden lg:flex"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="mt-8 sm:mt-10 md:mt-12 text-center">
           <button 
             onClick={() => {
               trackLandingCTA({
                 cta_id: 'upcoming_view_all',
                 cta_text: t('landing.viewAllEvents'),
                 section: 'upcoming_circles',
                 destination: '/explore',
                 is_external: false,
               });
               setViewState(ViewState.FEED);
             }}
             className="w-auto mx-auto sm:w-auto px-8 sm:px-10 py-4 sm:py-4 min-h-[48px] sm:min-h-0 border-2 border-gray-300 rounded-full text-[#15383c] font-bold text-base sm:text-base hover:border-[#15383c] hover:bg-[#15383c] hover:text-white transition-all touch-manipulation active:scale-[0.97] active:bg-[#15383c] active:text-white"
           >
             {t('landing.viewAllEvents')}
           </button>
        </div>
      </section>

      {/* 3. Pillars / Types of Circles section */}
      <section className="relative overflow-hidden bg-[#15383c] lazy-section">
        {/* Left image panel - desktop only */}
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden lg:block lg:w-[38%]">
          <img
            src="/hero-private-chef-vertical.webp"
            alt="Private chef serving a group dinner"
            width={800}
            height={1200}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            style={{
              objectPosition: 'center 25%',
              WebkitMaskImage:
                "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 95%)",
              maskImage:
                "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 95%)",
            }}
          />
          {/* Fade overlay into dark green background - starts at 50% to show more image */}
          <div 
            className="pointer-events-none absolute inset-0"
            style={{
              background: "linear-gradient(to right, transparent 0%, transparent 50%, rgba(21,56,60,0.5) 70%, #15383c 100%)"
            }}
            aria-hidden="true"
          />
        </div>

        {/* Content - centered on mobile, shifted right on desktop */}
        <div className="relative z-10 w-full lg:w-[65%] lg:ml-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-24 xl:py-28 text-center">
            <div className="mb-6 sm:mb-8 md:mb-10">
              <span className="inline-flex items-center gap-2 py-1 sm:py-1.5 md:py-2 px-3.5 sm:px-4 md:px-5 rounded-full bg-white/5 border border-white/10 text-[#e35e25] text-[9px] sm:text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase backdrop-blur-sm">
                <Sparkles size={10} className="sm:w-3 sm:h-3 -mt-0.5" />
                {t('landing.badge')}
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold text-white mb-5 sm:mb-6 md:mb-8 tracking-tight leading-[1.1] px-2 sm:px-4">
              {t('landing.title')} <br />
              <span className="text-[#e35e25]">
                {t('landing.titleHighlight')}
              </span>
            </h2>
            
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300/90 font-light leading-relaxed mb-8 sm:mb-10 md:mb-12 max-w-4xl mx-auto px-4 sm:px-6">
              {t('landing.description')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 md:gap-6 px-4">
              <button 
                onClick={() => {
                  trackLandingCTA({
                    cta_id: 'pillars_signup',
                    cta_text: t('landing.signUp'),
                    section: 'pillars',
                    destination: '/auth',
                    is_external: false,
                  });
                  setViewState(ViewState.AUTH);
                }}
                className="px-8 py-4 bg-transparent border-2 border-white/20 text-white rounded-full font-bold text-base hover:bg-white/5 hover:border-white/30 transition-all duration-300 flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] whitespace-nowrap"
              >
                {t('landing.signUp')} <ArrowRight size={18} className="opacity-70" />
              </button>
            </div>
        </div>
      </section>

      {/* 4. Every Great Circle Starts With Real Connection */}
      <ChatMockupSection />

      {/* 5. How To Move Your Crowd */}
      <Pillars />

      {/* 6-7. Trust & FAQ - Unified premium section */}
      <section className="py-10 sm:py-12 lg:py-14 bg-[#15383c] border-t border-white/5 lazy-section far-below-fold relative overflow-hidden">
        {/* Subtle background treatment - soft radial glow */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,255,255,0.03) 0%, transparent 70%)'
          }}
        />
        
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 relative z-10">
          {/* Section Header */}
          <div className="mb-8 lg:mb-10">
            <span className="inline-block py-1.5 px-4 rounded-full bg-[#e35e25]/15 text-[#e35e25] text-[11px] font-bold tracking-[0.18em] uppercase mb-4">
              {t('landing.safetyTrust')}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-heading font-bold text-white tracking-tight leading-tight">
              {t('landing.communityGuidelines')} & FAQs
            </h2>
          </div>

          {/* Desktop: 12-col grid (4 cols left, 8 cols right), Mobile: stack */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 lg:items-stretch">
            
            {/* Trust Panel - Compact info card */}
            <div 
              className="lg:col-span-4 bg-[#faf9f7] rounded-[20px] lg:rounded-[24px] p-5 sm:p-6 lg:p-7 border border-slate-200/60 flex flex-col"
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <h3 className="text-[17px] sm:text-lg font-heading font-semibold text-[#15383c] mb-4 tracking-tight">
                {t('landing.communityGuidelines')}
              </h3>

              {/* Tight checklist */}
              <div className="space-y-2.5 mb-5">
                <div className="flex items-start gap-2.5 text-[#15383c]/80 text-[14px] leading-snug">
                  <div className="flex-shrink-0 w-[18px] h-[18px] mt-0.5 rounded-full bg-[#e35e25]/10 flex items-center justify-center text-[#e35e25]">
                    <Check size={11} strokeWidth={3} />
                  </div>
                  <span>{t('landing.guidelineVerified')}</span>
                </div>
                <div className="flex items-start gap-2.5 text-[#15383c]/80 text-[14px] leading-snug">
                  <div className="flex-shrink-0 w-[18px] h-[18px] mt-0.5 rounded-full bg-[#e35e25]/10 flex items-center justify-center text-[#e35e25]">
                    <Check size={11} strokeWidth={3} />
                  </div>
                  <span>{t('landing.guidelineReviews')}</span>
                </div>
                <div className="flex items-start gap-2.5 text-[#15383c]/80 text-[14px] leading-snug">
                  <div className="flex-shrink-0 w-[18px] h-[18px] mt-0.5 rounded-full bg-[#e35e25]/10 flex items-center justify-center text-[#e35e25]">
                    <Check size={11} strokeWidth={3} />
                  </div>
                  <span>{t('landing.guidelineModerated')}</span>
                </div>
                <div className="flex items-start gap-2.5 text-[#15383c]/80 text-[14px] leading-snug">
                  <div className="flex-shrink-0 w-[18px] h-[18px] mt-0.5 rounded-full bg-[#e35e25]/10 flex items-center justify-center text-[#e35e25]">
                    <Check size={11} strokeWidth={3} />
                  </div>
                  <span>{t('landing.guidelineSafety')}</span>
                </div>
              </div>

              {/* CTAs: inline row - pinned to bottom on desktop */}
              <div className="flex items-center gap-4 lg:mt-auto">
                <button 
                  onClick={() => {
                    trackLandingCTA({
                      cta_id: 'guidelines_signup',
                      cta_text: t('landing.signUp'),
                      section: 'guidelines',
                      destination: '/auth',
                      is_external: false,
                    });
                    setViewState(ViewState.AUTH);
                  }} 
                  className="px-4 py-2 bg-[#e35e25] text-white rounded-full font-semibold text-[13px] hover:bg-[#cf4d1d] transition-colors touch-manipulation active:scale-[0.98]"
                >
                  {t('landing.signUp')}
                </button>
                <button 
                  onClick={() => {
                    trackLandingCTA({
                      cta_id: 'guidelines_see_guidelines',
                      cta_text: t('landing.seeGuidelines'),
                      section: 'guidelines',
                      destination: '/guidelines',
                      is_external: false,
                    });
                    setViewState(ViewState.GUIDELINES);
                  }} 
                  className="text-[#15383c]/60 text-[13px] font-medium hover:text-[#e35e25] transition-colors touch-manipulation"
                >
                  {t('landing.seeGuidelines')} →
                </button>
              </div>
            </div>

            {/* FAQ Panel - Refined accordion */}
            <div 
              className="lg:col-span-8 bg-[#faf9f7] rounded-[20px] lg:rounded-[24px] p-5 sm:p-6 lg:p-7 border border-slate-200/60 flex flex-col"
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <h3 className="text-[17px] sm:text-lg font-heading font-semibold text-[#15383c] mb-4 tracking-tight">
                FAQs
              </h3>
              
              <div className="space-y-0">
                {faqs.map((faq, index) => (
                  <div 
                    key={index} 
                    className={`border-b border-slate-200/70 last:border-b-0 ${index === 0 ? 'border-t border-slate-200/70' : ''}`}
                  >
                    <button 
                      onClick={() => toggleFaq(index)}
                      className="w-full py-3.5 flex items-center justify-between text-left group hover:bg-slate-100/50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <span className={`text-[14px] font-medium transition-colors pr-4 leading-snug ${openFaqIndex === index ? 'text-[#e35e25]' : 'text-[#15383c]'}`}>
                        {faq.question}
                      </span>
                      <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-all duration-300 ${openFaqIndex === index ? 'bg-[#e35e25]/10 text-[#e35e25] rotate-180' : 'text-slate-400 group-hover:text-slate-600'}`}>
                        <ChevronDown size={16} strokeWidth={2.5} />
                      </span>
                    </button>
                    
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaqIndex === index ? 'max-h-[400px] opacity-100 pb-4' : 'max-h-0 opacity-0'}`}>
                      <p className="text-[#15383c]/65 text-[14px] leading-relaxed pr-8">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Stay Updated - Uses content-visibility:auto for far-below-fold performance */}
      <section className="py-6 sm:py-8 md:py-12 lg:py-16 xl:py-20 bg-[#15383c] text-white relative overflow-hidden border-t border-white/5 lazy-section far-below-fold">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl font-heading font-bold text-[#e35e25] mb-4 sm:mb-6 tracking-tight uppercase leading-none">
            {t('landing.stayUpdated')}
          </h2>
          
          <p className="text-sm sm:text-base text-gray-300 mb-8 sm:mb-10 md:mb-12 font-light max-w-2xl mx-auto leading-relaxed">
            {t('landing.stayUpdatedDesc')}
          </p>

          <form 
            className="max-w-2xl mx-auto relative flex items-center mb-4 sm:mb-6" 
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newsletterEmail.trim() || newsletterSubmitting) return;

              // Dynamic import Firebase modules only when newsletter is submitted (performance optimization)
              const { getDbSafe } = await import('../lib/firebase');
              const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');

              // Check for missing config before starting
              const db = getDbSafe();
              const resendKey = import.meta.env.VITE_RESEND_API_KEY;
              
              if (!db && !resendKey) {
                alert('⚠️ Configuration error: Firebase and Resend are not configured.');
                return;
              }

              setNewsletterSubmitting(true);
              setNewsletterSuccess(false);
              
              // Timeout fallback - never stay stuck on "Sending..."
              const timeoutId = setTimeout(() => {
                setNewsletterSubmitting(false);
                if (!newsletterSuccess) {
                  alert('⚠️ Request timed out. Your subscription may have been processed. Please try again.');
                }
              }, 10000); // 10 second timeout
              
              try {
                const email = newsletterEmail.trim();
                const timestamp = new Date().toLocaleString('en-US', { 
                  dateStyle: 'long', 
                  timeStyle: 'short' 
                });

                // Store to Firestore (non-blocking)
                if (db) {
                  addDoc(collection(db, 'newsletter_subscribers'), {
                    email,
                    subscribedAt: serverTimestamp(),
                    createdAt: Date.now(),
                  }).catch((error: any) => {
                    // Silently handle permission errors for newsletter subscription
                    if (error?.code === 'permission-denied') {
                      console.warn('[NEWSLETTER] Permission denied - newsletter subscription not saved to Firestore');
                    } else {
                      console.error('[NEWSLETTER] Error saving to Firestore:', error);
                    }
                  });
                }

                // Send notification email to support
                if (resendKey) {
                  const emailHtml = `
                    <h2 style="margin: 0 0 24px 0; color: #15383c; font-size: 24px; font-weight: bold;">New Newsletter Subscription</h2>
                    <div style="background-color: #f8fafb; padding: 24px; border-radius: 12px;">
                      <p style="margin: 0 0 12px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                        <strong style="color: #15383c;">Email:</strong> <a href="mailto:${email}" style="color: #e35e25; text-decoration: none;">${email}</a>
                      </p>
                      <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                        <strong style="color: #15383c;">Subscribed:</strong> ${timestamp}
                      </p>
                    </div>
                  `;

                  const emailResult = await sendEmail({
                    to: 'support@gopopera.ca',
                    subject: `Newsletter Subscription - ${email}`,
                    html: emailHtml,
                    templateName: 'newsletter-subscription',
                  });

                  if (!emailResult.success && emailResult.error) {
                    console.warn('Email send result:', emailResult);
                  }
                } else {
                  console.warn('Resend API key not configured, skipping email send');
                }

                // Show success
                clearTimeout(timeoutId);
                setNewsletterSuccess(true);
                setNewsletterEmail('');
                setTimeout(() => setNewsletterSuccess(false), 3000);
              } catch (error: any) {
                clearTimeout(timeoutId);
                console.error('Error subscribing to newsletter:', error);
                alert(`⚠️ Error: ${error.message || 'Failed to subscribe. Please try again.'}`);
              } finally {
                setNewsletterSubmitting(false);
              }
            }}
          >
              <input 
                  type="email" 
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={t('landing.emailPlaceholder')} 
                  required
                  disabled={newsletterSubmitting}
                  className="w-full bg-transparent border border-gray-500/50 rounded-full py-3 sm:py-4 md:py-5 pl-6 sm:pl-8 pr-32 sm:pr-40 text-white placeholder-gray-500 focus:outline-none focus:border-[#e35e25] focus:ring-1 focus:ring-[#e35e25] transition-all text-sm sm:text-base md:text-lg disabled:opacity-50"
              />
              <button 
                  type="submit" 
                  disabled={newsletterSubmitting || !newsletterEmail.trim()}
                  className="absolute right-1.5 sm:right-2 top-1.5 sm:top-2 bottom-1.5 sm:bottom-2 bg-white text-[#15383c] px-6 sm:px-8 rounded-full font-bold hover:bg-gray-100 transition-colors shadow-lg text-xs sm:text-sm md:text-base touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {newsletterSubmitting ? '...' : t('landing.submit')}
              </button>
          </form>
          
          {newsletterSuccess && (
            <div className="max-w-2xl mx-auto mb-4">
              <div className="bg-green-500/20 border border-green-500/50 rounded-full px-4 py-2 flex items-center justify-center gap-2">
                <CheckCircle2 size={18} className="text-green-400" />
                <p className="text-green-400 text-sm font-medium">{t('landing.subscribedSuccess')}</p>
              </div>
            </div>
          )}
          
          <p className="text-xs sm:text-sm text-gray-500 opacity-60">
              {t('landing.termsAgreement')} <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  trackLandingCTA({
                    cta_id: 'newsletter_terms',
                    cta_text: t('landing.termsOfUse'),
                    section: 'newsletter',
                    destination: '/terms',
                    is_external: false,
                  });
                  setViewState(ViewState.TERMS);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }} 
                className="underline hover:text-[#e35e25] transition-colors cursor-pointer"
              >
                {t('landing.termsOfUse')}
              </button>.
          </p>
        </div>
      </section>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        events={events}
      />
    </main>
  );
};