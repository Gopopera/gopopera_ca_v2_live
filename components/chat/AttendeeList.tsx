import React, { useState, useEffect } from 'react';
import { Users, X, UserX, Ban, Crown, CreditCard, Banknote, Gift } from 'lucide-react';
import { getDbSafe } from '../../src/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useUserStore } from '../../stores/userStore';
import { subscribeToMultipleUserProfiles } from '../../firebase/userSubscriptions';

/**
 * Payment Badge Component
 * Displays payment status for attendees based on reservation.pricingMode and doorPaymentStatus
 */
const PaymentBadge: React.FC<{ pricingMode?: string; doorPaymentStatus?: string }> = ({ pricingMode, doorPaymentStatus }) => {
  if (!pricingMode) return null;
  
  if (pricingMode === 'free') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
        <Gift size={10} />
        FREE
      </span>
    );
  }
  
  if (pricingMode === 'online') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
        <CreditCard size={10} />
        PAID ONLINE
      </span>
    );
  }
  
  if (pricingMode === 'door') {
    const isPaid = doorPaymentStatus === 'paid';
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
        isPaid 
          ? 'bg-green-100 text-green-700' 
          : 'bg-amber-100 text-amber-700'
      }`}>
        <Banknote size={10} />
        {isPaid ? 'DOOR — PAID' : 'DOOR — UNPAID'}
      </span>
    );
  }
  
  return null;
};

interface Attendee {
  userId: string;
  userName: string;
  userPhoto?: string;
  isHost: boolean;
  hasRSVP: boolean;
  isBanned?: boolean;
  reservedAt?: number;
  cancelledAt?: number;
  checkedInAt?: number;
  status?: 'reserved' | 'checked_in' | 'cancelled';
  // Payment tracking fields
  pricingMode?: 'free' | 'online' | 'door';
  doorPaymentStatus?: 'unpaid' | 'paid';
}

interface AttendeeListProps {
  eventId: string;
  hostId: string;
  isHost: boolean;
  onRemoveUser?: (userId: string) => void;
  onBanUser?: (userId: string) => void;
  onExpelUser?: (userId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const AttendeeList: React.FC<AttendeeListProps> = ({
  eventId,
  hostId,
  isHost,
  onRemoveUser,
  onBanUser,
  onExpelUser,
  isOpen,
  onClose,
}) => {
  const currentUser = useUserStore((state) => state.getCurrentUser());
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  // REFACTORED: Use real-time subscriptions for profile pictures
  useEffect(() => {
    if (isOpen) {
      loadAttendees();
    }
  }, [isOpen, eventId]);

  // Subscribe to profile updates for all attendees in real-time
  // Use attendees.length as a dependency to re-subscribe when attendees change
  useEffect(() => {
    if (!isOpen || attendees.length === 0) {
      return;
    }

    const userIds = attendees.map(a => a.userId);
    if (userIds.length === 0) return;

    const unsubscribe = subscribeToMultipleUserProfiles(userIds, (profiles) => {
      // Update attendees with latest profile data
      setAttendees(prev => {
        // Only update if the attendee list structure hasn't changed
        // (i.e., same userIds, just profile data changed)
        const prevUserIds = prev.map(a => a.userId).sort().join(',');
        const currentUserIds = userIds.sort().join(',');
        if (prevUserIds !== currentUserIds) {
          // Attendee list changed, return as-is to avoid overwriting
          return prev;
        }

        return prev.map(attendee => {
          const profile = profiles[attendee.userId];
          if (profile) {
            return {
              ...attendee,
              userName: profile.displayName || attendee.userName,
              userPhoto: profile.photoURL || undefined,
            };
          }
          return attendee;
        });
      });
    });

    return () => unsubscribe();
  }, [isOpen, eventId, attendees.length]); // Re-subscribe when attendee count changes

  const loadAttendees = async () => {
    setLoading(true);
    try {
      const db = getDbSafe();
      if (!db) return;

      // FIX: Get ACTIVE reservations (status="reserved" OR "checked_in") to show all valid attendees
      const rsvpsRef = collection(db, 'reservations');
      const rsvpsQuery = query(
        rsvpsRef, 
        where('eventId', '==', eventId),
        where('status', 'in', ['reserved', 'checked_in'])
      );
      const rsvpsSnapshot = await getDocs(rsvpsQuery);
      
      // DEV-only diagnostics
      if (import.meta.env.DEV) {
        console.log('[ATTENDEE_LIST] 🔍 Reservations query result:', {
          eventId,
          totalDocs: rsvpsSnapshot.docs.length,
        });
      }
      
      const attendeeList: Attendee[] = [];
      const userIds = new Set<string>();
      
      // FIX: Deduplicate by userId - keep newest reservation (by reservedAt)
      const reservationsByUser = new Map<string, { doc: any; reservedAt: number }>();
      
      for (const rsvpDoc of rsvpsSnapshot.docs) {
        const rsvpData = rsvpDoc.data();
        const userId = rsvpData.userId;
        if (!userId || userId === hostId) continue;
        
        const reservedAt = rsvpData.reservedAt || 0;
        const existing = reservationsByUser.get(userId);
        
        if (!existing || reservedAt > existing.reservedAt) {
          reservationsByUser.set(userId, { doc: rsvpDoc, reservedAt });
        }
      }
      
      // DEV-only: log duplicates
      if (import.meta.env.DEV) {
        const hostAdjustment = rsvpsSnapshot.docs.some(d => d.data().userId === hostId) ? 1 : 0;
        const duplicateCount = rsvpsSnapshot.docs.length - reservationsByUser.size - hostAdjustment;
        if (duplicateCount > 0) {
          console.log('[ATTENDEE_LIST] ⚠️ Found duplicate reservations:', {
            eventId,
            duplicateCount,
          });
        }
      }

      // Add host first
      if (hostId) {
        userIds.add(hostId);
        try {
          const hostDoc = await getDoc(doc(db, 'users', hostId));
          const hostData = hostDoc.data();
          attendeeList.push({
            userId: hostId,
            userName: hostData?.displayName || hostData?.name || 'Host',
            userPhoto: hostData?.photoURL || hostData?.imageUrl,
            isHost: true,
            hasRSVP: true,
            isBanned: false,
            reservedAt: undefined,
            cancelledAt: undefined,
            checkedInAt: undefined,
          });
        } catch (error) {
          console.error('Error loading host:', error);
        }
      }

      // Add attendees from deduplicated map
      for (const [userId, { doc: rsvpDoc }] of reservationsByUser) {
        if (userIds.has(userId)) continue;
        userIds.add(userId);
        
        const rsvpData = rsvpDoc.data();

        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          const userData = userDoc.data();
          
          const bannedEvents = userData?.bannedEvents || [];
          const isBanned = bannedEvents.includes(eventId);

          attendeeList.push({
            userId,
            userName: userData?.displayName || userData?.name || 'User',
            userPhoto: userData?.photoURL || userData?.imageUrl,
            isHost: false,
            hasRSVP: true, // Always true since we only query active statuses
            isBanned,
            reservedAt: rsvpData.reservedAt,
            cancelledAt: rsvpData.cancelledAt,
            checkedInAt: rsvpData.checkedInAt,
            status: rsvpData.status,
            // Payment tracking fields from reservation
            pricingMode: rsvpData.pricingMode,
            doorPaymentStatus: rsvpData.doorPaymentStatus,
          });
        } catch (error) {
          console.error('Error loading user:', error);
        }
      }
      
      // DEV-only: final count log
      if (import.meta.env.DEV) {
        console.log('[ATTENDEE_LIST] ✅ Final attendee list:', {
          eventId,
          count: attendeeList.length,
          rsvpdCount: attendeeList.filter(a => a.hasRSVP && !a.isHost).length,
        });
      }

      setAttendees(attendeeList);
    } catch (error) {
      console.error('Error loading attendees:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // FIX: Compute RSVP'd count (excluding host) to match EventDetailPage
  const rsvpdCount = attendees.filter(a => a.hasRSVP && !a.isHost).length;

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-end md:justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white w-full md:w-96 h-[60vh] md:h-[80vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col animate-slide-up md:animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - FIX: Show RSVP'd count, not total attendees.length */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-[#15383c]" />
            <h2 className="text-2xl font-heading font-bold text-[#15383c]">Attendees</h2>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
              {rsvpdCount}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-[#15383c] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading attendees...</p>
            </div>
          ) : attendees.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No attendees yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {attendees.map((attendee) => (
                <div
                  key={attendee.userId}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    attendee.isBanned
                      ? 'bg-red-50 border border-red-200'
                      : attendee.isHost
                      ? 'bg-[#eef4f5] border border-[#15383c]/10'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-100'
                  }`}
                >
                  <div className="relative">
                    {attendee.userPhoto ? (
                      <img
                        src={attendee.userPhoto}
                        alt={attendee.userName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#e35e25] flex items-center justify-center text-white font-bold text-sm">
                        {attendee.userName[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    {attendee.isHost && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#e35e25] rounded-full flex items-center justify-center border-2 border-white">
                        <Crown size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-sm truncate ${attendee.isBanned ? 'text-red-600' : 'text-[#15383c]'}`}>
                        {attendee.userName}
                      </p>
                      {attendee.isHost && (
                        <span className="text-[10px] bg-[#e35e25]/10 text-[#e35e25] px-2 py-0.5 rounded-full font-bold uppercase">
                          Host
                        </span>
                      )}
                      {attendee.isBanned && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase">
                          Banned
                        </span>
                      )}
                      {/* Checked in badge - show if status is checked_in OR checkedInAt exists */}
                      {!attendee.isHost && (attendee.status === 'checked_in' || attendee.checkedInAt) && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">
                          Checked in
                        </span>
                      )}
                      {/* Payment badge - show pricing mode for non-host attendees */}
                      {!attendee.isHost && (
                        <PaymentBadge 
                          pricingMode={attendee.pricingMode} 
                          doorPaymentStatus={attendee.doorPaymentStatus} 
                        />
                      )}
                    </div>
                    {/* Show status: Checked in or RSVP'd */}
                    <p className="text-xs text-gray-500">
                      {(attendee.status === 'checked_in' || attendee.checkedInAt) ? 'Checked in' : "RSVP'd"}
                    </p>
                    {/* Action history log - FIX: Handle Invalid Date by checking type and value */}
                    {(attendee.reservedAt || attendee.checkedInAt) && (
                      <div className="text-[10px] text-gray-400 mt-0.5 space-y-0.5">
                        {attendee.reservedAt && typeof attendee.reservedAt === 'number' && attendee.reservedAt > 0 && (
                          <p>Reserved {new Date(attendee.reservedAt).toLocaleString('en-US', { 
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                          })}</p>
                        )}
                        {attendee.checkedInAt && typeof attendee.checkedInAt === 'number' && attendee.checkedInAt > 0 && (
                          <p className="text-green-500">Checked in {new Date(attendee.checkedInAt).toLocaleString('en-US', { 
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                          })}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {isHost && !attendee.isHost && onExpelUser && (
                    <button
                      onClick={() => onExpelUser(attendee.userId)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-full text-sm font-medium hover:bg-red-100 transition-colors"
                      title="Expel user"
                    >
                      Expel
                    </button>
                  )}
                  {/* Legacy buttons for backward compatibility */}
                  {isHost && !attendee.isHost && !onExpelUser && onRemoveUser && onBanUser && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onRemoveUser(attendee.userId)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Remove user"
                      >
                        <UserX size={16} />
                      </button>
                      <button
                        onClick={() => onBanUser(attendee.userId)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Ban user"
                      >
                        <Ban size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

