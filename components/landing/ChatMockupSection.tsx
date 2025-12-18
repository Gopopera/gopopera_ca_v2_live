import React from 'react';
import { MessageCircle, BarChart2, Megaphone, Send, Sparkles, Users, DollarSign } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const ChatMockupSection: React.FC = () => {
  const { t } = useLanguage();
  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-28 bg-[#f8fafb] overflow-hidden relative -mt-8 sm:-mt-12 md:-mt-16 lg:-mt-20">
      {/* Background Decor - Enhanced with gradient flow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-5%] right-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-[#e35e25]/8 to-[#e35e25]/3 rounded-full blur-[180px]"></div>
         <div className="absolute bottom-[-5%] left-[-5%] w-[500px] h-[500px] bg-gradient-to-tr from-[#15383c]/8 to-[#15383c]/3 rounded-full blur-[150px]"></div>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-[#e35e25]/5 via-transparent to-transparent rounded-full blur-[200px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 md:gap-16 lg:gap-20 items-center">
          
          {/* Left Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
             <div className="mb-6 sm:mb-8 md:mb-10">
              <span className="inline-flex items-center gap-2 py-1 sm:py-1.5 md:py-2 px-3.5 sm:px-4 md:px-5 rounded-full bg-[#15383c]/5 border border-[#15383c]/10 text-[#e35e25] text-[9px] sm:text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">
                <Users size={10} className="sm:w-3 sm:h-3 -mt-0.5" />
                {t('chatMockup.engagement')}
              </span>
             </div>
             <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-6xl font-heading font-bold text-[#15383c] mb-8 sm:mb-10 md:mb-12 leading-[1.1] px-2">
               {t('chatMockup.title')}
             </h2>
             
             <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 font-light mb-10 sm:mb-12 md:mb-14 leading-relaxed px-4 lg:px-0">
               {t('chatMockup.description')}
             </p>
             
             <div className="space-y-3 sm:space-y-4 text-left max-w-lg mx-auto lg:mx-0">
                {/* Feature 1: Real-world crowd activation */}
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-[#f2f2f2] rounded-[16px] sm:rounded-[20px] shadow-md hover:shadow-lg transition-all duration-300 group border border-gray-200/50">
                   <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-[#15383c] to-[#1a4549] flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <MessageCircle size={18} className="sm:w-5 sm:h-5" />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm sm:text-base text-[#15383c] mb-1">{t('chatMockup.realWorldActivation')}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{t('chatMockup.realWorldActivationDesc')}</p>
                   </div>
                </div>
                
                {/* Feature 2: Popera Guide (AI) - NEW */}
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-[#f2f2f2] rounded-[16px] sm:rounded-[20px] shadow-md hover:shadow-lg transition-all duration-300 group border border-gray-200/50">
                   <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-[#e35e25] to-[#cf4d1d] flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <Sparkles size={18} className="sm:w-5 sm:h-5" />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm sm:text-base text-[#15383c] mb-1">{t('chatMockup.poperaGuideAi')}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{t('chatMockup.poperaGuideAiDesc')}</p>
                   </div>
                </div>
                
                {/* Feature 3: Instant SMS & email updates */}
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-[#f2f2f2] rounded-[16px] sm:rounded-[20px] shadow-md hover:shadow-lg transition-all duration-300 group border border-gray-200/50">
                   <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-[#15383c] to-[#1a4549] flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <Megaphone size={18} className="sm:w-5 sm:h-5" />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm sm:text-base text-[#15383c] mb-1">{t('chatMockup.instantUpdates')}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{t('chatMockup.instantUpdatesDesc')}</p>
                   </div>
                </div>
                
                {/* Feature 4: Build local trust */}
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-[#f2f2f2] rounded-[16px] sm:rounded-[20px] shadow-md hover:shadow-lg transition-all duration-300 group border border-gray-200/50">
                   <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-[#15383c] to-[#1a4549] flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <BarChart2 size={18} className="sm:w-5 sm:h-5" />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm sm:text-base text-[#15383c] mb-1">{t('chatMockup.buildTrust')}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{t('chatMockup.buildTrustDesc')}</p>
                   </div>
                </div>
                
                {/* Feature 5: Monetize your circles */}
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-[#f2f2f2] rounded-[16px] sm:rounded-[20px] shadow-md hover:shadow-lg transition-all duration-300 group border border-gray-200/50">
                   <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-[#15383c] to-[#1a4549] flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <DollarSign size={18} className="sm:w-5 sm:h-5" />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm sm:text-base text-[#15383c] mb-1">{t('chatMockup.monetizeCircles')}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{t('chatMockup.monetizeCirclesDesc')}</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Right Visual - Premium Phone Mockup (matching real GroupChat UI) */}
          <div className="relative mx-auto lg:mx-0 w-full max-w-[320px] sm:max-w-md lg:max-w-lg order-1 lg:order-2 mb-8 lg:mb-0">
             <div className="bg-white rounded-[24px] sm:rounded-[28px] shadow-[0_40px_80px_-20px_rgba(21,56,60,0.25)] border-[3px] sm:border-[6px] md:border-[8px] border-white overflow-hidden relative z-10 transform transition-transform hover:scale-[1.02] duration-300">
                {/* Chat Header - Matching real GroupChat header */}
                <div className="bg-gradient-to-br from-[#15383c] via-[#1a4549] to-[#15383c] p-4 sm:p-5 md:p-6 text-white relative shadow-lg">
                   <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                   <div className="flex justify-between items-center mb-3 sm:mb-4 relative z-10">
                      <span className="font-heading font-bold text-xs sm:text-sm opacity-90">{t('chat.circleGroupChat')}</span>
                   </div>
                   <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-white/30 shadow-lg relative">
                        <img 
                          src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop&crop=face" 
                          alt="Host profile"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                         <h3 className="font-bold text-base sm:text-lg md:text-xl leading-none truncate mb-1">{t('chatMockup.eventName')}</h3>
                         <span className="text-[10px] sm:text-[11px] text-green-300 flex items-center gap-1.5 uppercase tracking-wider font-bold"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></span> 12 {t('chat.online')}</span>
                      </div>
                   </div>
                </div>

                {/* Chat Content - Matching real GroupChat message styles */}
                <div className="bg-gray-50 p-3 sm:p-4 md:p-5 space-y-4 sm:space-y-5 h-[300px] sm:h-[420px] md:h-[460px] overflow-y-auto overflow-x-hidden relative" style={{ WebkitOverflowScrolling: 'touch' }}>
                   
                   {/* Date separator */}
                   <div className="flex justify-center pt-1"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">{t('chat.today')}</span></div>

                   {/* Message 1 - Regular attendee message (matching real GroupChat) */}
                   <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#15383c] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        A
                      </div>
                      <div className="flex flex-col space-y-1 min-w-0 max-w-[80%]">
                         <div className="bg-white border border-gray-100 text-gray-800 px-3.5 py-2.5 rounded-2xl rounded-tl-none shadow-sm text-[12px] sm:text-sm leading-relaxed w-fit">
                            {t('chatMockup.heyEveryone')}
                         </div>
                         <span className="text-[10px] text-gray-400 ml-1">{t('chatMockup.alex')} • 07:10 AM</span>
                      </div>
                   </div>

                   {/* Message 2 - Regular attendee message */}
                   <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                        <img 
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" 
                          alt="Liam"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col space-y-1 min-w-0 max-w-[80%]">
                         <div className="bg-white border border-gray-100 text-gray-800 px-3.5 py-2.5 rounded-2xl rounded-tl-none shadow-sm text-[12px] sm:text-sm leading-relaxed w-fit">
                            {t('chatMockup.parkingTight')}
                         </div>
                         <span className="text-[10px] text-gray-400 ml-1">{t('chatMockup.priya')} • 07:12 AM</span>
                      </div>
                   </div>

                   {/* Announcement Card - Matching real GroupChat announcement style */}
                   <div className="bg-[#15383c] rounded-2xl p-4 sm:p-5 text-white shadow-xl shadow-[#15383c]/10 relative overflow-hidden">
                      <div className="relative z-10">
                         <div className="flex items-center space-x-2.5 mb-2.5">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#e35e25] flex items-center justify-center shrink-0">
                              <Megaphone size={14} className="sm:w-4 sm:h-4 text-white" />
                            </div>
                            <h3 className="font-bold text-xs sm:text-sm">Announcement</h3>
                         </div>
                         <p className="text-gray-200 text-[11px] sm:text-sm leading-relaxed">{t('chatMockup.announcementText')}</p>
                         <span className="text-[10px] text-gray-400 mt-2 block">Host • 07:15 AM</span>
                      </div>
                   </div>

                   {/* Message 3 - Host message (with orange tint like real GroupChat) */}
                   <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#e35e25] shrink-0">
                        <img 
                          src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop&crop=face" 
                          alt="Host"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col space-y-1 min-w-0 max-w-[80%]">
                         <div className="bg-[#e35e25]/10 border border-[#e35e25]/30 text-gray-800 px-3.5 py-2.5 rounded-2xl rounded-tl-none shadow-sm text-[12px] sm:text-sm leading-relaxed w-fit">
                            {t('chatMockup.hostReply')}
                         </div>
                         <span className="text-[10px] text-gray-400 ml-1"><span className="font-bold text-[#e35e25]">Host • </span>Marcus • 07:18 AM</span>
                      </div>
                   </div>

                   {/* Message 4 - Regular attendee */}
                   <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                        <img 
                          src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face" 
                          alt="Mara"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col space-y-1 min-w-0 max-w-[80%]">
                         <div className="bg-white border border-gray-100 text-gray-800 px-3.5 py-2.5 rounded-2xl rounded-tl-none shadow-sm text-[12px] sm:text-sm leading-relaxed w-fit">
                            {t('chatMockup.maraMessage')}
                         </div>
                         <span className="text-[10px] text-gray-400 ml-1">{t('chatMockup.mara')} • 07:20 AM</span>
                      </div>
                   </div>

                   {/* Typing Indicator */}
                   <div className="flex items-center gap-2 pl-10">
                      <div className="flex gap-1">
                         <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                         <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                         <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-[10px] text-gray-400">{t('chatMockup.alex')} {t('chatMockup.typingIndicator')}</span>
                   </div>

                </div>

                {/* Input Bar - Matching real GroupChat input style */}
                <div className="bg-white p-3 sm:p-4 border-t border-gray-100">
                   <div className="relative flex items-center">
                      <input 
                        type="text"
                        placeholder={t('chat.messageGroup')}
                        readOnly
                        className="w-full bg-gray-50 border border-gray-200 rounded-full py-2.5 sm:py-3 pl-4 pr-11 sm:pr-12 text-[11px] sm:text-sm text-gray-500 focus:outline-none cursor-default"
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-[#15383c] rounded-full flex items-center justify-center text-white shadow-md">
                        <Send size={14} className="sm:w-4 sm:h-4" />
                      </div>
                   </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </section>
  );
};
