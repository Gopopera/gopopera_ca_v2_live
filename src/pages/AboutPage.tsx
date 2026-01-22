import React from 'react';
import { ViewState } from '../../types';
import { Check, Users, MessageCircle, MapPin, DollarSign, TrendingUp, Heart, Calendar, ChevronLeft, ArrowRight, Sparkles, Bell, Palette, Utensils, Activity, BookOpen, HandHeart, Star } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SeoHelmet } from '../../components/seo/SeoHelmet';

interface AboutPageProps {
  setViewState: (view: ViewState) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ setViewState }) => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#15383c] text-gray-200 font-sans pt-20 sm:pt-24 pb-12 sm:pb-20">
      {/* SEO: About page meta tags */}
      <SeoHelmet viewState={ViewState.ABOUT} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-6 sm:mb-10">
        <button onClick={() => setViewState(ViewState.LANDING)} className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors touch-manipulation active:scale-95">
          <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
        </button>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-6 sm:mb-8 md:mb-10 leading-tight px-2">
            {t('about.title')}
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 font-light max-w-3xl mx-auto leading-[1.8] sm:leading-relaxed px-4 sm:px-6 mb-6 sm:mb-8">
            {t('about.description')}
          </p>
          {/* Micro-line */}
          <p className="text-xs sm:text-sm text-[#e35e25] font-medium tracking-wide mt-4 sm:mt-2">
            {t('about.microLine')}
          </p>
        </div>

        {/* Commitment Section */}
        <section className="mb-12 sm:mb-16 md:mb-24">
          <div className="bg-white/5 p-6 sm:p-8 md:p-12 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#e35e25] rounded-full blur-[120px] opacity-10 pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
            <div className="relative z-10 flex flex-col md:flex-row gap-6 sm:gap-8 md:gap-10 items-center">
              <div className="flex-1 space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed">
                <p>{t('about.letsHost')}</p>
              </div>
              <div className="flex-1 bg-[#1a454a] p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/5 w-full">
                <h3 className="font-bold text-white text-lg sm:text-xl mb-3 sm:mb-4 flex items-center gap-2">
                  <Calendar size={18} className="sm:w-5 sm:h-5 text-[#e35e25]" /> {t('about.commitment')}
                </h3>
                <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">{t('about.commitmentDesc')}</p>
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-[#e35e25]">
                  <Check size={14} className="sm:w-4 sm:h-4" />
                  <span>{t('about.reduceNoShows')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What You Can Do - 5 Category Cards */}
        <section className="mb-12 sm:mb-16 md:mb-24">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <span className="inline-block py-1.5 px-4 rounded-full bg-white/5 border border-white/10 text-[#e35e25] text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase mb-3 sm:mb-4">
              {t('about.capabilities')}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white">
              {t('about.whatYouCanDo')}
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-2">{t('about.allCategories')}</p>
          </div>
          
          {/* 5 Category Cards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Workshops & Skills */}
            <div className="bg-[#1a454a] p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 hover:-translate-y-2 transition-transform duration-500">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-[#e35e25] mb-4 sm:mb-6">
                <Palette size={20} className="sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">{t('about.makeCreate')}</h3>
              <p className="text-gray-400 leading-relaxed text-sm sm:text-base">{t('about.makeCreateDesc')}</p>
            </div>

            {/* Food & Drink */}
            <div className="bg-[#1a454a] p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 hover:-translate-y-2 transition-transform duration-500">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-[#e35e25] mb-4 sm:mb-6">
                <Utensils size={20} className="sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">{t('about.eatDrink')}</h3>
              <p className="text-gray-400 leading-relaxed text-sm sm:text-base">{t('about.eatDrinkDesc')}</p>
            </div>

            {/* Sports & Recreation */}
            <div className="bg-[#1a454a] p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 hover:-translate-y-2 transition-transform duration-500">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-[#e35e25] mb-4 sm:mb-6">
                <Activity size={20} className="sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">{t('about.moveFlow')}</h3>
              <p className="text-gray-400 leading-relaxed text-sm sm:text-base">{t('about.moveFlowDesc')}</p>
            </div>

            {/* Arts & Culture */}
            <div className="bg-[#1a454a] p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 hover:-translate-y-2 transition-transform duration-500">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-[#e35e25] mb-4 sm:mb-6">
                <BookOpen size={20} className="sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">{t('about.talkThink')}</h3>
              <p className="text-gray-400 leading-relaxed text-sm sm:text-base">{t('about.talkThinkDesc')}</p>
            </div>

            {/* Community & Causes */}
            <div className="bg-[#1a454a] p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 hover:-translate-y-2 transition-transform duration-500">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-[#e35e25] mb-4 sm:mb-6">
                <HandHeart size={20} className="sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">{t('about.communitySupport')}</h3>
              <p className="text-gray-400 leading-relaxed text-sm sm:text-base">{t('about.communitySupportDesc')}</p>
            </div>
          </div>
        </section>

        {/* Group Chat + Trust/Reputation Cards */}
        <section className="mb-12 sm:mb-16 md:mb-24 grid md:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-white/5 p-6 sm:p-8 md:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#e35e25] rounded-full flex items-center justify-center text-white mb-6 sm:mb-8 shadow-lg shadow-orange-900/40">
              <MessageCircle size={24} className="sm:w-7 sm:h-7" />
            </div>
            <h3 className="text-xl sm:text-2xl font-heading font-bold text-white mb-4 sm:mb-6">{t('about.keepConversation')}</h3>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">{t('about.keepConversationDesc')}</p>
          </div>
          <div className="bg-white/5 p-6 sm:p-8 md:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#15383c] rounded-full flex items-center justify-center text-white mb-6 sm:mb-8 border border-white/20 shadow-lg">
              <Star size={24} className="sm:w-7 sm:h-7" />
            </div>
            <h3 className="text-xl sm:text-2xl font-heading font-bold text-white mb-4 sm:mb-6">{t('about.buildFollowing')}</h3>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">{t('about.buildFollowingDesc')}</p>
          </div>
        </section>

        {/* AI + Notifications Cards */}
        <section className="mb-12 sm:mb-16 md:mb-24 grid md:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-white/5 p-6 sm:p-8 md:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#1a454a] rounded-full flex items-center justify-center text-white mb-6 sm:mb-8 border border-white/20 shadow-lg">
              <Sparkles size={24} className="sm:w-7 sm:h-7" />
            </div>
            <h3 className="text-xl sm:text-2xl font-heading font-bold text-white mb-4 sm:mb-6">{t('about.aiPowered')}</h3>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">{t('about.aiPoweredDesc')}</p>
          </div>
          <div className="bg-white/5 p-6 sm:p-8 md:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#e35e25] rounded-full flex items-center justify-center text-white mb-6 sm:mb-8 shadow-lg shadow-orange-900/40">
              <Bell size={24} className="sm:w-7 sm:h-7" />
            </div>
            <h3 className="text-xl sm:text-2xl font-heading font-bold text-white mb-4 sm:mb-6">{t('about.smartNotifications')}</h3>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">{t('about.smartNotificationsDesc')}</p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-[#e35e25] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10 lg:p-16 text-white relative overflow-hidden shadow-2xl shadow-orange-900/30">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
          <div className="relative z-10 grid md:grid-cols-2 gap-8 sm:gap-10 md:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-4 sm:mb-6">{t('about.hostingFree')}</h2>
              <p className="text-base sm:text-lg md:text-xl opacity-90 leading-relaxed font-medium">{t('about.hostingFreeDesc')}</p>
            </div>
            <div className="bg-black/20 backdrop-blur-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-black/5">
              <h4 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">{t('about.howFeesWork')}</h4>
              <p className="text-white/90 leading-relaxed mb-4 sm:mb-6 text-sm sm:text-base">{t('about.feesWorkDesc')} <span className="font-bold bg-white text-[#e35e25] px-1 rounded">10%</span>.</p>
              <button onClick={() => { setViewState(ViewState.AUTH); window.history.pushState({ viewState: ViewState.AUTH }, '', '/auth?mode=signup'); }} className="w-full py-3.5 sm:py-4 bg-white text-[#e35e25] rounded-full font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation active:scale-95">
                {t('about.startHosting')} <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
