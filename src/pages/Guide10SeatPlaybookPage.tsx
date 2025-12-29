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
    <main className="min-h-screen bg-[#f2f2f2] w-full max-w-full overflow-x-hidden">
      <SeoHelmet viewState={ViewState.GUIDE_10_SEAT} />
      
      {/* HERO SECTION */}
      <section className="relative bg-white pt-24 pb-12 md:pt-32 md:pb-16 lg:pt-40 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Content */}
            <div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-bold text-[#15383c] mb-6 leading-tight">
                The 10-Seat Event Playbook
              </h1>
              <p className="text-xl sm:text-2xl text-gray-700 mb-8 leading-relaxed">
                Turn followers into real people. Host a small in-person circle (3–10 seats) and fill it with a simple 7-day plan.
              </p>
              
              {/* Badges */}
              <div className="flex flex-wrap gap-3 mb-8">
                <span className="inline-block py-2 px-4 rounded-full bg-[#15383c]/10 border border-[#15383c]/20 text-[#15383c] text-sm font-bold">
                  Made for creators
                </span>
                <span className="inline-block py-2 px-4 rounded-full bg-[#15383c]/10 border border-[#15383c]/20 text-[#15383c] text-sm font-bold">
                  3–10 seats
                </span>
                <span className="inline-block py-2 px-4 rounded-full bg-[#15383c]/10 border border-[#15383c]/20 text-[#15383c] text-sm font-bold">
                  Works in any city
                </span>
              </div>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <button
                  onClick={handlePrimaryCTA}
                  className="px-8 py-4 bg-[#e35e25] text-white rounded-full font-bold text-lg hover:bg-[#cf4d1d] transition-colors shadow-lg shadow-orange-900/20 hover:shadow-xl touch-manipulation active:scale-[0.98]"
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
                  className="px-8 py-4 border-2 border-[#15383c] text-[#15383c] rounded-full font-bold text-lg hover:bg-[#15383c] hover:text-white transition-colors touch-manipulation active:scale-[0.98]"
                >
                  See the 5 steps
                </button>
              </div>
              
              <p className="text-sm text-gray-500">
                Designed for recurring circles — not one-off events.
              </p>
            </div>
            
            {/* Right: Image */}
            <div className="relative w-full max-w-full overflow-hidden rounded-2xl shadow-xl bg-white/0">
              <img
                src={PLAYBOOK_IMAGES.hero}
                alt={PLAYBOOK_IMAGE_ALTS.hero}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* MINI PROOF BAR */}
      <section className="bg-white border-y border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <MessageCircle className="text-[#e35e25] flex-shrink-0" size={32} />
              <span className="text-gray-700 font-medium">Built-in group chat</span>
            </div>
            <div className="flex items-center gap-4">
              <Mail className="text-[#e35e25] flex-shrink-0" size={32} />
              <span className="text-gray-700 font-medium">Host updates via SMS & email</span>
            </div>
            <div className="flex items-center gap-4">
              <CheckCircle2 className="text-[#e35e25] flex-shrink-0" size={32} />
              <span className="text-gray-700 font-medium">Better show-up rates with small groups</span>
            </div>
          </div>
        </div>
      </section>

      {/* WHY THIS WORKS */}
      <section className="py-12 md:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-[#15383c] mb-8">
                Small seats fill faster — and feel better
              </h2>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold text-xl leading-none mt-1">•</span>
                  <span className="text-gray-700 text-lg leading-relaxed">
                    Scarcity without pressure: 10 seats creates urgency naturally.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold text-xl leading-none mt-1">•</span>
                  <span className="text-gray-700 text-lg leading-relaxed">
                    Safer for strangers: small groups lower social friction.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold text-xl leading-none mt-1">•</span>
                  <span className="text-gray-700 text-lg leading-relaxed">
                    Easier to repeat weekly: consistency beats viral spikes.
                  </span>
                </li>
              </ul>
              
              {/* Creator reality callout */}
              <GlassCard>
                <p className="text-[#15383c] font-medium text-lg leading-relaxed">
                  You don't need a huge audience. You need a clear offer + small seat count + repeat.
                </p>
              </GlassCard>
            </div>
            
            <div className="relative w-full max-w-full overflow-hidden rounded-2xl shadow-xl bg-white/0">
              <img
                src={PLAYBOOK_IMAGES.seats}
                alt={PLAYBOOK_IMAGE_ALTS.seats}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* STEP NAVIGATION */}
      <div id="steps" className="scroll-mt-24">
        <StepNav currentStep={currentStep} onStepClick={setCurrentStep} />
      </div>

      {/* STEP 1: THE MODEL */}
      <StepSection
        stepNumber={1}
        title="Pick a circle that's easy to say yes to"
        bullets={[
          "Choose something simple: coffee, walk, game, beginner session.",
          "Keep it 60–120 minutes.",
          "3–10 seats only.",
        ]}
        exampleCard={
          <GlassCard>
            <p className="text-[#15383c] font-semibold text-lg">
              8 seats · Coffee + walk + photos · Mile End · Sunday 2pm
            </p>
          </GlassCard>
        }
        imageSrc={PLAYBOOK_IMAGES.step1}
        imageAlt={PLAYBOOK_IMAGE_ALTS.step1}
        id="step-1"
        bgColor="white"
      />

      {/* STEP 2: THE OFFER */}
      <section id="step-2" className="scroll-mt-24 py-12 md:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="mb-4">
                <span className="inline-block py-1.5 px-4 rounded-full bg-[#15383c]/10 border border-[#15383c]/20 text-[#15383c] text-xs font-bold tracking-wider uppercase">
                  STEP 2 / 5
                </span>
              </div>
              
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-[#15383c] mb-6">
                Build an offer people actually join
              </h2>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold text-xl leading-none mt-1">•</span>
                  <span className="text-gray-700 text-lg leading-relaxed">Activity: what are we doing?</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold text-xl leading-none mt-1">•</span>
                  <span className="text-gray-700 text-lg leading-relaxed">Constraint: seats + time window.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold text-xl leading-none mt-1">•</span>
                  <span className="text-gray-700 text-lg leading-relaxed">Vibe: who it's for + how it feels.</span>
                </li>
              </ul>
              
              {/* Offer cards */}
              <div className="space-y-4">
                <GlassCard>
                  <p className="text-[#15383c] font-semibold text-lg">6 seats — No-phone wine bar hang</p>
                </GlassCard>
                <GlassCard>
                  <p className="text-[#15383c] font-semibold text-lg">8 seats — Ramen crawl + photo walk</p>
                </GlassCard>
                <GlassCard>
                  <p className="text-[#15383c] font-semibold text-lg">10 seats — Beginner salsa mini-session + drinks</p>
                </GlassCard>
              </div>
            </div>
            
            <div className="relative w-full max-w-full overflow-hidden rounded-2xl shadow-xl bg-white/0">
              <img
                src={PLAYBOOK_IMAGES.step2}
                alt={PLAYBOOK_IMAGE_ALTS.step2}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* STEP 3: THE 7-DAY PLAN */}
      <section id="step-3" className="scroll-mt-24 py-12 md:py-16 lg:py-20 bg-[#f2f2f2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="mb-4">
                <span className="inline-block py-1.5 px-4 rounded-full bg-[#15383c]/10 border border-[#15383c]/20 text-[#15383c] text-xs font-bold tracking-wider uppercase">
                  STEP 3 / 5
                </span>
              </div>
              
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-[#15383c] mb-8">
                Fill it with a simple 7-day plan
              </h2>
              
              {/* Day-by-day cards */}
              <div className="space-y-3 mb-8">
                {[
                  { day: 7, text: "Poll story: 'Would you join?'" },
                  { day: 6, text: "Announce details + seat count + link" },
                  { day: 5, text: "Short reel: why you're hosting" },
                  { day: 4, text: "FAQ + what to expect" },
                  { day: 3, text: "Social proof + reminder" },
                  { day: 2, text: "Last seats + repost replies" },
                  { day: 1, text: "Final reminder + meetup details" },
                ].map((item) => (
                  <div key={item.day} className="bg-white rounded-xl p-4 border border-gray-200">
                    <span className="font-bold text-[#e35e25] mr-3">Day {item.day}:</span>
                    <span className="text-gray-700">{item.text}</span>
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleJumpToTemplates}
                className="px-6 py-3 bg-[#15383c] text-white rounded-full font-bold hover:bg-[#1a4a4f] transition-colors"
              >
                Jump to scripts →
              </button>
            </div>
            
            <div className="relative w-full max-w-full overflow-hidden rounded-2xl shadow-xl bg-white/0">
              <img
                src={PLAYBOOK_IMAGES.step3}
                alt={PLAYBOOK_IMAGE_ALTS.step3}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* STEP 4: CONVERSION */}
      <StepSection
        stepNumber={4}
        title="Turn interest into RSVPs"
        bullets={[
          "One tap to reserve (no back-and-forth).",
          "Clear seat count + clear deadline.",
          "Reminders reduce no-shows.",
        ]}
        exampleCard={
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800 font-semibold mb-2">Avoid this:</p>
              <ul className="text-red-700 space-y-1 text-sm">
                <li>• Too many seats</li>
                <li>• No clear plan</li>
                <li>• Asking for 'maybe'</li>
              </ul>
            </div>
          </div>
        }
        imageSrc={PLAYBOOK_IMAGES.step4}
        imageAlt={PLAYBOOK_IMAGE_ALTS.step4}
        id="step-4"
        bgColor="white"
      />

      {/* STEP 5: POPERA SETUP */}
      <section id="step-5" className="scroll-mt-24 py-12 md:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <div>
              <div className="mb-4">
                <span className="inline-block py-1.5 px-4 rounded-full bg-[#15383c]/10 border border-[#15383c]/20 text-[#15383c] text-xs font-bold tracking-wider uppercase">
                  STEP 5 / 5
                </span>
              </div>
              
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-[#15383c] mb-8">
                Set it up in Popera in 10 minutes
              </h2>
              
              {/* Checklist */}
              <ul className="space-y-4 mb-8">
                {[
                  "Title + 1 strong photo",
                  "Seats (3–10) + location",
                  "Paste the description template",
                  "Publish + share the link",
                  "Use group chat to coordinate",
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="text-[#e35e25] flex-shrink-0 mt-1" size={24} />
                    <span className="text-gray-700 text-lg leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              
              {/* Product proof cards */}
              <div className="space-y-3 mb-8">
                <GlassCard>
                  <p className="text-[#15383c] font-medium">Chat keeps everyone aligned</p>
                </GlassCard>
                <GlassCard>
                  <p className="text-[#15383c] font-medium">Automatic updates by SMS/email</p>
                </GlassCard>
                <GlassCard>
                  <p className="text-[#15383c] font-medium">Recurring circles = repeat attendance</p>
                </GlassCard>
              </div>
            </div>
            
            {/* Right: Create form UI */}
            <div className="relative w-full max-w-full overflow-hidden rounded-2xl shadow-xl bg-white/0">
              <img
                src={PLAYBOOK_IMAGES.step5}
                alt={PLAYBOOK_IMAGE_ALTS.step5}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* TEMPLATES SECTION */}
      <section id="templates" className="scroll-mt-24 py-12 md:py-16 lg:py-20 bg-[#f2f2f2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-[#15383c] mb-4 text-center">
            Copy-paste templates
          </h2>
          <p className="text-xl text-gray-600 mb-12 text-center">
            Use these exactly as written. Edit the details. Post today.
          </p>
          
          <div className="space-y-6">
            <TemplateAccordion
              title="Event Description Template"
              templateId="event-description"
              content={`[8 seats] [activity] in [neighborhood] — [day/time]

We're doing [activity]. Small group, good energy.

Seats: [X]
Who it's for: [beginner-friendly / social / creatives]
Plan: quick intros → activity → chill chat
Bring: [one item]
Reserve to get the group chat link.`}
            />
            
            <TemplateAccordion
              title="3 IG Story Scripts"
              templateId="ig-stories"
              content={`Script 1 (poll):
I'm hosting a tiny [X-seat] hang in [area] this [day]. Would you join? YES/NO

Script 2 (details):
Details: [activity], [time], [X seats]. Reserve here: [link]

Script 3 (last call):
Last seats. If you said yes earlier, reserve now: [link]`}
            />
            
            <TemplateAccordion
              title="DM Reply Template"
              templateId="dm-reply"
              content={`Hey! I'm doing a small [activity] in [area] with [X seats]. Want the link to reserve?`}
            />
          </div>
          
          <p className="mt-8 text-center text-gray-600 font-medium">
            Small groups win because they're easy to commit to.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 md:py-20 lg:py-24 bg-[#15383c] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-6">
            Ready to host your first circle?
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Start with 6–10 seats. Run it again next week. That's how you grow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handlePrimaryCTA}
              className="px-10 py-5 bg-[#e35e25] text-white rounded-full font-bold text-lg hover:bg-[#cf4d1d] transition-colors shadow-lg shadow-orange-900/20 hover:shadow-xl touch-manipulation active:scale-[0.98]"
            >
              Start your first circle
            </button>
            <button
              onClick={handleSecondaryCTA}
              className="px-10 py-5 border-2 border-white text-white rounded-full font-bold text-lg hover:bg-white hover:text-[#15383c] transition-colors touch-manipulation active:scale-[0.98]"
            >
              Get setup help
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 md:py-16 lg:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#15383c] mb-10 text-center">
            FAQ
          </h2>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-200 last:border-0">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full py-6 flex items-center justify-between text-left group hover:bg-gray-50/50 transition-colors"
                  aria-expanded={openFaqIndex === index}
                >
                  <span className={`font-medium text-lg transition-colors ${
                    openFaqIndex === index ? 'text-[#e35e25]' : 'text-[#15383c]'
                  }`}>
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`text-gray-400 transition-transform duration-300 ${
                      openFaqIndex === index ? 'rotate-180 text-[#e35e25]' : ''
                    }`}
                  />
                </button>
                
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaqIndex === index ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
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

