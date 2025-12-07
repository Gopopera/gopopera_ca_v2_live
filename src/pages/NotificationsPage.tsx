import React, { useState, useEffect } from 'react';
import { ViewState } from '../../types';
import { Bell, Calendar, MessageCircle, Users, Megaphone, BarChart2, ChevronLeft, CheckCircle2, X, Filter } from 'lucide-react';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../firebase/notifications';
import { useUserStore } from '../../stores/userStore';
import type { FirestoreNotification } from '../../firebase/types';

interface NotificationsPageProps {
  setViewState: (view: ViewState) => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new-event':
    case 'followed-host-event':
      return <Calendar size={20} className="text-[#e35e25]" />;
    case 'new-rsvp':
      return <Users size={20} className="text-[#e35e25]" />;
    case 'announcement':
      return <Megaphone size={20} className="text-[#e35e25]" />;
    case 'poll':
      return <BarChart2 size={20} className="text-[#e35e25]" />;
    case 'new-message':
      return <MessageCircle size={20} className="text-[#e35e25]" />;
    default:
      return <Bell size={20} className="text-[#e35e25]" />;
  }
};

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ setViewState }) => {
  const user = useUserStore((state) => state.user);
  const [notifications, setNotifications] = useState<FirestoreNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    loadNotifications();

    // Subscribe to real-time updates
    let unsubscribe: (() => void) | null = null;

    const setupRealtimeSubscription = async () => {
      try {
        const { getDbSafe } = await import('../lib/firebase');
        const { collection, query, orderBy, limit, onSnapshot } = await import('firebase/firestore');

        const db = getDbSafe();
        if (!db) {
          loadNotifications();
          return;
        }

        const notificationsRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notificationsRef, orderBy('timestamp', 'desc'), limit(100));

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const notifs = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toMillis?.() || doc.data().timestamp || Date.now(),
            })) as FirestoreNotification[];
            setNotifications(notifs);
            setLoading(false);
          },
          (error) => {
            console.error('Error in notification subscription:', error);
            loadNotifications();
          }
        );
      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
        loadNotifications();
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  const loadNotifications = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const notifs = await getUserNotifications(user.uid, 100);
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.uid) return;

    try {
      await markNotificationAsRead(user.uid, notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.uid) return;

    setMarkingAllRead(true);
    try {
      await markAllNotificationsAsRead(user.uid);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationClick = (notification: FirestoreNotification) => {
    // Mark as read
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.eventId) {
      // Would need to pass event to detail view - for now just go to feed
      setViewState(ViewState.FEED);
    } else if (notification.hostId) {
      // Navigate to host profile
      setViewState(ViewState.FEED);
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-20 font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center">
            <button
              onClick={() => setViewState(ViewState.FEED)}
              className="mr-3 sm:mr-4 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors active:scale-95 touch-manipulation shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c]">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-500 mt-1">{unreadCount} unread</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAllRead}
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-[#15383c] hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm touch-manipulation active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              Mark all read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all touch-manipulation active:scale-95 ${
              filter === 'all'
                ? 'bg-[#e35e25] text-white shadow-md shadow-orange-900/20'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all touch-manipulation active:scale-95 flex items-center gap-2 ${
              filter === 'unread'
                ? 'bg-[#e35e25] text-white shadow-md shadow-orange-900/20'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Filter size={14} />
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-[#e35e25]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell size={40} className="text-[#e35e25]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#15383c] mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-gray-500 text-sm sm:text-base">
                {filter === 'unread'
                  ? 'All caught up! You have no unread notifications.'
                  : 'You\'ll see notifications about events, messages, and updates here.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-white rounded-xl sm:rounded-2xl border transition-all cursor-pointer touch-manipulation active:scale-95 ${
                  notification.read
                    ? 'border-gray-100 shadow-sm hover:shadow-md'
                    : 'border-[#e35e25]/30 shadow-md hover:shadow-lg bg-[#e35e25]/5'
                }`}
              >
                <div className="p-4 sm:p-5 flex gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    notification.read ? 'bg-gray-100' : 'bg-[#e35e25]/10'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`font-bold text-base sm:text-lg ${
                        notification.read ? 'text-[#15383c]' : 'text-[#15383c]'
                      }`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-[#e35e25] rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {notification.body}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(notification.timestamp)}
                      </span>
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className="text-xs text-[#e35e25] hover:text-[#cf4d1d] font-medium transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};