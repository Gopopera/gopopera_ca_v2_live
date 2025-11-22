import React from 'react';
import { ViewState } from '../types';
import { ChevronLeft, Clock, XCircle, AlertCircle, CreditCard, UserX, Edit, HelpCircle, DollarSign, Mail, CheckCircle, X, AlertTriangle } from 'lucide-react';

interface CancellationPageProps {
  setViewState: (view: ViewState) => void;
}

export const CancellationPage: React.FC<CancellationPageProps> = ({ setViewState }) => {
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
            Refund and Cancellation Policy
          </h1>
          <p className="text-xs sm:text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 sm:mb-6">
            Last updated: January 1, 2024
          </p>
          <p className="text-base sm:text-lg text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
            Clear, fair policies for hosts and attendees
          </p>
        </div>

        <div className="space-y-8 sm:space-y-10 md:space-y-12">
          {/* Overview */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <AlertCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              Overview
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
              <p>
                This policy outlines the refund and cancellation procedures for events hosted on Popera. Both hosts and attendees have rights and responsibilities regarding cancellations and refunds.
              </p>
            </div>
          </section>

          {/* Attendee Cancellations */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <UserX className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              Attendee Cancellations
            </h2>
            
            {/* Free Events Card */}
            <div className="bg-white/5 p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10 mb-4 sm:mb-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle className="text-green-400 w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white mb-2 sm:mb-3 text-lg sm:text-xl">Free Events</h3>
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    You may cancel your RSVP at any time before the event starts. No fees apply.
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
                  <h3 className="font-bold text-white mb-2 sm:mb-3 text-lg sm:text-xl">Paid Events</h3>
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4 sm:mb-6">
                    Cancellation policies vary by event and are set by the host. Common policies include:
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 sm:space-y-4 ml-0 sm:ml-16">
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-[#15383c] rounded-lg border border-white/5">
                  <CheckCircle className="text-green-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white text-sm sm:text-base mb-1">Full refund</p>
                    <p className="text-gray-400 text-xs sm:text-sm">If you cancel more than 48 hours before the event</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-[#15383c] rounded-lg border border-white/5">
                  <AlertTriangle className="text-yellow-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white text-sm sm:text-base mb-1">Partial refund (typically 50%)</p>
                    <p className="text-gray-400 text-xs sm:text-sm">If you cancel 24-48 hours before the event</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-[#15383c] rounded-lg border border-white/5">
                  <X className="text-red-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white text-sm sm:text-base mb-1">No refund</p>
                    <p className="text-gray-400 text-xs sm:text-sm">If you cancel less than 24 hours before the event or fail to attend</p>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-400 text-xs sm:text-sm mt-4 sm:mt-6 ml-0 sm:ml-16 italic">
                The specific cancellation policy for each event is displayed before you confirm your RSVP.
              </p>
            </div>
          </section>

          {/* Host Cancellations */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <XCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              Host Cancellations
            </h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
              <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
                If a host cancels an event:
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <CheckCircle className="text-green-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    All attendees receive a <strong className="text-white">full refund</strong>, including any service fees
                  </p>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <CheckCircle className="text-green-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    Attendees are notified immediately via email and in-app notification
                  </p>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <AlertCircle className="text-yellow-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    The host's account may be reviewed for repeated cancellations
                  </p>
                </div>
              </div>
              <div className="mt-6 sm:mt-8 p-4 sm:p-5 bg-[#e35e25]/10 rounded-xl border border-[#e35e25]/20">
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                  <strong className="text-white">Tip:</strong> Hosts are encouraged to cancel events as early as possible to minimize inconvenience to attendees.
                </p>
              </div>
            </div>
          </section>

          {/* Refund Processing */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <CreditCard className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              Refund Processing
            </h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
              <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
                <div className="flex items-start gap-3 sm:gap-4">
                  <Clock className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-white mb-2">Processing Time</p>
                    <p>
                      Refunds are processed to the original payment method within <strong className="text-white">5-10 business days</strong>. Processing times may vary depending on your bank or payment provider.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-white/10">
                  <DollarSign className="text-[#e35e25] w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-white mb-2">Service Fee Refunds</p>
                    <p>
                      Popera's <strong className="text-[#e35e25]">10% service fee</strong> is refunded in full when an event is cancelled by the host or when a refund is issued due to host misconduct.
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
              No-Show Policy
            </h2>
            <div className="bg-red-500/10 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-red-500/20">
              <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
                If you RSVP to an event but fail to attend without cancelling:
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <X className="text-red-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    You will <strong className="text-white">not receive a refund</strong> for paid events
                  </p>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <AlertCircle className="text-yellow-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    Your account may receive a <strong className="text-white">no-show warning</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <AlertTriangle className="text-red-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    <strong className="text-white">Repeated no-shows</strong> may result in restrictions on future RSVPs
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Event Modifications */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <Edit className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              Event Modifications
            </h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
              <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
                If a host significantly modifies an event (date, time, location, or nature), attendees will be notified and may:
              </p>
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="p-4 sm:p-5 bg-[#15383c] rounded-xl border border-white/5">
                  <CheckCircle className="text-green-400 w-6 h-6 sm:w-7 sm:h-7 mb-3 sm:mb-4" />
                  <p className="font-bold text-white text-sm sm:text-base mb-2">Accept the changes</p>
                  <p className="text-gray-400 text-xs sm:text-sm">Keep your RSVP and attend the modified event</p>
                </div>
                <div className="p-4 sm:p-5 bg-[#15383c] rounded-xl border border-white/5">
                  <XCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7 mb-3 sm:mb-4" />
                  <p className="font-bold text-white text-sm sm:text-base mb-2">Cancel and get refunded</p>
                  <p className="text-gray-400 text-xs sm:text-sm">Receive a full refund if you choose not to attend</p>
                </div>
              </div>
            </div>
          </section>

          {/* Disputes and Exceptions */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <HelpCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              Disputes and Exceptions
            </h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
              <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
                In exceptional circumstances (natural disasters, emergencies, host misconduct), Popera may issue refunds outside the standard policy.
              </p>
              <div className="bg-[#e35e25]/10 p-4 sm:p-5 rounded-xl border border-[#e35e25]/20">
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                  <strong className="text-white">Need help?</strong> Contact our support team at <a href="mailto:support@gopopera.ca" className="text-[#e35e25] hover:underline">support@gopopera.ca</a> to request a review.
                </p>
              </div>
            </div>
          </section>

          {/* Host Payment */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <DollarSign className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              Host Payment
            </h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
              <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
                <div className="flex items-start gap-3 sm:gap-4">
                  <CheckCircle className="text-green-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-white mb-2">Payment Timeline</p>
                    <p>
                      Hosts receive payment for their events <strong className="text-white">after the event concludes</strong>, minus Popera's 10% service fee. Payments are processed within <strong className="text-white">3-5 business days</strong> after the event date.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-white/10">
                  <AlertCircle className="text-yellow-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-white mb-2">Cancelled Events</p>
                    <p>
                      If an event is cancelled or significantly disrupted, payment may be withheld or adjusted accordingly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-[#e35e25]/10 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-[#e35e25]/20">
            <h2 className="text-xl sm:text-2xl font-bold text-white font-heading mb-4 sm:mb-6 flex items-center gap-3">
              <Mail className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              Contact for Refunds
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
              If you have questions about refunds or cancellations, please contact us:
            </p>
            <div className="space-y-2 sm:space-y-3">
              <p className="text-base sm:text-lg text-white">
                <strong>Email:</strong> <a href="mailto:support@gopopera.ca" className="text-[#e35e25] hover:underline">support@gopopera.ca</a>
              </p>
              <p className="text-base sm:text-lg text-white">
                <strong>Website:</strong> <a href="https://www.gopopera.ca" className="text-[#e35e25] hover:underline">www.gopopera.ca</a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
