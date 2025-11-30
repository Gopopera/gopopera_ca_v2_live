import React, { useState } from 'react';
import { ViewState } from '../types';
import { ChevronLeft, HelpCircle, MessageCircle, BookOpen, Shield, CreditCard, Users, Calendar, Search, Mail, ExternalLink, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface HelpPageProps {
  setViewState: (view: ViewState) => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({ setViewState }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const faqCategories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <BookOpen size={20} />,
      questions: [
        {
          q: 'How do I create an account?',
          a: 'Click "Sign In / Sign Up" in the header, then choose your preferred sign-in method (Google, email, etc.). Once signed in, you can create events, RSVP to events, and connect with other users.'
        },
        {
          q: 'How do I host my first event?',
          a: 'Click "Host Event" in the header (or from your profile menu), fill in the event details (title, description, date, time, location, images), set a capacity and optional reservation fee, then publish. Your event will appear in the feed for others to discover.'
        },
        {
          q: 'How do I RSVP to an event?',
          a: 'Browse events in the feed, click on any event to view details, then click "Reserve" or "RSVP". For paid events, you\'ll complete payment during the reservation process. You\'ll receive a confirmation and can access the event\'s group chat.'
        },
        {
          q: 'What is a reservation fee?',
          a: 'Hosts can optionally charge a small reservation fee to reduce no-shows and ensure commitment. Popera takes a 10% service fee on reservation fees. Free events have no fees.'
        }
      ]
    },
    {
      id: 'hosting',
      title: 'Hosting Events',
      icon: <Users size={20} />,
      questions: [
        {
          q: 'How do I edit or cancel my event?',
          a: 'Go to your event detail page and click "Edit Event" (if you\'re the host). You can modify details, update capacity, or cancel the event. If you cancel, all attendees will receive full refunds automatically.'
        },
        {
          q: 'When do I receive payment for my event?',
          a: 'Hosts receive payment after the event concludes, minus Popera\'s 10% service fee. Payments are processed within 3-5 business days after the event date.'
        },
        {
          q: 'How do I manage RSVPs and attendees?',
          a: 'On your event detail page, you can see all RSVPs, manage capacity, and communicate with attendees through the group chat. You\'ll also receive notifications for new RSVPs and messages.'
        },
        {
          q: 'Can I charge different prices for different attendees?',
          a: 'Currently, each event has one reservation fee that applies to all attendees. You can create separate events with different pricing if needed.'
        },
        {
          q: 'What happens if I need to cancel my event?',
          a: 'If you cancel an event, all attendees receive full refunds (including service fees) automatically. You\'ll be notified immediately, and repeated cancellations may result in account review.'
        }
      ]
    },
    {
      id: 'attending',
      title: 'Attending Events',
      icon: <Calendar size={20} />,
      questions: [
        {
          q: 'How do I cancel my RSVP?',
          a: 'Go to the event detail page and click "Cancel Reservation". For free events, you can cancel anytime. For paid events, refund policies vary (typically full refund if cancelled 48+ hours before, partial or no refund for last-minute cancellations).'
        },
        {
          q: 'What if I can\'t attend an event I RSVP\'d to?',
          a: 'Cancel your RSVP as early as possible through the event page. This allows others to join and ensures you receive any applicable refunds according to the event\'s cancellation policy.'
        },
        {
          q: 'How do I communicate with the host or other attendees?',
          a: 'Each event has a built-in group chat. Once you RSVP, you can access the chat to ask questions, coordinate arrival, or connect with other attendees. The host can also send updates through the chat.'
        },
        {
          q: 'What if the event is different from what was described?',
          a: 'Contact the host through the group chat or report the event through our reporting system. You can also leave an honest review after the event. In cases of significant misrepresentation, you may be eligible for a refund.'
        }
      ]
    },
    {
      id: 'payments',
      title: 'Payments & Refunds',
      icon: <CreditCard size={20} />,
      questions: [
        {
          q: 'How do refunds work?',
          a: 'Refunds depend on the event\'s cancellation policy. Free events: cancel anytime, no fees. Paid events: typically full refund if cancelled 48+ hours before, partial (50%) if 24-48 hours before, no refund if less than 24 hours or no-show. Host cancellations result in full refunds for all attendees.'
        },
        {
          q: 'How long do refunds take?',
          a: 'Refunds are processed to your original payment method within 5-10 business days. Processing times may vary depending on your bank or payment provider.'
        },
        {
          q: 'What is Popera\'s service fee?',
          a: 'Popera charges a 10% service fee on reservation fees set by hosts. This fee is clearly displayed before you confirm your RSVP. The service fee is refunded in full if an event is cancelled by the host.'
        },
        {
          q: 'How do I get a refund for a cancelled event?',
          a: 'If a host cancels an event, refunds are processed automatically. You\'ll receive an email notification and the refund will appear in your account within 5-10 business days. No action is required on your part.'
        }
      ]
    },
    {
      id: 'safety',
      title: 'Safety & Reporting',
      icon: <Shield size={20} />,
      questions: [
        {
          q: 'How do I report a problem or safety concern?',
          a: 'Use the "Report Event" button on any event page, or contact support@gopopera.ca directly. For immediate safety concerns, contact local authorities first, then report to us.'
        },
        {
          q: 'What should I do if I feel unsafe at an event?',
          a: 'Leave the event immediately if you feel unsafe. Report the issue through our in-app reporting system or email support@gopopera.ca. Contact local authorities if it\'s an emergency.'
        },
        {
          q: 'How does Popera verify hosts?',
          a: 'Every host is verified for authenticity. We review profiles and event listings to ensure legitimacy and protect our community. Verified hosts have a checkmark on their profile.'
        },
        {
          q: 'What happens when I report an event or user?',
          a: 'Our team reviews all reports promptly. We may contact you for additional information. Depending on the severity, actions may include warnings, account restrictions, or permanent suspension.'
        }
      ]
    },
    {
      id: 'account',
      title: 'Account & Profile',
      icon: <Users size={20} />,
      questions: [
        {
          q: 'How do I update my profile?',
          a: 'Go to your profile page (click your profile picture in the header), then click "Edit Profile". You can update your name, bio, profile picture, and other details.'
        },
        {
          q: 'How do I change my notification settings?',
          a: 'Go to your profile, then "Settings" → "Notifications". You can customize which notifications you receive via email, SMS, and in-app alerts.'
        },
        {
          q: 'How do I delete my account?',
          a: 'Go to your profile → "Settings" → "Delete Account". This action is permanent and will remove all your data, events, and RSVPs. Make sure to cancel any upcoming events first.'
        },
        {
          q: 'Can I change my email address?',
          a: 'Yes, you can update your email in your profile settings. You may need to verify the new email address.'
        }
      ]
    }
  ];

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(q => 
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const quickLinks = [
    { title: 'Contact Us', view: ViewState.CONTACT, icon: <Mail size={18} /> },
    { title: 'Community Guidelines', view: ViewState.GUIDELINES, icon: <Shield size={18} /> },
    { title: 'Cancellation Policy', view: ViewState.CANCELLATION, icon: <CreditCard size={18} /> },
    { title: 'Terms of Service', view: ViewState.TERMS, icon: <BookOpen size={18} /> },
    { title: 'Privacy Policy', view: ViewState.PRIVACY, icon: <Shield size={18} /> }
  ];

  return (
    <div className="min-h-screen bg-[#15383c] pt-20 sm:pt-24 pb-8 sm:pb-12 text-white font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <button 
          onClick={() => setViewState(ViewState.LANDING)} 
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"
        >
          <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">
            Help & Support
          </h1>
          <p className="text-gray-300 text-base sm:text-lg max-w-2xl mx-auto">
            Find answers to common questions or get in touch with our support team
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 sm:mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a454a] border border-[#2d6a70] rounded-full py-3 sm:py-4 pl-12 pr-4 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#e35e25] focus:ring-1 focus:ring-[#e35e25] transition-all"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-4 sm:mb-6">
            Quick Links
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {quickLinks.map((link) => (
              <button
                key={link.view}
                onClick={() => setViewState(link.view)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 sm:p-5 text-left transition-all hover:border-[#e35e25]/50 group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-[#e35e25] group-hover:text-[#e35e25] transition-colors">
                    {link.icon}
                  </div>
                  <h3 className="font-bold text-white text-sm sm:text-base">{link.title}</h3>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm">View details →</p>
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-4 sm:mb-6">
            Frequently Asked Questions
          </h2>
          
          {filteredCategories.length === 0 && searchQuery ? (
            <div className="bg-white/5 p-8 rounded-2xl border border-white/10 text-center">
              <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300">No results found for "{searchQuery}"</p>
              <p className="text-gray-400 text-sm mt-2">Try a different search term or contact support</p>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div key={category.id} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                <button
                  onClick={() => toggleSection(category.id)}
                  className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="text-[#e35e25]">
                      {category.icon}
                    </div>
                    <h3 className="font-heading font-bold text-lg sm:text-xl text-white text-left">
                      {category.title}
                    </h3>
                  </div>
                  {expandedSection === category.id ? (
                    <ChevronUp className="text-gray-400 w-5 h-5 shrink-0" />
                  ) : (
                    <ChevronDown className="text-gray-400 w-5 h-5 shrink-0" />
                  )}
                </button>
                
                {expandedSection === category.id && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
                    {category.questions.map((faq, idx) => (
                      <div key={idx} className="border-t border-white/10 pt-4 sm:pt-6 first:border-t-0 first:pt-0">
                        <h4 className="font-bold text-white mb-2 sm:mb-3 text-base sm:text-lg">
                          {faq.q}
                        </h4>
                        <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                          {faq.a}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contact Support */}
        <div className="mt-12 sm:mt-16 bg-[#e35e25]/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-[#e35e25]/20">
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#e35e25] rounded-full flex items-center justify-center shrink-0">
              <MessageCircle size={24} className="sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-3 sm:mb-4">
                Still Need Help?
              </h2>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4 sm:mb-6">
                Can't find what you're looking for? Our support team is here to help. Reach out to us and we'll get back to you as soon as possible.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => setViewState(ViewState.CONTACT)}
                  className="bg-[#e35e25] hover:bg-[#cf4d1d] text-white font-bold py-3 sm:py-3.5 px-6 sm:px-8 rounded-full transition-all flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation active:scale-95"
                >
                  <Mail size={18} className="sm:w-5 sm:h-5" />
                  Contact Support
                </button>
                <a
                  href="mailto:support@gopopera.ca"
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 sm:py-3.5 px-6 sm:px-8 rounded-full transition-all flex items-center justify-center gap-2 text-sm sm:text-base border border-white/20"
                >
                  support@gopopera.ca
                  <ExternalLink size={16} className="sm:w-4 sm:h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="mt-8 sm:mt-12">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-4 sm:mb-6">
            Additional Resources
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white/5 p-5 sm:p-6 rounded-xl border border-white/10">
              <h3 className="font-bold text-white mb-2 sm:mb-3 flex items-center gap-2">
                <BookOpen size={18} className="text-[#e35e25]" />
                Documentation
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Learn more about hosting, attending, and using Popera's features
              </p>
            </div>
            <div className="bg-white/5 p-5 sm:p-6 rounded-xl border border-white/10">
              <h3 className="font-bold text-white mb-2 sm:mb-3 flex items-center gap-2">
                <Shield size={18} className="text-[#e35e25]" />
                Safety & Security
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Learn about our safety measures and how to report issues
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
