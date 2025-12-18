import React from 'react';
import { MessageCircle, BarChart2, Megaphone, Send, Sparkles, Users, DollarSign, ArrowLeft, X, UserPlus } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const ChatMockupSection: React.FC = () => {
  const { t } = useLanguage();
  return (
    <section className="py-10 sm:py-12 md:py-16 lg:py-8 xl:py-10 bg-[#f8fafb] overflow-hidden relative lg:min-h-[calc(100vh-80px)] flex items-center">
      {/* Background Decor - Enhanced with gradient flow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-5%] right-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-[#e35e25]/8 to-[#e35e25]/3 rounded-full blur-[180px]"></div>
         <div className="absolute bottom-[-5%] left-[-5%] w-[500px] h-[500px] bg-gradient-to-tr from-[#15383c]/8 to-[#15383c]/3 rounded-full blur-[150px]"></div>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-[#e35e25]/5 via-transparent to-transparent rounded-full blur-[200px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 md:gap-12 lg:gap-10 items-center">
          
          {/* Left Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
             <div className="mb-4 sm:mb-6 lg:mb-4">
              <span className="inline-flex items-center gap-2 py-1 sm:py-1.5 px-3.5 sm:px-4 rounded-full bg-[#15383c]/5 border border-[#15383c]/10 text-[#e35e25] text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase">
                <Users size={10} className="sm:w-3 sm:h-3 -mt-0.5" />
                {t('chatMockup.engagement')}
              </span>
             </div>
             <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl font-heading font-bold text-[#15383c] mb-4 sm:mb-6 lg:mb-4 leading-[1.1] px-2 lg:px-0">
               {t('chatMockup.title')}
             </h2>
             
             <p className="text-sm sm:text-base md:text-lg lg:text-lg text-gray-700 font-light mb-6 sm:mb-8 lg:mb-6 leading-relaxed px-4 lg:px-0">
               {t('chatMockup.description')}
             </p>
             
             <div className="space-y-2 sm:space-y-3 lg:space-y-2 text-left max-w-lg mx-auto lg:mx-0">
                {/* Feature 1: Real-world crowd activation */}
                <div className="flex gap-3 p-3 sm:p-4 lg:p-3 bg-[#f2f2f2] rounded-[14px] sm:rounded-[16px] shadow-md hover:shadow-lg transition-all duration-300 group border border-gray-200/50">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-9 lg:h-9 rounded-full bg-[#15383c] flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <MessageCircle size={16} className="sm:w-[18px] sm:h-[18px] lg:w-4 lg:h-4 text-[#e35e25]" strokeWidth={2} />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[#15383c] mb-0.5">{t('chatMockup.realWorldActivation')}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{t('chatMockup.realWorldActivationDesc')}</p>
                   </div>
                </div>
                
                {/* Feature 2: Popera Guide (AI) */}
                <div className="flex gap-3 p-3 sm:p-4 lg:p-3 bg-[#f2f2f2] rounded-[14px] sm:rounded-[16px] shadow-md hover:shadow-lg transition-all duration-300 group border border-gray-200/50">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-9 lg:h-9 rounded-full bg-[#15383c] flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <Sparkles size={16} className="sm:w-[18px] sm:h-[18px] lg:w-4 lg:h-4 text-[#e35e25]" strokeWidth={2} />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[#15383c] mb-0.5">{t('chatMockup.poperaGuideAi')}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{t('chatMockup.poperaGuideAiDesc')}</p>
                   </div>
                </div>
                
                {/* Feature 3: Instant SMS & email updates */}
                <div className="flex gap-3 p-3 sm:p-4 lg:p-3 bg-[#f2f2f2] rounded-[14px] sm:rounded-[16px] shadow-md hover:shadow-lg transition-all duration-300 group border border-gray-200/50">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-9 lg:h-9 rounded-full bg-[#15383c] flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <Megaphone size={16} className="sm:w-[18px] sm:h-[18px] lg:w-4 lg:h-4 text-[#e35e25]" strokeWidth={2} />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[#15383c] mb-0.5">{t('chatMockup.instantUpdates')}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{t('chatMockup.instantUpdatesDesc')}</p>
                   </div>
                </div>
                
                {/* Feature 4: Build local trust */}
                <div className="flex gap-3 p-3 sm:p-4 lg:p-3 bg-[#f2f2f2] rounded-[14px] sm:rounded-[16px] shadow-md hover:shadow-lg transition-all duration-300 group border border-gray-200/50">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-9 lg:h-9 rounded-full bg-[#15383c] flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <BarChart2 size={16} className="sm:w-[18px] sm:h-[18px] lg:w-4 lg:h-4 text-[#e35e25]" strokeWidth={2} />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[#15383c] mb-0.5">{t('chatMockup.buildTrust')}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{t('chatMockup.buildTrustDesc')}</p>
                   </div>
                </div>
                
                {/* Feature 5: Monetize your circles */}
                <div className="flex gap-3 p-3 sm:p-4 lg:p-3 bg-[#f2f2f2] rounded-[14px] sm:rounded-[16px] shadow-md hover:shadow-lg transition-all duration-300 group border border-gray-200/50">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-9 lg:h-9 rounded-full bg-[#15383c] flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <DollarSign size={16} className="sm:w-[18px] sm:h-[18px] lg:w-4 lg:h-4 text-[#e35e25]" strokeWidth={2} />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[#15383c] mb-0.5">{t('chatMockup.monetizeCircles')}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{t('chatMockup.monetizeCirclesDesc')}</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Right Visual - Phone Mockup matching real mobile Group Conversation layout */}
          <div className="relative mx-auto lg:mx-0 w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[340px] order-1 lg:order-2 mb-6 lg:mb-0">
             <div className="bg-white rounded-[24px] sm:rounded-[28px] shadow-[0_30px_60px_-15px_rgba(21,56,60,0.25)] border-[3px] sm:border-[5px] border-gray-100 overflow-hidden relative z-10 transform transition-transform hover:scale-[1.02] duration-300 lg:max-h-[540px]">
                
                {/* Mobile Header - Matching real Group Conversation mobile layout */}
                <div className="bg-gradient-to-br from-[#15383c] via-[#1a4549] to-[#15383c] px-3 py-3 sm:px-4 sm:py-4 text-white relative">
                   {/* Top row: Back, Label, Close */}
                   <div className="flex items-center justify-between mb-3">
                      <button className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white">
                        <ArrowLeft size={18} strokeWidth={2} />
                      </button>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] text-white/70">Group Conversation</span>
                      <button className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white">
                        <X size={18} strokeWidth={2} />
                      </button>
                   </div>
                   
                   {/* Circle info row */}
                   <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 shrink-0">
                        <img 
                          src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop&crop=face" 
                          alt="Host"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                         <h3 className="font-bold text-sm leading-tight truncate mb-0.5">{t('chatMockup.eventName')}</h3>
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/80">Marcus</span>
                            <span className="text-[8px] font-bold bg-[#e35e25] px-1.5 py-0.5 rounded uppercase">Host</span>
                         </div>
                      </div>
                      <button className="flex items-center gap-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-2.5 py-1 transition-colors shrink-0">
                        <UserPlus size={12} strokeWidth={2} />
                        <span className="text-[10px] font-medium">Follow</span>
                      </button>
                   </div>
                </div>

                {/* Chat Content - Real mobile Group Conversation style (NO AI Insights) */}
                <div className="bg-gray-50 p-3 space-y-3 h-[260px] sm:h-[300px] lg:h-[280px] overflow-hidden relative">
                   
                   {/* Date separator */}
                   <div className="flex justify-center"><span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-full shadow-sm border border-gray-100">{t('chat.today')}</span></div>

                   {/* Message 1 */}
                   <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#15383c] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        A
                      </div>
                      <div className="flex flex-col space-y-0.5 min-w-0 max-w-[80%]">
                         <div className="bg-white border border-gray-100 text-gray-800 px-3 py-2 rounded-2xl rounded-tl-none shadow-sm text-[11px] leading-relaxed w-fit">
                            {t('chatMockup.heyEveryone')}
                         </div>
                         <span className="text-[9px] text-gray-400 ml-1">{t('chatMockup.alex')} • 07:10</span>
                      </div>
                   </div>

                   {/* Announcement Card */}
                   <div className="bg-[#15383c] rounded-xl p-3 text-white shadow-lg relative overflow-hidden">
                      <div className="flex items-center space-x-2 mb-1.5">
                         <div className="w-6 h-6 rounded-full bg-[#e35e25] flex items-center justify-center shrink-0">
                           <Megaphone size={12} className="text-white" strokeWidth={2} />
                         </div>
                         <span className="font-bold text-[10px] uppercase tracking-wide">Announcement</span>
                      </div>
                      <p className="text-gray-200 text-[10px] leading-relaxed">{t('chatMockup.announcementText')}</p>
                      <span className="text-[9px] text-gray-400 mt-1 block">Host • 07:15</span>
                   </div>

                   {/* Message 2 - Host message */}
                   <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-[#e35e25] shrink-0">
                        <img 
                          src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop&crop=face" 
                          alt="Host"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col space-y-0.5 min-w-0 max-w-[80%]">
                         <div className="bg-[#e35e25]/10 border border-[#e35e25]/30 text-gray-800 px-3 py-2 rounded-2xl rounded-tl-none shadow-sm text-[11px] leading-relaxed w-fit">
                            {t('chatMockup.hostReply')}
                         </div>
                         <span className="text-[9px] text-gray-400 ml-1"><span className="font-bold text-[#e35e25]">Host</span> • Marcus • 07:18</span>
                      </div>
                   </div>

                   {/* Typing Indicator */}
                   <div className="flex items-center gap-1.5 pl-9">
                      <div className="flex gap-0.5">
                         <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                         <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                         <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-[9px] text-gray-400">{t('chatMockup.mara')} {t('chatMockup.typingIndicator')}</span>
                   </div>

                </div>

                {/* Input Bar - Matching real mobile input style */}
                <div className="bg-white px-3 py-2.5 border-t border-gray-100">
                   <div className="relative flex items-center">
                      <input 
                        type="text"
                        placeholder={t('chat.messageGroup')}
                        readOnly
                        className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 pl-3.5 pr-10 text-[11px] text-gray-500 focus:outline-none cursor-default"
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#15383c] rounded-full flex items-center justify-center text-white shadow-md">
                        <Send size={12} strokeWidth={2} />
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
