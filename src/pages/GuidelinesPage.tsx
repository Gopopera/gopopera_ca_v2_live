import React from 'react';
import { ViewState } from '../../types';
import { ChevronLeft, Heart, Shield, AlertTriangle, UserCheck, MessageCircle, Users, Mail, AlertCircle, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SeoHelmet } from '../../components/seo/SeoHelmet';

interface GuidelinesPageProps {
  setViewState: (view: ViewState) => void;
}

export const GuidelinesPage: React.FC<GuidelinesPageProps> = ({ setViewState }) => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#15383c] text-gray-200 font-sans pt-20 sm:pt-24 pb-12 sm:pb-20">
      {/* SEO: Guidelines page meta tags */}
      <SeoHelmet viewState={ViewState.GUIDELINES} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-6 sm:mb-10">
        <button 
          onClick={() => setViewState(ViewState.LANDING)} 
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors touch-manipulation active:scale-95"
        >
          <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
        </button>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-12 md:mb-16">
          <h1 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-white mb-3 sm:mb-4">
            {t('guidelines.title')}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            {t('guidelines.lastUpdated')}
          </p>
          <p className="text-base sm:text-lg text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
            {t('guidelines.subtitle')}
          </p>
        </div>

        <div className="space-y-8 sm:space-y-10 md:space-y-12">
          {/* Introduction */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300">
              {t('guidelines.intro')}
            </p>
          </section>

          {/* Core Principles */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <Heart className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.corePrinciples')}
            </h2>
            <div className="space-y-6 sm:space-y-8">
              <div>
                <h3 className="font-bold text-white mb-2 text-lg sm:text-xl">{t('guidelines.respect')}</h3>
                <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300">
                  {t('guidelines.respectDesc')}
                </p>
              </div>
              <div>
                <h3 className="font-bold text-white mb-2 text-lg sm:text-xl">{t('guidelines.honesty')}</h3>
                <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300">
                  {t('guidelines.honestyDesc')}
                </p>
              </div>
              <div>
                <h3 className="font-bold text-white mb-2 text-lg sm:text-xl">{t('guidelines.safety')}</h3>
                <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300">
                  {t('guidelines.safetyDesc')}
                </p>
              </div>
            </div>
          </section>

          {/* Expectations for Everyone */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <Users className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.forEveryone')}
            </h2>
            <ul className="space-y-3 sm:space-y-4 text-base sm:text-lg font-light leading-relaxed text-gray-300 list-disc list-inside ml-2 sm:ml-4">
              <li>{t('guidelines.everyoneRule1')}</li>
              <li>{t('guidelines.everyoneRule2')}</li>
              <li>{t('guidelines.everyoneRule3')}</li>
              <li>{t('guidelines.everyoneRule4')}</li>
              <li>{t('guidelines.everyoneRule5')}</li>
            </ul>
          </section>

          {/* For Hosts */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <UserCheck className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.forHosts')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
              {t('guidelines.forHostsIntro')}
            </p>
            <ul className="space-y-3 sm:space-y-4 text-base sm:text-lg font-light leading-relaxed text-gray-300 list-disc list-inside ml-2 sm:ml-4 mb-6 sm:mb-8">
              <li>{t('guidelines.hostRule1')}</li>
              <li>{t('guidelines.hostRule2')}</li>
              <li>{t('guidelines.hostRule3')}</li>
              <li>{t('guidelines.hostRule4')}</li>
              <li>{t('guidelines.hostRule5')}</li>
              <li>{t('guidelines.hostRule6')}</li>
            </ul>
            <div className="bg-[#e35e25]/10 p-4 sm:p-5 rounded-xl border border-[#e35e25]/20">
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                <strong className="text-white">{t('guidelines.verificationNote')}</strong> {t('guidelines.verificationNoteDesc')}
              </p>
            </div>
          </section>

          {/* For Attendees */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <Users className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.forAttendees')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
              {t('guidelines.forAttendeesIntro')}
            </p>
            <ul className="space-y-3 sm:space-y-4 text-base sm:text-lg font-light leading-relaxed text-gray-300 list-disc list-inside ml-2 sm:ml-4">
              <li>{t('guidelines.attendeeRule1')}</li>
              <li>{t('guidelines.attendeeRule2')}</li>
              <li>{t('guidelines.attendeeRule3')}</li>
            </ul>
          </section>

          {/* Group Chats & Communication */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <MessageCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.groupChats')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
              {t('guidelines.groupChatsIntro')}
            </p>
            <ul className="space-y-3 sm:space-y-4 text-base sm:text-lg font-light leading-relaxed text-gray-300 list-disc list-inside ml-2 sm:ml-4 mb-6 sm:mb-8">
              <li>{t('guidelines.chatRule1')}</li>
              <li>{t('guidelines.chatRule2')}</li>
              <li>{t('guidelines.chatRule3')}</li>
            </ul>
            <p className="text-sm sm:text-base text-gray-400 italic">
              {t('guidelines.chatEnforcement')}
            </p>
          </section>

          {/* Prohibited Content & Behavior */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <X className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.prohibitedContent')}
            </h2>
            <ul className="space-y-3 sm:space-y-4 text-base sm:text-lg font-light leading-relaxed text-gray-300 list-disc list-inside ml-2 sm:ml-4">
              <li>{t('guidelines.prohibited1')}</li>
              <li>{t('guidelines.prohibited2')}</li>
              <li>{t('guidelines.prohibited3')}</li>
              <li>{t('guidelines.prohibited4')}</li>
              <li>{t('guidelines.prohibited5')}</li>
              <li>{t('guidelines.prohibited6')}</li>
              <li>{t('guidelines.prohibited7')}</li>
              <li>{t('guidelines.prohibited8')}</li>
              <li>{t('guidelines.prohibited9')}</li>
              <li>{t('guidelines.prohibited10')}</li>
              <li>{t('guidelines.prohibited11')}</li>
              <li>{t('guidelines.prohibited12')}</li>
            </ul>
          </section>

          {/* Enforcement */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <Shield className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.enforcement')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
              {t('guidelines.enforcementIntro')}
            </p>
            <ul className="space-y-2 sm:space-y-3 text-base sm:text-lg font-light leading-relaxed text-gray-300 list-disc list-inside ml-2 sm:ml-4">
              <li>{t('guidelines.enforcement1')}</li>
              <li>{t('guidelines.enforcement2')}</li>
              <li>{t('guidelines.enforcement3')}</li>
              <li>{t('guidelines.enforcement4')}</li>
              <li>{t('guidelines.enforcement5')}</li>
              <li>{t('guidelines.enforcement6')}</li>
            </ul>
          </section>

          {/* Reporting */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <AlertCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.reporting')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300">
              {t('guidelines.reportingDesc')}
            </p>
          </section>

          {/* Questions / Contact */}
          <section className="bg-[#e35e25]/10 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-[#e35e25]/20">
            <h2 className="text-xl sm:text-2xl font-bold text-white font-heading mb-4 sm:mb-6 flex items-center gap-3">
              <Mail className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.questions')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-2">
              {t('guidelines.questionsContact') && <>{t('guidelines.questionsContact')} </>}<a href="mailto:support@gopopera.ca" className="text-[#e35e25] hover:underline">{t('guidelines.email')}</a>
            </p>
            <p className="text-base sm:text-lg font-light text-gray-300">
              {t('guidelines.website')}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
