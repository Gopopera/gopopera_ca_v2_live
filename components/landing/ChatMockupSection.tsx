import React from 'react';
import { MessageCircle, BarChart2, Megaphone, Send, Sparkles } from 'lucide-react';

export const ChatMockupSection: React.FC = () => {
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
             <div className="inline-block py-2 sm:py-2.5 px-5 sm:px-6 rounded-full bg-gradient-to-r from-[#e35e25]/10 to-[#e35e25]/5 border border-[#e35e25]/20 text-[#e35e25] text-[10px] sm:text-[11px] md:text-xs font-bold tracking-[0.2em] uppercase mb-5 sm:mb-6 md:mb-8 shadow-sm backdrop-blur-sm">
                Engagement
             </div>
             <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-6xl font-heading font-bold text-[#15383c] mb-5 sm:mb-6 md:mb-8 leading-[1.1] px-2">
               Every great pop-up starts with <span className="text-[#e35e25] relative inline-block">
                 real connection.
                 <svg className="absolute w-full h-3 sm:h-4 -bottom-2 left-0 text-[#e35e25]/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                   <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2.5" fill="none" />
                 </svg>
               </span>
             </h2>
             
             <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 font-light mb-6 sm:mb-8 md:mb-10 leading-relaxed px-4 lg:px-0">
               Keep your community engaged before, during, and after the event. No more scattered DMs or lost emails.
             </p>
             
             {/* Mobile-only: extra spacing and subtitle */}
             <p className="text-sm sm:text-base text-gray-600 font-light mb-8 md:hidden leading-relaxed px-4">
               The simplest way to gather your crowd and keep them connected.
             </p>

             <div className="space-y-4 sm:space-y-5 text-left max-w-lg mx-auto lg:mx-0">
                <div className="flex gap-4 sm:gap-5 p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-md hover:shadow-xl hover:border-[#15383c]/30 transition-all duration-300 group">
                   <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#15383c] to-[#1a4549] flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <MessageCircle size={20} className="sm:w-6 sm:h-6" />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base sm:text-lg text-[#15383c] mb-1">Real-world crowd activation</h3>
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">Turn passive followers into active attendees.</p>
                   </div>
                </div>
                <div className="flex gap-4 sm:gap-5 p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-md hover:shadow-xl hover:border-[#15383c]/30 transition-all duration-300 group">
                   <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#15383c] to-[#1a4549] flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <Megaphone size={20} className="sm:w-6 sm:h-6" />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base sm:text-lg text-[#15383c] mb-1">Instant SMS & email updates</h3>
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">Broadcast changes or hype directly to everyone.</p>
                   </div>
                </div>
                <div className="flex gap-4 sm:gap-5 p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-md hover:shadow-xl hover:border-[#15383c]/30 transition-all duration-300 group">
                   <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#15383c] to-[#1a4549] flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                     <BarChart2 size={20} className="sm:w-6 sm:h-6" />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base sm:text-lg text-[#15383c] mb-1">Build local trust</h3>
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">Transparent ratings and community-led moderation.</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Right Visual - Chat Mockup */}
          <div className="relative mx-auto lg:mx-0 w-full max-w-[340px] sm:max-w-md lg:max-w-lg order-1 lg:order-2">
             <div className="bg-white rounded-3xl sm:rounded-[2.5rem] md:rounded-[3rem] lg:rounded-[3.5rem] shadow-[0_40px_80px_-20px_rgba(21,56,60,0.25)] border-[4px] sm:border-[6px] md:border-[8px] border-white overflow-hidden relative z-10 scale-95 sm:scale-100 transform transition-transform hover:scale-[1.02] duration-300">
                <div className="bg-gradient-to-br from-[#15383c] via-[#1a4549] to-[#15383c] p-5 sm:p-6 md:p-7 pb-6 sm:pb-7 md:pb-8 text-white relative shadow-lg">
                   <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                   <div className="flex justify-between items-center mb-4 sm:mb-5 relative z-10">
                      <span className="font-heading font-bold text-xs sm:text-sm md:text-base opacity-90">Pop-ups group chat</span>
                   </div>
                   <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#e35e25] to-[#cf4d1d] rounded-full flex items-center justify-center font-bold text-lg sm:text-xl md:text-2xl border-3 border-white/30 shadow-lg">P</div>
                      <div className="min-w-0">
                         <h3 className="font-bold text-lg sm:text-xl md:text-2xl leading-none truncate mb-1">Retro Record Fair</h3>
                         <span className="text-[10px] sm:text-[11px] md:text-xs text-green-300 flex items-center gap-1.5 uppercase tracking-wider font-bold"><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></span> 12 online</span>
                      </div>
                   </div>
                </div>

                {/* Desktop: max-height with scroll, Mobile: auto height */}
                <div className="bg-gradient-to-b from-[#f8fafb] to-white p-5 lg:p-7 space-y-3 sm:space-y-4 md:space-y-5 h-auto min-h-[380px] sm:h-[440px] md:h-[480px] md:max-h-[540px] overflow-y-auto overflow-x-hidden relative">
                   <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#f8fafb] to-transparent z-10 pointer-events-none"></div>
                   
                   <div className="flex justify-center pt-2"><span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-white px-4 py-1.5 rounded-full shadow-md border border-gray-200">Today</span></div>

                   <div className="flex flex-col items-start gap-1.5">
                      <div className="bg-white p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl rounded-tl-none shadow-md text-[12px] sm:text-sm text-gray-700 max-w-[85%] border border-gray-200 hover:shadow-lg transition-shadow">
                         Hey everyone! Is anyone arriving early for the keynote at 3 PM?
                      </div>
                      <span className="text-[10px] sm:text-[11px] text-gray-500 ml-3 font-medium">Alex - 2:37 PM</span>
                   </div>

                   <div className="flex flex-col items-start gap-1.5">
                      <div className="bg-white p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl rounded-tl-none shadow-md text-[12px] sm:text-sm text-gray-700 max-w-[85%] border border-gray-200 hover:shadow-lg transition-shadow">
                         Just got here - parking is tight near Entrance B.
                      </div>
                      <span className="text-[10px] sm:text-[11px] text-gray-500 ml-3 font-medium">Priya - 2:39 PM</span>
                   </div>

                   <div className="bg-gradient-to-br from-[#15383c] to-[#1a4549] p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl text-white relative overflow-hidden border border-[#15383c]/50">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                      <div className="flex items-center gap-2 sm:gap-2.5 mb-2 sm:mb-2.5 relative z-10">
                         <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-[#e35e25] to-[#cf4d1d] rounded-full flex items-center justify-center shadow-lg"><Megaphone size={11} className="sm:w-[12px] sm:h-[12px]" /></div>
                         <span className="font-bold text-[11px] sm:text-xs uppercase tracking-wide">Announcement</span>
                      </div>
                      <p className="text-[11px] sm:text-sm opacity-95 relative z-10 leading-relaxed">You can park near entrance B for anyone arriving early before 3PM.</p>
                   </div>

                   <div className="bg-gradient-to-br from-[#15383c] to-[#1a4549] p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl text-white border border-[#15383c]/50">
                      <h4 className="font-bold text-sm sm:text-base mb-3 sm:mb-4">Will you join the after-party?</h4>
                      <div className="flex gap-2 sm:gap-3">
                         <div className="flex-1 bg-white/15 rounded-xl p-2.5 sm:p-3 text-center border border-white/10 shadow-inner">
                            <span className="block font-bold text-base sm:text-lg md:text-xl mb-1">90%</span>
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider opacity-80">Yes</span>
                         </div>
                         <div className="flex-1 bg-white/10 rounded-xl p-2.5 sm:p-3 text-center border border-white/5">
                            <span className="block font-bold text-base sm:text-lg md:text-xl text-white/50 mb-1">10%</span>
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider opacity-60">No</span>
                         </div>
                      </div>
                   </div>

                   {/* Host Reply Message */}
                   <div className="flex flex-col items-start gap-1.5">
                      <div className="bg-white p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl rounded-tl-none shadow-md text-[12px] sm:text-sm text-gray-700 max-w-[85%] border border-gray-200 hover:shadow-lg transition-shadow">
                         Thanks for the feedback! We'll set up the after-party at 7 PM. See you there! 🎉
                      </div>
                      <span className="text-[10px] sm:text-[11px] text-gray-500 ml-3 font-medium">Host - 2:45 PM</span>
                   </div>
                </div>

                <div className="p-3 sm:p-4 bg-gradient-to-b from-white to-gray-50 border-t border-gray-200">
                   <div className="relative">
                      <div className="w-full bg-gray-100 rounded-full py-3 sm:py-3.5 pl-4 sm:pl-5 pr-11 sm:pr-12 text-[11px] sm:text-sm text-gray-500 border border-gray-200 focus-within:border-[#15383c]/30 focus-within:bg-white transition-colors">Message the group...</div>
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-[#15383c] to-[#1a4549] rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"><Send size={12} className="sm:w-4 sm:h-4" /></div>
                   </div>
                </div>
             </div>
             
             {/* Floating Badge - Engagement */}
             <div className="absolute top-8 sm:top-10 md:top-12 -right-3 sm:-right-5 md:-right-10 bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl animate-bounce duration-[3000ms] flex items-center gap-3 sm:gap-4 z-20 border-2 border-gray-200 hover:border-[#e35e25]/30 transition-colors">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#e35e25]/15 to-[#e35e25]/5 rounded-full flex items-center justify-center text-[#e35e25] shadow-lg">
                  <Sparkles size={18} className="sm:w-6 sm:h-6" />
                </div>
                <div>
                   <p className="text-[11px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider">Engagement</p>
                   <p className="text-sm sm:text-base font-bold text-[#15383c]">Increase engagement</p>
                </div>
             </div>

          </div>

        </div>
      </div>
    </section>
  );
};