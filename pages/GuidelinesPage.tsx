import React from 'react';
import { ViewState } from '../types';
import { ChevronLeft, Heart, Shield, AlertTriangle, UserCheck, MessageCircle, Users } from 'lucide-react';

interface GuidelinesPageProps {
  setViewState: (view: ViewState) => void;
}

export const GuidelinesPage: React.FC<GuidelinesPageProps> = ({ setViewState }) => {
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
            Community Guidelines
          </h1>
          <p className="text-base sm:text-lg text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
            Building a safe, respectful, and vibrant community for everyone
          </p>
        </div>

        <div className="space-y-8 sm:space-y-10 md:space-y-12">
          {/* Core Principles */}
          <section className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <Heart className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              Our Core Principles
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
              <p>
                Popera is built on trust, respect, and genuine connection. These guidelines help ensure everyone has a positive experience, whether you're hosting or attending events.
              </p>
            </div>
          </section>

          {/* For Everyone */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <Users className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              For Everyone
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">Be Respectful</h3>
                <p className="mb-3 sm:mb-4">
                  Treat everyone with kindness and respect. Harassment, discrimination, hate speech, or abusive behavior will not be tolerated.
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">Be Honest</h3>
                <p className="mb-3 sm:mb-4">
                  Provide accurate information in your profile and event listings. Misleading or false information undermines trust and may result in account restrictions.
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">Be Safe</h3>
                <p className="mb-3 sm:mb-4">
                  Prioritize your safety and the safety of others. Report suspicious behavior, unsafe conditions, or violations of these guidelines immediately.
                </p>
              </div>
            </div>
          </section>

          {/* For Hosts */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <UserCheck className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              For Hosts
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">Host Verification</h3>
                <p className="mb-3 sm:mb-4">
                  Every host is verified for authenticity. We review profiles and event listings to ensure legitimacy and protect our community.
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">Accurate Listings</h3>
                <p className="mb-3 sm:mb-4">
                  Provide clear, accurate descriptions of your events, including date, time, location, and what attendees can expect. Update your listing if details change.
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">Honor Commitments</h3>
                <p className="mb-3 sm:mb-4">
                  If you accept RSVPs, honor them. Cancellations should be rare and communicated as early as possible. Repeated cancellations may result in restrictions.
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">Safe Spaces</h3>
                <p className="mb-3 sm:mb-4">
                  Create and maintain a safe, welcoming environment at your events. Address any issues promptly and professionally.
                </p>
              </div>
            </div>
          </section>

          {/* For Attendees */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <MessageCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              For Attendees
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">RSVP Responsibly</h3>
                <p className="mb-3 sm:mb-4">
                  Only RSVP to events you genuinely plan to attend. If your plans change, cancel your RSVP as early as possible to allow others to join.
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">Respect the Space</h3>
                <p className="mb-3 sm:mb-4">
                  Follow the host's rules and guidelines. Respect the venue, other attendees, and the host's property.
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">Honest Reviews</h3>
                <p className="mb-3 sm:mb-4">
                  Reviews stay public and honest. Share constructive, truthful feedback that helps others make informed decisions. Reviews should focus on the event experience, not personal attacks.
                </p>
              </div>
            </div>
          </section>

          {/* Communication */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <MessageCircle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              Group Chats & Communication
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">Moderated Conversations</h3>
                <p className="mb-3 sm:mb-4">
                  Group chats are moderated to ensure respect. Keep conversations relevant, respectful, and appropriate. Spam, off-topic content, or inappropriate messages may be removed.
                </p>
              </div>
              <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <h3 className="font-bold text-white mb-3 sm:mb-4 text-lg sm:text-xl">Privacy</h3>
                <p className="mb-3 sm:mb-4">
                  Respect others' privacy. Do not share personal information without consent, and do not use group chats for unsolicited marketing or promotions.
                </p>
              </div>
            </div>
          </section>

          {/* Prohibited Content */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <AlertTriangle className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              Prohibited Content & Behavior
            </h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10">
              <ul className="space-y-3 sm:space-y-4 text-base sm:text-lg font-light leading-relaxed text-gray-300 list-disc list-inside ml-2 sm:ml-4">
                <li>Illegal activities or events promoting illegal behavior</li>
                <li>Discrimination, hate speech, or harassment of any kind</li>
                <li>Fraudulent, misleading, or deceptive listings</li>
                <li>Spam, unsolicited advertising, or pyramid schemes</li>
                <li>Adult content, explicit material, or events inappropriate for general audiences</li>
                <li>Violence, threats, or intimidation</li>
                <li>Impersonation or fake accounts</li>
                <li>Circumventing platform policies or fees</li>
              </ul>
            </div>
          </section>

          {/* Enforcement */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-heading mb-6 sm:mb-8 flex items-center gap-3">
              <Shield className="text-[#e35e25] w-6 h-6 sm:w-7 sm:h-7" />
              Enforcement & Reporting
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg font-light leading-relaxed text-gray-300">
              <p>
                Violations of these guidelines may result in:
              </p>
              <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6">
                <li>Warnings and educational notices</li>
                <li>Temporary restrictions on account features</li>
                <li>Permanent account suspension</li>
                <li>Legal action in cases of serious violations</li>
              </ul>
              <p className="mt-4 sm:mt-6">
                If you witness or experience violations, please report them immediately through our reporting system or contact support@gopopera.ca. Your safety and experience comes first.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-[#e35e25]/10 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-[#e35e25]/20">
            <h2 className="text-xl sm:text-2xl font-bold text-white font-heading mb-4 sm:mb-6">
              Questions or Concerns?
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-gray-300 mb-4 sm:mb-6">
              If you have questions about these guidelines or need to report a violation, please contact us:
            </p>
            <p className="text-base sm:text-lg font-light text-gray-300">
              Email: support@gopopera.ca<br />
              Website: www.gopopera.ca
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
