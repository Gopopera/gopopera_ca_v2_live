import React from 'react';
import { ViewState } from '../types';
import { ChevronLeft } from 'lucide-react';

interface PrivacyPageProps {
  setViewState: (view: ViewState) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ setViewState }) => {
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
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm font-medium text-gray-400 uppercase tracking-wider">
            Last updated: January 1, 2024
          </p>
        </div>

        <div className="space-y-8 sm:space-y-10 md:space-y-12 text-base sm:text-lg font-light leading-relaxed text-gray-300">
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              1. Introduction
            </h2>
            <p className="mb-4 sm:mb-6">
              Popera ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at www.gopopera.ca.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              2. Information We Collect
            </h2>
            <p className="mb-4 sm:mb-6">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li>Account information (name, email, password)</li>
              <li>Profile information (bio, photos, preferences)</li>
              <li>Event information (when you create or RSVP to events)</li>
              <li>Payment information (processed securely through third-party providers)</li>
              <li>Communications (messages in group chats, reviews, reports)</li>
            </ul>
            <p className="mb-4 sm:mb-6">
              We also automatically collect certain information, including:
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li>Device information (IP address, browser type, device identifiers)</li>
              <li>Usage data (pages visited, features used, time spent)</li>
              <li>Location data (with your permission, to show nearby events)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              3. How We Use Your Information
            </h2>
            <p className="mb-4 sm:mb-6">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send you notifications about events, messages, and updates</li>
              <li>Personalize your experience and show relevant events</li>
              <li>Detect and prevent fraud, abuse, and security issues</li>
              <li>Comply with legal obligations and enforce our Terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              4. Information Sharing
            </h2>
            <p className="mb-4 sm:mb-6">
              We share your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li><strong>With other users:</strong> Your profile and event information are visible to other users as necessary for the platform to function</li>
              <li><strong>With service providers:</strong> We share data with trusted partners who help us operate (payment processors, hosting, analytics)</li>
              <li><strong>For legal reasons:</strong> We may disclose information if required by law or to protect rights and safety</li>
              <li><strong>With your consent:</strong> We share information when you explicitly authorize it</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              5. Data Security
            </h2>
            <p className="mb-4 sm:mb-6">
              We implement industry-standard security measures to protect your information, including encryption, secure servers, and access controls. However, no method of transmission over the internet is 100% secure.
            </p>
            <p className="mb-4 sm:mb-6">
              You are responsible for keeping your account password confidential and for all activities under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              6. Your Rights
            </h2>
            <p className="mb-4 sm:mb-6">
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 mb-4 sm:mb-6">
              <li>Access and update your personal information through your account settings</li>
              <li>Delete your account and request deletion of your data</li>
              <li>Opt out of marketing communications</li>
              <li>Request a copy of your data</li>
              <li>Object to certain processing of your information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              7. Cookies and Tracking
            </h2>
            <p className="mb-4 sm:mb-6">
              We use cookies and similar technologies to enhance your experience, analyze usage, and deliver personalized content. You can control cookies through your browser settings, though this may affect platform functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              8. Children's Privacy
            </h2>
            <p className="mb-4 sm:mb-6">
              Popera is not intended for users under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              9. International Data Transfers
            </h2>
            <p className="mb-4 sm:mb-6">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              10. Changes to This Privacy Policy
            </h2>
            <p className="mb-4 sm:mb-6">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the platform after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-4 sm:mb-6">
              11. Contact Us
            </h2>
            <p className="mb-4 sm:mb-6">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
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
