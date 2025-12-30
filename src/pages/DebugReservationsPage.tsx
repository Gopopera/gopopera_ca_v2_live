import React, { useEffect, useState } from 'react';
import { ChevronLeft, Users, Calendar, MapPin, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { getDbSafe } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

interface Reservation {
  id: string;
  eventId: string;
  userId: string;
  status: string;
  attendeeCount: number;
  reservedAt: number;
  cancelledAt?: number;
  userEmail?: string;
  userName?: string;
}

interface EventWithReservations {
  id: string;
  title: string;
  city: string;
  date: string;
  reservations: Reservation[];
  activeCount: number;
  cancelledCount: number;
}

export const DebugReservationsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const currentUser = useUserStore((state) => state.user);
  const [events, setEvents] = useState<EventWithReservations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchReservations = async () => {
    if (!currentUser?.uid) {
      setError('You must be logged in to view this page');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const db = getDbSafe();
      if (!db) {
        setError('Firestore not initialized');
        setIsLoading(false);
        return;
      }

      // Step 1: Get all events for this host
      const eventsCol = collection(db, 'events');
      const eventsQuery = query(eventsCol, where('hostId', '==', currentUser.uid));
      const eventsSnapshot = await getDocs(eventsQuery);

      console.log('[DEBUG_RESERVATIONS] Found events for host:', {
        hostId: currentUser.uid,
        eventCount: eventsSnapshot.docs.length
      });

      if (eventsSnapshot.empty) {
        setEvents([]);
        setIsLoading(false);
        setLastRefresh(new Date());
        return;
      }

      // Step 2: For each event, get all reservations
      const eventsWithReservations: EventWithReservations[] = [];

      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();
        const eventId = eventDoc.id;

        // Get all reservations for this event (including cancelled)
        const reservationsCol = collection(db, 'reservations');
        const reservationsQuery = query(reservationsCol, where('eventId', '==', eventId));
        const reservationsSnapshot = await getDocs(reservationsQuery);

        const reservations: Reservation[] = [];
        let activeCount = 0;
        let cancelledCount = 0;

        for (const resDoc of reservationsSnapshot.docs) {
          const resData = resDoc.data();
          
          // Try to get user info
          let userEmail = 'Unknown';
          let userName = 'Unknown User';
          
          try {
            const userDoc = await getDoc(doc(db, 'users', resData.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userEmail = userData.email || 'No email';
              userName = userData.displayName || userData.name || 'Unknown';
            }
          } catch (e) {
            console.warn('[DEBUG_RESERVATIONS] Could not fetch user:', resData.userId);
          }

          const attendeeCount = resData.attendeeCount || 1;
          const isActive = resData.status === 'reserved';

          if (isActive) {
            activeCount += attendeeCount;
          } else {
            cancelledCount += attendeeCount;
          }

          reservations.push({
            id: resDoc.id,
            eventId,
            userId: resData.userId,
            status: resData.status || 'unknown',
            attendeeCount,
            reservedAt: resData.reservedAt || resData.createdAt || 0,
            cancelledAt: resData.cancelledAt,
            userEmail,
            userName
          });
        }

        // Sort reservations: active first, then by date
        reservations.sort((a, b) => {
          if (a.status === 'reserved' && b.status !== 'reserved') return -1;
          if (a.status !== 'reserved' && b.status === 'reserved') return 1;
          return (b.reservedAt || 0) - (a.reservedAt || 0);
        });

        eventsWithReservations.push({
          id: eventId,
          title: eventData.title || 'Untitled Event',
          city: eventData.city || 'Unknown City',
          date: eventData.date || 'No Date',
          reservations,
          activeCount,
          cancelledCount
        });

        console.log('[DEBUG_RESERVATIONS] Event reservations:', {
          eventId,
          title: eventData.title,
          totalReservations: reservations.length,
          activeCount,
          cancelledCount
        });
      }

      // Sort events by date
      eventsWithReservations.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      });

      setEvents(eventsWithReservations);
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error('[DEBUG_RESERVATIONS] Error:', err);
      setError(err.message || 'Failed to fetch reservations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [currentUser?.uid]);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reserved':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'reserved':
        return <CheckCircle size={14} className="text-green-600" />;
      case 'cancelled':
        return <XCircle size={14} className="text-red-600" />;
      default:
        return <Clock size={14} className="text-gray-600" />;
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">Please log in to view your reservations.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow hover:bg-gray-50"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Reservations Diagnostic</h1>
            <p className="text-sm text-gray-500">
              Logged in as: {currentUser.email}
            </p>
          </div>
          <button
            onClick={fetchReservations}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#e35e25] text-white rounded-lg hover:bg-[#c94d1a] disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Last refresh time */}
        {lastRefresh && (
          <p className="text-xs text-gray-400 mb-4">
            Last refreshed: {lastRefresh.toLocaleTimeString()}
          </p>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#e35e25] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reservations...</p>
          </div>
        )}

        {/* No events */}
        {!isLoading && !error && events.length === 0 && (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <Users size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No events found for your account.</p>
            <p className="text-sm text-gray-400 mt-2">
              Host ID: {currentUser.uid}
            </p>
          </div>
        )}

        {/* Events with reservations */}
        {!isLoading && events.map((event) => (
          <div key={event.id} className="bg-white rounded-xl shadow mb-6 overflow-hidden">
            {/* Event header */}
            <div className="bg-[#15383c] text-white p-4">
              <h2 className="text-lg font-bold">{event.title}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-300">
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {event.city}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {event.date}
                </span>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{event.activeCount}</p>
                <p className="text-xs text-gray-500">Active Attendees</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{event.cancelledCount}</p>
                <p className="text-xs text-gray-500">Cancelled</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{event.reservations.length}</p>
                <p className="text-xs text-gray-500">Total Reservations</p>
              </div>
            </div>

            {/* Reservations list */}
            {event.reservations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No reservations yet
              </div>
            ) : (
              <div className="divide-y">
                {event.reservations.map((res) => (
                  <div key={res.id} className="p-4 flex items-center gap-4">
                    {/* Status icon */}
                    <div className="shrink-0">
                      {getStatusIcon(res.status)}
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {res.userName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {res.userEmail}
                      </p>
                    </div>

                    {/* Attendee count */}
                    <div className="text-center shrink-0">
                      <p className="font-bold text-gray-900">{res.attendeeCount}</p>
                      <p className="text-xs text-gray-500">seat{res.attendeeCount !== 1 ? 's' : ''}</p>
                    </div>

                    {/* Status badge */}
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(res.status)}`}>
                      {res.status}
                    </div>

                    {/* Dates */}
                    <div className="text-right text-xs text-gray-400 shrink-0 hidden sm:block">
                      <p>Reserved: {formatDate(res.reservedAt)}</p>
                      {res.cancelledAt && (
                        <p className="text-red-400">Cancelled: {formatDate(res.cancelledAt)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Event ID footer */}
            <div className="px-4 py-2 bg-gray-50 border-t">
              <p className="text-xs text-gray-400 font-mono">
                Event ID: {event.id}
              </p>
            </div>
          </div>
        ))}

        {/* Debug info */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-bold text-gray-700 mb-2">Debug Info</h3>
          <div className="text-xs text-gray-500 font-mono space-y-1">
            <p>User ID (hostId): {currentUser.uid}</p>
            <p>Email: {currentUser.email}</p>
            <p>Total Events: {events.length}</p>
            <p>Total Active Attendees: {events.reduce((sum, e) => sum + e.activeCount, 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

