import React, { useState, useMemo } from 'react';
import { Hero } from '../components/landing/Hero';
import { Pillars } from '../components/landing/Pillars';
import { EventFeed } from '../components/events/EventFeed';
import { EventCard } from '../components/events/EventCard';
import { ChatMockupSection } from '../components/landing/ChatMockupSection';
import { CityInput } from '../components/layout/CityInput';
import { Event, ViewState } from '../types';
import { ArrowRight, Sparkles, Check, ChevronDown, Search, MapPin, PlusCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { categoryMatches } from '../utils/categoryMapper';
import { useSelectedCity, useSetCity, type City } from '../src/stores/cityStore';
import { getDbSafe } from '../src/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sendEmail } from '../src/lib/email';

interface LandingPageProps {
  setViewState: (view: ViewState) => void;
  events: Event[];
  onEventClick: (event: Event) => void;
  onChatClick: (e: React.MouseEvent, event: Event) => void;
  onReviewsClick: (e: React.MouseEvent, event: Event) => void;
  onHostClick: (hostName: string) => void;
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
  const { t } = useLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const city = useSelectedCity();
  const setCity = useSetCity();
  const location = city;
  
  // Filter events based on category and location
  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    // Apply category filter
    // Uses category mapper to handle plural/singular variations (e.g., "Markets" -> "Market")
    if (activeCategory !== 'All') {
      filtered = filtered.filter(event => 
        categoryMatches(event.category, activeCategory)
      );
    }
    
    // Apply city filter - match by city slug or city name
    if (location && location.trim() && location !== 'montreal') {
      const citySlug = location.toLowerCase();
      filtered = filtered.filter(event => {
        const eventCityLower = event.city.toLowerCase();
        // Match by slug (e.g., "montreal" matches "Montreal, CA")
        return eventCityLower.includes(citySlug) || 
               eventCityLower.includes(citySlug.replace('-', ' '));
      });
    }
    
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
    
    return filtered;
  }, [events, activeCategory, location, searchQuery]);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const categories = [
    'All', 'Community', 'Music', 'Workshops', 'Markets', 'Sports', 'Social', 'Shows', 'Food & Drink', 'Wellness'
  ];

  const popularCities: Array<{ slug: City; label: string }> = [
    { slug: 'montreal', label: 'Montreal, CA' },
    { slug: 'toronto', label: 'Toronto, CA' },
    { slug: 'ottawa', label: 'Ottawa, CA' },
    { slug: 'quebec', label: 'Quebec City, CA' },
    { slug: 'gatineau', label: 'Gatineau, CA' },
    { slug: 'vancouver', label: 'Vancouver, CA' },
  ];

  const faqs = [
    {
      question: "1. What is Popera?",
      answer: "Popera is Canada's first community-powered pop-up platform, where anyone can safely create, discover, and join meaningful pop-up experiences near them. From garage sales to art shows, local meetups, and cultural events, Popera helps bring people together through authentic, real-world moments. All powered by simple RSVPs, built-in group chats, and transparent reviews."
    },
    {
      question: "2. What is a \"Pop-up\"?",
      answer: "A \"Pop-up\" is a short-term, real-world experience: a sale, gathering, or creative moment. Hosted by everyday people, creators, or small brands. Think of it as a mini event that appears, connects people, and disappears until the next one. Popera makes hosting or joining these pop-ups as easy as sending an invite or claiming a spot and allows connections to be more efficient before, during and after the event."
    },
    {
      question: "3. How do RSVPs and the address unlock work?",
      answer: "When you RSVP to a Popera event, you instantly join its private group chat and community. The exact address stays hidden until your reservation is confirmed. This ensures privacy and safety for hosts and guests alike. Once confirmed, you'll unlock the address and get all event details right in your group conversation."
    },
    {
      question: "4. Why is there a commitment fee?",
      answer: "Not every event has a fee. Many Popera events are free, while others include a small reservation/commitment fee set by the host. It varies by community norms, event type, and the host's preference (e.g., limited spots, high-demand pop-ups). When a fee is used, it's there to reduce no-shows and protect everyone's time. You'll always see the amount upfront before you RSVP."
    },
    {
      question: "5. Is my payment secure, and what if an event is canceled?",
      answer: "Absolutely. All payments on Popera are processed through Stripe, a trusted global payment provider. If a host cancels, your reservation is automatically refunded. Your data and payments are protected end-to-end, so you can focus on enjoying the experience."
    },
    {
      question: "6. Who can host and how do you keep it safe?",
      answer: "Anyone with a passion to share can host. From local artists and entrepreneurs to neighbors organizing a garage sale. Popera verifies hosts through Stripe Identity and phone verification, and community feedback adds another layer of trust. Every event is supported by clear rules, transparent reviews, and responsive moderation to keep pop-ups safe, inclusive, and fun for everyone."
    }
  ];

  return (
    <main className="min-h-screen bg-[#FAFAFA] w-full max-w-full overflow-x-hidden">
      {/* 1. Bring Your Crowd Anywhere (Hero section) */}
      <Hero setViewState={setViewState} />
      
      {/* 2. Upcoming Events (event feed section) */}
      <section className="section-padding md:container md:mx-auto md:px-6 lg:px-8 bg-[#FAFAFA] overflow-hidden">
        {/* Header Content */}
        <div className="flex flex-col gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8 md:mb-10 lg:mb-12">
          <div className="max-w-3xl">
            <div className="mb-3 sm:mb-4">
               <span className="inline-flex items-center gap-2 py-1 sm:py-1.5 md:py-2 px-3.5 sm:px-4 md:px-5 rounded-full bg-[#15383c]/5 border border-[#15383c]/10 text-[#e35e25] text-[9px] sm:text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">
                  <Sparkles size={10} className="sm:w-3 sm:h-3 -mt-0.5" />
                  Happening Now
               </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl font-heading font-bold text-[#15383c] mb-2 sm:mb-3 md:mb-4 px-4 sm:px-0">Upcoming Pop-ups</h2>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 font-light leading-relaxed px-4 sm:px-0">See where the crowd is going. Discover the moments bringing people together this week.</p>
          </div>

          {/* SEARCH BAR & FILTERS */}
          <div className="mt-4 space-y-6">
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
                      placeholder="Search events, hosts, or venues..."
                      className="w-full pl-12 pr-4 py-3.5 md:py-4 min-h-[48px] sm:min-h-0 bg-white border border-gray-200 rounded-full text-base sm:text-sm focus:outline-none focus:border-[#15383c] focus:ring-2 focus:ring-[#15383c]/10 shadow-sm hover:shadow-md transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
             </div>

             {/* Horizontal Categories */}
             <div className="relative z-10">
               <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 hide-scrollbar scroll-smooth w-full touch-pan-x overscroll-x-contain scroll-pl-4">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`
                        px-5 sm:px-5 py-2.5 sm:py-2 rounded-full text-sm sm:text-sm font-medium whitespace-nowrap transition-all border flex-shrink-0 touch-manipulation active:scale-[0.95] min-h-[40px] sm:min-h-0
                        ${activeCategory === cat
                          ? 'bg-[#15383c] text-white border-[#15383c] shadow-lg shadow-teal-900/20'
                          : 'bg-white text-gray-600 sm:text-gray-500 border-gray-200 hover:border-[#e35e25] hover:text-[#e35e25] hover:shadow-sm active:bg-gray-50'}
                      `}
                    >
                      {cat}
                    </button>
                  ))}
               </div>
               <div className="absolute right-0 top-0 bottom-2 w-6 sm:w-8 bg-gradient-to-l from-[#FAFAFA] to-transparent pointer-events-none md:hidden"></div>
             </div>
          </div>
        </div>
        
        {/* Mobile: Horizontal scroll, Desktop: Grid layout */}
        <div className="flex md:grid overflow-x-auto md:overflow-x-visible gap-6 pb-2 md:pb-6 snap-x snap-mandatory md:snap-none scroll-smooth md:place-items-center">
           {filteredEvents.slice(0, 8).map(event => (
             <div key={event.id} className="snap-start flex-shrink-0">
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

        <div className="mt-6 sm:mt-8 text-center">
           <button 
             onClick={() => setViewState(ViewState.FEED)}
             className="w-auto mx-auto sm:w-auto px-8 sm:px-10 py-4 sm:py-4 min-h-[48px] sm:min-h-0 border-2 border-gray-300 rounded-full text-[#15383c] font-bold text-base sm:text-base hover:border-[#15383c] hover:bg-[#15383c] hover:text-white transition-all touch-manipulation active:scale-[0.97] active:bg-[#15383c] active:text-white"
           >
             View All Events
           </button>
        </div>
      </section>

      {/* 3. Pop-ups and Crowd Activation section */}
      <section className="py-6 sm:py-8 md:py-12 lg:py-16 xl:py-20 bg-[#15383c] relative overflow-hidden w-full rounded-t-[2rem] sm:rounded-t-[2.5rem] md:rounded-t-[3rem] lg:rounded-t-[4rem]">
         <div className="max-w-5xl md:max-w-6xl lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="mb-6 sm:mb-8 md:mb-10 animate-fade-in-up">
              <span className="inline-block py-1 sm:py-1.5 md:py-2 px-3.5 sm:px-4 md:px-5 rounded-full bg-white/5 border border-white/10 text-[#e35e25] text-[9px] sm:text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase backdrop-blur-sm">
                {t('landing.badge')}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl font-heading font-bold text-white mb-4 sm:mb-6 md:mb-8 tracking-tight leading-none px-2 sm:px-4">
              {t('landing.title')} <br />
              <span className="text-[#e35e25] relative">
                {t('landing.titleHighlight')}
                <svg className="absolute w-full h-2 sm:h-3 -bottom-1 left-0 text-[#e35e25]/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                   <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </span>
            </h2>
            
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-200 font-light leading-relaxed mb-6 sm:mb-8 md:mb-10 max-w-4xl mx-auto px-4 sm:px-6">
              {t('landing.description')} <span className="text-white font-normal border-b border-white/20 pb-0.5">{t('landing.descriptionHighlight')}</span>{t('landing.descriptionEnd')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-6 px-4">
              <button className="w-auto mx-auto sm:w-auto px-8 sm:px-10 md:px-12 py-4 sm:py-4 md:py-5 min-h-[48px] sm:min-h-0 rounded-full bg-[#e35e25] text-white font-bold text-base sm:text-base md:text-lg lg:text-xl hover:bg-[#cf4d1d] transition-all shadow-2xl shadow-orange-900/30 hover:-translate-y-1 hover:shadow-orange-900/40 ring-4 ring-[#e35e25]/20 touch-manipulation active:scale-[0.97] active:bg-[#cf4d1d]">
                {t('landing.signUp')}
              </button>
            </div>
         </div>
      </section>

      {/* 4. Every Great Pop-up Starts With Real Connection */}
      <ChatMockupSection />

      {/* 5. How To Move Your Crowd */}
      <Pillars />

      {/* 6. Community Guidelines */}
      <section className="py-6 sm:py-8 md:py-12 lg:py-16 xl:py-20 bg-[#15383c] border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
           <span className="inline-block py-1 sm:py-1.5 md:py-2 px-3.5 sm:px-4 md:px-5 rounded-full bg-white/5 border border-white/10 text-[#e35e25] text-[9px] sm:text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mb-4 sm:mb-6 backdrop-blur-sm shadow-sm">
              Safety & Trust
           </span>

          <div className="flex justify-center mb-8 sm:mb-12">
             <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl font-heading font-bold text-white uppercase tracking-tight">
               <span className="text-[#e35e25]">Community</span> Guidelines
             </h2>
          </div>

          <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto mb-8 sm:mb-12 text-left md:text-center px-4 relative z-10">
            <div className="flex items-center md:justify-center gap-3 sm:gap-4 text-white text-base sm:text-lg md:text-xl font-light">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Check size={14} strokeWidth={3} />
              </div>
              <span>Every host is verified for authenticity</span>
            </div>
            <div className="flex items-center md:justify-center gap-3 sm:gap-4 text-white text-base sm:text-lg md:text-xl font-light">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Check size={14} strokeWidth={3} />
              </div>
              <span>Reviews stay public and honest</span>
            </div>
            <div className="flex items-center md:justify-center gap-3 sm:gap-4 text-white text-base sm:text-lg md:text-xl font-light">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Check size={14} strokeWidth={3} />
              </div>
              <span>Group chats are moderated to ensure respect</span>
            </div>
            <div className="flex items-center md:justify-center gap-3 sm:gap-4 text-white text-base sm:text-lg md:text-xl font-light">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Check size={14} strokeWidth={3} />
              </div>
              <span>Your safety and experience comes first</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
            <button onClick={() => setViewState(ViewState.GUIDELINES)} className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-white text-[#15383c] rounded-full font-bold hover:bg-gray-100 transition-colors touch-manipulation active:scale-95 text-sm sm:text-base">
              {t('landing.seeGuidelines')}
            </button>
            <button onClick={() => setViewState(ViewState.AUTH)} className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 border border-[#e35e25] text-white rounded-full font-bold hover:bg-[#e35e25]/10 transition-colors touch-manipulation active:scale-95 text-sm sm:text-base">
              {t('landing.signUp')}
            </button>
          </div>
        </div>
      </section>

      {/* 7. FAQs */}
      <section className="py-6 sm:py-8 md:py-12 lg:py-16 xl:py-20 bg-[#15383c]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl sm:rounded-[2.5rem] md:rounded-[3rem] lg:rounded-[4rem] p-6 sm:p-8 md:p-12 lg:p-16 shadow-2xl">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl font-heading font-bold text-[#e35e25] text-center mb-8 sm:mb-12 md:mb-16 uppercase tracking-tight">
              FAQS
            </h2>
            
            <div className="space-y-2">
              {faqs.map((faq, index) => (
                <div key={index} className="border-b border-gray-100 last:border-0">
                  <button 
                    onClick={() => toggleFaq(index)}
                    className="w-full py-6 flex items-center justify-between text-left group hover:bg-gray-50/50 transition-colors px-2 rounded-lg"
                  >
                    <span className={`text-sm sm:text-base font-medium transition-colors ${openFaqIndex === index ? 'text-[#e35e25]' : 'text-[#15383c]'}`}>
                      {faq.question}
                    </span>
                    <span className={`ml-4 text-gray-400 transition-transform duration-300 ${openFaqIndex === index ? 'rotate-180 text-[#e35e25]' : ''}`}>
                      <ChevronDown size={20} />
                    </span>
                  </button>
                  
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaqIndex === index ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'}`}>
                     <p className="text-gray-500 leading-relaxed px-2">
                       {faq.answer}
                     </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stay Updated */}
      <section className="py-6 sm:py-8 md:py-12 lg:py-16 xl:py-20 bg-[#15383c] text-white relative overflow-hidden border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl font-heading font-bold text-[#e35e25] mb-4 sm:mb-6 tracking-tight uppercase leading-none">
            Stay Updated
          </h2>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-10 md:mb-12 font-light max-w-2xl mx-auto leading-relaxed">
            Be part of Canada's first pop-up community. <br className="hidden md:block" />
            Join the waitlist before launch on the 15th of May 2026.
          </p>

          <form 
            className="max-w-2xl mx-auto relative flex items-center mb-4 sm:mb-6" 
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newsletterEmail.trim() || newsletterSubmitting) return;

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
                  }).catch((error) => {
                    console.error('Error saving to Firestore:', error);
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
                  placeholder="email" 
                  required
                  disabled={newsletterSubmitting}
                  className="w-full bg-transparent border border-gray-500/50 rounded-full py-3 sm:py-4 md:py-5 pl-6 sm:pl-8 pr-32 sm:pr-40 text-white placeholder-gray-500 focus:outline-none focus:border-[#e35e25] focus:ring-1 focus:ring-[#e35e25] transition-all text-sm sm:text-base md:text-lg disabled:opacity-50"
              />
              <button 
                  type="submit" 
                  disabled={newsletterSubmitting || !newsletterEmail.trim()}
                  className="absolute right-1.5 sm:right-2 top-1.5 sm:top-2 bottom-1.5 sm:bottom-2 bg-white text-[#15383c] px-6 sm:px-8 rounded-full font-bold hover:bg-gray-100 transition-colors shadow-lg text-xs sm:text-sm md:text-base touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {newsletterSubmitting ? '...' : 'Submit'}
              </button>
          </form>
          
          {newsletterSuccess && (
            <div className="max-w-2xl mx-auto mb-4">
              <div className="bg-green-500/20 border border-green-500/50 rounded-full px-4 py-2 flex items-center justify-center gap-2">
                <CheckCircle2 size={18} className="text-green-400" />
                <p className="text-green-400 text-sm font-medium">Subscribed! Check your email.</p>
              </div>
            </div>
          )}
          
          <p className="text-xs sm:text-sm text-gray-500 opacity-60">
              By clicking submit, you agree to our <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setViewState(ViewState.TERMS);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }} 
                className="underline hover:text-[#e35e25] transition-colors cursor-pointer"
              >
                Terms of Use
              </button>.
          </p>
        </div>
      </section>
    </main>
  );
};