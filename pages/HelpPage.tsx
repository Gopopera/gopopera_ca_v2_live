import React, { useState } from 'react';
import { ViewState } from '../types';
import { ChevronLeft, HelpCircle, MessageCircle, BookOpen, Shield, CreditCard, Users, Calendar, Mail, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface HelpPageProps {
  setViewState: (view: ViewState) => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({ setViewState }) => {
  const { t } = useLanguage();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const faqCategories = [
    {
      id: 'getting-started',
      title: t('help.gettingStarted'),
      icon: <BookOpen size={20} />,
      questions: [
        {
          q: t('help.howCreateAccount'),
          a: t('help.howCreateAccountA')
        },
        {
          q: t('help.howHostFirst'),
          a: t('help.howHostFirstA')
        },
        {
          q: t('help.howRSVP'),
          a: t('help.howRSVPA')
        },
        {
          q: t('help.whatReservationFee'),
          a: t('help.whatReservationFeeA')
        }
      ]
    },
    {
      id: 'hosting',
      title: t('help.hostingEvents'),
      icon: <Users size={20} />,
      questions: [
        {
          q: t('help.howEditCancel'),
          a: t('help.howEditCancelA')
        },
        {
          q: t('help.whenReceivePayment'),
          a: t('help.whenReceivePaymentA')
        },
        {
          q: t('help.howManageRSVPs'),
          a: t('help.howManageRSVPsA')
        },
        {
          q: t('help.differentPrices'),
          a: t('help.differentPricesA')
        },
        {
          q: t('help.whatHappensCancel'),
          a: t('help.whatHappensCancelA')
        }
      ]
    },
    {
      id: 'attending',
      title: t('help.attendingEvents'),
      icon: <Calendar size={20} />,
      questions: [
        {
          q: t('help.howCancelRSVP'),
          a: t('help.howCancelRSVPA')
        },
        {
          q: t('help.whatIfCantAttend'),
          a: t('help.whatIfCantAttendA')
        },
        {
          q: t('help.howCommunicate'),
          a: t('help.howCommunicateA')
        },
        {
          q: t('help.whatIfDifferent'),
          a: t('help.whatIfDifferentA')
        }
      ]
    },
    {
      id: 'payments',
      title: t('help.paymentsRefunds'),
      icon: <CreditCard size={20} />,
      questions: [
        {
          q: t('help.howRefundsWork'),
          a: t('help.howRefundsWorkA')
        },
        {
          q: t('help.howLongRefunds'),
          a: t('help.howLongRefundsA')
        },
        {
          q: t('help.whatServiceFee'),
          a: t('help.whatServiceFeeA')
        },
        {
          q: t('help.howGetRefund'),
          a: t('help.howGetRefundA')
        }
      ]
    },
    {
      id: 'safety',
      title: t('help.safetyReporting'),
      icon: <Shield size={20} />,
      questions: [
        {
          q: t('help.howReport'),
          a: t('help.howReportA')
        },
        {
          q: t('help.whatIfUnsafe'),
          a: t('help.whatIfUnsafeA')
        },
        {
          q: t('help.howVerifyHosts'),
          a: t('help.howVerifyHostsA')
        },
        {
          q: t('help.whatHappensReport'),
          a: t('help.whatHappensReportA')
        }
      ]
    },
    {
      id: 'account',
      title: t('help.accountProfile'),
      icon: <Users size={20} />,
      questions: [
        {
          q: t('help.howUpdateProfile'),
          a: t('help.howUpdateProfileA')
        },
        {
          q: t('help.howChangeNotifications'),
          a: t('help.howChangeNotificationsA')
        },
        {
          q: t('help.howDeleteAccount'),
          a: t('help.howDeleteAccountA')
        },
        {
          q: t('help.canChangeEmail'),
          a: t('help.canChangeEmailA')
        }
      ]
    }
  ];

  const filteredCategories = faqCategories;

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
            {t('help.title')}
          </h1>
          <p className="text-gray-300 text-base sm:text-lg max-w-2xl mx-auto">
            {t('help.subtitle')}
          </p>
        </div>

        {/* Quick Links */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-4 sm:mb-6">
            {t('help.quickLinks')}
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
                <p className="text-gray-400 text-xs sm:text-sm">{t('help.viewDetails')}</p>
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-4 sm:mb-6">
            {t('help.frequentlyAsked')}
          </h2>
          
          {filteredCategories.map((category) => (
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
            ))}
        </div>

        {/* Contact Support */}
        <div className="mt-12 sm:mt-16 bg-[#e35e25]/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-[#e35e25]/20">
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#e35e25] rounded-full flex items-center justify-center shrink-0">
              <MessageCircle size={24} className="sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-3 sm:mb-4">
                {t('help.stillNeedHelp')}
              </h2>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4 sm:mb-6">
                {t('help.stillNeedHelpDesc')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => setViewState(ViewState.CONTACT)}
                  className="bg-[#e35e25] hover:bg-[#cf4d1d] text-white font-bold py-3 sm:py-3.5 px-6 sm:px-8 rounded-full transition-all flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation active:scale-95"
                >
                  <Mail size={18} className="sm:w-5 sm:h-5" />
                  {t('help.contactSupport')}
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
      </div>
    </div>
  );
};
