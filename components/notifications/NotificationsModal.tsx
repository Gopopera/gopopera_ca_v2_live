import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCircle2, Calendar, MessageCircle, Users, Megaphone, BarChart2 } from 'lucide-react';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../firebase/notifications';
import { useUserStore } from '../../stores/userStore';
import type { FirestoreNotification } from '../../firebase/types';
import { ViewState } from '../../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: ViewState, eventId?: string) => void;
}

const getNotificationIcon = (type: FirestoreNotification['type']) => {
  switch (type) {
    case 'new-event':
    case 'followed-host-event':
      return <Calendar size={20} className="text-[#e35e25]" />;
    case 'new-message':
      return <MessageCircle size={20} className="text-[#e35e25]" />;
    case 'announcement':
      return <Megaphone size={20} className="text-[#e35e25]" />;
    case 'poll':
      return <BarChart2 size={20} className="text-[#e35e25]" />;
    case 'new-rsvp':
      return <Users size={20} className="text-[#e35e25]" />;
    default:
      return <Bell size={20} className="text-[#e35e25]" />;
  }
};

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const user = useUserStore((state) => state.user);
  const [notifications, setNotifications] = useState<FirestoreNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    if (!isOpen || !user?.uid) {
      if (isOpen) {
        console.log('[NOTIFICATIONS_MODAL] ⚠️ Modal opened but no user:', { isOpen, userId: user?.uid });
      }
      return;
    }
    
    console.log('[NOTIFICATIONS_MODAL] 🚀 Modal opened, setting up notifications:', {
      userId: user.uid,
      path: `users/${user.uid}/notifications`,
    });
    
    // Load initial notifications
    loadNotifications();
    
    // Subscribe to real-time notification updates
    let unsubscribe: (() => void) | null = null;
    
    const setupRealtimeSubscription = async () => {
      try {
        const { getDbSafe } = await import('../../src/lib/firebase');
        const { collection, query, orderBy, limit, onSnapshot } = await import('firebase/firestore');
        
        const db = getDbSafe();
        if (!db) {
          console.warn('[NOTIFICATIONS_MODAL] ⚠️ Firestore not available for real-time subscription');
          return;
        }
        
        const path = `users/${user.uid}/notifications`;
        console.log('[NOTIFICATIONS_MODAL] 📡 Setting up real-time subscription:', { path });
        
        const notificationsRef = collection(db, 'users', user.uid, 'notifications');
        
        // Try with timestamp ordering first, fallback to limit-only if index missing
        let q;
        try {
          q = query(notificationsRef, orderBy('timestamp', 'desc'), limit(50));
        } catch (err) {
          console.warn('[NOTIFICATIONS_MODAL] ⚠️ Falling back to unordered query');
          q = query(notificationsRef, limit(50));
        }
        
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            console.log('[NOTIFICATIONS_MODAL] 📊 Real-time update received:', {
              userId: user.uid,
              path,
              count: snapshot.size,
              docIds: snapshot.docs.map(d => d.id).slice(0, 5),
            });
            
            const notifs = snapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                // Use multiple fallbacks for timestamp
                timestamp: data.timestamp?.toMillis?.() || data.timestampMs || data.timestamp || data.createdAt || Date.now(),
              };
            }) as FirestoreNotification[];
            
            // Sort client-side to ensure proper ordering
            notifs.sort((a, b) => b.timestamp - a.timestamp);
            
            setNotifications(notifs);
            setLoading(false);
          },
          (error: any) => {
            console.error('[NOTIFICATIONS_MODAL] ❌ Error in notification subscription:', {
              userId: user.uid,
              path,
              error: error?.message || error,
              code: error?.code,
            });
            // Fallback to manual load
            loadNotifications();
          }
        );
      } catch (error: any) {
        console.error('[NOTIFICATIONS_MODAL] ❌ Error setting up real-time subscription:', {
          userId: user.uid,
          error: error?.message || error,
        });
        // Fallback to manual load
        loadNotifications();
      }
    };
    
    setupRealtimeSubscription();
    
    return () => {
      if (unsubscribe) {
        console.log('[NOTIFICATIONS_MODAL] 🧹 Cleaning up subscription for user:', user.uid);
        unsubscribe();
      }
    };
  }, [isOpen, user?.uid]);

  const loadNotifications = async () => {
    if (!user?.uid) {
      console.log('[NOTIFICATIONS_MODAL] ⚠️ No user ID, skipping load');
      return;
    }

    console.log('[NOTIFICATIONS_MODAL] 📖 Loading notifications for user:', user.uid);
    setLoading(true);
    try {
      const notifs = await getUserNotifications(user.uid);
      console.log('[NOTIFICATIONS_MODAL] ✅ Notifications loaded:', {
        userId: user.uid,
        count: notifs.length,
        notifications: notifs.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          read: n.read,
          timestamp: new Date(n.timestamp).toISOString(),
        })),
      });
      setNotifications(notifs);
    } catch (error) {
      console.error('[NOTIFICATIONS_MODAL] ❌ Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: FirestoreNotification) => {
    // Mark as read
    if (!notification.read && user?.uid) {
      try {
        await markNotificationAsRead(user.uid, notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate if eventId is present
    if (notification.eventId && onNavigate) {
      onNavigate(ViewState.DETAIL, notification.eventId);
      onClose();
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.uid) return;

    setMarkingAllRead(true);
    try {
      await markAllNotificationsAsRead(user.uid);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 max-w-2xl w-full max-h-[90vh] flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100/80">
          <div className="flex items-center gap-3">
            <Bell size={22} className="text-[#e35e25]" />
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#15383c]">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-[#e35e25] text-white text-xs font-bold rounded-full shadow-sm shadow-[#e35e25]/30">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAllRead}
                className="text-sm text-[#15383c] hover:text-[#e35e25] transition-colors disabled:opacity-50"
              >
                {markingAllRead ? 'Marking...' : 'Mark all read'}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-[#15383c] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell size={48} className="text-[#e35e25] mx-auto mb-4" />
              <p className="text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left p-4 rounded-xl transition-colors ${
                    notification.read
                      ? 'bg-gray-50 hover:bg-gray-100'
                      : 'bg-[#eef4f5] hover:bg-[#e35e25]/5 border-l-4 border-[#e35e25]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-bold text-sm ${notification.read ? 'text-gray-600' : 'text-[#15383c]'}`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-[#e35e25] rounded-full shrink-0 mt-1.5"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.timestamp).toLocaleDateString()} at{' '}
                        {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

