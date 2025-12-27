import React, { useState, useEffect, useMemo } from 'react';
import { Search, CheckCircle2, Clock, XCircle, Loader2, Users } from 'lucide-react';
import { listReservationsForEvent, updateReservationCheckIn, getUserProfile } from '../../../firebase/db';
import { FirestoreReservation } from '../../../firebase/types';

interface AttendeeListProps {
  eventId: string;
  hostUid: string;
}

interface AttendeeData {
  reservationId: string;
  reservation: FirestoreReservation;
  displayName: string;
  email?: string;
  photoURL?: string;
}

export const AttendeeList: React.FC<AttendeeListProps> = ({ eventId, hostUid }) => {
  const [attendees, setAttendees] = useState<AttendeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  // Load attendees
  useEffect(() => {
    let cancelled = false;

    const loadAttendees = async () => {
      setLoading(true);
      try {
        const reservations = await listReservationsForEvent(eventId);
        
        // Fetch user profiles for each reservation
        const attendeeData: AttendeeData[] = await Promise.all(
          reservations.map(async (res) => {
            let displayName = 'Unknown';
            let email: string | undefined;
            let photoURL: string | undefined;

            try {
              const profile = await getUserProfile(res.userId);
              if (profile) {
                displayName = profile.displayName || profile.name || 'Unknown';
                email = profile.email;
                photoURL = profile.photoURL || profile.imageUrl;
              }
            } catch {
              // Ignore profile fetch errors
            }

            return {
              reservationId: res.id,
              reservation: res,
              displayName,
              email,
              photoURL,
            };
          })
        );

        if (!cancelled) {
          setAttendees(attendeeData);
        }
      } catch (err) {
        console.error('Error loading attendees:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAttendees();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // Filter and sort attendees
  const filteredAttendees = useMemo(() => {
    let filtered = attendees;

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.displayName.toLowerCase().includes(query) ||
          (a.email && a.email.toLowerCase().includes(query))
      );
    }

    // Sort: unchecked first, then by reservation date
    return filtered.sort((a, b) => {
      // Cancelled at the end
      if (a.reservation.status === 'cancelled' && b.reservation.status !== 'cancelled') return 1;
      if (b.reservation.status === 'cancelled' && a.reservation.status !== 'cancelled') return -1;
      
      // Unchecked before checked
      const aChecked = !!a.reservation.checkedInAt;
      const bChecked = !!b.reservation.checkedInAt;
      if (aChecked !== bChecked) return aChecked ? 1 : -1;

      // Then by reservation date (newest first)
      return (b.reservation.reservedAt || 0) - (a.reservation.reservedAt || 0);
    });
  }, [attendees, searchQuery]);

  // Handle check-in
  const handleCheckIn = async (reservationId: string) => {
    if (checkingIn) return;

    setCheckingIn(reservationId);
    try {
      await updateReservationCheckIn(reservationId, hostUid);
      
      // Update local state
      setAttendees((prev) =>
        prev.map((a) =>
          a.reservationId === reservationId
            ? {
                ...a,
                reservation: {
                  ...a.reservation,
                  checkedInAt: Date.now(),
                  checkedInBy: hostUid,
                },
              }
            : a
        )
      );
    } catch (err) {
      console.error('Error checking in attendee:', err);
      alert('Failed to check in attendee. Please try again.');
    } finally {
      setCheckingIn(null);
    }
  };

  // Stats
  const totalReserved = attendees.filter((a) => a.reservation.status === 'reserved').length;
  const checkedInCount = attendees.filter((a) => a.reservation.checkedInAt).length;
  const cancelledCount = attendees.filter((a) => a.reservation.status === 'cancelled').length;

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
          <span className="ml-3 text-white/70">Loading attendees...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users size={20} />
            Attendees
          </h3>
          <div className="flex gap-3 text-sm">
            <span className="text-green-400">{checkedInCount} checked in</span>
            <span className="text-white/50">/ {totalReserved} reserved</span>
            {cancelledCount > 0 && (
              <span className="text-red-400/70">{cancelledCount} cancelled</span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      {/* Attendee list */}
      <div className="max-h-[400px] overflow-y-auto">
        {filteredAttendees.length === 0 ? (
          <div className="p-8 text-center text-white/50">
            {searchQuery ? 'No attendees match your search.' : 'No attendees yet.'}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredAttendees.map((attendee) => {
              const isCheckedIn = !!attendee.reservation.checkedInAt;
              const isCancelled = attendee.reservation.status === 'cancelled';
              const isCheckingThis = checkingIn === attendee.reservationId;

              return (
                <div
                  key={attendee.reservationId}
                  className={`flex items-center justify-between p-4 ${
                    isCancelled ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                      {attendee.photoURL ? (
                        <img
                          src={attendee.photoURL}
                          alt={attendee.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white/70 font-medium">
                          {attendee.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Name & email */}
                    <div>
                      <div className="text-white font-medium">{attendee.displayName}</div>
                      {attendee.email && (
                        <div className="text-white/50 text-sm">{attendee.email}</div>
                      )}
                    </div>
                  </div>

                  {/* Status / Action */}
                  <div className="flex items-center gap-2">
                    {isCancelled ? (
                      <span className="flex items-center gap-1 text-red-400/70 text-sm">
                        <XCircle size={16} />
                        Cancelled
                      </span>
                    ) : isCheckedIn ? (
                      <span className="flex items-center gap-1 text-green-400 text-sm">
                        <CheckCircle2 size={16} />
                        Checked in
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCheckIn(attendee.reservationId)}
                        disabled={!!checkingIn}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {isCheckingThis ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Checking in...
                          </>
                        ) : (
                          <>
                            <Clock size={14} />
                            Check in
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

