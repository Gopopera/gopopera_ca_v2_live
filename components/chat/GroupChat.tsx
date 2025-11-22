import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Send, Megaphone, BarChart2, MessageCircle, FileText, ChevronRight, Sparkles, ArrowLeft, MoreVertical, Pin, Image as ImageIcon } from 'lucide-react';
import { Event } from '@/types';
import { useUserStore } from '@/stores/userStore';
import { useChatStore } from '@/stores/chatStore';
import { ChatReservationBlocker } from './ChatReservationBlocker';
import { DemoEventBlocker } from './DemoEventBlocker';
import { GroupChatHeader } from './GroupChatHeader';
import { POPERA_HOST_ID } from '@/stores/userStore';

interface GroupChatProps {
  event: Event;
  onClose: () => void;
  onViewDetails: () => void;
  onReserve?: () => void; // Callback to trigger reservation flow
  isLoggedIn?: boolean;
}

export const GroupChat: React.FC<GroupChatProps> = ({ event, onClose, onViewDetails, onReserve, isLoggedIn = false }) => {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = useUserStore((state) => state.getCurrentUser());
  const getMessagesForEvent = useChatStore((state) => state.getMessagesForEvent);
  const addMessage = useChatStore((state) => state.addMessage);
  const subscribeToEventChat = useChatStore((state) => state.subscribeToEventChat);
  const unsubscribeFromEventChat = useChatStore((state) => state.unsubscribeFromEventChat);
  const initializeEventChat = useChatStore((state) => state.initializeEventChat);
  const getPollForEvent = useChatStore((state) => state.getPollForEvent);
  const addPoll = useChatStore((state) => state.addPoll);
  
  const isPoperaOwned = event.isPoperaOwned === true || event.hostId === POPERA_HOST_ID;
  const isOfficialLaunch = event.isOfficialLaunch === true;
  const isFakeEvent = event.isFakeEvent === true;
  const isDemo = event.isDemo === true || isFakeEvent; // Check both flags for compatibility
  const isHost = currentUser && currentUser.id === event.hostId;
  const hasReserved = currentUser ? currentUser.rsvps.includes(event.id) : false;
  
  // Determine view type
  // Official launch events require reservation for chat access (unlike other Popera events)
  // Demo events are always blocked
  // Regular Popera events are open to all
  // Regular events require reservation
  const viewType = isDemo 
    ? 'demo' 
    : isHost 
    ? 'host' 
    : isOfficialLaunch 
    ? (hasReserved ? 'participant' : 'blocked')
    : (isPoperaOwned || hasReserved) 
    ? 'participant' 
    : 'blocked';
  const canAccessChat = viewType === 'host' || viewType === 'participant';
  const canSendMessages = canAccessChat && !isDemo && !!currentUser; // Require authentication and not demo
  
  const messages = getMessagesForEvent(event.id);
  const poll = getPollForEvent(event.id);
  
  // Subscribe to Firestore realtime chat updates
  useEffect(() => {
    if (canAccessChat && !isDemo) {
      // subscribeToEventChat is now async due to dynamic imports
      subscribeToEventChat(event.id).catch(err => {
        console.error("Error subscribing to chat:", err);
      });
      return () => {
        unsubscribeFromEventChat(event.id);
      };
    }
  }, [event.id, canAccessChat, isDemo, subscribeToEventChat, unsubscribeFromEventChat]);
  
  // Initialize chat for Popera events (including official launch events) - fallback for mock data
  useEffect(() => {
    if (isPoperaOwned && messages.length === 0 && !isDemo) {
      initializeEventChat(event.id, event.hostName);
    }
  }, [event.id, event.hostName, isPoperaOwned, messages.length, initializeEventChat, isDemo]);
  
  const handleSendMessage = async () => {
    if (!message.trim() || !canSendMessages || !currentUser) return;
    
    await addMessage(event.id, currentUser.id, currentUser.name, message, 'message', isHost);
    setMessage('');
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        // Send image as message with data URL (format: [Image:dataUrl:filename])
        if (currentUser && canSendMessages) {
          // In real app, upload image to storage first, then send URL
          addMessage(event.id, currentUser.id, currentUser.name, `[Image:${imageUrl}:${file.name}]`, 'message', isHost);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleReserve = () => {
    if (onReserve) {
      onReserve();
    }
  };
  
  // Calculate real member count from RSVPs (for Popera events) or use static for demo events
  const memberCount = isPoperaOwned 
    ? (event.attendeesCount || 0) 
    : (isDemo ? 34 : (event.attendeesCount || 0));

  const tabs = [
    { name: 'Chat', active: true, icon: MessageCircle },
    { name: 'Poll', active: false, icon: BarChart2 },
    { name: 'Survey', active: false, icon: FileText },
    { name: 'Announcement', active: false, icon: Megaphone },
  ];

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col md:flex-row overflow-hidden font-sans z-50">
      
      {/* LEFT SIDEBAR (DESKTOP ONLY) */}
      <aside className="hidden md:flex w-80 lg:w-96 bg-[#15383c] flex-col shrink-0 h-full shadow-2xl z-20">
        <div className="p-6 sm:p-8 pb-4 flex items-center justify-between">
          <h1 className="text-white font-heading font-bold text-2xl sm:text-3xl tracking-tight cursor-pointer" onClick={onClose}>POPERA</h1>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors text-xs sm:text-sm font-medium flex items-center gap-1 touch-manipulation">
            <ArrowLeft size={14} className="sm:w-4 sm:h-4" /> Exit
          </button>
        </div>

        <div className="px-6 sm:px-8 py-4 sm:py-6">
          <div className="bg-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/10 backdrop-blur-sm">
            <div className="relative h-28 sm:h-32 rounded-lg sm:rounded-xl overflow-hidden mb-3 sm:mb-4">
               <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#15383c]/80 to-transparent"></div>
               <span className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 text-[10px] sm:text-xs font-bold bg-[#e35e25] text-white px-1.5 sm:px-2 py-0.5 rounded-full">
                 {event.category}
               </span>
            </div>
            <h2 className="text-white font-heading font-bold text-base sm:text-lg leading-tight mb-1.5 sm:mb-2">
              {event.title}
            </h2>
            <p className="text-gray-400 text-[10px] sm:text-xs">Hosted by {event.hostName}</p>
          </div>
        </div>

        <div className="flex-1 px-6 overflow-y-auto space-y-2">
           <h3 className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Menu</h3>
           {tabs.map((tab) => (
             <button
               key={tab.name}
               className={`
                 w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all group
                 ${tab.active 
                   ? 'bg-[#e35e25] text-white shadow-lg shadow-orange-900/20' 
                   : 'text-gray-300 hover:bg-white/10'}
               `}
             >
               <tab.icon size={18} className={`mr-3 ${tab.active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
               {tab.name}
             </button>
           ))}
        </div>

        <div className="p-6 mt-auto border-t border-white/10 bg-[#0f2a2d]">
          <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
             <div className="flex items-center">
               <Users size={14} className="mr-2" />
               <span>{memberCount} Members</span>
             </div>
             <div className="flex items-center text-green-400">
               <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
               {Math.floor(memberCount * 0.35)} online
             </div>
          </div>
        </div>
      </aside>


      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative min-w-0">
        {/* Demo Event Blocker - always shown for fake events */}
        {isDemo && <DemoEventBlocker />}
        
        {/* Reservation Blocker - shown if user hasn't reserved and event is not Popera-owned and not demo */}
        {!isDemo && !canAccessChat && (
          <ChatReservationBlocker 
            onReserve={handleReserve}
            isLoggedIn={isLoggedIn}
          />
        )}

        {/* New Header - Desktop */}
        <div className="hidden md:block">
          <GroupChatHeader event={event} onClose={onClose} isMobile={false} />
        </div>
        
        {/* New Header - Mobile */}
        <div className="md:hidden">
          <GroupChatHeader event={event} onClose={onClose} isMobile={true} />
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6">
          {/* Host Tools Bar - Only visible to hosts */}
          {isHost && !isDemo && (
            <div className="max-w-3xl mx-auto w-full bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm sm:text-base text-[#15383c]">Host Tools</h3>
                <span className="text-[10px] sm:text-xs bg-[#e35e25]/10 text-[#e35e25] px-2 py-1 rounded-full font-bold uppercase">Host</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    const question = prompt('Enter poll question:');
                    if (question) {
                      const option1 = prompt('Option 1:');
                      const option2 = prompt('Option 2:');
                      if (option1 && option2) {
                        addPoll(event.id, question, [option1, option2]);
                      }
                    }
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-[#e35e25] hover:bg-[#e35e25]/5 transition-colors touch-manipulation active:scale-95"
                >
                  <BarChart2 size={20} className="text-[#15383c]" />
                  <span className="text-xs font-medium text-gray-700">Create Poll</span>
                </button>
                <button
                  onClick={() => {
                    const announcement = prompt('Enter announcement:');
                    if (announcement && currentUser) {
                      addMessage(event.id, currentUser.id, currentUser.name, announcement, 'announcement', true);
                    }
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-[#e35e25] hover:bg-[#e35e25]/5 transition-colors touch-manipulation active:scale-95"
                >
                  <Megaphone size={20} className="text-[#15383c]" />
                  <span className="text-xs font-medium text-gray-700">Announcement</span>
                </button>
                <button
                  onClick={() => {
                    alert('Survey creation coming soon!');
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-[#e35e25] hover:bg-[#e35e25]/5 transition-colors touch-manipulation active:scale-95"
                >
                  <FileText size={20} className="text-[#15383c]" />
                  <span className="text-xs font-medium text-gray-700">Survey</span>
                </button>
                <button
                  onClick={() => {
                    alert('More host tools coming soon!');
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-[#e35e25] hover:bg-[#e35e25]/5 transition-colors touch-manipulation active:scale-95"
                >
                  <MoreVertical size={20} className="text-[#15383c]" />
                  <span className="text-xs font-medium text-gray-700">More</span>
                </button>
              </div>
            </div>
          )}

          {/* Pinned message for Popera events */}
          {isPoperaOwned && !isDemo && (
            <div className="bg-[#e35e25]/10 border-2 border-[#e35e25]/30 rounded-2xl p-4 sm:p-6 max-w-3xl mx-auto w-full">
              <div className="flex items-start gap-3">
                <Pin size={20} className="text-[#e35e25] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#15383c] mb-2 text-sm sm:text-base">Open Chat</h4>
                  <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
                    This chat is open so early users can interact, ask questions, and learn how to create their own Popera pop-ups.
                  </p>
                </div>
              </div>
            </div>
          )}

          {canAccessChat && !isDemo && (
            <>
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between border border-gray-100 shadow-sm max-w-3xl mx-auto w-full">
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                   <div className="w-8 h-8 sm:w-10 sm:h-10 bg-popera-teal/5 rounded-full flex items-center justify-center text-[#15383c] shrink-0">
                     <Sparkles size={18} className="sm:w-5 sm:h-5" />
                   </div>
                   <div className="min-w-0 flex-1">
                     <h4 className="text-xs sm:text-sm font-bold text-[#15383c]">AI Insights</h4>
                     <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block truncate">Summarizing key moments and logistics in real-time.</p>
                   </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 rounded-full border border-green-500/30 bg-green-50 text-[10px] font-bold text-green-600 flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></span> Live
                  </span>
                </div>
              </div>

              <div className="max-w-3xl mx-auto w-full space-y-6 pb-4">
                {/* Render actual messages from store */}
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const messageDate = new Date(msg.timestamp);
                    const timeString = messageDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    
                    if (msg.type === 'announcement') {
                      return (
                        <div key={msg.id} className="bg-[#15383c] rounded-2xl p-6 text-white shadow-xl shadow-[#15383c]/10 relative overflow-hidden">
                          <div className="relative z-10">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="w-8 h-8 rounded-full bg-[#e35e25] flex items-center justify-center shrink-0">
                                <Megaphone size={16} className="text-white" />
                              </div>
                              <h3 className="font-bold text-sm md:text-base">Host Announcement</h3>
                            </div>
                            <p className="text-gray-200 text-sm mb-4 leading-relaxed">{msg.message}</p>
                            <span className="text-[10px] text-gray-400">{msg.userName} - {timeString}</span>
                          </div>
                        </div>
                      );
                    }
                    
                    // Check if message contains image (format: [Image:dataUrl:filename])
                    const imageMatch = msg.message.match(/^\[Image:([^:]+):([^\]]+)\]$/);
                    
                    return (
                      <div key={msg.id} className={`flex flex-col space-y-1 ${msg.isHost ? 'items-end' : 'items-start'}`}>
                        <div className={`${
                          msg.isHost 
                            ? 'bg-[#e35e25]/10 border-[#e35e25]/30' 
                            : 'bg-white border-gray-100'
                        } text-gray-800 px-5 py-3.5 rounded-2xl ${msg.isHost ? 'rounded-tr-none' : 'rounded-tl-none'} shadow-sm border max-w-[85%] text-sm leading-relaxed`}>
                          {imageMatch ? (
                            <div className="space-y-2">
                              <img 
                                src={imageMatch[1]} 
                                alt={imageMatch[2]} 
                                className="rounded-lg max-w-full h-auto max-h-64 object-contain"
                              />
                              <p className="text-xs text-gray-500">{imageMatch[2]}</p>
                            </div>
                          ) : (
                            msg.message
                          )}
                        </div>
                        <span className={`text-[10px] text-gray-400 ${msg.isHost ? 'mr-2' : 'ml-2'}`}>
                          {msg.isHost && <span className="font-bold text-[#e35e25]">Host </span>}
                          {msg.userName} - {timeString}
                        </span>
                      </div>
                    );
                  })
                )}

                {/* Render poll if exists */}
                {poll && (
                  <div className="bg-[#15383c] rounded-2xl p-6 text-white shadow-xl shadow-[#15383c]/10">
                    <h3 className="font-bold text-lg mb-2">{poll.question}</h3>
                    <div className="grid grid-cols-2 gap-4 mb-5">
                      {poll.options.map((opt, idx) => (
                        <div key={idx} className="bg-white/10 rounded-xl p-4 text-center border border-white/5 cursor-pointer group">
                          <div className="text-2xl font-bold mb-1 group-hover:text-[#e35e25]">{opt.percentage}%</div>
                          <div className="text-xs text-gray-400 uppercase tracking-wide">{opt.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400 border-t border-white/10 pt-4">
                      <span>Participants: {poll.totalVotes} votes</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {canSendMessages && (
          <div className="bg-white p-3 sm:p-4 md:p-6 border-t border-gray-100 shrink-0 z-10 safe-area-inset-bottom">
             <div className="max-w-3xl mx-auto relative flex items-center gap-2">
                {/* Image Upload Button - Only for host and participants */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-gray-400 hover:text-[#15383c] transition-colors rounded-full hover:bg-gray-100 shrink-0 touch-manipulation active:scale-95"
                  aria-label="Upload image"
                >
                  <ImageIcon size={20} className="sm:w-5 sm:h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <input 
                  type="text" 
                  placeholder="Message the group..." 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 pl-4 sm:pl-6 pr-12 sm:pr-14 py-3 sm:py-4 bg-gray-50 border border-gray-200 rounded-full text-sm sm:text-base focus:outline-none focus:border-[#15383c] focus:ring-1 focus:ring-[#15383c] focus:bg-white shadow-sm transition-all" 
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 bg-[#15383c] rounded-full flex items-center justify-center text-white hover:bg-[#e35e25] transition-colors shadow-md touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};