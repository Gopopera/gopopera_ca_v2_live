import React from 'react';
import { ViewState } from '../../types';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface PrivacyPageProps {
  setViewState: (view: ViewState) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ setViewState }) => {
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
            {t('privacy.title')}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-gray-400 uppercase tracking-wider">
            {t('privacy.lastUpdated')}
          </p>
        </div>

        <div className="space-y-8 sm:space-y-10 md:space-y-12 text-base sm:text-lg font-light leading-relaxed text-gray-300">
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('privacy.introduction')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('privacy.introductionDesc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('privacy.informationCollect')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('privacy.informationCollectDesc')}
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li>{t('privacy.accountInfo')}</li>
              <li>{t('privacy.profileInfo')}</li>
              <li>{t('privacy.eventInfo')}</li>
              <li>{t('privacy.paymentInfo')}</li>
              <li>{t('privacy.communications')}</li>
            </ul>
            <p className="mb-4 sm:mb-6">
              {t('privacy.automaticallyCollect')}
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li>{t('privacy.deviceInfo')}</li>
              <li>{t('privacy.usageData')}</li>
              <li>{t('privacy.locationData')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('privacy.howUse')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('privacy.howUseDesc')}
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li>{t('privacy.provideMaintain')}</li>
              <li>{t('privacy.processTransactions')}</li>
              <li>{t('privacy.sendNotifications')}</li>
              <li>{t('privacy.personalize')}</li>
              <li>{t('privacy.detectPrevent')}</li>
              <li>{t('privacy.complyLegal')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('privacy.informationSharing')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('privacy.informationSharingDesc')}
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li><strong>{t('privacy.withUsers')}</strong> {t('privacy.withUsersDesc')}</li>
              <li><strong>{t('privacy.withProviders')}</strong> {t('privacy.withProvidersDesc')}</li>
              <li><strong>{t('privacy.forLegal')}</strong> {t('privacy.forLegalDesc')}</li>
              <li><strong>{t('privacy.withConsent')}</strong> {t('privacy.withConsentDesc')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('privacy.dataSecurity')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('privacy.dataSecurityDesc1')}
            </p>
            <p className="mb-4 sm:mb-6">
              {t('privacy.dataSecurityDesc2')}
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('privacy.yourRights')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('privacy.yourRightsDesc')}
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li>{t('privacy.accessUpdate')}</li>
              <li>{t('privacy.deleteAccount')}</li>
              <li>{t('privacy.optOut')}</li>
              <li>{t('privacy.requestCopy')}</li>
              <li>{t('privacy.objectProcessing')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('privacy.cookiesTracking')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('privacy.cookiesTrackingDesc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('privacy.childrenPrivacy')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('privacy.childrenPrivacyDesc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('privacy.internationalTransfers')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('privacy.internationalTransfersDesc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('privacy.changesPolicy')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('privacy.changesPolicyDesc')}
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('privacy.contactUs')}
            </h2>
            <p className="mb-4 sm:mb-6">
              {t('privacy.contactUsDesc')}
            </p>
            <p className="mb-4 sm:mb-6">
              {t('privacy.email')}<br />
              {t('privacy.website')}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
