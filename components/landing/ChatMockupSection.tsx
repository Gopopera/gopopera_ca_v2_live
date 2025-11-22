import React from 'react';
import { MessageCircle, BarChart2, Megaphone, Send, Sparkles } from 'lucide-react';

export const ChatMockupSection: React.FC = () => {
  return (
    <section className="py-8 sm:py-8 md:py-12 lg:py-16 xl:py-20 bg-[#f8fafb] overflow-hidden relative">
      {/* Background Decor - Clean, no pink */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#e35e25] rounded-full blur-[150px] opacity-[0.03]"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#15383c] rounded-full blur-[120px] opacity-[0.03]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 md:gap-12 lg:gap-16 items-center">
          
          {/* Left Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
             <div className="inline-block py-1.5 sm:py-2 px-4 sm:px-5 rounded-full bg-[#e35e25]/10 text-[#e35e25] text-[10px] sm:text-[11px] md:text-xs font-bold tracking-[0.2em] uppercase mb-4 sm:mb-5 md:mb-6">
                Engagement
             </div>
             <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl font-heading font-bold text-[#15383c] mb-4 sm:mb-5 md:mb-6 leading-tight px-2">
               Every great pop-up starts with <span className="text-[#e35e25]">real connection.</span>
             </h2>
             
             <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 font-light mb-6 sm:mb-7 md:mb-8 leading-relaxed px-4 lg:px-0">
               Keep your community engaged before, during, and after the event. No more scattered DMs or lost emails.
             </p>

             <div className="space-y-3 sm:space-y-4 text-left max-w-lg mx-auto lg:mx-0">
                <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm hover:border-[#15383c]/20 transition-colors">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#15383c] flex items-center justify-center text-white shrink-0">
                     <MessageCircle size={18} className="sm:w-5 sm:h-5" />
                   </div>
                   <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-[#15383c]">Real-world crowd activation</h3>
                      <p className="text-xs sm:text-sm text-gray-500">Turn passive followers into active attendees.</p>
                   </div>
                </div>
                <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm hover:border-[#15383c]/20 transition-colors">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#15383c] flex items-center justify-center text-white shrink-0">
                     <Megaphone size={18} className="sm:w-5 sm:h-5" />
                   </div>
                   <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-[#15383c]">Instant SMS & email updates</h3>
                      <p className="text-xs sm:text-sm text-gray-500">Broadcast changes or hype directly to everyone.</p>
                   </div>
                </div>
                <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm hover:border-[#15383c]/20 transition-colors">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#15383c] flex items-center justify-center text-white shrink-0">
                     <BarChart2 size={18} className="sm:w-5 sm:h-5" />
                   </div>
                   <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-[#15383c]">Build local trust</h3>
                      <p className="text-xs sm:text-sm text-gray-500">Transparent ratings and community-led moderation.</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Right Visual - Chat Mockup */}
          <div className="relative mx-auto lg:mx-0 w-full max-w-[320px] sm:max-w-md order-1 lg:order-2">
             <div className="bg-white rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.10)] border-[3px] sm:border-[6px] md:border-[8px] border-white overflow-hidden relative z-10 scale-90 sm:scale-100">
                <div className="bg-[#15383c] p-4 sm:p-5 md:p-6 pb-6 sm:pb-7 md:pb-8 text-white relative">
                   <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <span className="font-heading font-bold text-xs sm:text-sm md:text-base opacity-80">Pop-ups group chat</span>
                   </div>
                   <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#e35e25] rounded-full flex items-center justify-center font-bold text-base sm:text-lg md:text-xl border-2 border-white/20">P</div>
                      <div className="min-w-0">
                         <h3 className="font-bold text-base sm:text-lg md:text-xl leading-none truncate">Retro Record Fair</h3>
                         <span className="text-[9px] sm:text-[10px] md:text-xs text-green-400 flex items-center gap-1 mt-1 uppercase tracking-wider font-bold"><span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-green-400 rounded-full animate-pulse"></span> 12 online</span>
                      </div>
                   </div>
                </div>

                <div className="bg-[#f8fafb] p-3 sm:p-4 md:p-5 space-y-2.5 sm:space-y-3 md:space-y-4 h-auto min-h-[360px] sm:h-[420px] md:h-[460px] lg:h-[500px] overflow-y-auto overflow-x-hidden relative">
                   <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#f8fafb] to-transparent z-10 pointer-events-none"></div>
                   
                   <div className="flex justify-center"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">Today</span></div>

                   <div className="flex flex-col items-start gap-1">
                      <div className="bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl rounded-tl-none shadow-sm text-[11px] sm:text-xs text-gray-600 max-w-[85%] border border-gray-100">
                         Hey everyone! Is anyone arriving early for the keynote at 3 PM?
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-gray-400 ml-2">Alex - 2:37 PM</span>
                   </div>

                   <div className="flex flex-col items-start gap-1">
                      <div className="bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl rounded-tl-none shadow-sm text-[11px] sm:text-xs text-gray-600 max-w-[85%] border border-gray-100">
                         Just got here - parking is tight near Entrance B.
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-gray-400 ml-2">Priya - 2:39 PM</span>
                   </div>

                   <div className="bg-[#15383c] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-md text-white relative overflow-hidden">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 relative z-10">
                         <div className="w-4 h-4 sm:w-5 sm:h-5 bg-[#e35e25] rounded-full flex items-center justify-center"><Megaphone size={9} className="sm:w-[10px] sm:h-[10px]" /></div>
                         <span className="font-bold text-[10px] sm:text-xs uppercase tracking-wide">Announcement</span>
                      </div>
                      <p className="text-[10px] sm:text-xs opacity-90 relative z-10">You can park near entrance B for anyone arriving early before 3PM.</p>
                   </div>

                   <div className="bg-[#15383c] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-md text-white">
                      <h4 className="font-bold text-xs sm:text-sm mb-2 sm:mb-3">Will you join the after-party?</h4>
                      <div className="flex gap-1.5 sm:gap-2">
                         <div className="flex-1 bg-white/10 rounded-lg p-1.5 sm:p-2 text-center border border-white/5">
                            <span className="block font-bold text-sm sm:text-base md:text-lg">90%</span>
                            <span className="text-[8px] sm:text-[9px] uppercase tracking-wider opacity-70">Yes</span>
                         </div>
                         <div className="flex-1 bg-white/10 rounded-lg p-1.5 sm:p-2 text-center border border-white/5">
                            <span className="block font-bold text-sm sm:text-base md:text-lg text-white/50">10%</span>
                            <span className="text-[8px] sm:text-[9px] uppercase tracking-wider opacity-50">No</span>
                         </div>
                      </div>
                   </div>

                   {/* Host Reply Message */}
                   <div className="flex flex-col items-start gap-1">
                      <div className="bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl rounded-tl-none shadow-sm text-[11px] sm:text-xs text-gray-600 max-w-[85%] border border-gray-100">
                         Thanks for the feedback! We'll set up the after-party at 7 PM. See you there! 🎉
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-gray-400 ml-2">Host - 2:45 PM</span>
                   </div>
                </div>

                <div className="p-2.5 sm:p-3 bg-white border-t border-gray-100">
                   <div className="relative">
                      <div className="w-full bg-gray-100 rounded-full py-2.5 sm:py-3 pl-3 sm:pl-4 pr-9 sm:pr-10 text-[10px] sm:text-xs text-gray-400">Message the group...</div>
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 bg-[#15383c] rounded-full flex items-center justify-center text-white shadow-sm"><Send size={11} className="sm:w-3 sm:h-3" /></div>
                   </div>
                </div>
             </div>
             
             {/* Floating Badge - Engagement */}
             <div className="absolute top-6 sm:top-8 md:top-10 -right-2 sm:-right-4 md:-right-8 bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-xl animate-bounce duration-[3000ms] flex items-center gap-2 sm:gap-3 z-20 border border-gray-100">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#e35e25]/10 rounded-full flex items-center justify-center text-[#e35e25]">
                  <Sparkles size={16} className="sm:w-5 sm:h-5" />
                </div>
                <div>
                   <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase">Engagement</p>
                   <p className="text-xs sm:text-sm font-bold text-[#15383c]">Increase engagement</p>
                </div>
             </div>

          </div>

        </div>
      </div>
    </section>
  );
};