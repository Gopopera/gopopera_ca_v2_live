import React from 'react';
import { ViewState } from '../../types';
import { 
  ChevronLeft, 
  Ticket, 
  CreditCard, 
  DollarSign, 
  ScanLine, 
  RefreshCcw, 
  Wallet, 
  ShieldCheck, 
  HelpCircle 
} from 'lucide-react';
import { SeoHelmet } from '../../components/seo/SeoHelmet';

interface TicketsAndPaymentsPageProps {
  setViewState: (view: ViewState) => void;
}

export const TicketsAndPaymentsPage: React.FC<TicketsAndPaymentsPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-12 font-sans">
      {/* SEO: Tickets & Payments page meta tags */}
      <SeoHelmet viewState={ViewState.TICKETS_AND_PAYMENTS} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <button 
          onClick={() => setViewState(ViewState.LANDING)} 
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"
        >
          <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
        </button>

        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#e35e25]/10 rounded-full mb-4">
            <Ticket size={32} className="text-[#e35e25]" />
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4 text-[#15383c]">
            Tickets & Payments
          </h1>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Popera is built for small in-person circles: simple seat reservations, flexible pricing, and tools to manage attendance.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 md:p-12 space-y-8">
          
          {/* How reservations work */}
          <section>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4 flex items-center gap-2">
              <CreditCard size={24} className="text-[#e35e25]" />
              How reservations work
            </h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-[#e35e25] shrink-0 mt-1">•</span>
                <span className="text-gray-600">Limited seats per circle</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#e35e25] shrink-0 mt-1">•</span>
                <span className="text-gray-600">Reserve a spot directly on the circle page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#e35e25] shrink-0 mt-1">•</span>
                <span className="text-gray-600">Host chooses: Free, Paid, or commitment fee</span>
              </li>
            </ul>
          </section>

          {/* Commitment fees and pricing flexibility */}
          <section>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4 flex items-center gap-2">
              <DollarSign size={24} className="text-[#e35e25]" />
              Commitment fees and pricing flexibility
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Hosts can set a commitment fee or ticket price from $1 to $75+ (or more) depending on goal and value—tastings, workshops, guided sessions, training, and more.
            </p>
            <p className="text-gray-600 leading-relaxed">
              The price is always shown before you confirm your reservation.
            </p>
          </section>

          {/* Secure payments (Stripe) */}
          <section>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4 flex items-center gap-2">
              <ShieldCheck size={24} className="text-[#e35e25]" />
              Secure payments (Stripe)
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Popera uses Stripe to process payments securely. Payment methods vary by circle but typically include major cards and compatible wallets.
            </p>
          </section>

          {/* Tickets + check-in */}
          <section>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4 flex items-center gap-2">
              <ScanLine size={24} className="text-[#e35e25]" />
              Tickets + check-in (scan to track attendance)
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              After your reservation is confirmed, Popera generates a ticket/confirmation.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Hosts can scan tickets to check in attendees and monitor attendance from their event settings and host tools.
            </p>
          </section>

          {/* Refunds & cancellations */}
          <section>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4 flex items-center gap-2">
              <RefreshCcw size={24} className="text-[#e35e25]" />
              Refunds & cancellations
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Refund rules depend on the host's policy, which is shown at checkout.
            </p>
            <p className="text-gray-600 leading-relaxed mb-3">
              <strong>General rule:</strong> If the host cancels, you get a refund. If you cancel as an attendee, refund eligibility depends on the rules and timing.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Contact support if you have issues.
            </p>
          </section>

          {/* Payouts to hosts */}
          <section>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4 flex items-center gap-2">
              <Wallet size={24} className="text-[#e35e25]" />
              Payouts to hosts
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Popera helps collect payments and manage reservations. Payout timing varies based on processing, verification, and disputes.
            </p>
          </section>

          {/* No-shows & trust */}
          <section>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4 flex items-center gap-2">
              <ShieldCheck size={24} className="text-[#e35e25]" />
              No-shows & trust
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Soft no-show controls (cooldowns after repeated no-shows) and reconfirmation prompts help maintain trust in the community.
            </p>
          </section>

          {/* Need help? */}
          <section className="bg-[#eef4f5] rounded-2xl p-6 border border-[#15383c]/10">
            <h2 className="font-heading font-bold text-xl text-[#15383c] mb-3 flex items-center gap-2">
              <HelpCircle size={22} className="text-[#e35e25]" />
              Need help?
            </h2>
            <p className="text-gray-700 mb-4">
              Questions about tickets, payments, or refunds? Reach out to our support team:
            </p>
            <a 
              href="mailto:support@gopopera.ca" 
              className="text-[#e35e25] font-bold hover:underline"
            >
              support@gopopera.ca
            </a>
          </section>
        </div>
      </div>
    </div>
  );
};

