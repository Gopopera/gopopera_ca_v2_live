import React from 'react';
import { ViewState } from '../types';
import { ChevronLeft } from 'lucide-react';

interface TermsPageProps {
  setViewState: (view: ViewState) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ setViewState }) => {
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
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm font-medium text-gray-400 uppercase tracking-wider">
            Last updated: January 1, 2024
          </p>
        </div>

        <div className="space-y-8 sm:space-y-10 md:space-y-12 text-base sm:text-lg font-light leading-relaxed text-gray-300">
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              1. Acceptance of Terms
            </h2>
            <p className="mb-4 sm:mb-6">
              Welcome to Popera (www.gopopera.ca). By accessing or using our platform, you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              2. Description of Service
            </h2>
            <p className="mb-4 sm:mb-6">
              Popera is a platform that connects hosts and attendees for pop-up events, gatherings, sales, and experiences. We provide tools for event creation, RSVP management, group communication, and payment processing.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              3. User Accounts
            </h2>
            <p className="mb-4 sm:mb-6">
              You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate.
            </p>
            <p className="mb-4 sm:mb-6">
              You are responsible for all activities that occur under your account. Popera reserves the right to suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              4. Host Responsibilities
            </h2>
            <p className="mb-4 sm:mb-6">
              As a host, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li>Provide accurate event information, including date, time, location, and description</li>
              <li>Honor all confirmed reservations and commitments</li>
              <li>Maintain a safe and respectful environment at your events</li>
              <li>Comply with all applicable local, provincial, and federal laws</li>
              <li>Respond promptly to attendee inquiries and concerns</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              5. Attendee Responsibilities
            </h2>
            <p className="mb-4 sm:mb-6">
              As an attendee, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li>RSVP only to events you genuinely plan to attend</li>
              <li>Arrive on time and respect the host's space and rules</li>
              <li>Treat all participants with respect and kindness</li>
              <li>Pay any required fees promptly and as specified</li>
              <li>Cancel your RSVP in a timely manner if you cannot attend</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              6. Payments and Fees
            </h2>
            <p className="mb-4 sm:mb-6">
              Popera charges a 10% service fee on reservation fees set by hosts. All fees are clearly displayed before you confirm your RSVP. Payments are processed securely through our payment partners.
            </p>
            <p className="mb-4 sm:mb-6">
              Refunds are subject to our Cancellation Policy. Hosts receive payment after the event concludes, minus applicable fees.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              7. Prohibited Activities
            </h2>
            <p className="mb-4 sm:mb-6">
              You may not use Popera to:
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li>Post false, misleading, or fraudulent information</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Violate any laws or regulations</li>
              <li>Spam or send unsolicited communications</li>
              <li>Impersonate others or create fake accounts</li>
              <li>Interfere with the platform's security or functionality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              8. Intellectual Property
            </h2>
            <p className="mb-4 sm:mb-6">
              All content on Popera, including text, graphics, logos, and software, is the property of Popera or its licensors and is protected by copyright and trademark laws.
            </p>
            <p className="mb-4 sm:mb-6">
              You retain ownership of content you post, but grant Popera a license to use, display, and distribute such content on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              9. Limitation of Liability
            </h2>
            <p className="mb-4 sm:mb-6">
              Popera acts as a platform connecting hosts and attendees. We are not responsible for the conduct of users, the quality of events, or any disputes that arise between hosts and attendees.
            </p>
            <p className="mb-4 sm:mb-6">
              To the maximum extent permitted by law, Popera shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              10. Modifications to Terms
            </h2>
            <p className="mb-4 sm:mb-6">
              Popera reserves the right to modify these Terms at any time. We will notify users of significant changes via email or platform notification. Continued use of the service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              11. Contact Information
            </h2>
            <p className="mb-4 sm:mb-6">
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="mb-4 sm:mb-6">
              Email: support@gopopera.ca<br />
              Website: www.gopopera.ca
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
