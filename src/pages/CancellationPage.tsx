import React from 'react';
import { ViewState } from '../../types';
import { ChevronLeft, AlertCircle, CreditCard, UserX, DollarSign, Mail, CheckCircle, X, AlertTriangle, Clock, XCircle, Edit, Scale } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

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
              <p>{t('cancellation.overviewDesc')}</p>
            </div>
          </section>

          {/* RSVP Types */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <CheckCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.rsvpTypes')}
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <CheckCircle className="text-green-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  <strong className="text-white">{t('cancellation.freeRsvps')}</strong> {t('cancellation.freeRsvpsDesc')}
                </p>
              </div>
              <div className="flex items-start gap-3 sm:gap-4">
                <DollarSign className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  <strong className="text-white">{t('cancellation.paidReservations')}</strong> {t('cancellation.paidReservationsDesc')}
                </p>
              </div>
            </div>
          </section>

          {/* Optional Commitment Fee */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <DollarSign className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.commitmentFee')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
              {t('cancellation.commitmentFeeDesc')}
            </p>
            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <CheckCircle className="text-green-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  {t('cancellation.commitmentRefundedAtCheckin')}
                </p>
              </div>
              <div className="flex items-start gap-3 sm:gap-4">
                <CheckCircle className="text-green-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  {t('cancellation.commitmentConvertedToTip')}
                </p>
              </div>
            </div>
            <div className="bg-[#e35e25]/10 p-4 sm:p-5 rounded-xl border border-[#e35e25]/20">
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                <AlertTriangle className="inline text-yellow-400 w-4 h-4 mr-2" />
                {t('cancellation.commitmentNoShowNote')}
              </p>
            </div>
          </section>

          {/* Attendee Cancellations */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <UserX className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.attendeeCancellations')}
            </h2>
            <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <CheckCircle className="text-green-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  <strong className="text-white">{t('cancellation.freeRsvpsCancellation')}</strong> {t('cancellation.freeRsvpsCancellationDesc')}
                </p>
              </div>
              <div className="flex items-start gap-3 sm:gap-4">
                <DollarSign className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  <strong className="text-white">{t('cancellation.paidReservationsCancellation')}</strong> {t('cancellation.paidReservationsCancellationDesc')}
                </p>
              </div>
            </div>
            <p className="text-sm sm:text-base text-gray-400 italic">
              {t('cancellation.refundEligibility')}
            </p>
          </section>

          {/* Host Cancellations */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <XCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.hostCancellations')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300">
              {t('cancellation.hostCancellationsDesc')}
            </p>
          </section>

          {/* Significant Changes */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <Edit className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.significantChanges')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300">
              {t('cancellation.significantChangesDesc')}
            </p>
          </section>

          {/* Refund Processing Times */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <Clock className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.refundProcessing')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300">
              {t('cancellation.refundProcessingDesc')}
            </p>
          </section>

          {/* Service Fees */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <CreditCard className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.serviceFees')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300">
              {t('cancellation.serviceFeesDesc')}
            </p>
          </section>

          {/* No-Shows and Abuse */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <AlertTriangle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.noShows')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
              {t('cancellation.noShowsIntro')}
            </p>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <X className="text-red-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  {t('cancellation.noShowsPaidNotRefunded')}
                </p>
              </div>
              <div className="flex items-start gap-3 sm:gap-4">
                <AlertTriangle className="text-yellow-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  {t('cancellation.noShowsRestrictions')}
                </p>
              </div>
            </div>
          </section>

          {/* Disputes, Chargebacks, and Exceptions */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <AlertCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.disputes')}
            </h2>
            <div className="space-y-4 sm:space-y-6">
              <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300">
                {t('cancellation.disputesChargebackDesc')}
              </p>
              <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300">
                {t('cancellation.disputesExceptionsDesc')}
              </p>
            </div>
          </section>

          {/* Host Payouts */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <DollarSign className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.hostPayouts')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300">
              {t('cancellation.hostPayoutsDesc')}
            </p>
          </section>

          {/* Consumer Rights Notice */}
          <section className="bg-[#e35e25]/10 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-[#e35e25]/20">
            <div className="flex items-start gap-3 sm:gap-4">
              <Scale className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7 shrink-0 mt-1" />
              <p className="text-base sm:text-lg font-medium leading-relaxed text-white">
                {t('cancellation.consumerRights')}
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl font-bold text-white font-heading mb-4 sm:mb-6 flex items-center gap-3">
              <Mail className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              {t('cancellation.contact')}
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4">
              {t('cancellation.contactDesc')}
            </p>
            <p className="text-base sm:text-lg text-white">
              <a href="mailto:support@gopopera.ca" className="text-[#e35e25] hover:underline">{t('cancellation.email')}</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
