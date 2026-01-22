import React, { useState, useEffect } from 'react';
import { ViewState } from '../../types';
import { SeoHelmet } from '../../components/seo/SeoHelmet';
import { MessageCircle, Mail, CheckCircle2, ChevronDown } from 'lucide-react';
import { StepSection } from './guide-components/StepSection';
import { StepNav } from './guide-components/StepNav';
import { TemplateAccordion } from './guide-components/TemplateAccordion';
import { StickyCTA } from './guide-components/StickyCTA';
import { GlassCard } from './guide-components/GlassCard';
import { useUserStore } from '../../stores/userStore';
import { trackEvent } from '../lib/ga4';
import { PLAYBOOK_IMAGES, PLAYBOOK_IMAGE_ALTS } from './guide-components/playbookImages';

interface Guide10SeatPlaybookPageProps {
  setViewState: (view: ViewState) => void;
}

export const Guide10SeatPlaybookPage: React.FC<Guide10SeatPlaybookPageProps> = ({ setViewState }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const user = useUserStore((state) => state.user);
  const setRedirectAfterLogin = useUserStore((state) => state.setRedirectAfterLogin);

  // Track page view on mount
  useEffect(() => {
    trackEvent('view_content', {
      content_type: 'guide',
      content_id: '10-seat-playbook',
      content_name: 'The 10-Seat Event Playbook',
    });
  }, []);

  // Handle primary CTA - Start your first circle
  const handlePrimaryCTA = () => {
    trackEvent('guide_start_circle_click', {
      section: 'primary_cta',
      is_logged_in: !!user,
    });
    
    if (user) {
      setViewState(ViewState.CREATE_EVENT);
    } else {
      setRedirectAfterLogin(ViewState.CREATE_EVENT);
      setViewState(ViewState.AUTH);
      window.history.pushState({ viewState: ViewState.AUTH }, '', '/auth?mode=signin');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Handle secondary CTA - Get setup help
  const handleSecondaryCTA = () => {
    trackEvent('guide_get_help_click', {
      section: 'secondary_cta',
    });
    setViewState(ViewState.CONTACT);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Scroll to templates section
  const handleJumpToTemplates = () => {
    const element = document.getElementById('templates');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      question: 'Do I need 25k followers?',
      answer: 'No. Small engaged audience works.',
    },
    {
      question: "What if I've never hosted?",
      answer: 'Start with 6 seats + simple plan.',
    },
    {
      question: 'How do I avoid no-shows?',
      answer: 'Clear seats + reminders + chat.',
    },
    {
      question: 'Is Popera free?',
      answer: 'Free to start (early access).',
    },
    {
      question: 'Can I run recurring circles?',
      answer: 'Yes — recurring is the point.',
    },
  ];

  return (
    <main className="min-h-screen bg-[#f2f2f2] w-full max-w-full overflow-x-hidden pt-[72px] md:pt-0">
      <SeoHelmet viewState={ViewState.GUIDE_10_SEAT} />
      
      {/* HERO SECTION */}
      <section className="relative bg-white pt-6 pb-10 md:pt-24 md:pb-12 lg:pt-32 lg:pb-16 xl:pt-40 xl:pb-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-8 xl:gap-12 lg:items-center">
            {/* Left: Content */}
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-heading font-bold text-[#15383c] mb-4 md:mb-6 leading-[1.1] md:leading-tight">
                The 10-Seat Event Playbook
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl text-gray-700 mb-4 md:mb-6 lg:mb-8 leading-6 md:leading-relaxed">
                Turn followers into real people. Host small paid circles (3–10 seats) and run them again.
              </p>
              
              {/* Badges */}
              <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6 lg:mb-8">
                <span className="inline-block py-1.5 md:py-2 px-3 md:px-4 rounded-full bg-[#15383c]/10 border border-[#15383c]/20 text-[#15383c] text-xs md:text-sm font-bold">
                  Made for creators
                </span>
                <span className="inline-block py-1.5 md:py-2 px-3 md:px-4 rounded-full bg-[#15383c]/10 border border-[#15383c]/20 text-[#15383c] text-xs md:text-sm font-bold">
                  3–10 seats
                </span>
                <span className="inline-block py-1.5 md:py-2 px-3 md:px-4 rounded-full bg-[#15383c]/10 border border-[#15383c]/20 text-[#15383c] text-xs md:text-sm font-bold">
                  Works in any city
                </span>
              </div>
              
              {/* CTAs */}
              <div className="flex flex-col gap-3 md:gap-4 mb-4 md:mb-6">
                <button
                  onClick={handlePrimaryCTA}
                  className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 bg-[#e35e25] text-white rounded-full font-bold text-base md:text-lg hover:bg-[#cf4d1d] transition-colors shadow-sm md:shadow-lg md:shadow-orange-900/20 hover:shadow-md md:hover:shadow-xl touch-manipulation active:scale-[0.98]"
                >
                  Start your first circle
                </button>
                <button
                  onClick={() => {
                    const element = document.getElementById('steps');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 border-2 border-[#15383c] text-[#15383c] rounded-full font-bold text-base md:text-lg hover:bg-[#15383c] hover:text-white transition-colors touch-manipulation active:scale-[0.98]"
                >
                  See the 5 steps
                </button>
              </div>
              
              <p className="text-xs md:text-sm text-gray-500">
                Test what your community wants. Package an experience. Sell limited seats. Collect reviews to sell out the next one.
              </p>
            </div>
            
            {/* Right: Image */}
            <div className="relative w-full max-w-full overflow-hidden rounded-2xl shadow-sm md:shadow-xl bg-white/0 mt-6 lg:mt-0">
              <img
                src={PLAYBOOK_IMAGES.hero}
                alt={PLAYBOOK_IMAGE_ALTS.hero}
                className="w-full h-full max-h-[260px] md:max-h-none object-cover"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* MINI PROOF BAR */}
      <section className="bg-white border-y border-black/5 md:border-gray-200 py-4 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            <div className="flex items-center gap-3 md:gap-4">
              <MessageCircle className="text-[#e35e25] flex-shrink-0" size={24} />
              <span className="text-gray-700 font-medium text-sm md:text-base">Built-in group chat</span>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <Mail className="text-[#e35e25] flex-shrink-0" size={24} />
              <span className="text-gray-700 font-medium text-sm md:text-base">Host updates via SMS & email</span>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <CheckCircle2 className="text-[#e35e25] flex-shrink-0" size={24} />
              <span className="text-gray-700 font-medium text-sm md:text-base">Better show-up rates with small groups</span>
            </div>
          </div>
        </div>
      </section>

      {/* WHY THIS WORKS */}
      <section className="py-10 md:py-12 lg:py-16 xl:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-8 xl:gap-12 lg:items-center">
            <div className="order-1 lg:order-1">
              <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-heading font-bold text-[#15383c] mb-4 md:mb-6 lg:mb-8 leading-tight">
                Small seats fill faster — and feel better
              </h2>
              <ul className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                <li className="flex items-start gap-2.5 md:gap-3">
                  <span className="text-[#e35e25] font-bold text-base md:text-xl leading-none mt-0.5 md:mt-1">•</span>
                  <span className="text-gray-700 text-base md:text-lg leading-6 md:leading-relaxed">
                    Scarcity without pressure: 10 seats creates urgency naturally.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 md:gap-3">
                  <span className="text-[#e35e25] font-bold text-base md:text-xl leading-none mt-0.5 md:mt-1">•</span>
                  <span className="text-gray-700 text-base md:text-lg leading-6 md:leading-relaxed">
                    Safer for strangers: small groups lower social friction.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 md:gap-3">
                  <span className="text-[#e35e25] font-bold text-base md:text-xl leading-none mt-0.5 md:mt-1">•</span>
                  <span className="text-gray-700 text-base md:text-lg leading-6 md:leading-relaxed">
                    Easier to repeat weekly: consistency beats viral spikes.
                  </span>
                </li>
              </ul>
              
              {/* Creator reality callout */}
              <GlassCard>
                <p className="text-[#15383c] font-medium text-sm md:text-lg leading-5 md:leading-relaxed">
                  Test what your community wants. Package an experience around your brand. Sell limited seats. Manage attendees via group chat. Collect reviews to sell out the next one.
                </p>
              </GlassCard>
            </div>
            
            <div className="relative w-full max-w-[520px] md:max-w-full mx-auto lg:mx-0 overflow-hidden rounded-2xl shadow-sm md:shadow-xl bg-white/0 order-2 lg:order-2">
              <img
                src={PLAYBOOK_IMAGES.seats}
                alt={PLAYBOOK_IMAGE_ALTS.seats}
                className="h-full w-full aspect-[4/3] md:aspect-auto object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* STEP NAVIGATION */}
      <div id="steps" className="scroll-mt-[88px] md:scroll-mt-24">
        <StepNav currentStep={currentStep} onStepClick={setCurrentStep} />
      </div>

      {/* STEP 1: THE MODEL */}
      <StepSection
        stepNumber={1}
        title="Pick a circle that's easy to say yes to"
        bullets={[
          "Start from your brand: host something your followers already want from you.",
          "Keep it tight: 60–120 minutes, clear plan, clear outcome.",
          "Small seats = premium vibe: 3–10 seats to keep it personal (and easy to sell out).",
        ]}
        exampleCard={
          <GlassCard>
            <p className="text-[#15383c] font-semibold text-base md:text-lg">
              8 seats · Restaurant support + tasting · Mile End · Sunday 2pm
            </p>
          </GlassCard>
        }
        imageSrc={PLAYBOOK_IMAGES.step1}
        imageAlt={PLAYBOOK_IMAGE_ALTS.step1}
        id="step-1"
        bgColor="white"
      />

      {/* STEP 2: THE OFFER */}
      <section id="step-2" className="scroll-mt-[88px] md:scroll-mt-24 py-10 md:py-12 lg:py-16 xl:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-8 xl:gap-12 lg:items-center">
            <div className="order-1 lg:order-1">
              <div className="mb-3 md:mb-4">
                <span className="inline-block py-1 md:py-1.5 px-3 md:px-4 rounded-full bg-[#15383c]/10 border border-[#15383c]/20 text-[#15383c] text-xs font-bold tracking-wider uppercase">
                  STEP 2 / 5
                </span>
              </div>
              
              <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-heading font-bold text-[#15383c] mb-4 md:mb-6 leading-tight">
                Build an offer people actually join
              </h2>
              
              <ul className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                <li className="flex items-start gap-2.5 md:gap-3">
                  <span className="text-[#e35e25] font-bold text-base md:text-xl leading-none mt-0.5 md:mt-1">•</span>
                  <span className="text-gray-700 text-base md:text-lg leading-6 md:leading-relaxed">Activity: what are we doing?</span>
                </li>
                <li className="flex items-start gap-2.5 md:gap-3">
                  <span className="text-[#e35e25] font-bold text-base md:text-xl leading-none mt-0.5 md:mt-1">•</span>
                  <span className="text-gray-700 text-base md:text-lg leading-6 md:leading-relaxed">Constraint: seats + time window.</span>
                </li>
                <li className="flex items-start gap-2.5 md:gap-3">
                  <span className="text-[#e35e25] font-bold text-base md:text-xl leading-none mt-0.5 md:mt-1">•</span>
                  <span className="text-gray-700 text-base md:text-lg leading-6 md:leading-relaxed">Vibe: who it's for + how it feels.</span>
                </li>
              </ul>
              
              {/* Offer cards */}
              <div className="space-y-3 md:space-y-4">
                <GlassCard>
                  <p className="text-[#15383c] font-semibold text-base md:text-lg">6 seats — Chef tasting with the community</p>
                </GlassCard>
                <GlassCard>
                  <p className="text-[#15383c] font-semibold text-base md:text-lg">8 seats — Beginner salsa mini-session + drinks</p>
                </GlassCard>
                <GlassCard>
                  <p className="text-[#15383c] font-semibold text-base md:text-lg">10 seats — No-phone wine bar hang (community experience)</p>
                </GlassCard>
              </div>
            </div>
            
            <div className="relative w-full max-w-[520px] md:max-w-full mx-auto lg:mx-0 overflow-hidden rounded-2xl shadow-sm md:shadow-xl bg-white/0 order-2 lg:order-2">
              <img
                src={PLAYBOOK_IMAGES.step2}
                alt={PLAYBOOK_IMAGE_ALTS.step2}
                className="w-full h-full aspect-[4/3] md:aspect-auto object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* STEP 3: THE 7-DAY PLAN */}
      <section id="step-3" className="scroll-mt-[88px] md:scroll-mt-24 py-10 md:py-12 lg:py-16 xl:py-20 bg-[#f2f2f2]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="mb-3 md:mb-4">
            <span className="inline-block py-1 md:py-1.5 px-3 md:px-4 rounded-full bg-[#15383c]/10 border border-[#15383c]/20 text-[#15383c] text-xs font-bold tracking-wider uppercase">
              STEP 3 / 5
            </span>
          </div>
          
          <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-heading font-bold text-[#15383c] mb-4 md:mb-6 lg:mb-8 leading-tight">
            Fill it with a simple 7-day plan
          </h2>
          
          {/* Day-by-day timeline (mobile) / cards (desktop) */}
          <div className="bg-white rounded-2xl p-4 md:p-6 mb-6 md:mb-8 space-y-3 shadow-sm md:shadow-md border border-black/5 md:border-gray-200">
            {[
              { day: 1, text: "Poll story: 'Would you join?' — find out what your followers want (engage + validate)." },
              { day: 2, text: "Create the circle on Popera — title, seats, price, location, details." },
              { day: 3, text: "Announce: post the offer + seat count + link (bio + story + pinned)." },
              { day: 4, text: "Short reel: why you're hosting + what people get — drive sign-ups with the link." },
              { day: 5, text: "Nurture in group chat: intros + icebreakers + answer questions (build hype)." },
              { day: 6, text: "Final push: social proof + last seats + reminders (reduce no-shows)." },
              { day: 7, text: "Host day: run the experience + post recap + collect reviews for next week." },
            ].map((item, index, array) => (
              <div key={item.day} className={`${index < array.length - 1 ? 'pb-3 border-b border-black/5 md:border-gray-200' : ''}`}>
                <span className="font-bold text-[#e35e25] text-sm md:text-base mr-2 md:mr-3">Day {item.day}:</span>
                <span className="text-gray-700 text-sm md:text-base leading-6 md:leading-normal">{item.text}</span>
              </div>
            ))}
          </div>
          
          <button
            onClick={handleJumpToTemplates}
            className="w-full md:w-auto px-6 py-3 bg-[#15383c] text-white rounded-full font-bold hover:bg-[#1a4a4f] transition-colors text-sm md:text-base"
          >
            Jump to scripts →
          </button>
        </div>
      </section>

      {/* STEP 4: CONVERSION */}
      <section id="step-4" className="scroll-mt-[88px] md:scroll-mt-24 py-10 md:py-12 lg:py-16 xl:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-8 xl:gap-12 lg:items-center">
            {/* Left: Content */}
            <div className="order-1 lg:order-1">
              <div className="mb-3 md:mb-4">
                <span className="inline-block py-1 md:py-1.5 px-3 md:px-4 rounded-full bg-[#15383c]/10 border border-[#15383c]/20 text-[#15383c] text-xs font-bold tracking-wider uppercase">
                  STEP 4 / 5
                </span>
              </div>
              
              <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-heading font-bold text-[#15383c] mb-4 md:mb-6 leading-tight">
                Turn your followers into confirmed seats
              </h2>
              
              <ul className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                <li className="flex items-start gap-2.5 md:gap-3">
                  <span className="text-[#e35e25] font-bold text-base md:text-xl leading-none mt-0.5 md:mt-1">•</span>
                  <span className="text-gray-700 text-base md:text-lg leading-6 md:leading-relaxed">One link. One tap. No awkward back-and-forth.</span>
                </li>
                <li className="flex items-start gap-2.5 md:gap-3">
                  <span className="text-[#e35e25] font-bold text-base md:text-xl leading-none mt-0.5 md:mt-1">•</span>
                  <span className="text-gray-700 text-base md:text-lg leading-6 md:leading-relaxed">Small seat count creates urgency without begging.</span>
                </li>
                <li className="flex items-start gap-2.5 md:gap-3">
                  <span className="text-[#e35e25] font-bold text-base md:text-xl leading-none mt-0.5 md:mt-1">•</span>
                  <span className="text-gray-700 text-base md:text-lg leading-6 md:leading-relaxed">Optional paid RSVP filters flaky 'maybes' and boosts show-up rate.</span>
                </li>
              </ul>
              
              {/* Avoid this box - less loud on mobile */}
              <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                <div className="bg-red-50/50 md:bg-red-50 border border-red-200/50 md:border-red-200 rounded-xl p-3 md:p-4">
                  <p className="text-red-800 font-semibold mb-1.5 md:mb-2 text-sm md:text-base">Avoid this:</p>
                  <ul className="text-red-700 space-y-1 text-xs md:text-sm leading-5">
                    <li>• Too many seats for your first run</li>
                    <li>• No clear outcome (what they get for showing up)</li>
                    <li>• Free sign-ups with no commitment (invites no-shows)</li>
                    <li>• Sending people to DMs for logistics</li>
                  </ul>
                </div>
                <p className="text-gray-600 text-xs md:text-sm leading-5">
                  After they reserve, they unlock the group chat so you can coordinate and build hype.
                </p>
              </div>
            </div>
            
            {/* Right: Image */}
            <div className="relative w-full max-w-[420px] md:max-w-full mx-auto lg:mx-0 overflow-hidden rounded-2xl shadow-sm md:shadow-xl bg-white/0 order-2 lg:order-2">
              <img
                src={PLAYBOOK_IMAGES.step4}
                alt={PLAYBOOK_IMAGE_ALTS.step4}
                className="w-full h-full aspect-[4/3] md:aspect-auto object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* STEP 5: POPERA SETUP */}
      <section id="step-5" className="scroll-mt-[88px] md:scroll-mt-24 py-10 md:py-12 lg:py-16 xl:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-8 xl:gap-12">
            <div className="order-1 lg:order-1">
              <div className="mb-3 md:mb-4">
                <span className="inline-block py-1 md:py-1.5 px-3 md:px-4 rounded-full bg-[#15383c]/10 border border-[#15383c]/20 text-[#15383c] text-xs font-bold tracking-wider uppercase">
                  STEP 5 / 5
                </span>
              </div>
              
              <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-heading font-bold text-[#15383c] mb-4 md:mb-6 lg:mb-8 leading-tight">
                Launch it in Popera in 10 minutes
              </h2>
              
              {/* Checklist - compact on mobile */}
              <div className="bg-white md:bg-transparent rounded-xl md:rounded-none p-4 md:p-0 border border-black/5 md:border-0 mb-6 md:mb-8">
                <ul className="space-y-2.5 md:space-y-4">
                  {[
                    "Name the experience (make it clearly 'you')",
                    "Set seats and price (small seats, clear value)",
                    "Drop your description template (copy-paste, done)",
                    "Publish and share one link (bio, story, pinned post)",
                    "Use group chat to host (icebreakers, updates, last details)",
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-2.5 md:gap-3">
                      <CheckCircle2 className="text-[#e35e25] flex-shrink-0 mt-0.5 md:mt-1" size={20} />
                      <span className="text-gray-700 text-sm md:text-lg leading-5 md:leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Product proof cards - compact on mobile */}
              <div className="bg-gray-50 md:bg-transparent rounded-xl p-4 md:p-0 border border-black/5 md:border-0 mb-6 md:mb-8">
                <p className="text-xs md:text-sm font-semibold text-gray-600 mb-3 md:hidden">Key benefits:</p>
                <div className="space-y-2 md:space-y-3">
                  <div className="md:hidden">
                    <p className="text-[#15383c] text-sm leading-5">Group chat turns sign-ups into a real crew</p>
                  </div>
                  <div className="md:hidden">
                    <p className="text-[#15383c] text-sm leading-5">Automatic SMS and email keeps everyone on track</p>
                  </div>
                  <div className="md:hidden">
                    <p className="text-[#15383c] text-sm leading-5">Collect reviews after to sell out the next one</p>
                  </div>
                  <div className="hidden md:block">
                    <GlassCard>
                      <p className="text-[#15383c] font-medium text-base md:text-lg">Group chat turns sign-ups into a real crew</p>
                    </GlassCard>
                  </div>
                  <div className="hidden md:block">
                    <GlassCard>
                      <p className="text-[#15383c] font-medium text-base md:text-lg">Automatic SMS and email keeps everyone on track</p>
                    </GlassCard>
                  </div>
                  <div className="hidden md:block">
                    <GlassCard>
                      <p className="text-[#15383c] font-medium text-base md:text-lg">Collect reviews after to sell out the next one</p>
                    </GlassCard>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right: Create form UI - Fixed cropping bug for mobile */}
            <div className="relative w-full flex items-center justify-center order-2 lg:order-2">
              <div className="relative w-full max-w-[420px] md:max-w-full rounded-2xl shadow-sm md:shadow-xl bg-white overflow-hidden md:overflow-visible">
                <img
                  src={PLAYBOOK_IMAGES.step5}
                  alt={PLAYBOOK_IMAGE_ALTS.step5}
                  className="w-full h-auto max-h-[420px] md:max-h-none object-contain p-3 md:p-0"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TEMPLATES SECTION */}
      <section id="templates" className="scroll-mt-[88px] md:scroll-mt-24 py-10 md:py-12 lg:py-16 xl:py-20 bg-[#f2f2f2]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-heading font-bold text-[#15383c] mb-3 md:mb-4 text-center leading-tight">
            Copy-paste templates
          </h2>
          <p className="text-base md:text-xl text-gray-600 mb-8 md:mb-12 text-center">
            Use these exactly as written. Edit the details. Post today.
          </p>
          
          <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
            <TemplateAccordion
              title="Event Description Template"
              templateId="event-description"
              content={`[X seats] Meet the community with me in [neighborhood] • [day/time]

This is a small in-person experience for people who follow my work and want real connection — not a huge crowd.

What we're doing: [experience / theme]
Who it's for: [your community / niche / beginners welcome]
What you get:
1) Meet me + other community members
2) A guided moment or clear vibe (not awkward)
3) Group chat access for details + follow-ups
Seats & pricing: [X seats], first come first served. Price: [$X] per person (reduces no-shows).
Plan: quick intros → experience → chill time + photos
Reserve to unlock the group chat link.`}
            />
            
            <TemplateAccordion
              title="3 IG Story Scripts"
              templateId="ig-stories"
              content={`Script 1 (poll / validation):
Montreal people: if I host a small [experience] this week, would you join? YES/NO

Script 2 (offer + link):
I'm hosting a small [X seat] [experience] in [area] on [day/time].
It's for people who want to meet the community in real life.
Reserve here: [link]

Script 3 (last seats):
Only [X] seats left. Once it's full, that's it.
Reserve now to join the group chat: [link]`}
            />
            
            <TemplateAccordion
              title="DM Reply Template"
              templateId="dm-reply"
              content={`Hey! I'm hosting a small [X seat] in-person [experience] in [area] on [day/time].
It's for people who follow my work and want to meet the community IRL.
Want the reserve link?`}
            />
          </div>
          
          {/* Templates section image */}
          <div className="relative w-full max-w-[420px] md:max-w-2xl mx-auto mb-6 md:mb-8">
            <div className="relative w-full rounded-2xl shadow-sm md:shadow-xl bg-white overflow-hidden">
              <img
                src={PLAYBOOK_IMAGES.templates}
                alt={PLAYBOOK_IMAGE_ALTS.templates}
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            </div>
          </div>
          
          <p className="mt-8 text-center text-gray-600 font-medium">
            Small groups win because they're easy to commit to.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-12 md:py-16 lg:py-20 xl:py-24 bg-[#15383c] text-white">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-heading font-bold mb-4 md:mb-6 leading-tight">
            Ready to host your first circle?
          </h2>
          <p className="text-base md:text-xl text-gray-300 mb-8 md:mb-10">
            Start with 6–10 seats. Run it again next week. That's how you grow.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
            <button
              onClick={handlePrimaryCTA}
              className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 bg-[#e35e25] text-white rounded-full font-bold text-base md:text-lg hover:bg-[#cf4d1d] transition-colors shadow-sm md:shadow-lg md:shadow-orange-900/20 hover:shadow-md md:hover:shadow-xl touch-manipulation active:scale-[0.98]"
            >
              Start your first circle
            </button>
            <button
              onClick={handleSecondaryCTA}
              className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 border-2 border-white text-white rounded-full font-bold text-base md:text-lg hover:bg-white hover:text-[#15383c] transition-colors touch-manipulation active:scale-[0.98]"
            >
              Get setup help
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 md:py-12 lg:py-16 xl:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-heading font-bold text-[#15383c] mb-6 md:mb-10 text-center leading-tight">
            FAQ
          </h2>
          
          <div className="space-y-0 md:space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-black/5 md:border-gray-200 last:border-0">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full py-4 md:py-6 flex items-center justify-between text-left group hover:bg-gray-50/50 transition-colors"
                  aria-expanded={openFaqIndex === index}
                >
                  <span className={`font-medium text-base md:text-lg transition-colors ${
                    openFaqIndex === index ? 'text-[#e35e25]' : 'text-[#15383c]'
                  }`}>
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform duration-300 ${
                      openFaqIndex === index ? 'rotate-180 text-[#e35e25]' : ''
                    }`}
                  />
                </button>
                
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaqIndex === index ? 'max-h-96 opacity-100 pb-4 md:pb-6' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-gray-600 text-sm md:text-base leading-5 md:leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sticky Mobile CTA */}
      <StickyCTA
        onPrimaryClick={handlePrimaryCTA}
        onSecondaryClick={handleSecondaryCTA}
        primaryText="Start your first circle"
        secondaryText="Get setup help"
      />
    </main>
  );
};

