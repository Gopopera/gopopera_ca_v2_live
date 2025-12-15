import React from 'react';
import { ViewState } from '../../types';
import { ChevronLeft, Heart, Shield, AlertTriangle, UserCheck, MessageCircle, Users } from 'lucide-react';
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
          <p className="text-base sm:text-lg text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
            {t('guidelines.subtitle')}
          </p>
        </div>

        <div className="space-y-8 sm:space-y-10 md:space-y-12">
          {/* Core Principles */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <Heart className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.corePrinciples')}
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
              <p>
                {t('guidelines.corePrinciplesDesc')}
              </p>
            </div>
          </section>

          {/* For Everyone */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <Users className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.forEveryone')}
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">{t('guidelines.beRespectful')}</h3>
                <p className="mb-3 sm:mb-4">
                  {t('guidelines.beRespectfulDesc')}
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">{t('guidelines.beHonest')}</h3>
                <p className="mb-3 sm:mb-4">
                  {t('guidelines.beHonestDesc')}
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">{t('guidelines.beSafe')}</h3>
                <p className="mb-3 sm:mb-4">
                  {t('guidelines.beSafeDesc')}
                </p>
              </div>
            </div>
          </section>

          {/* For Hosts */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <UserCheck className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.forHosts')}
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">{t('guidelines.hostVerification')}</h3>
                <p className="mb-3 sm:mb-4">
                  {t('guidelines.hostVerificationDesc')}
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">{t('guidelines.accurateListings')}</h3>
                <p className="mb-3 sm:mb-4">
                  {t('guidelines.accurateListingsDesc')}
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">{t('guidelines.honorCommitments')}</h3>
                <p className="mb-3 sm:mb-4">
                  {t('guidelines.honorCommitmentsDesc')}
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">{t('guidelines.safeSpaces')}</h3>
                <p className="mb-3 sm:mb-4">
                  {t('guidelines.safeSpacesDesc')}
                </p>
              </div>
            </div>
          </section>

          {/* For Attendees */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <MessageCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.forAttendees')}
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">{t('guidelines.rsvpResponsibly')}</h3>
                <p className="mb-3 sm:mb-4">
                  {t('guidelines.rsvpResponsiblyDesc')}
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">{t('guidelines.respectSpace')}</h3>
                <p className="mb-3 sm:mb-4">
                  {t('guidelines.respectSpaceDesc')}
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">{t('guidelines.honestReviews')}</h3>
                <p className="mb-3 sm:mb-4">
                  {t('guidelines.honestReviewsDesc')}
                </p>
              </div>
            </div>
          </section>

          {/* Communication */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <MessageCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.groupChats')}
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">{t('guidelines.moderatedConversations')}</h3>
                <p className="mb-3 sm:mb-4">
                  {t('guidelines.moderatedConversationsDesc')}
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">{t('guidelines.privacy')}</h3>
                <p className="mb-3 sm:mb-4">
                  {t('guidelines.privacyDesc')}
                </p>
              </div>
            </div>
          </section>

          {/* Prohibited Content */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <AlertTriangle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.prohibitedContent')}
            </h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
              <ul className="space-y-3 sm:space-y-4 text-base sm:text-lg font-light leading-relaxed text-gray-300 list-disc list-inside ml-2 sm:ml-4">
                <li>{t('guidelines.illegalActivities')}</li>
                <li>{t('guidelines.discrimination')}</li>
                <li>{t('guidelines.fraudulent')}</li>
                <li>{t('guidelines.spam')}</li>
                <li>{t('guidelines.adultContent')}</li>
                <li>{t('guidelines.violence')}</li>
                <li>{t('guidelines.impersonation')}</li>
                <li>{t('guidelines.circumventing')}</li>
              </ul>
            </div>
          </section>

          {/* Enforcement */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <Shield className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('guidelines.enforcement')}
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
              <p>
                {t('guidelines.violationsMayResult')}
              </p>
              <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6">
                <li>{t('guidelines.warnings')}</li>
                <li>{t('guidelines.temporaryRestrictions')}</li>
                <li>{t('guidelines.permanentSuspension')}</li>
                <li>{t('guidelines.legalAction')}</li>
              </ul>
              <p className="mt-4 sm:mt-6">
                {t('guidelines.reportViolations')}
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-[#e35e25]/10 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-[#e35e25]/20">
            <h2 className="text-xl sm:text-2xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('guidelines.questionsConcerns')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
              {t('guidelines.questionsDesc')}
            </p>
            <p className="text-base sm:text-lg font-light text-gray-300">
              {t('guidelines.email')}<br />
              {t('guidelines.website')}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
