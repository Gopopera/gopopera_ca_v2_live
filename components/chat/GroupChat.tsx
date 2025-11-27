import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Users, Send, Megaphone, BarChart2, MessageCircle, FileText, ChevronRight, Sparkles, ArrowLeft, MoreVertical, Pin, Image as ImageIcon, Lock, Download, MessageSquareOff } from 'lucide-react';
import { Event } from '@/types';
import { useUserStore } from '@/stores/userStore';
import { useChatStore } from '@/stores/chatStore';
import { ChatReservationBlocker } from './ChatReservationBlocker';
import { DemoEventBlocker } from './DemoEventBlocker';
import { GroupChatHeader } from './GroupChatHeader';
import { AttendeeList } from './AttendeeList';
import { ExpelUserModal } from './ExpelUserModal';
import { CreatePollModal } from './CreatePollModal';
import { POPERA_HOST_ID } from '@/stores/userStore';
import { getDbSafe } from '../../src/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { processRefundForRemovedUser } from '../../utils/refundHelper';
import { expelUserFromEvent } from '../../firebase/db';
import { followHost, unfollowHost, isFollowing } from '../../firebase/follow';

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
  const [showAttendeeList, setShowAttendeeList] = useState(false);
  const [chatLocked, setChatLocked] = useState(false);
  const [muteAll, setMuteAll] = useState(false);
  const [showExpelModal, setShowExpelModal] = useState(false);
  const [userToExpel, setUserToExpel] = useState<{ userId: string; userName: string } | null>(null);
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [isFollowingHost, setIsFollowingHost] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const currentUser = useUserStore((state) => state.getCurrentUser());
  const getMessagesForEvent = useChatStore((state) => state.getMessagesForEvent);
  const addMessage = useChatStore((state) => state.addMessage);
  const subscribeToEventChat = useChatStore((state) => state.subscribeToEventChat);
  const unsubscribeFromEventChat = useChatStore((state) => state.unsubscribeFromEventChat);
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
  
  // Check if user is banned
  const isBanned = useMemo(() => {
    if (!currentUser || !event.id) return false;
    const bannedEvents = (currentUser as any).bannedEvents || [];
    return bannedEvents.includes(event.id);
  }, [currentUser, event.id]);
  
  const canAccessChat = (viewType === 'host' || viewType === 'participant') && !isBanned;
  const canSendMessages = canAccessChat && !isDemo && !!currentUser && !chatLocked; // Require authentication and not demo
  
  const messages = getMessagesForEvent(event.id);
  const poll = getPollForEvent(event.id);
  
  // Subscribe to Firestore realtime chat updates
  useEffect(() => {
    if (canAccessChat && !isDemo && !isBanned) {
      subscribeToEventChat(event.id);
      return () => {
        unsubscribeFromEventChat(event.id);
      };
    }
  }, [event.id, canAccessChat, isDemo, isBanned, subscribeToEventChat, unsubscribeFromEventChat]);

  // Check follow status
  useEffect(() => {
    if (currentUser?.id && event.hostId && !isHost) {
      const checkFollowStatus = async () => {
        const following = await isFollowing(currentUser.id, event.hostId);
        setIsFollowingHost(following);
      };
      checkFollowStatus();
    } else {
      setIsFollowingHost(false);
    }
  }, [currentUser?.id, event.hostId, isHost]);

  // Handle follow toggle
  const handleFollowToggle = async () => {
    if (!currentUser?.id || !event.hostId || isHost || followLoading) return;

    setFollowLoading(true);
    try {
      if (isFollowingHost) {
        await unfollowHost(currentUser.id, event.hostId);
        setIsFollowingHost(false);
      } else {
        await followHost(currentUser.id, event.hostId);
        setIsFollowingHost(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };
  
  // NO AUTOMATIC MESSAGES - Chat is ready when user has access
  // Messages are synced in real-time via Firestore subscriptions
  // Only host and attendees can send messages (enforced by canSendMessages check)
  
  const handleSendMessage = async () => {
    if (!message.trim() || !canSendMessages || !currentUser || chatLocked) return;
    
    const messageText = message.trim();
    await addMessage(event.id, currentUser.id, currentUser.name, messageText, 'message', isHost);
    setMessage('');

    // Notify attendees of new message (non-blocking, fire-and-forget)
    import('../../utils/notificationHelpers').then(async ({ notifyAttendeesOfNewMessage }) => {
      const { getDocs, collection, query, where } = await import('firebase/firestore');
      const { getDbSafe } = await import('../../src/lib/firebase');
      const db = getDbSafe();
      
      if (db && currentUser) {
        try {
          // Get all RSVPs for this event
          const rsvpsRef = collection(db, 'reservations');
          const rsvpsQuery = query(rsvpsRef, where('eventId', '==', event.id));
          const rsvpsSnapshot = await getDocs(rsvpsQuery);
          const attendeeIds = rsvpsSnapshot.docs.map(doc => doc.data().userId).filter(Boolean);
          
          // Also include host
          if (event.hostId && !attendeeIds.includes(event.hostId)) {
            attendeeIds.push(event.hostId);
          }

          await notifyAttendeesOfNewMessage(
            event.id,
            event.title,
            currentUser.id,
            currentUser.name,
            messageText.slice(0, 100), // Snippet
            attendeeIds
          );
        } catch (error) {
          console.error('Error sending message notifications:', error);
        }
      }
    }).catch((error) => {
      console.error('Error loading notification helpers for new message:', error);
    });
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      // CRITICAL: Only host and attendees can send images
      if (!currentUser || !canSendMessages) {
        console.warn('[GROUP_CHAT] Unauthorized image upload attempt blocked');
        return;
      }
      
      // Additional validation: Ensure user is either host or has reserved
      if (!isHost && !hasReserved) {
        console.warn('[GROUP_CHAT] Unauthorized image upload attempt blocked');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        // Send image as message with data URL (format: [Image:dataUrl:filename])
        // Message will be saved to Firestore and synced in real-time
        addMessage(event.id, currentUser.id, currentUser.name || currentUser.displayName || 'User', `[Image:${imageUrl}:${file.name}]`, 'message', isHost);
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

  // Host management functions
  const handleRemoveUser = async (userId: string) => {
    if (!isHost || !currentUser) return;

    try {
      const db = getDbSafe();
      if (!db) return;

      // Remove RSVP
      const reservationsRef = collection(db, 'reservations');
      const q = query(
        reservationsRef,
        where('userId', '==', userId),
        where('eventId', '==', event.id),
        where('status', '==', 'reserved')
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const reservation = snapshot.docs[0];
        // Process refund
        await processRefundForRemovedUser(userId, event.id);
        // Update reservation status
        await updateDoc(doc(db, 'reservations', reservation.id), {
          status: 'cancelled',
          cancelledBy: 'host',
          cancelledAt: Date.now(),
        });
      }

      // Remove from user's RSVPs
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const rsvps = userData.rsvps || [];
        await updateDoc(userRef, {
          rsvps: rsvps.filter((id: string) => id !== event.id),
        });
      }

      alert('User removed and refund processed');
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user. Please try again.');
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!isHost || !currentUser) return;

    try {
      const db = getDbSafe();
      if (!db) return;

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const bannedEvents = userData.bannedEvents || [];
        
        if (!bannedEvents.includes(event.id)) {
          await updateDoc(userRef, {
            bannedEvents: arrayUnion(event.id),
          });
          alert('User banned from this event');
        } else {
          await updateDoc(userRef, {
            bannedEvents: arrayRemove(event.id),
          });
          alert('User unbanned from this event');
        }
      }
    } catch (error) {
      console.error('Error banning user:', error);
      alert('Failed to ban user. Please try again.');
    }
  };

  const handleExpelUser = (userId: string) => {
    if (!isHost || !currentUser) return;
    
    // Get user name for modal
    const db = getDbSafe();
    if (!db) return;
    
    getDoc(doc(db, 'users', userId))
      .then((userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userName = userData.name || userData.displayName || 'User';
          setUserToExpel({ userId, userName });
          setShowExpelModal(true);
        }
      })
      .catch((error) => {
        console.error('Error fetching user:', error);
        // Still show modal with default name
        setUserToExpel({ userId, userName: 'User' });
        setShowExpelModal(true);
      });
  };

  const handleConfirmExpel = async (reason: string, description: string) => {
    if (!isHost || !currentUser || !userToExpel) return;

    try {
      await expelUserFromEvent(
        event.id,
        userToExpel.userId,
        currentUser.id,
        reason,
        description
      );

      // Process refund if needed
      try {
        await processRefundForRemovedUser(userToExpel.userId, event.id);
      } catch (refundError) {
        console.error('Error processing refund:', refundError);
        // Don't fail expulsion if refund fails
      }

      alert(`${userToExpel.userName} has been expelled from this event.`);
      
      // Close modals and refresh attendee list
      setShowExpelModal(false);
      setUserToExpel(null);
      setShowAttendeeList(false);
      
      // Refresh attendee list by closing and reopening
      setTimeout(() => {
        setShowAttendeeList(true);
      }, 100);
    } catch (error) {
      console.error('Error expelling user:', error);
      alert('Failed to expel user. Please try again.');
    }
  };

  const handleCloseChatEarly = async () => {
    if (!isHost || !confirm('Close chat early? This will prevent new messages.')) return;
    
    try {
      const db = getDbSafe();
      if (db) {
        await updateDoc(doc(db, 'events', event.id), {
          chatClosed: true,
          chatClosedAt: Date.now(),
        });
        setChatLocked(true);
        alert('Chat closed');
      }
    } catch (error) {
      console.error('Error closing chat:', error);
    }
  };

  const handleDownloadChatHistory = () => {
    const chatData = {
      event: event.title,
      date: new Date().toISOString(),
      messages: messages.map(msg => ({
        user: msg.userName,
        message: msg.message,
        timestamp: msg.timestamp,
        type: msg.type,
      })),
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `popera-chat-${event.id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // AI Insights - Only for attendees (not host), positive and encouraging
  const aiInsights = useMemo(() => {
    if (messages.length === 0) {
      return {
        summary: 'The conversation is just getting started! Be the first to say hello and connect with others.',
        highlights: [],
        topAnnouncement: null,
        vibe: 'starting',
      };
    }

    const recentMessages = messages.slice(-20);
    const announcements = recentMessages.filter(m => m.type === 'announcement');
    const participantMessages = recentMessages.filter(m => !m.isHost);
    
    // Positive, encouraging summary
    let summary = '';
    if (recentMessages.length >= 15) {
      summary = `Great energy! The community is buzzing with ${recentMessages.length} recent messages. Keep the momentum going!`;
    } else if (recentMessages.length >= 8) {
      summary = `The conversation is picking up! ${recentMessages.length} people have shared their thoughts. Join in!`;
    } else if (participantMessages.length > 0) {
      summary = `People are connecting! ${participantMessages.length} attendees have joined the conversation.`;
    } else {
      summary = 'The conversation is starting. Share your thoughts and connect with others!';
    }

    // Positive highlights (questions, excitement, engagement)
    const highlights: string[] = [];
    const positiveWords = ['excited', 'love', 'great', 'amazing', 'awesome', 'can\'t wait', 'looking forward', 'thank', 'appreciate'];
    const questionWords = ['?', 'how', 'what', 'when', 'where'];
    
    recentMessages.forEach(msg => {
      const lowerMsg = msg.message.toLowerCase();
      // Find positive engagement
      if (positiveWords.some(word => lowerMsg.includes(word))) {
        const highlight = msg.message.slice(0, 60);
        if (highlight && !highlights.includes(highlight)) {
          highlights.push(highlight + (msg.message.length > 60 ? '...' : ''));
        }
      }
      // Find questions (showing interest)
      if (questionWords.some(word => lowerMsg.includes(word)) && msg.message.includes('?')) {
        const highlight = msg.message.slice(0, 60);
        if (highlight && !highlights.includes(highlight) && highlights.length < 3) {
          highlights.push(highlight + (msg.message.length > 60 ? '...' : ''));
        }
      }
    });

    const topAnnouncement = announcements.length > 0
      ? announcements[announcements.length - 1].message.slice(0, 120)
      : null;

    let vibe = 'active';
    if (recentMessages.length < 5) vibe = 'growing';
    else if (participantMessages.length > recentMessages.length / 2) vibe = 'community-driven';
    else if (recentMessages.length > 15) vibe = 'vibrant';

    return {
      summary,
      highlights: highlights.slice(0, 3),
      topAnnouncement,
      vibe,
    };
  }, [messages]);
  
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
           
           {/* Attendee List Button */}
           <button
             onClick={() => setShowAttendeeList(true)}
             className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all text-gray-300 hover:bg-white/10 group"
           >
             <Users size={18} className="mr-3 text-gray-400 group-hover:text-white" />
             Attendees
           </button>
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
          <>
            {/* Blurred chat preview */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 filter blur-sm pointer-events-none">
              {messages.slice(0, 3).map((msg) => (
                <div key={msg.id} className="bg-white rounded-xl p-4 opacity-50">
                  <p className="text-sm text-gray-600">{msg.message}</p>
                </div>
              ))}
            </div>
            <ChatReservationBlocker 
              onReserve={handleReserve}
              isLoggedIn={isLoggedIn}
            />
          </>
        )}

        {/* New Header - Desktop */}
        <div className="hidden md:block">
          <GroupChatHeader 
            event={event} 
            onClose={onClose} 
            onViewDetails={onViewDetails} 
            isMobile={false}
            isHost={isHost}
            isFollowing={isFollowingHost}
            onFollowToggle={handleFollowToggle}
            followLoading={followLoading}
          />
        </div>
        
        {/* New Header - Mobile */}
        <div className="md:hidden">
          <GroupChatHeader 
            event={event} 
            onClose={onClose} 
            onViewDetails={onViewDetails} 
            isMobile={true}
            isHost={isHost}
            isFollowing={isFollowingHost}
            onFollowToggle={handleFollowToggle}
            followLoading={followLoading}
          />
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
                  onClick={() => setShowCreatePollModal(true)}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-[#e35e25] hover:bg-[#e35e25]/5 transition-colors touch-manipulation active:scale-95"
                >
                  <BarChart2 size={20} className="text-[#15383c]" />
                  <span className="text-xs font-medium text-gray-700">Create Poll</span>
                </button>
                <button
                  onClick={async () => {
                    const title = prompt('Announcement title:');
                    if (!title) return;
                    const message = prompt('Announcement message:');
                    if (!message || !currentUser) return;

                    try {
                      // Create announcement in Firestore
                      const { createAnnouncement } = await import('../../firebase/notifications');
                      await createAnnouncement(event.id, {
                        type: 'announcement',
                        title,
                        message,
                        createdBy: event.hostId,
                      });

                      // Also add to chat
                      await addMessage(event.id, currentUser.id, currentUser.name, `${title}: ${message}`, 'announcement', true);

                      // Notify attendees (non-blocking)
                      import('../../utils/notificationHelpers').then(async ({ notifyAttendeesOfAnnouncement }) => {
                        const { getDocs, collection, query, where } = await import('firebase/firestore');
                        const { getDbSafe } = await import('../../src/lib/firebase');
                        const db = getDbSafe();
                        
                        if (db) {
                          try {
                            const rsvpsRef = collection(db, 'reservations');
                            const rsvpsQuery = query(rsvpsRef, where('eventId', '==', event.id));
                            const rsvpsSnapshot = await getDocs(rsvpsQuery);
                            const attendeeIds = rsvpsSnapshot.docs.map(doc => doc.data().userId).filter(Boolean);
                            if (event.hostId && !attendeeIds.includes(event.hostId)) {
                              attendeeIds.push(event.hostId);
                            }

                            await notifyAttendeesOfAnnouncement(
                              event.id,
                              title,
                              message,
                              event.title,
                              attendeeIds
                            );
                          } catch (error) {
                            console.error('Error notifying attendees of announcement:', error);
                          }
                        }
                      }).catch((error) => {
                        console.error('Error loading notification helpers for announcement:', error);
                      });
                    } catch (error) {
                      console.error('Error creating announcement:', error);
                      alert('Failed to create announcement. Please try again.');
                    }
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-[#e35e25] hover:bg-[#e35e25]/5 transition-colors touch-manipulation active:scale-95"
                >
                  <Megaphone size={20} className="text-[#15383c]" />
                  <span className="text-xs font-medium text-gray-700">Announcement</span>
                </button>
                <button
                  onClick={async () => {
                    const numQuestions = prompt('How many questions? (1-3)', '1');
                    if (!numQuestions || isNaN(parseInt(numQuestions)) || parseInt(numQuestions) < 1 || parseInt(numQuestions) > 3) return;
                    
                    const questions: Array<{ question: string; type: 'short' | 'multiple'; options?: string[] }> = [];
                    
                    for (let i = 0; i < parseInt(numQuestions); i++) {
                      const question = prompt(`Question ${i + 1}:`);
                      if (!question) return;
                      
                      const type = prompt('Type: "short" for short answer, "multiple" for multiple choice', 'short');
                      if (type !== 'short' && type !== 'multiple') return;
                      
                      let options: string[] = [];
                      if (type === 'multiple') {
                        const option1 = prompt('Option 1:');
                        const option2 = prompt('Option 2:');
                        if (!option1 || !option2) return;
                        options = [option1, option2];
                      }
                      
                      questions.push({ question, type: type as 'short' | 'multiple', options });
                    }

                    try {
                      const db = getDbSafe();
                      if (db) {
                        await addDoc(collection(db, 'events', event.id, 'surveys'), {
                          questions,
                          createdBy: event.hostId,
                          createdAt: Date.now(),
                          status: 'active',
                        });
                        alert('Survey created! Attendees can answer after the event.');
                      }
                    } catch (error) {
                      console.error('Error creating survey:', error);
                      alert('Failed to create survey. Please try again.');
                    }
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-[#e35e25] hover:bg-[#e35e25]/5 transition-colors touch-manipulation active:scale-95"
                >
                  <FileText size={20} className="text-[#15383c]" />
                  <span className="text-xs font-medium text-gray-700">Survey</span>
                </button>
                <button
                  onClick={() => {
                    // Show more tools menu
                    const action = prompt('More Tools:\n1. Close Chat Early\n2. Lock New Messages\n3. Mute All\n4. Download Chat History\n\nEnter number (1-4):');
                    if (action === '1') {
                      handleCloseChatEarly();
                    } else if (action === '2') {
                      setChatLocked(!chatLocked);
                      alert(chatLocked ? 'Chat unlocked' : 'Chat locked - new messages disabled');
                    } else if (action === '3') {
                      setMuteAll(!muteAll);
                      alert(muteAll ? 'All notifications unmuted' : 'All notifications muted');
                    } else if (action === '4') {
                      handleDownloadChatHistory();
                    }
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

          {/* AI Insights - Only visible to attendees (not host) */}
          {canAccessChat && !isDemo && !isHost && (
            <>
              <div className="bg-gradient-to-br from-white to-[#f8fafb] rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm max-w-3xl mx-auto w-full">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#e35e25]/10 to-[#e35e25]/5 rounded-full flex items-center justify-center text-[#e35e25] shrink-0">
                    <Sparkles size={20} className="text-[#e35e25]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-heading font-bold text-[#15383c]">AI Insights</h4>
                    <p className="text-xs text-gray-600">What's happening in the conversation</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-[#15383c] leading-relaxed">{aiInsights.summary}</p>
                  {aiInsights.highlights.length > 0 && (
                    <div className="bg-white/60 rounded-lg p-3 border border-gray-100">
                      <p className="font-semibold text-xs text-gray-600 mb-2 uppercase tracking-wide">Recent highlights</p>
                      <ul className="space-y-1.5">
                        {aiInsights.highlights.map((highlight, idx) => (
                          <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                            <span className="text-[#e35e25] mt-1">•</span>
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiInsights.topAnnouncement && (
                    <div className="bg-[#15383c]/5 rounded-lg p-3 border border-[#15383c]/10">
                      <p className="font-semibold text-xs text-[#15383c] mb-1.5 uppercase tracking-wide">Latest announcement</p>
                      <p className="text-xs text-gray-700 leading-relaxed italic">"{aiInsights.topAnnouncement}"</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Community vibe:</span>
                    <span className="text-xs font-semibold text-[#e35e25] capitalize">{aiInsights.vibe}</span>
                  </div>
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

        {canSendMessages && !chatLocked && (
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
        
        {chatLocked && (
          <div className="bg-yellow-50 border-t border-yellow-200 p-4 text-center">
            <p className="text-sm text-yellow-800 flex items-center justify-center gap-2">
              <Lock size={16} />
              Chat is locked. New messages are disabled.
            </p>
          </div>
        )}
      </main>

      {/* Attendee List Modal */}
      <AttendeeList
        eventId={event.id}
        hostId={event.hostId || ''}
        isHost={isHost}
        onRemoveUser={handleRemoveUser}
        onBanUser={handleBanUser}
        onExpelUser={handleExpelUser}
        isOpen={showAttendeeList}
        onClose={() => setShowAttendeeList(false)}
      />

      {/* Expel User Modal */}
      {userToExpel && (
        <ExpelUserModal
          userName={userToExpel.userName}
          isOpen={showExpelModal}
          onClose={() => {
            setShowExpelModal(false);
            setUserToExpel(null);
          }}
          onConfirm={handleConfirmExpel}
        />
      )}

      {/* Create Poll Modal */}
      <CreatePollModal
        isOpen={showCreatePollModal}
        onClose={() => setShowCreatePollModal(false)}
        onCreatePoll={async (question, options) => {
          try {
            // Create poll message in Firestore
            await addMessage(
              event.id,
              currentUser?.id || '',
              currentUser?.name || 'Host',
              `Poll: ${question}`,
              'poll',
              true
            );
            
            // Add poll to store
            addPoll(event.id, question, options);
            
            // Notify attendees of new poll (non-blocking)
            import('../../utils/notificationHelpers').then(async ({ notifyAttendeesOfPoll }) => {
              try {
                const db = getDbSafe();
                if (db) {
                  const reservationsRef = collection(db, 'reservations');
                  const q = query(
                    reservationsRef,
                    where('eventId', '==', event.id),
                    where('status', '==', 'reserved')
                  );
                  const snapshot = await getDocs(q);
                  const attendeeIds = snapshot.docs.map(doc => doc.data().userId).filter(Boolean);
                  
                  if (attendeeIds.length > 0) {
                    await notifyAttendeesOfPoll(
                      event.hostId || '',
                      attendeeIds,
                      event.id,
                      event.title || 'Event',
                      question
                    );
                  }
                }
              } catch (error) {
                console.error('Error notifying attendees of poll:', error);
              }
            }).catch((error) => {
              console.error('Error loading notification helpers for poll:', error);
            });
          } catch (error) {
            console.error('Error creating poll:', error);
            alert('Failed to create poll. Please try again.');
          }
        }}
      />
    </div>
  );
};