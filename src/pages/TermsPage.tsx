import React from 'react';
import { ViewState } from '../../types';
import { ChevronLeft, FileText, Scale, Shield, Users, CreditCard, AlertTriangle, Lock, Gavel, Mail, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SeoHelmet } from '../../components/seo/SeoHelmet';

interface TermsPageProps {
  setViewState: (view: ViewState) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ setViewState }) => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#15383c] text-gray-200 font-sans pt-20 sm:pt-24 pb-12 sm:pb-20">
      <SeoHelmet viewState={ViewState.TERMS} />
      
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
          <p className="text-xs sm:text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            {t('terms.effectiveDate')}
          </p>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
            {t('terms.intro')}
          </p>
        </div>

        {/* Related Policies Links */}
        <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10 mb-8 sm:mb-10">
          <p className="text-sm sm:text-base text-gray-300 mb-3">{t('terms.relatedPolicies')}</p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button onClick={() => setViewState(ViewState.PRIVACY)} className="flex items-center gap-1.5 text-[#e35e25] hover:underline text-sm">
              <ExternalLink size={14} /> {t('terms.privacyPolicyLink')}
            </button>
            <button onClick={() => setViewState(ViewState.CANCELLATION)} className="flex items-center gap-1.5 text-[#e35e25] hover:underline text-sm">
              <ExternalLink size={14} /> {t('terms.cancellationPolicyLink')}
            </button>
            <button onClick={() => setViewState(ViewState.GUIDELINES)} className="flex items-center gap-1.5 text-[#e35e25] hover:underline text-sm">
              <ExternalLink size={14} /> {t('terms.guidelinesLink')}
            </button>
          </div>
        </div>

        <div className="space-y-8 sm:space-y-10 md:space-y-12 text-base sm:text-lg font-light leading-relaxed text-gray-300">
          {/* 1. Acceptance */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6 flex items-center gap-3">
              <FileText className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6" />
              {t('terms.s1Title')}
            </h2>
            <p className="mb-4">{t('terms.s1Desc')}</p>
          </section>

          {/* 2. What Popera Is */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6 flex items-center gap-3">
              <Scale className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6" />
              {t('terms.s2Title')}
            </h2>
            <p className="mb-4">{t('terms.s2Desc1')}</p>
            <p className="mb-4 p-4 bg-white/5 rounded-lg border-l-4 border-[#e35e25]">
              <strong className="text-white">{t('terms.s2PlatformRole')}</strong> {t('terms.s2PlatformRoleDesc')}
            </p>
          </section>

          {/* 3. Eligibility */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6 flex items-center gap-3">
              <Users className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6" />
              {t('terms.s3Title')}
            </h2>
            <p className="mb-4">{t('terms.s3Desc')}</p>
          </section>

          {/* 4. Listings */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.s4Title')}
            </h2>
            <p className="mb-4">{t('terms.s4Desc')}</p>
          </section>

          {/* 5. Host Responsibilities */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.s5Title')}
            </h2>
            <p className="mb-4">{t('terms.s5Intro')}</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>{t('terms.s5Item1')}</li>
              <li>{t('terms.s5Item2')}</li>
              <li>{t('terms.s5Item3')}</li>
              <li>{t('terms.s5Item4')}</li>
              <li>{t('terms.s5Item5')}</li>
              <li>{t('terms.s5Item6')}</li>
            </ul>
            <p className="p-4 bg-yellow-500/10 rounded-lg border-l-4 border-yellow-500 text-yellow-200">
              <strong>{t('terms.s5NoInsurance')}</strong> {t('terms.s5NoInsuranceDesc')}
            </p>
          </section>

          {/* 6. Attendee Responsibilities */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.s6Title')}
            </h2>
            <p className="mb-4">{t('terms.s6Intro')}</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>{t('terms.s6Item1')}</li>
              <li>{t('terms.s6Item2')}</li>
              <li>{t('terms.s6Item3')}</li>
              <li>{t('terms.s6Item4')}</li>
              <li>{t('terms.s6Item5')}</li>
            </ul>
          </section>

          {/* 7. Payments */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6 flex items-center gap-3">
              <CreditCard className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6" />
              {t('terms.s7Title')}
            </h2>
            
            <h3 className="text-lg font-bold text-white mb-2">{t('terms.s7FeesTitle')}</h3>
            <p className="mb-4">{t('terms.s7FeesDesc')}</p>
            
            <h3 className="text-lg font-bold text-white mb-2">{t('terms.s7CommitmentTitle')}</h3>
            <p className="mb-4">{t('terms.s7CommitmentDesc')}</p>
            
            <h3 className="text-lg font-bold text-white mb-2">{t('terms.s7ProcessingTitle')}</h3>
            <p className="mb-4">{t('terms.s7ProcessingDesc')}</p>
            
            <h3 className="text-lg font-bold text-white mb-2">{t('terms.s7PayoutTitle')}</h3>
            <p className="mb-4">{t('terms.s7PayoutDesc')}</p>
            
            <h3 className="text-lg font-bold text-white mb-2">{t('terms.s7ChargebacksTitle')}</h3>
            <p className="mb-4">{t('terms.s7ChargebacksDesc')}</p>
            
            <h3 className="text-lg font-bold text-white mb-2">{t('terms.s7TaxesTitle')}</h3>
            <p className="mb-4">{t('terms.s7TaxesDesc')}</p>
          </section>

          {/* 8. Cancellations */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.s8Title')}
            </h2>
            <p className="mb-4">{t('terms.s8Desc')}</p>
          </section>

          {/* 9. Safety */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6 flex items-center gap-3">
              <Shield className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6" />
              {t('terms.s9Title')}
            </h2>
            <p className="mb-4">{t('terms.s9Desc1')}</p>
            <p className="mb-4">{t('terms.s9Desc2')}</p>
          </section>

          {/* 10. Prohibited */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6 flex items-center gap-3">
              <AlertTriangle className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6" />
              {t('terms.s10Title')}
            </h2>
            <p className="mb-4">{t('terms.s10Intro')}</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>{t('terms.s10Item1')}</li>
              <li>{t('terms.s10Item2')}</li>
              <li>{t('terms.s10Item3')}</li>
              <li>{t('terms.s10Item4')}</li>
              <li>{t('terms.s10Item5')}</li>
              <li>{t('terms.s10Item6')}</li>
              <li>{t('terms.s10Item7')}</li>
            </ul>
            <p className="mb-4">{t('terms.s10Enforcement')}</p>
          </section>

          {/* 11. Content & IP */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.s11Title')}
            </h2>
            <p className="mb-4">{t('terms.s11Desc1')}</p>
            <p className="mb-4">{t('terms.s11Desc2')}</p>
          </section>

          {/* 12. Privacy */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6 flex items-center gap-3">
              <Lock className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6" />
              {t('terms.s12Title')}
            </h2>
            <p className="mb-4">{t('terms.s12Desc')}</p>
          </section>

          {/* 13. Termination */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.s13Title')}
            </h2>
            <p className="mb-4">{t('terms.s13Desc1')}</p>
            <p className="mb-4">{t('terms.s13Desc2')}</p>
          </section>

          {/* 14. Disclaimers */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.s14Title')}
            </h2>
            <p className="mb-4">{t('terms.s14Desc')}</p>
          </section>

          {/* 15. Limitation of Liability */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.s15Title')}
            </h2>
            <p className="mb-4">{t('terms.s15Intro')}</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>{t('terms.s15Item1')}</li>
              <li>{t('terms.s15Item2')}</li>
              <li>{t('terms.s15Item3')}</li>
            </ul>
            <p className="mb-4">{t('terms.s15Jurisdictions')}</p>
          </section>

          {/* 16. Indemnity */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.s16Title')}
            </h2>
            <p className="mb-4">{t('terms.s16Desc')}</p>
          </section>

          {/* 17. Changes */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              {t('terms.s17Title')}
            </h2>
            <p className="mb-4">{t('terms.s17Desc')}</p>
          </section>

          {/* 18. Governing Law */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6 flex items-center gap-3">
              <Gavel className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6" />
              {t('terms.s18Title')}
            </h2>
            <div className="bg-white/5 p-4 rounded-lg border border-white/10 mb-4">
              <p className="mb-3"><strong className="text-white">{t('terms.s18Quebec')}</strong></p>
              <p className="mb-4">{t('terms.s18QuebecDesc')}</p>
              <p className="mb-3"><strong className="text-white">{t('terms.s18OtherProvinces')}</strong></p>
              <p className="mb-4">{t('terms.s18OtherProvincesDesc')}</p>
            </div>
            <p className="text-sm italic">{t('terms.s18ConsumerRights')}</p>
          </section>

          {/* 19. Contact */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl border border-white/10">
            <h2 className="text-xl sm:text-2xl font-bold text-white font-heading mb-4 flex items-center gap-3">
              <Mail className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6" />
              {t('terms.s19Title')}
            </h2>
            <p className="mb-4">{t('terms.s19Desc')}</p>
            <p className="text-white">
              {t('terms.email')}<br />
              {t('terms.website')}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
