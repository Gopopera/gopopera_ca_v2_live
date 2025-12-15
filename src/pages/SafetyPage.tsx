import React from 'react';
import { ViewState } from '../../types';
import { ChevronLeft, Shield, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SeoHelmet } from '../../components/seo/SeoHelmet';

interface SafetyPageProps {
  setViewState: (view: ViewState) => void;
}

export const SafetyPage: React.FC<SafetyPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-12 font-sans">
      {/* SEO: Safety page meta tags */}
      <SeoHelmet viewState={ViewState.SAFETY} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <button 
          onClick={() => setViewState(ViewState.LANDING)} 
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"
        >
          <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
        </button>

        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#e35e25]/10 rounded-full mb-4">
            <Shield size={32} className="text-[#e35e25]" />
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4 text-[#15383c]">
            Safety & Trust
          </h1>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
            Your safety is our priority. Learn how we protect hosts and attendees on Popera.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 md:p-12 space-y-8">
          <section>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4 flex items-center gap-2">
              <Shield size={24} className="text-[#e35e25]" />
              Verified Hosts
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              All hosts on Popera go through identity verification via Stripe Identity and phone verification before they can create their first event. This ensures that every event is hosted by a real person with verified credentials.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={20} className="text-[#e35e25] shrink-0 mt-0.5" />
                <span className="text-gray-600">Stripe Identity verification for host accounts</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={20} className="text-[#e35e25] shrink-0 mt-0.5" />
                <span className="text-gray-600">Phone number verification required</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={20} className="text-[#e35e25] shrink-0 mt-0.5" />
                <span className="text-gray-600">Background checks for high-value events</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4 flex items-center gap-2">
              <Users size={24} className="text-[#e35e25]" />
              Community Moderation
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Our community-driven moderation system allows users to report issues, rate events, and provide feedback. Every report is reviewed by our team, and we take swift action against any violations of our community guidelines.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={20} className="text-[#e35e25] shrink-0 mt-0.5" />
                <span className="text-gray-600">24/7 report review system</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={20} className="text-[#e35e25] shrink-0 mt-0.5" />
                <span className="text-gray-600">Transparent event ratings and reviews</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={20} className="text-[#e35e25] shrink-0 mt-0.5" />
                <span className="text-gray-600">Host and attendee verification badges</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4 flex items-center gap-2">
              <AlertTriangle size={24} className="text-[#e35e25]" />
              What to Do If You Feel Unsafe
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              If you ever feel unsafe at an event or notice suspicious behavior, we're here to help.
            </p>
            <ol className="space-y-3 list-decimal list-inside text-gray-600">
              <li className="pl-2">Leave the event immediately if you feel unsafe</li>
              <li className="pl-2">Report the issue through our in-app reporting system</li>
              <li className="pl-2">Contact local authorities if it's an emergency</li>
              <li className="pl-2">Reach out to our support team at support@gopopera.ca</li>
            </ol>
          </section>

          <section className="bg-[#eef4f5] rounded-2xl p-6 border border-[#15383c]/10">
            <h3 className="font-heading font-bold text-xl text-[#15383c] mb-3">
              Need Immediate Help?
            </h3>
            <p className="text-gray-700 mb-4">
              Our support team is available 24/7 to assist with safety concerns. Contact us at:
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

