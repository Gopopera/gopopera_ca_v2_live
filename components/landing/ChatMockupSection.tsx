import React, { useEffect } from 'react';
import { MessageCircle, BarChart2, Megaphone, Send, Sparkles, Users, DollarSign, ArrowLeft, X, Info, FileText, MoreVertical } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { preloadImage } from '../../hooks/useImageCache';

// Local host avatar for better performance
const HOST_AVATAR_URL = '/images/avatars/host-marcus.jpg';

// Mock messages factory - returns translated messages
const getMockMessages = (t: (key: string) => string) => [
  {
    id: 1,
    type: 'message',
    sender: 'Marcus',
    initial: 'M',
    isHost: true,
    text: t('chatMockup.mockMsg1'),
    time: '06:45',
    avatar: HOST_AVATAR_URL
  },
  {
    id: 2,
    type: 'message',
    sender: 'Asha',
    initial: 'A',
    isHost: false,
    text: t('chatMockup.mockMsg2'),
    time: '06:52'
  },
  {
    id: 3,
    type: 'announcement',
    text: t('chatMockup.mockAnnouncement'),
    time: '07:00'
  },
  {
    id: 4,
    type: 'message',
    sender: 'Liam',
    initial: 'L',
    isHost: false,
    text: t('chatMockup.mockMsg3'),
    time: '07:05'
  },
  {
    id: 5,
    type: 'message',
    sender: 'Marcus',
    initial: 'M',
    isHost: true,
    text: t('chatMockup.mockMsg4'),
    time: '07:08',
    avatar: '/images/avatars/host-marcus.jpg'
  },
  {
    id: 6,
    type: 'message',
    sender: 'Mara',
    initial: 'M',
    isHost: false,
    text: t('chatMockup.mockMsg5'),
    time: '07:12'
  },
  {
    id: 7,
    type: 'message',
    sender: 'Asha',
    initial: 'A',
    isHost: false,
    text: t('chatMockup.mockMsg6'),
    time: '07:14'
  },
  {
    id: 8,
    type: 'message',
    sender: 'Jon',
    initial: 'J',
    isHost: false,
    text: t('chatMockup.mockMsg7'),
    time: '07:18'
  },
  {
    id: 9,
    type: 'message',
    sender: 'Marcus',
    initial: 'M',
    isHost: true,
    text: t('chatMockup.mockMsg8'),
    time: '07:20',
    avatar: '/images/avatars/host-marcus.jpg'
  },
  {
    id: 10,
    type: 'message',
    sender: 'Liam',
    initial: 'L',
    isHost: false,
    text: t('chatMockup.mockMsg9'),
    time: '07:22'
  },
  {
    id: 11,
    type: 'message',
    sender: 'Mara',
    initial: 'M',
    isHost: false,
    text: t('chatMockup.mockMsg10'),
    time: '07:24'
  },
  {
    id: 12,
    type: 'message',
    sender: 'Marcus',
    initial: 'M',
    isHost: true,
    text: t('chatMockup.mockMsg11'),
    time: '07:25',
    avatar: '/images/avatars/host-marcus.jpg'
  }
];

// Host avatar used in chat mockup - use local image for performance
const hostAvatarUrl = HOST_AVATAR_URL;

export const ChatMockupSection: React.FC = () => {
  const { t } = useLanguage();
  const mockMessages = getMockMessages(t);

  // Preload the host avatar image on mount for instant display
  useEffect(() => {
    preloadImage(hostAvatarUrl);
  }, []);

  return (
    <section className="py-8 sm:py-10 md:py-12 lg:py-6 xl:py-8 bg-[#f8fafb] overflow-hidden relative lg:min-h-[calc(100vh-80px)] flex items-center lazy-section">
      {/* Background Decor - Simplified on mobile for performance, full blur on desktop */}
      {/* MOBILE: Simple gradients without blur (saves 100-200ms paint time) */}
      <div className="lg:hidden absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-5%] right-[-5%] w-[300px] h-[300px] bg-gradient-to-br from-[#e35e25]/10 to-transparent rounded-full opacity-60"></div>
         <div className="absolute bottom-[-5%] left-[-5%] w-[250px] h-[250px] bg-gradient-to-tr from-[#15383c]/10 to-transparent rounded-full opacity-60"></div>
      </div>
      {/* DESKTOP: Full blur effects for premium experience */}
      <div className="hidden lg:block absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-5%] right-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-[#e35e25]/8 to-[#e35e25]/3 rounded-full blur-[180px]"></div>
         <div className="absolute bottom-[-5%] left-[-5%] w-[500px] h-[500px] bg-gradient-to-tr from-[#15383c]/8 to-[#15383c]/3 rounded-full blur-[150px]"></div>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-[#e35e25]/5 via-transparent to-transparent rounded-full blur-[200px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 lg:gap-8 items-center">
          
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
                <div className="flex gap-3 p-3 sm:p-4 lg:p-3 bg-white/60 backdrop-blur-md rounded-[14px] sm:rounded-[16px] shadow-sm hover:shadow-md transition-all duration-300 group border border-white/40">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-9 lg:h-9 rounded-full bg-[#15383c] flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <MessageCircle size={16} className="sm:w-[18px] sm:h-[18px] lg:w-4 lg:h-4 text-[#e35e25]" strokeWidth={2} />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[#15383c] mb-0.5">{t('chatMockup.realWorldActivation')}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{t('chatMockup.realWorldActivationDesc')}</p>
                   </div>
                </div>
                
                {/* Feature 2: Popera Guide (AI) */}
                <div className="flex gap-3 p-3 sm:p-4 lg:p-3 bg-white/60 backdrop-blur-md rounded-[14px] sm:rounded-[16px] shadow-sm hover:shadow-md transition-all duration-300 group border border-white/40">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-9 lg:h-9 rounded-full bg-[#15383c] flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <Sparkles size={16} className="sm:w-[18px] sm:h-[18px] lg:w-4 lg:h-4 text-[#e35e25]" strokeWidth={2} />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[#15383c] mb-0.5">{t('chatMockup.poperaGuideAi')}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{t('chatMockup.poperaGuideAiDesc')}</p>
                   </div>
                </div>
                
                {/* Feature 3: Instant SMS & email updates */}
                <div className="flex gap-3 p-3 sm:p-4 lg:p-3 bg-white/60 backdrop-blur-md rounded-[14px] sm:rounded-[16px] shadow-sm hover:shadow-md transition-all duration-300 group border border-white/40">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-9 lg:h-9 rounded-full bg-[#15383c] flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <Megaphone size={16} className="sm:w-[18px] sm:h-[18px] lg:w-4 lg:h-4 text-[#e35e25]" strokeWidth={2} />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[#15383c] mb-0.5">{t('chatMockup.instantUpdates')}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{t('chatMockup.instantUpdatesDesc')}</p>
                   </div>
                </div>
                
                {/* Feature 4: Build local trust */}
                <div className="flex gap-3 p-3 sm:p-4 lg:p-3 bg-white/60 backdrop-blur-md rounded-[14px] sm:rounded-[16px] shadow-sm hover:shadow-md transition-all duration-300 group border border-white/40">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-9 lg:h-9 rounded-full bg-[#15383c] flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <BarChart2 size={16} className="sm:w-[18px] sm:h-[18px] lg:w-4 lg:h-4 text-[#e35e25]" strokeWidth={2} />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[#15383c] mb-0.5">{t('chatMockup.buildTrust')}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{t('chatMockup.buildTrustDesc')}</p>
                   </div>
                </div>
                
                {/* Feature 5: Monetize your circles */}
                <div className="flex gap-3 p-3 sm:p-4 lg:p-3 bg-white/60 backdrop-blur-md rounded-[14px] sm:rounded-[16px] shadow-sm hover:shadow-md transition-all duration-300 group border border-white/40">
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
          {/* Increased size for hero visual: mobile 340px, sm 380px, lg 420px */}
          <div className="relative mx-auto lg:mx-0 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] order-1 lg:order-2 mb-4 lg:mb-0">
             <div className="bg-white rounded-[32px] sm:rounded-[36px] lg:rounded-[40px] shadow-[0_40px_80px_-20px_rgba(21,56,60,0.3)] border-[5px] sm:border-[6px] lg:border-[8px] border-gray-100 overflow-hidden relative z-10 transform transition-transform hover:scale-[1.02] duration-300">
                
                {/* Mobile Header - UPDATED to match real Group Conversation mobile layout */}
                <div className="bg-gradient-to-br from-[#15383c] via-[#1a4549] to-[#15383c] px-3 py-3 sm:px-4 sm:py-4 text-white relative">
                   {/* Top row: Back, Label, Close */}
                   <div className="flex items-center justify-between mb-3">
                      <button className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white rounded-full">
                        <ArrowLeft size={18} strokeWidth={2} />
                      </button>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] text-white/70">{t('chatMockup.groupConversationLabel')}</span>
                      <button className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white rounded-full">
                        <X size={18} strokeWidth={2} />
                      </button>
                   </div>
                   
                   {/* Circle info row - UPDATED layout */}
                   <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-white/30 shrink-0">
                        <img 
                          src="/images/avatars/host-marcus.jpg" 
                          alt="Host"
                          width={100}
                          height={100}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      {/* Title and host info */}
                      <div className="min-w-0 flex-1">
                         <h3 className="font-bold text-base sm:text-lg leading-tight truncate mb-1">{t('chatMockup.mockEventTitle')}</h3>
                         <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm text-white/80">Marcus</span>
                            <span className="text-[9px] sm:text-[10px] font-bold bg-[#e35e25] px-2 py-0.5 rounded uppercase tracking-wide">HOST</span>
                         </div>
                      </div>
                      {/* Event details button */}
                      <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-3 py-1.5 sm:py-2 transition-colors shrink-0">
                        <Info size={14} strokeWidth={2} />
                        <span className="text-[10px] sm:text-xs font-medium">{t('chatMockup.eventDetailsBtn')}</span>
                      </button>
                   </div>
                </div>

                {/* Chat Content - Scrollable with Cold Plunge messages */}
                <div className="bg-gray-50 h-[380px] sm:h-[440px] lg:h-[480px] overflow-y-auto relative" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.1) transparent' }}>
                   
                   {/* Host Tools Block - Sticky, non-interactive */}
                   <div 
                     className="sticky top-0 z-20 p-3 sm:p-4 bg-gray-50 pointer-events-none"
                   >
                     <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 shadow-sm">
                       <div className="flex items-center justify-between mb-2.5">
                         <h3 className="font-bold text-xs sm:text-sm text-[#15383c]">Host Tools</h3>
                         <span className="text-[8px] sm:text-[9px] bg-[#e35e25]/10 text-[#e35e25] px-1.5 py-0.5 rounded-full font-bold uppercase">HOST</span>
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                         <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-gray-200 bg-white">
                           <BarChart2 size={16} className="text-[#15383c]" />
                           <span className="text-[10px] sm:text-[11px] font-medium text-gray-700">Create Poll</span>
                         </div>
                         <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-gray-200 bg-white">
                           <Megaphone size={16} className="text-[#15383c]" />
                           <span className="text-[10px] sm:text-[11px] font-medium text-gray-700">Announcement</span>
                         </div>
                         <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-gray-200 bg-white">
                           <FileText size={16} className="text-[#15383c]" />
                           <span className="text-[10px] sm:text-[11px] font-medium text-gray-700">Survey</span>
                         </div>
                         <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-gray-200 bg-white">
                           <MoreVertical size={16} className="text-[#15383c]" />
                           <span className="text-[10px] sm:text-[11px] font-medium text-gray-700">More</span>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Messages container with padding */}
                   <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
                      {/* Date separator */}
                      <div className="flex justify-center">
                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-full shadow-sm border border-gray-100">
                          {t('chat.today')}
                        </span>
                      </div>

                      {/* Render mock messages */}
                      {mockMessages.map((msg) => {
                        if (msg.type === 'announcement') {
                          return (
                            <div key={msg.id} className="bg-[#15383c] rounded-xl p-3 text-white shadow-lg relative overflow-hidden">
                               <div className="flex items-center space-x-2 mb-1.5">
                                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#e35e25] flex items-center justify-center shrink-0">
                                    <Megaphone size={12} className="sm:w-[14px] sm:h-[14px] text-white" strokeWidth={2} />
                                  </div>
                                  <span className="font-bold text-[10px] sm:text-[11px] uppercase tracking-wide">{t('chatMockup.announcementLabel')}</span>
                               </div>
                               <p className="text-gray-200 text-[10px] sm:text-[11px] leading-relaxed">{msg.text}</p>
                               <span className="text-[9px] sm:text-[10px] text-gray-400 mt-1 block">{t('chatMockup.host')} • {msg.time}</span>
                            </div>
                          );
                        }

                        // Regular message
                        return (
                          <div key={msg.id} className="flex items-start gap-2">
                             {msg.isHost && msg.avatar ? (
                               <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden ring-2 ring-[#e35e25] shrink-0">
                                 <img 
                                   src={msg.avatar}
                                   alt="Host"
                                   width={32}
                                   height={32}
                                   className="w-full h-full object-cover"
                                   loading="lazy"
                                   decoding="async"
                                 />
                               </div>
                             ) : (
                               <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#15383c] flex items-center justify-center text-white text-[10px] sm:text-[11px] font-bold shrink-0">
                                 {msg.initial}
                               </div>
                             )}
                             <div className="flex flex-col space-y-0.5 min-w-0 max-w-[80%]">
                                <div className={`${msg.isHost 
                                  ? 'bg-[#e35e25]/10 border border-[#e35e25]/30' 
                                  : 'bg-white border border-gray-100'
                                } text-gray-800 px-3 py-2 rounded-2xl rounded-tl-none shadow-sm text-[11px] sm:text-[12px] leading-relaxed w-fit`}>
                                   {msg.text}
                                </div>
                                <span className="text-[9px] sm:text-[10px] text-gray-400 ml-1">
                                  {msg.isHost && <span className="font-bold text-[#e35e25]">{t('chatMockup.host')} • </span>}
                                  {msg.sender} • {msg.time}
                                </span>
                             </div>
                          </div>
                        );
                      })}

                      {/* Typing Indicator */}
                      <div className="flex items-center gap-1.5 pl-9 sm:pl-10">
                         <div className="flex gap-0.5">
                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                         </div>
                         <span className="text-[9px] sm:text-[10px] text-gray-400">Asha {t('chatMockup.typingIndicator')}</span>
                      </div>
                   </div>

                </div>

                {/* Input Bar - Matching real mobile input style */}
                <div className="bg-white px-3 py-2.5 sm:px-4 sm:py-3 border-t border-gray-100">
                   <div className="relative flex items-center">
                      <input 
                        type="text"
                        placeholder={t('chat.messageGroup')}
                        readOnly
                        className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 sm:py-2.5 pl-3.5 sm:pl-4 pr-10 sm:pr-12 text-[11px] sm:text-[12px] text-gray-500 focus:outline-none cursor-default"
                      />
                      <div className="absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 bg-[#15383c] rounded-full flex items-center justify-center text-white shadow-md">
                        <Send size={12} className="sm:w-[14px] sm:h-[14px]" strokeWidth={2} />
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
