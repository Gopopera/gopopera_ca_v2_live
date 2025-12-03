import React from 'react';
import { ViewState } from '../types';
import { ChevronLeft, Clock, XCircle, AlertCircle, CreditCard, UserX, Edit, HelpCircle, DollarSign, Mail, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CancellationPageProps {
  setViewState: (view: ViewState) => void;
}

export const CancellationPage: React.FC<CancellationPageProps> = ({ setViewState }) => {
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
            {t('cancellation.title')}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 sm:mb-6">
            {t('cancellation.lastUpdated')}
          </p>
          <p className="text-base sm:text-lg text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
            {t('cancellation.subtitle')}
          </p>
        </div>

        <div className="space-y-8 sm:space-y-10 md:space-y-12">
          {/* Overview */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <AlertCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.overview')}
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
              <p>
                {t('cancellation.overviewDesc')}
              </p>
            </div>
          </section>

          {/* Attendee Cancellations */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <UserX className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.attendeeCancellations')}
            </h2>
            
            {/* Free Events Card */}
            <div className="bg-white/5 p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10 mb-4 sm:mb-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle className="text-green-400 w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white mb-2 sm:mb-3 text-lg sm:text-xl">{t('cancellation.freeEvents')}</h3>
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    {t('cancellation.freeEventsDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Paid Events Card */}
            <div className="bg-white/5 p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
              <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#e35e25]/20 rounded-xl flex items-center justify-center shrink-0">
                  <DollarSign className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white mb-2 sm:mb-3 text-lg sm:text-xl">{t('cancellation.paidEvents')}</h3>
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4 sm:mb-6">
                    {t('cancellation.paidEventsDesc')}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 sm:space-y-4 ml-0 sm:ml-16">
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-[#15383c] rounded-lg border border-white/5">
                  <CheckCircle className="text-green-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white text-sm sm:text-base mb-1">{t('cancellation.fullRefund')}</p>
                    <p className="text-gray-400 text-xs sm:text-sm">{t('cancellation.fullRefundDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-[#15383c] rounded-lg border border-white/5">
                  <AlertTriangle className="text-yellow-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white text-sm sm:text-base mb-1">{t('cancellation.partialRefund')}</p>
                    <p className="text-gray-400 text-xs sm:text-sm">{t('cancellation.partialRefundDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-[#15383c] rounded-lg border border-white/5">
                  <X className="text-red-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white text-sm sm:text-base mb-1">{t('cancellation.noRefund')}</p>
                    <p className="text-gray-400 text-xs sm:text-sm">{t('cancellation.noRefundDesc')}</p>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-400 text-xs sm:text-sm mt-4 sm:mt-6 ml-0 sm:ml-16 italic">
                {t('cancellation.specificPolicy')}
              </p>
            </div>
          </section>

          {/* Host Cancellations */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <XCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.hostCancellations')}
            </h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
              <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
                {t('cancellation.hostCancellationsDesc')}
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <CheckCircle className="text-green-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    {t('cancellation.allAttendeesRefund')} <strong className="text-white">{t('cancellation.fullRefundIncluding')}</strong>, {t('cancellation.includingServiceFees')}
                  </p>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <CheckCircle className="text-green-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    {t('cancellation.notifiedImmediately')}
                  </p>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <AlertCircle className="text-yellow-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    {t('cancellation.accountReviewed')}
                  </p>
                </div>
              </div>
              <div className="mt-6 sm:mt-8 p-4 sm:p-5 bg-[#e35e25]/10 rounded-xl border border-[#e35e25]/20">
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('cancellation.tip')}</strong> {t('cancellation.tipDesc')}
                </p>
              </div>
            </div>
          </section>

          {/* Refund Processing */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <CreditCard className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.refundProcessing')}
            </h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
              <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
                <div className="flex items-start gap-3 sm:gap-4">
                  <Clock className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-white mb-2">{t('cancellation.processingTime')}</p>
                    <p>
                      {t('cancellation.processingTimeDesc')} <strong className="text-white">{t('cancellation.businessDays')}</strong>{t('cancellation.processingTimeDesc2')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-white/10">
                  <DollarSign className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-white mb-2">{t('cancellation.serviceFeeRefunds')}</p>
                    <p>
                      {t('cancellation.serviceFeeRefundsDesc')} <strong className="text-[#e35e25]">{t('cancellation.serviceFeePercent')}</strong> {t('cancellation.serviceFeeRefundsDesc2')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* No-Show Policy */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <AlertTriangle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.noShowPolicy')}
            </h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
              <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
                {t('cancellation.noShowPolicyDesc')}
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <X className="text-red-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    {t('cancellation.noRefundNoShow')} <strong className="text-white">{t('cancellation.notReceiveRefund')}</strong> {t('cancellation.noRefundNoShowDesc')}
                  </p>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <AlertTriangle className="text-red-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    <strong className="text-white">{t('cancellation.repeatedNoShows')}</strong> {t('cancellation.repeatedNoShowsDesc')}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Event Modifications */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <Edit className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.eventModifications')}
            </h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
              <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
                {t('cancellation.eventModificationsDesc')}
              </p>
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="p-4 sm:p-5 bg-[#15383c] rounded-xl border border-white/5">
                  <CheckCircle className="text-green-400 w-6 h-6 sm:w-7 sm:h-7 mb-3 sm:mb-4" />
                  <p className="font-bold text-white text-sm sm:text-base mb-2">{t('cancellation.acceptChanges')}</p>
                  <p className="text-gray-400 text-xs sm:text-sm">{t('cancellation.acceptChangesDesc')}</p>
                </div>
                <div className="p-4 sm:p-5 bg-[#15383c] rounded-xl border border-white/5">
                  <XCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7 mb-3 sm:mb-4" />
                  <p className="font-bold text-white text-sm sm:text-base mb-2">{t('cancellation.cancelRefunded')}</p>
                  <p className="text-gray-400 text-xs sm:text-sm">{t('cancellation.cancelRefundedDesc')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Disputes and Exceptions */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <HelpCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.disputesExceptions')}
            </h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
              <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
                {t('cancellation.disputesExceptionsDesc')}
              </p>
              <div className="bg-[#e35e25]/10 p-4 sm:p-5 rounded-xl border border-[#e35e25]/20">
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                  <strong className="text-white">{t('cancellation.needHelp')}</strong> {t('cancellation.needHelpDesc')} <a href="mailto:support@gopopera.ca" className="text-[#e35e25] hover:underline">support@gopopera.ca</a> {t('cancellation.needHelpDesc2')}
                </p>
              </div>
            </div>
          </section>

          {/* Host Payment */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <DollarSign className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.hostPayment')}
            </h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
              <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
                <div className="flex items-start gap-3 sm:gap-4">
                  <CheckCircle className="text-green-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-white mb-2">{t('cancellation.paymentTimeline')}</p>
                    <p>
                      {t('cancellation.paymentTimelineDesc')} <strong className="text-white">{t('cancellation.afterEventConcludes')}</strong>{t('cancellation.paymentTimelineDesc2')} <strong className="text-white">{t('cancellation.threeFiveDays')}</strong>{t('cancellation.paymentTimelineDesc3')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-white/10">
                  <AlertCircle className="text-yellow-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-white mb-2">{t('cancellation.cancelledEvents')}</p>
                    <p>
                      {t('cancellation.cancelledEventsDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl font-bold text-white font-heading mb-4 sm:mb-6 flex items-center gap-3">
              <Mail className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.contactRefunds')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
              {t('cancellation.contactRefundsDesc')}
            </p>
            <div className="space-y-2 sm:space-y-3">
              <p className="text-base sm:text-lg text-white">
                <strong>{t('cancellation.email')}</strong> <a href="mailto:support@gopopera.ca" className="text-[#e35e25] hover:underline">support@gopopera.ca</a>
              </p>
              <p className="text-base sm:text-lg text-white">
                <strong>{t('cancellation.website')}</strong> <a href="https://www.gopopera.ca" className="text-[#e35e25] hover:underline">www.gopopera.ca</a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
