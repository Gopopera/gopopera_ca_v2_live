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
  const iconClass = "text-[#e35e25]/80";
  const iconSize = 17;
  
  switch (type) {
    case 'new-event':
    case 'followed-host-event':
      return <Calendar size={iconSize} className={iconClass} strokeWidth={1.75} />;
    case 'new-message':
      return <MessageCircle size={iconSize} className={iconClass} strokeWidth={1.75} />;
    case 'announcement':
      return <Megaphone size={iconSize} className={iconClass} strokeWidth={1.75} />;
    case 'poll':
      return <BarChart2 size={iconSize} className={iconClass} strokeWidth={1.75} />;
    case 'new-rsvp':
      return <Users size={iconSize} className={iconClass} strokeWidth={1.75} />;
    default:
      return <Bell size={iconSize} className={iconClass} strokeWidth={1.75} />;
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
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-4" 
      onClick={onClose}
      style={{
        background: 'linear-gradient(135deg, rgba(21, 56, 60, 0.4) 0%, rgba(0, 0, 0, 0.5) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Liquid Glass Container */}
      <div 
        className="relative max-w-2xl w-full max-h-[90vh] flex flex-col animate-fade-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.75) 50%, rgba(248, 250, 252, 0.8) 100%)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderRadius: '28px',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: `
            0 8px 32px rgba(21, 56, 60, 0.12),
            0 2px 8px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            inset 0 -1px 0 rgba(255, 255, 255, 0.3)
          `,
        }}
      >
        {/* Subtle gradient overlay for liquid effect */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-[28px]"
          style={{
            background: 'radial-gradient(ellipse at top left, rgba(227, 94, 37, 0.03) 0%, transparent 50%)',
          }}
        />

        {/* Header */}
        <div className="relative flex items-center justify-between p-5 sm:p-6 border-b border-white/40">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(227, 94, 37, 0.15) 0%, rgba(227, 94, 37, 0.08) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.5)',
              }}
            >
              <Bell size={18} className="text-[#e35e25]" />
            </div>
            <h2 className="text-lg sm:text-xl font-medium tracking-tight text-[#15383c]/90">Notifications</h2>
            {unreadCount > 0 && (
              <span 
                className="px-2.5 py-1 text-white text-[11px] font-semibold rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #e35e25 0%, #d14d1a 100%)',
                  boxShadow: '0 2px 8px rgba(227, 94, 37, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAllRead}
                className="text-xs font-medium text-[#15383c]/60 hover:text-[#e35e25] transition-all duration-300 disabled:opacity-40"
              >
                {markingAllRead ? 'Marking...' : 'Mark all read'}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#15383c]/40 hover:text-[#15383c]/70 hover:bg-white/50 transition-all duration-300"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="relative flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-16">
              <div 
                className="w-10 h-10 rounded-full mx-auto mb-4 animate-spin"
                style={{
                  background: 'conic-gradient(from 0deg, transparent, rgba(227, 94, 37, 0.6))',
                  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                }}
              />
              <p className="text-[#15383c]/50 text-sm font-light">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background: 'linear-gradient(145deg, rgba(227, 94, 37, 0.08) 0%, rgba(227, 94, 37, 0.04) 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                }}
              >
                <Bell size={28} className="text-[#e35e25]/60" />
              </div>
              <p className="text-[#15383c]/50 text-sm font-light">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full text-left group transition-all duration-300"
                  style={{
                    background: notification.read 
                      ? 'rgba(255, 255, 255, 0.4)'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.5) 100%)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    border: notification.read 
                      ? '1px solid rgba(255, 255, 255, 0.3)'
                      : '1px solid rgba(227, 94, 37, 0.2)',
                    boxShadow: notification.read
                      ? '0 2px 8px rgba(0, 0, 0, 0.04)'
                      : '0 4px 16px rgba(227, 94, 37, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                    padding: '14px 16px',
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon container */}
                    <div 
                      className="mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: notification.read
                          ? 'rgba(21, 56, 60, 0.06)'
                          : 'linear-gradient(135deg, rgba(227, 94, 37, 0.12) 0%, rgba(227, 94, 37, 0.06) 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-medium text-sm leading-snug transition-colors duration-300 ${
                          notification.read ? 'text-[#15383c]/60' : 'text-[#15383c]/90 group-hover:text-[#15383c]'
                        }`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div 
                            className="w-2 h-2 rounded-full shrink-0 mt-1.5 animate-pulse"
                            style={{
                              background: 'linear-gradient(135deg, #e35e25 0%, #ff7a45 100%)',
                              boxShadow: '0 0 8px rgba(227, 94, 37, 0.5)',
                            }}
                          />
                        )}
                      </div>
                      <p className={`text-sm mt-1 leading-relaxed ${
                        notification.read ? 'text-[#15383c]/40' : 'text-[#15383c]/60'
                      }`}>
                        {notification.body}
                      </p>
                      <p className="text-[10px] text-[#15383c]/35 mt-2 font-light tracking-wide uppercase">
                        {new Date(notification.timestamp).toLocaleDateString()} · {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

