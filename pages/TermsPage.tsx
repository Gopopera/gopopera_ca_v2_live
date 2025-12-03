import React from 'react';
import { ViewState } from '../types';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface TermsPageProps {
  setViewState: (view: ViewState) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ setViewState }) => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#15383c] text-gray-200 font-sans pt-20 sm:pt-24 pb-12 sm:pb-20">
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
            {t('terms.title')}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-gray-400 uppercase tracking-wider">
            {t('terms.lastUpdated')}
          </p>
        </div>

        <div className="space-y-8 sm:space-y-10 md:space-y-12 text-base sm:text-lg font-light leading-relaxed text-gray-300">
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.acceptance')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('terms.acceptanceDesc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.description')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('terms.descriptionDesc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.userAccounts')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('terms.userAccountsDesc1')}
            </p>
            <p className="mb-4 sm:mb-6">
              {t('terms.userAccountsDesc2')}
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.hostResponsibilities')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('terms.hostResponsibilitiesDesc')}
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li>{t('terms.provideAccurate')}</li>
              <li>{t('terms.honorReservations')}</li>
              <li>{t('terms.maintainSafe')}</li>
              <li>{t('terms.complyLaws')}</li>
              <li>{t('terms.respondPromptly')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.attendeeResponsibilities')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('terms.attendeeResponsibilitiesDesc')}
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li>{t('terms.rsvpGenuinely')}</li>
              <li>{t('terms.arriveOnTime')}</li>
              <li>{t('terms.treatRespectfully')}</li>
              <li>{t('terms.payPromptly')}</li>
              <li>{t('terms.cancelTimely')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.paymentsFees')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('terms.paymentsFeesDesc1')}
            </p>
            <p className="mb-4 sm:mb-6">
              {t('terms.paymentsFeesDesc2')}
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.prohibited')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('terms.prohibitedDesc')}
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li>{t('terms.postFalse')}</li>
              <li>{t('terms.harass')}</li>
              <li>{t('terms.violateLaws')}</li>
              <li>{t('terms.spam')}</li>
              <li>{t('terms.impersonate')}</li>
              <li>{t('terms.interfere')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.intellectualProperty')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('terms.intellectualPropertyDesc1')}
            </p>
            <p className="mb-4 sm:mb-6">
              {t('terms.intellectualPropertyDesc2')}
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.limitationLiability')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('terms.limitationLiabilityDesc1')}
            </p>
            <p className="mb-4 sm:mb-6">
              {t('terms.limitationLiabilityDesc2')}
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.modifications')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('terms.modificationsDesc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.contactInfo')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('terms.contactInfoDesc')}
            </p>
            <p className="mb-4 sm:mb-6">
              {t('terms.email')}<br />
              {t('terms.website')}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
