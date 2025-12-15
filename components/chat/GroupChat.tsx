console.log("[BOOT] GroupChat.tsx loaded at runtime");
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
import { CreateAnnouncementModal } from './CreateAnnouncementModal';
import { CreateSurveyModal } from './CreateSurveyModal';
import { MoreToolsModal } from './MoreToolsModal';
import { SubscriptionOptOutModal } from '../payments/SubscriptionOptOutModal';
import { isRecurringEvent } from '../../utils/stripeHelpers';
import { POPERA_HOST_ID } from '@/stores/userStore';
import { getDbSafe } from '../../src/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { processRefundForRemovedUser } from '../../utils/refundHelper';
import { expelUserFromEvent } from '../../firebase/db';
import { followHost, unfollowHost, isFollowing } from '../../firebase/follow';
import { subscribeToUserProfile } from '../../firebase/userSubscriptions';
import { useProfileStore } from '../../stores/profileStore';
import { notifyAttendeesOfNewMessage, notifyAttendeesOfPoll, notifyAttendeesOfAnnouncement } from '../../utils/notificationHelpers';

// REFACTORED: Component to fetch sender avatar in real-time from /users/{senderId}
const MessageAvatar: React.FC<{ 
  userId: string; 
  fallbackName: string; 
  isHost: boolean;
  onClick?: () => void;
}> = React.memo(({ userId, fallbackName, isHost, onClick }) => {
  const [photoURL, setPhotoURL] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState<string>(fallbackName);
  
  React.useEffect(() => {
    if (!userId) {
      setPhotoURL(null);
      setDisplayName(fallbackName);
      return;
    }
    
    let unsubscribe: (() => void) | null = null;
    
    try {
      unsubscribe = subscribeToUserProfile(userId, (userData) => {
        if (userData) {
          setPhotoURL(userData.photoURL || null);
          setDisplayName(userData.displayName || fallbackName);
        } else {
          setPhotoURL(null);
          setDisplayName(fallbackName);
        }
      });
    } catch (error) {
      console.error('[MESSAGE_AVATAR] ❌ Error loading user profile:', error);
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId, fallbackName]);
  
  // Get initials for fallback
  const initials = displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  
  return (
    <div 
      className={`w-8 h-8 rounded-full shrink-0 overflow-hidden ${isHost ? 'ring-2 ring-[#e35e25]' : ''} ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-[#15383c]/50 transition-all' : ''}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={onClick ? `View ${displayName}'s profile` : undefined}
    >
      {photoURL ? (
        <img 
          src={photoURL} 
          alt={displayName} 
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center text-white text-xs font-bold ${isHost ? 'bg-[#e35e25]' : 'bg-[#15383c]'}`}>
          {initials}
        </div>
      )}
    </div>
  );
});

MessageAvatar.displayName = 'MessageAvatar';

// REFACTORED: Component to fetch sender info in real-time from /users/{senderId}
// Memoized to prevent unnecessary re-renders when multiple messages from same sender
const MessageSenderName: React.FC<{ 
  userId: string; 
  fallbackName: string; 
  timeString: string; 
  isHost?: boolean;
  onClick?: () => void;
}> = React.memo(({ userId, fallbackName, timeString, isHost, onClick }) => {
  const [senderName, setSenderName] = React.useState<string>(fallbackName);
  
  React.useEffect(() => {
    if (!userId) {
      setSenderName(fallbackName);
      return;
    }
    
    let unsubscribe: (() => void) | null = null;
    
    // Real-time subscription to sender user document
    try {
      unsubscribe = subscribeToUserProfile(userId, (userData) => {
        if (userData) {
          setSenderName(userData.displayName || fallbackName);
        } else {
          setSenderName(fallbackName);
        }
      });
    } catch (error) {
      console.error('[MESSAGE_SENDER] ❌ Error loading user subscriptions:', error);
      setSenderName(fallbackName);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId, fallbackName]);
  
  return (
    <span className="text-[10px] text-gray-400">
      {isHost && <span className="font-bold text-[#e35e25]">Host • </span>}
      <span 
        className={onClick ? "cursor-pointer hover:text-[#15383c] hover:underline transition-colors" : ""}
        onClick={onClick}
      >
        {senderName}
      </span>
      {" • "}{timeString}
    </span>
  );
});

MessageSenderName.displayName = 'MessageSenderName';

interface GroupChatProps {
  event: Event;
  onClose: () => void;
  onViewDetails: () => void;
  onHostClick?: (hostName: string, hostId?: string) => void;
  onReserve?: () => void; // Callback to trigger reservation flow
  isLoggedIn?: boolean;
}

// Compress image to ensure it fits in Firestore (max ~800KB for safety)
const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Scale down if larger than maxWidth
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG for better compression
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // If still too large (> 500KB), reduce quality further
        const maxSize = 500 * 1024; // 500KB
        let currentQuality = quality;
        
        while (compressedDataUrl.length > maxSize && currentQuality > 0.1) {
          currentQuality -= 0.1;
          compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
        }
        
        // If still too large, reduce dimensions
        if (compressedDataUrl.length > maxSize) {
          const smallerCanvas = document.createElement('canvas');
          const scale = 0.5;
          smallerCanvas.width = width * scale;
          smallerCanvas.height = height * scale;
          const smallCtx = smallerCanvas.getContext('2d');
          if (smallCtx) {
            smallCtx.drawImage(img, 0, 0, smallerCanvas.width, smallerCanvas.height);
            compressedDataUrl = smallerCanvas.toDataURL('image/jpeg', 0.6);
          }
        }
        
        console.log('[IMAGE_COMPRESS] Compressed:', {
          originalSize: file.size,
          compressedSize: compressedDataUrl.length,
          reduction: `${((1 - compressedDataUrl.length / file.size) * 100).toFixed(1)}%`,
        });
        
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const GroupChat: React.FC<GroupChatProps> = ({ event, onClose, onViewDetails, onHostClick, onReserve, isLoggedIn = false }) => {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showAttendeeList, setShowAttendeeList] = useState(false);
  const [chatLocked, setChatLocked] = useState(false);
  const [muteAll, setMuteAll] = useState(false);
  const [showExpelModal, setShowExpelModal] = useState(false);
  const [userToExpel, setUserToExpel] = useState<{ userId: string; userName: string } | null>(null);
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [showCreateAnnouncementModal, setShowCreateAnnouncementModal] = useState(false);
  const [showCreateSurveyModal, setShowCreateSurveyModal] = useState(false);
  const [showMoreToolsModal, setShowMoreToolsModal] = useState(false);
  const [showSubscriptionOptOut, setShowSubscriptionOptOut] = useState(false);
  const [userSubscription, setUserSubscription] = useState<{ subscriptionId: string; nextChargeDate?: Date } | null>(null);
  const [isFollowingHost, setIsFollowingHost] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [hasReservedRealTime, setHasReservedRealTime] = useState<boolean | null>(null); // null = not checked yet
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
  // CRITICAL: Host identification - must be accurate for message visibility
  const isHost = currentUser && currentUser.id && event.hostId && currentUser.id === event.hostId;
  // CRITICAL: Check RSVPs from current user - this updates when user reserves
  const hasReserved = currentUser ? currentUser.rsvps.includes(event.id) : false;
  
  // CRITICAL: Real-time RSVP check function - checks Firestore directly
  // Check if user has a subscription for this event
  useEffect(() => {
    const checkSubscription = async () => {
      if (!currentUser?.uid || !event.id || !isRecurringEvent(event)) return;

      try {
        const db = getDbSafe();
        if (!db) return;

        const reservationsRef = collection(db, 'reservations');
        const q = query(
          reservationsRef,
          where('eventId', '==', event.id),
          where('userId', '==', currentUser.uid),
          where('status', '==', 'reserved')
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const reservation = snapshot.docs[0].data();
          if (reservation.subscriptionId && !reservation.optOutProcessed) {
            setUserSubscription({
              subscriptionId: reservation.subscriptionId,
              nextChargeDate: reservation.nextChargeDate ? new Date(reservation.nextChargeDate) : undefined,
            });
          }
        }
      } catch (error) {
        console.error('[GROUP_CHAT] Error checking subscription:', error);
      }
    };

    checkSubscription();
  }, [currentUser?.uid, event.id, event.sessionFrequency]);

  // This ensures we don't miss reservations due to stale cache
  const checkReservationInFirestore = React.useCallback(async (eventId: string, userId: string): Promise<boolean> => {
    if (!userId || !eventId) return false;
    
    try {
      const db = getDbSafe();
      
      if (!db) {
        console.warn('[GROUP_CHAT] Firestore not available for reservation check');
        return false;
      }
      
      const reservationsRef = collection(db, 'reservations');
      const q = query(
        reservationsRef,
        where('eventId', '==', eventId),
        where('userId', '==', userId),
        where('status', '==', 'reserved')
      );
      
      const snapshot = await getDocs(q);
      const hasReservation = !snapshot.empty;
      
      console.log('[GROUP_CHAT] 🔍 Real-time reservation check:', {
        eventId,
        userId,
        hasReservation,
        reservationCount: snapshot.size,
      });
      
      return hasReservation;
    } catch (error) {
      console.error('[GROUP_CHAT] ❌ Error checking reservation in Firestore:', error);
      return false;
    }
  }, []);
  
  // CRITICAL: Check reservation in real-time for attendees (not hosts)
  // This ensures we catch reservations that haven't been synced to the user store yet
  useEffect(() => {
    // Only check for attendees, not hosts or demo events
    if (isHost || isDemo || !currentUser?.id || !event.id) {
      return;
    }
    
    // Check real-time reservation status
    const checkReservation = async () => {
      const hasReservation = await checkReservationInFirestore(event.id, currentUser.id);
      setHasReservedRealTime(hasReservation);
      
      console.log('[GROUP_CHAT] ✅ Real-time reservation status updated:', {
        eventId: event.id,
        userId: currentUser.id,
        hasReservedCached: hasReserved,
        hasReservedRealTime: hasReservation,
      });
    };
    
    checkReservation();
    
    // Re-check periodically to catch late reservations
    const interval = setInterval(checkReservation, 5000);
    return () => clearInterval(interval);
  }, [event.id, currentUser?.id, isHost, isDemo, checkReservationInFirestore, hasReserved]);
  
  // Enhanced hasReserved check - uses both cached and real-time
  const hasReservedEnhanced = useMemo(() => {
    if (isHost) return true; // Host always has access
    if (hasReserved) return true; // Cached RSVP check
    if (hasReservedRealTime === true) return true; // Real-time check
    return false;
  }, [isHost, hasReserved, hasReservedRealTime]);
  
  // Check if user is banned
  const isBanned = useMemo(() => {
    if (!currentUser || !event.id) return false;
    const bannedEvents = (currentUser as any).bannedEvents || [];
    return bannedEvents.includes(event.id);
  }, [currentUser, event.id]);

  // Determine view type
  // Official launch events require reservation for chat access (unlike other Popera events)
  // Demo events are always blocked
  // Regular Popera events are open to all
  // Regular events require reservation
  // CRITICAL: Use enhanced reservation check (cached + real-time)
  const viewType = isDemo 
    ? 'demo' 
    : isHost 
    ? 'host' 
    : isOfficialLaunch 
    ? (hasReservedEnhanced ? 'participant' : 'blocked')
    : (isPoperaOwned || hasReservedEnhanced) 
    ? 'participant' 
    : 'blocked';
  
  const canAccessChat = (viewType === 'host' || viewType === 'participant') && !isBanned;
  const canSendMessages = canAccessChat && !isDemo && !!currentUser && !chatLocked; // Require authentication and not demo
  
  // Debug logging for access control
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[GROUP_CHAT] Access check:', {
        eventId: event.id,
        userId: currentUser?.id,
        isHost,
        hasReserved,
        hasReservedRealTime,
        hasReservedEnhanced,
        isPoperaOwned,
        isDemo,
        viewType,
        canAccessChat,
        rsvps: currentUser?.rsvps,
      });
    }
  }, [event.id, currentUser?.id, isHost, hasReserved, hasReservedRealTime, hasReservedEnhanced, isPoperaOwned, isDemo, viewType, canAccessChat, currentUser?.rsvps]);
  
  // CRITICAL DIAGNOSTIC: Log when messages are retrieved
  const messages = getMessagesForEvent(event.id);
  console.log(`[DIAGNOSTIC] 🟡 GroupChat RENDER - messages retrieved for eventId: ${event.id}`, {
    eventId: event.id,
    messageCount: messages.length,
    isHost,
    userId: currentUser?.id,
    hostId: event.hostId,
    messageIds: messages.map(m => m.id),
    messageDetails: messages.map(m => ({
      id: m.id,
      userId: m.userId,
      isHost: m.isHost,
      text: m.message.substring(0, 30),
    })),
  });
  
  const poll = getPollForEvent(event.id);
  
  // CRITICAL: Enhanced subscription logic with real-time reservation checking and fallback
  // Host should ALWAYS see all messages, attendees see messages when they have access
  useEffect(() => {
    let isMounted = true;
    let verifyInterval: NodeJS.Timeout | null = null;
    
    const setupSubscription = async () => {
      // For hosts - always subscribe (except demo events)
      if (isHost && !isDemo) {
        console.log('[GROUP_CHAT] ✅ Host subscribing to chat:', {
          eventId: event.id,
          userId: currentUser?.id,
          hostId: event.hostId,
        });
        subscribeToEventChat(event.id);
        return;
      }
      
      // For attendees - check access with enhanced reservation check
      // Wait a bit for real-time reservation check to complete if needed
      let hasAccess = canAccessChat;
      
      // If we don't have access yet but real-time check is pending, wait a moment
      if (!hasAccess && hasReservedRealTime === null && !isPoperaOwned) {
        console.log('[GROUP_CHAT] ⏳ Waiting for real-time reservation check...');
        // Give it 2 seconds for real-time check
        await new Promise(resolve => setTimeout(resolve, 2000));
        hasAccess = canAccessChat || hasReservedEnhanced;
      }
      
      const shouldSubscribe = hasAccess && !isDemo && !isBanned;
      
      if (!shouldSubscribe) {
        console.warn('[GROUP_CHAT] ⚠️ Not subscribing to chat:', {
          eventId: event.id,
          canAccessChat,
          hasReserved,
          hasReservedRealTime,
          hasReservedEnhanced,
          isPoperaOwned,
          isDemo,
          isBanned,
          isHost,
          viewType,
          userId: currentUser?.id,
          hostId: event.hostId,
        });
        return;
      }
      
      // Log subscription start with full context
      console.log('[GROUP_CHAT] ✅ Attendee subscribing to chat:', {
        eventId: event.id,
        hasReserved,
        hasReservedRealTime,
        hasReservedEnhanced,
        canAccessChat,
        viewType,
        userId: currentUser?.id,
        hostId: event.hostId,
        path: `events/${event.id}/messages`,
      });
      
      // CRITICAL: Subscribe immediately - this establishes the Firestore listener
      subscribeToEventChat(event.id);
      
      // For attendees: Add periodic verification with fallback subscription
      if (!isHost && isMounted) {
        verifyInterval = setInterval(async () => {
          if (!isMounted) return;
          
          const messages = getMessagesForEvent(event.id);
          const chatStore = useChatStore.getState();
          const firestoreMessages = chatStore.firestoreMessages[event.id] || [];
          const subscriptionActive = !!chatStore.unsubscribeCallbacks[event.id];
          
          // Re-check reservation status periodically
          if (currentUser?.id) {
            const hasReservation = await checkReservationInFirestore(event.id, currentUser.id);
            if (hasReservation && hasReservedRealTime !== hasReservation) {
              setHasReservedRealTime(hasReservation);
              console.log('[GROUP_CHAT] 🔄 Reservation status changed:', {
                eventId: event.id,
                hasReservation,
              });
            }
          }
          
          console.log('[GROUP_CHAT] 🔍 Attendee subscription verification:', {
            eventId: event.id,
            userId: currentUser?.id,
            messageCount: messages.length,
            firestoreMessageCount: firestoreMessages.length,
            subscriptionActive,
            hasReservedEnhanced,
          });
          
          // If subscription appears broken but we should have access, re-subscribe
          if (!subscriptionActive && hasReservedEnhanced && !isDemo && !isBanned) {
            console.warn('[GROUP_CHAT] ⚠️ Subscription lost, re-subscribing');
            subscribeToEventChat(event.id);
          }
          
          // If we have messages but subscription isn't active, something's wrong
          if (messages.length > 0 && !subscriptionActive) {
            console.warn('[GROUP_CHAT] ⚠️ Messages exist but subscription inactive, re-subscribing');
            subscribeToEventChat(event.id);
          }
        }, 5000); // Verify every 5 seconds for attendees
      }
      
      // For hosts: Add periodic verification to catch any subscription issues
      if (isHost && isMounted) {
        verifyInterval = setInterval(() => {
          if (!isMounted) return;
          
          const messages = getMessagesForEvent(event.id);
          const chatStore = useChatStore.getState();
          const firestoreMessages = chatStore.firestoreMessages[event.id] || [];
          
          console.log('[GROUP_CHAT] 🔍 Host subscription verification:', {
            eventId: event.id,
            userId: currentUser?.id,
            hostId: event.hostId,
            messageCount: messages.length,
            firestoreMessageCount: firestoreMessages.length,
            subscriptionActive: !!chatStore.unsubscribeCallbacks[event.id],
          });
          
          // If subscription appears broken, try to re-subscribe
          if (!chatStore.unsubscribeCallbacks[event.id] && messages.length === 0 && firestoreMessages.length === 0) {
            console.warn('[GROUP_CHAT] ⚠️ Host subscription appears broken, attempting re-subscription');
            subscribeToEventChat(event.id);
          }
        }, 3000); // Verify every 3 seconds for hosts
      }
    };
    
    setupSubscription();
    
    // Cleanup: Unsubscribe when component unmounts or dependencies change
    return () => {
      isMounted = false;
      if (verifyInterval) {
        clearInterval(verifyInterval);
      }
      console.log('[GROUP_CHAT] 🧹 Cleaning up subscription for event:', event.id);
      unsubscribeFromEventChat(event.id);
    };
  }, [
    event.id,
    event.hostId,
    canAccessChat,
    isDemo,
    isBanned,
    subscribeToEventChat,
    unsubscribeFromEventChat,
    isHost,
    hasReserved,
    hasReservedRealTime,
    hasReservedEnhanced,
    isPoperaOwned,
    currentUser?.id,
    viewType,
    getMessagesForEvent,
    checkReservationInFirestore,
  ]);
  
  // Debug: Log messages for host (separate effect for reactive logging)
  useEffect(() => {
    if (isHost && import.meta.env.DEV) {
      console.log('[GROUP_CHAT] 🎯 Host message check:', {
        eventId: event.id,
        messageCount: messages.length,
        messages: messages.map(m => ({ id: m.id, userName: m.userName, isHost: m.isHost, text: m.message.substring(0, 50) })),
        canAccessChat,
        viewType,
      });
    }
  }, [messages.length, isHost, event.id, canAccessChat, viewType]);

  // Auto-scroll to bottom when messages load or change
  useEffect(() => {
    if (messagesEndRef.current && canAccessChat && !isDemo && messages.length > 0) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, [messages.length, canAccessChat, isDemo]);

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
        // Update profile store metrics
        useProfileStore.getState().unfollowHost(currentUser.id, event.hostId);
      } else {
        await followHost(currentUser.id, event.hostId);
        setIsFollowingHost(true);
        // Update profile store metrics
        useProfileStore.getState().followHost(currentUser.id, event.hostId);
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
    // CRITICAL: Ensure isHost flag is correctly set when sending messages
    // This ensures host messages are properly identified in the chat
    const messageIsHost = currentUser.id === event.hostId;
    console.log('[GROUP_CHAT] 📤 Sending message:', {
      eventId: event.id,
      userId: currentUser.id,
      userName: currentUser.name,
      isHost: messageIsHost,
      hostId: event.hostId,
      messagePreview: messageText.substring(0, 50),
    });
    // REFACTORED: Only pass senderId - sender info fetched from /users/{senderId}
    await addMessage(event.id, currentUser.id, messageText, 'message', messageIsHost);
    setMessage('');

    // Notify attendees and host of new message (non-blocking, fire-and-forget)
    // IMPORTANT: Host should ALWAYS be notified when attendees send messages
    // All participants (attendees + host) should receive notifications
    (async () => {
      const db = getDbSafe();
      
      if (db && currentUser) {
        try {
          // Get all RSVPs for this event (only reserved status)
          const rsvpsRef = collection(db, 'reservations');
          const rsvpsQuery = query(
            rsvpsRef, 
            where('eventId', '==', event.id),
            where('status', '==', 'reserved')
          );
          const rsvpsSnapshot = await getDocs(rsvpsQuery);
          const attendeeIds = rsvpsSnapshot.docs
            .map(doc => doc.data().userId)
            .filter((userId): userId is string => Boolean(userId) && userId !== currentUser.id);
          
          // CRITICAL: ALWAYS include host in notification recipients
          // Host should receive notifications for ALL messages from attendees
          // If host sent the message, they'll be filtered out in notifyAttendeesOfNewMessage
          const allRecipients = [...new Set([...attendeeIds, event.hostId].filter(Boolean))];

          console.log('[GROUP_CHAT] Sending message notifications:', {
            eventId: event.id,
            senderId: currentUser.id,
            senderName: currentUser.name,
            recipientCount: allRecipients.length,
            recipients: allRecipients,
            includesHost: allRecipients.includes(event.hostId || ''),
          });

          await notifyAttendeesOfNewMessage(
            event.id,
            event.title,
            currentUser.id,
            currentUser.name || currentUser.displayName || 'Someone',
            messageText.slice(0, 100), // Snippet
            allRecipients
          );
          
          console.log('[GROUP_CHAT] ✅ Message notifications sent successfully:', {
            eventId: event.id,
            recipientCount: allRecipients.length,
          });
        } catch (error) {
          console.error('[GROUP_CHAT] ❌ Error sending message notifications:', error);
          // Don't block message sending if notifications fail
        }
      }
    })().catch((error) => {
      console.error('[GROUP_CHAT] Error in notification helper:', error);
    });
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      return;
    }
    
    // CRITICAL: Only host and attendees can send images
    if (!currentUser || !canSendMessages) {
      setImageError('You must be logged in and have access to send images');
      setTimeout(() => setImageError(null), 3000);
      return;
    }
    
    // Additional validation: Ensure user is either host or has reserved
    if (!isHost && !hasReservedEnhanced) {
      setImageError('You must be an attendee to send images');
      setTimeout(() => setImageError(null), 3000);
      return;
    }
    
    // Show loading state
    setImageUploading(true);
    setImageError(null);
    
    try {
      // Compress the image
      console.log('[GROUP_CHAT] 🖼️ Compressing image:', {
        originalName: file.name,
        originalSize: `${(file.size / 1024).toFixed(1)}KB`,
        type: file.type,
      });
      
      const compressedImageUrl = await compressImage(file);
      
      // Show preview briefly
      setImagePreview(compressedImageUrl);
      
      // CRITICAL: Ensure isHost flag is correctly set when sending image messages
      const messageIsHost = currentUser.id === event.hostId;
      console.log('[GROUP_CHAT] 📤 Sending compressed image message:', {
        eventId: event.id,
        userId: currentUser.id,
        userName: currentUser.name,
        isHost: messageIsHost,
        hostId: event.hostId,
        filename: file.name,
        compressedSize: `${(compressedImageUrl.length / 1024).toFixed(1)}KB`,
      });
      
      // Send image as message with compressed data URL
      // Use | as delimiter instead of : to avoid conflict with data URL colons
      await addMessage(event.id, currentUser.id, `[Image|${compressedImageUrl}|${file.name}]`, 'message', messageIsHost);
      
      // Clear preview after sending
      setImagePreview(null);
      
      // Notify attendees and host of new image message
      (async () => {
        const db = getDbSafe();
        
        if (db && currentUser) {
          try {
            const rsvpsRef = collection(db, 'reservations');
            const rsvpsQuery = query(
              rsvpsRef, 
              where('eventId', '==', event.id),
              where('status', '==', 'reserved')
            );
            const rsvpsSnapshot = await getDocs(rsvpsQuery);
            const attendeeIds = rsvpsSnapshot.docs
              .map(doc => doc.data().userId)
              .filter((userId): userId is string => Boolean(userId) && userId !== currentUser.id);
            
            const allRecipients = [...new Set([...attendeeIds, event.hostId].filter(Boolean))];

            await notifyAttendeesOfNewMessage(
              event.id,
              event.title,
              currentUser.id,
              currentUser.name || currentUser.displayName || 'Someone',
              `[Image: ${file.name}]`,
              allRecipients
            );
          } catch (error) {
            console.error('[GROUP_CHAT] Error sending image message notifications:', error);
          }
        }
      })().catch((error) => {
        console.error('[GROUP_CHAT] Error in notification helper for image message:', error);
      });
      
    } catch (error) {
      console.error('[GROUP_CHAT] ❌ Image upload failed:', error);
      setImageError('Failed to send image. Please try again.');
      setTimeout(() => setImageError(null), 3000);
    } finally {
      setImageUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
    if (!isHost) {
      console.error('[GROUP_CHAT] Cannot close chat: user is not the host');
      return;
    }
    
    try {
      const db = getDbSafe();
      if (db) {
        await updateDoc(doc(db, 'events', event.id), {
          chatClosed: true,
          chatClosedAt: Date.now(),
        });
        setChatLocked(true);
        console.log('[GROUP_CHAT] ✅ Chat closed early');
      }
    } catch (error) {
      console.error('[GROUP_CHAT] ❌ Error closing chat:', error);
      throw error; // Re-throw so modal can handle it
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

  // AI Insights - Fetched from OpenAI API for real analysis
  const [aiInsights, setAiInsights] = useState<{
    summary: string;
    highlights: string[];
    topAnnouncement: string | null;
    loading: boolean;
  }>({
    summary: 'Analyzing the conversation...',
    highlights: [],
    topAnnouncement: null,
    loading: true,
  });
  
  // Track last fetch to debounce API calls
  const lastAiFetchRef = useRef<number>(0);
  const aiFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch AI insights when messages change (debounced)
  useEffect(() => {
    // Don't fetch if host (insights only for attendees) or demo
    if (isHost || isDemo || !canAccessChat) return;
    
    // Debounce: wait 3 seconds after last message before fetching
    if (aiFetchTimeoutRef.current) {
      clearTimeout(aiFetchTimeoutRef.current);
    }
    
    // Get top announcement for display
    const announcements = messages.filter(m => m.type === 'announcement');
    const topAnnouncement = announcements.length > 0
      ? announcements[announcements.length - 1].message.replace(/^(Announcement:\s*)/i, '').slice(0, 120)
      : null;
    
    // If no messages, show default
    if (messages.length === 0) {
      setAiInsights({
        summary: 'The conversation is just getting started. Be the first to share your thoughts!',
        highlights: [],
        topAnnouncement,
        loading: false,
      });
      return;
    }
    
    // Set loading state
    setAiInsights(prev => ({ ...prev, loading: true, topAnnouncement }));
    
    aiFetchTimeoutRef.current = setTimeout(async () => {
      try {
        const recentMessages = messages.slice(-30).map(m => ({
          message: m.message,
          userName: m.userName,
          isHost: m.isHost,
          timestamp: m.timestamp,
        }));
        
        const eventContext = {
          title: event.title,
          description: event.description,
          category: event.category,
          date: event.date,
          location: event.location,
        };
        
        const response = await fetch('/api/chat-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: recentMessages, event: eventContext }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setAiInsights({
            summary: data.insight || 'The conversation is active.',
            highlights: data.highlights || [],
            topAnnouncement,
            loading: false,
          });
        } else {
          // Fallback to simple message count
          setAiInsights({
            summary: `${messages.length} messages in this conversation.`,
            highlights: [],
            topAnnouncement,
            loading: false,
          });
        }
      } catch (error) {
        console.error('[AI_INSIGHTS] Error fetching insights:', error);
        // Fallback on error
        setAiInsights({
          summary: `${messages.length} messages in this conversation.`,
          highlights: [],
          topAnnouncement,
          loading: false,
        });
      }
      
      lastAiFetchRef.current = Date.now();
    }, 2000); // 2 second debounce
    
    return () => {
      if (aiFetchTimeoutRef.current) {
        clearTimeout(aiFetchTimeoutRef.current);
      }
    };
  }, [messages.length, isHost, isDemo, canAccessChat, event.title, event.description, event.category, event.date, event.location]);
  
  // Calculate real member count from RSVPs (for Popera events) or use static for demo events
  const memberCount = isPoperaOwned 
    ? (event.attendeesCount || 0) 
    : (isDemo ? 34 : (event.attendeesCount || 0));

  // Menu tabs - Poll, Survey, and Announcement are host-only
  const tabs = useMemo(() => {
    const baseTabs = [
      { name: 'Chat', active: true, icon: MessageCircle },
    ];
    
    // Host-only tabs
    if (isHost) {
      baseTabs.push(
        { name: 'Poll', active: false, icon: BarChart2 },
        { name: 'Survey', active: false, icon: FileText },
        { name: 'Announcement', active: false, icon: Megaphone }
      );
    }
    
    return baseTabs;
  }, [isHost]);

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
               <img src={event.imageUrls?.[0] || `https://picsum.photos/seed/${event.id}/800/600`} alt={event.title} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#15383c]/80 to-transparent"></div>
               <span className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 text-[10px] sm:text-xs font-bold bg-[#e35e25] text-white px-1.5 sm:px-2 py-0.5 rounded-full">
                 {event.category}
               </span>
            </div>
            <h2 className="text-white font-heading font-bold text-base sm:text-lg leading-tight mb-1.5 sm:mb-2">
              {event.title}
            </h2>
            {/* REFACTORED: Host name fetched in real-time via GroupChatHeader */}
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
            onHostClick={onHostClick}
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
            onHostClick={onHostClick}
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
                  onClick={() => setShowCreateAnnouncementModal(true)}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-[#e35e25] hover:bg-[#e35e25]/5 transition-colors touch-manipulation active:scale-95"
                >
                  <Megaphone size={20} className="text-[#15383c]" />
                  <span className="text-xs font-medium text-gray-700">Announcement</span>
                </button>
                <button
                  onClick={() => setShowCreateSurveyModal(true)}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-[#e35e25] hover:bg-[#e35e25]/5 transition-colors touch-manipulation active:scale-95"
                >
                  <FileText size={20} className="text-[#15383c]" />
                  <span className="text-xs font-medium text-gray-700">Survey</span>
                </button>
                <button
                  onClick={() => setShowMoreToolsModal(true)}
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

          {/* AI Insights - Only visible to attendees (not host) - STICKY at top */}
          {canAccessChat && !isDemo && !isHost && (
            <div className="sticky top-0 z-20 bg-gray-50 pb-4">
              <div className="bg-gradient-to-br from-white to-[#f8fafb] rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-md max-w-3xl mx-auto w-full">
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
                  {aiInsights.loading ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="w-4 h-4 border-2 border-[#e35e25]/30 border-t-[#e35e25] rounded-full animate-spin"></div>
                      <span className="text-sm">Analyzing conversation...</span>
                    </div>
                  ) : (
                    <p className="font-medium text-[#15383c] leading-relaxed">{aiInsights.summary}</p>
                  )}
                  {!aiInsights.loading && aiInsights.highlights.length > 0 && (
                    <div className="bg-white/60 rounded-lg p-3 border border-gray-100">
                      <p className="font-semibold text-xs text-gray-600 mb-2 uppercase tracking-wide">Key topics</p>
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
                </div>
              </div>
            </div>
          )}

          {/* Messages - Visible to both hosts and attendees */}
          {canAccessChat && !isDemo && (
            <div className="max-w-3xl mx-auto w-full space-y-6 pb-4">
              {/* Render actual messages from store */}
              {(() => {
                // CRITICAL: Log messages right before rendering
                console.log(`[CHAT FEED] 🎨 Rendering ${messages.length} messages for event ${event.id}:`, {
                  eventId: event.id,
                  isHost,
                  userId: currentUser?.id,
                  hostId: event.hostId,
                  messageCount: messages.length,
                  messages: messages.map(m => ({
                    id: m.id,
                    userId: m.userId,
                    userName: m.userName,
                    isHost: m.isHost,
                    type: m.type,
                    timestamp: m.timestamp,
                    text: m.message.substring(0, 50),
                  })),
                });
                
                return messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const messageDate = new Date(msg.timestamp);
                    const timeString = messageDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    
                    if (msg.type === 'announcement') {
                      // Remove "Announcement:" prefix if message starts with it (since title already says it)
                      const cleanMessage = msg.message.replace(/^(Announcement:\s*)/i, '');
                      return (
                        <div key={msg.id} className="bg-[#15383c] rounded-2xl p-6 text-white shadow-xl shadow-[#15383c]/10 relative overflow-hidden">
                          <div className="relative z-10">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="w-8 h-8 rounded-full bg-[#e35e25] flex items-center justify-center shrink-0">
                                <Megaphone size={16} className="text-white" />
                              </div>
                              <h3 className="font-bold text-sm md:text-base">Announcement</h3>
                            </div>
                            <p className="text-gray-200 text-sm mb-4 leading-relaxed">{cleanMessage}</p>
                            <MessageSenderName 
                              userId={msg.userId} 
                              fallbackName={msg.userName} 
                              timeString={timeString}
                              onClick={() => {
                                if (msg.userId && onHostClick) {
                                  onHostClick(msg.userName, msg.userId);
                                }
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                    
                    // Check if message contains image
                    // New format uses | delimiter: [Image|dataUrl|filename]
                    // Old format used : delimiter: [Image:dataUrl:filename] - but this breaks with data URLs
                    let imageMatch = msg.message.match(/^\[Image\|(.+)\|([^\]|]+)\]$/);
                    if (!imageMatch) {
                      // Backward compatibility: try old format by finding the last colon before ]
                      // This works because filenames typically don't contain colons
                      const oldMatch = msg.message.match(/^\[Image:(.+):([^:\]]+)\]$/);
                      if (oldMatch) {
                        imageMatch = oldMatch;
                      }
                    }
                    
                    return (
                      <div key={msg.id} className="flex items-start gap-3">
                        {/* Profile picture on the left - clickable to view profile */}
                        <MessageAvatar 
                          userId={msg.userId} 
                          fallbackName={msg.userName} 
                          isHost={msg.isHost}
                          onClick={() => {
                            if (msg.userId && onHostClick) {
                              // Navigate to user profile - uses same handler as host click
                              onHostClick(msg.userName, msg.userId);
                            }
                          }}
                        />
                        
                        {/* Message content - no flex-1 to prevent stretching, max-w on parent */}
                        <div className="flex flex-col space-y-1 min-w-0 max-w-[85%]">
                          <div className={`${
                            msg.isHost 
                              ? 'bg-[#e35e25]/10 border-[#e35e25]/30' 
                              : 'bg-white border-gray-100'
                          } text-gray-800 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border w-fit text-sm leading-relaxed`}>
                            {imageMatch ? (
                              <div className="space-y-1">
                                <img 
                                  src={imageMatch[1]} 
                                  alt={imageMatch[2]} 
                                  className="rounded-lg max-w-full h-auto max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(imageMatch[1], '_blank')}
                                  title="Click to view full image"
                                />
                                <p className="text-xs text-gray-500">{imageMatch[2]}</p>
                              </div>
                            ) : (
                              msg.message
                            )}
                          </div>
                          <MessageSenderName 
                            userId={msg.userId} 
                            fallbackName={msg.userName} 
                            timeString={timeString} 
                            isHost={msg.isHost}
                            onClick={() => {
                              if (msg.userId && onHostClick) {
                                onHostClick(msg.userName, msg.userId);
                              }
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                );
              })()}

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
              
              {/* Scroll anchor for auto-scroll to bottom */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {canSendMessages && !chatLocked && (
          <div className="bg-white p-3 sm:p-4 md:p-6 border-t border-gray-100 shrink-0 z-10 safe-area-inset-bottom">
             {/* Image Upload Status */}
             {imageUploading && (
               <div className="max-w-3xl mx-auto mb-3 flex items-center gap-2 text-sm text-gray-600">
                 <div className="w-4 h-4 border-2 border-[#15383c]/30 border-t-[#15383c] rounded-full animate-spin"></div>
                 <span>Compressing and sending image...</span>
               </div>
             )}
             
             {/* Image Preview */}
             {imagePreview && !imageUploading && (
               <div className="max-w-3xl mx-auto mb-3">
                 <div className="relative inline-block">
                   <img 
                     src={imagePreview} 
                     alt="Preview" 
                     className="h-20 rounded-lg border border-gray-200 shadow-sm"
                   />
                   <button
                     onClick={() => setImagePreview(null)}
                     className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                   >
                     ×
                   </button>
                 </div>
               </div>
             )}
             
             {/* Error Message */}
             {imageError && (
               <div className="max-w-3xl mx-auto mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                 {imageError}
               </div>
             )}
             
             <div className="max-w-3xl mx-auto relative flex items-center gap-2">
                {/* Image Upload Button - Only for host and participants */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center transition-colors rounded-full shrink-0 touch-manipulation active:scale-95 ${
                    imageUploading 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-400 hover:text-[#15383c] hover:bg-gray-100'
                  }`}
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
                  disabled={imageUploading}
                  className="flex-1 pl-4 sm:pl-6 pr-12 sm:pr-14 py-3 sm:py-4 bg-gray-50 border border-gray-200 rounded-full text-sm sm:text-base focus:outline-none focus:border-[#15383c] focus:ring-1 focus:ring-[#15383c] focus:bg-white shadow-sm transition-all disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || imageUploading}
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
            // REFACTORED: Only pass senderId - sender info fetched from /users/{senderId}
            await addMessage(
              event.id,
              currentUser?.id || '',
              `Poll: ${question}`,
              'poll',
              true
            );
            
            // Add poll to store
            addPoll(event.id, question, options);
            
            // Notify attendees of new poll (non-blocking)
            (async () => {
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
                      event.id,
                      question,
                      `Poll: ${question}`,
                      event.title || 'Event',
                      attendeeIds
                    );
                  }
                }
              } catch (error) {
                console.error('Error notifying attendees of poll:', error);
              }
            })().catch((error) => {
              console.error('Error in notification helper for poll:', error);
            });
          } catch (error) {
            console.error('Error creating poll:', error);
            alert('Failed to create poll. Please try again.');
          }
        }}
      />

      {/* Create Announcement Modal */}
      <CreateAnnouncementModal
        isOpen={showCreateAnnouncementModal}
        onClose={() => setShowCreateAnnouncementModal(false)}
        onCreateAnnouncement={async (title, message) => {
          if (!currentUser?.id) {
            console.error('[GROUP_CHAT] Cannot create announcement: currentUser is null');
            alert('You must be logged in to create announcements.');
            return;
          }
          
          if (!isHost) {
            console.error('[GROUP_CHAT] Cannot create announcement: user is not the host', {
              userId: currentUser.id,
              hostId: event.hostId,
              isHost,
            });
            alert('Only the host can create announcements.');
            return;
          }
          
          try {
            console.log('[GROUP_CHAT] Creating announcement:', {
              eventId: event.id,
              userId: currentUser.id,
              userName: currentUser.name,
              title,
              message,
            });
            
            // Create announcement message in Firestore
            // REFACTORED: Only pass senderId - sender info fetched from /users/{senderId}
            await addMessage(
              event.id,
              currentUser.id,
              `Announcement: ${title} - ${message}`,
              'announcement',
              true
            );
            
            console.log('[GROUP_CHAT] ✅ Announcement created successfully');
            
            // Notify attendees of new announcement (non-blocking)
            (async () => {
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
                  
                  // Include host in notifications
                  if (event.hostId && !attendeeIds.includes(event.hostId)) {
                    attendeeIds.push(event.hostId);
                  }
                  
                  console.log('[GROUP_CHAT] Notifying attendees of announcement:', {
                    eventId: event.id,
                    attendeeCount: attendeeIds.length,
                  });
                  
                  if (attendeeIds.length > 0) {
                    await notifyAttendeesOfAnnouncement(
                      event.id,
                      title,
                      message,
                      event.title || 'Event',
                      attendeeIds
                    );
                    console.log('[GROUP_CHAT] ✅ Announcement notifications sent');
                  }
                }
              } catch (error) {
                console.error('[GROUP_CHAT] ❌ Error notifying attendees of announcement:', error);
              }
            })().catch((error) => {
              console.error('[GROUP_CHAT] ❌ Error in notification helper for announcement:', error);
            });
          } catch (error) {
            console.error('[GROUP_CHAT] ❌ Error creating announcement:', error);
            alert('Failed to create announcement. Please try again.');
          }
        }}
      />

      {/* Create Survey Modal */}
      <CreateSurveyModal
        isOpen={showCreateSurveyModal}
        onClose={() => setShowCreateSurveyModal(false)}
        onCreateSurvey={async (questions) => {
          if (!currentUser?.id) {
            console.error('[GROUP_CHAT] Cannot create survey: currentUser is null');
            alert('You must be logged in to create surveys.');
            return;
          }
          
          if (!isHost) {
            console.error('[GROUP_CHAT] Cannot create survey: user is not the host', {
              userId: currentUser.id,
              hostId: event.hostId,
              isHost,
            });
            alert('Only the host can create surveys.');
            return;
          }
          
          try {
            console.log('[GROUP_CHAT] Creating survey:', {
              eventId: event.id,
              userId: currentUser.id,
              userName: currentUser.name,
              questionCount: questions.length,
            });
            
            const db = getDbSafe();
            if (!db) {
              throw new Error('Firestore not initialized');
            }
            
            // Save survey to Firestore subcollection
            const surveysRef = collection(db, 'events', event.id, 'surveys');
            const surveyData = {
              questions,
              createdBy: currentUser.id,
              createdByName: currentUser.name || currentUser.displayName || 'Host',
              createdAt: Date.now(),
              status: 'active',
            };
            
            await addDoc(surveysRef, surveyData);
            
            // Also create a message in the chat to notify attendees
            const surveyText = `📋 Survey Created: ${questions.length} question(s)\n${questions.map((q, i) => `${i + 1}. ${q.question}${q.type === 'multiple' ? ` (Options: ${q.options?.join(', ')})` : ''}`).join('\n')}`;
            
            // REFACTORED: Only pass senderId - sender info fetched from /users/{senderId}
            await addMessage(
              event.id,
              currentUser.id,
              surveyText,
              'system',
              true
            );
            
            console.log('[GROUP_CHAT] ✅ Survey created successfully');
            alert(`Survey created with ${questions.length} question(s)!`);
          } catch (error) {
            console.error('[GROUP_CHAT] ❌ Error creating survey:', error);
            alert('Failed to create survey. Please try again.');
          }
        }}
      />

      {/* More Tools Modal */}
      <MoreToolsModal
        isOpen={showMoreToolsModal}
        onClose={() => setShowMoreToolsModal(false)}
        onCloseChatEarly={async () => {
          try {
            await handleCloseChatEarly();
            // Success message is shown by the modal's confirm dialog
          } catch (error) {
            alert('Failed to close chat. Please try again.');
          }
        }}
        onToggleLockMessages={() => {
          setChatLocked(!chatLocked);
          alert(chatLocked ? 'Chat unlocked - new messages enabled' : 'Chat locked - new messages disabled');
        }}
        onToggleMuteAll={() => {
          setMuteAll(!muteAll);
          alert(muteAll ? 'All notifications unmuted' : 'All notifications muted');
        }}
        onDownloadHistory={handleDownloadChatHistory}
        onManageSubscription={() => setShowSubscriptionOptOut(true)}
        hasSubscription={!!userSubscription}
        chatLocked={chatLocked}
        muteAll={muteAll}
      />

      {/* Subscription Opt-Out Modal */}
      {userSubscription && (
        <SubscriptionOptOutModal
          isOpen={showSubscriptionOptOut}
          onClose={() => setShowSubscriptionOptOut(false)}
          onConfirm={async () => {
            try {
              // Cancel subscription via API
              const response = await fetch('/api/stripe/cancel-subscription', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  subscriptionId: userSubscription.subscriptionId,
                }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to cancel subscription');
              }

              // Update reservation in Firestore
              const db = getDbSafe();
              if (db && currentUser?.uid) {
                const reservationsRef = collection(db, 'reservations');
                const q = query(
                  reservationsRef,
                  where('eventId', '==', event.id),
                  where('userId', '==', currentUser.uid),
                  where('status', '==', 'reserved')
                );
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty) {
                  const reservationDoc = snapshot.docs[0];
                  await updateDoc(doc(db, 'reservations', reservationDoc.id), {
                    optOutRequested: true,
                    optOutProcessed: true,
                  });
                }
              }

              setUserSubscription(null);
            } catch (error: any) {
              console.error('Error cancelling subscription:', error);
              throw error;
            }
          }}
          eventTitle={event.title}
          nextChargeDate={userSubscription.nextChargeDate}
        />
      )}
    </div>
  );
};