import React, { useState, useEffect } from 'react';
import { Users, X, UserX, Ban, Crown } from 'lucide-react';
import { getDbSafe } from '../../src/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useUserStore } from '../../stores/userStore';

interface Attendee {
  userId: string;
  userName: string;
  userPhoto?: string;
  isHost: boolean;
  hasRSVP: boolean;
  isBanned?: boolean;
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

  useEffect(() => {
    if (isOpen) {
      loadAttendees();
    }
  }, [isOpen, eventId]);

  const loadAttendees = async () => {
    setLoading(true);
    try {
      const db = getDbSafe();
      if (!db) return;

      // Get all RSVPs for this event
      const rsvpsRef = collection(db, 'reservations');
      const rsvpsQuery = query(rsvpsRef, where('eventId', '==', eventId));
      const rsvpsSnapshot = await getDocs(rsvpsQuery);
      
      const attendeeList: Attendee[] = [];
      const userIds = new Set<string>();

      // Add host first
      if (hostId) {
        userIds.add(hostId);
        try {
          const hostDoc = await getDoc(doc(db, 'users', hostId));
          const hostData = hostDoc.data();
          attendeeList.push({
            userId: hostId,
            userName: hostData?.name || hostData?.displayName || 'Host',
            userPhoto: hostData?.photoURL || hostData?.imageUrl,
            isHost: true,
            hasRSVP: true,
            isBanned: false,
          });
        } catch (error) {
          console.error('Error loading host:', error);
        }
      }

      // Add attendees
      for (const rsvpDoc of rsvpsSnapshot.docs) {
        const rsvpData = rsvpDoc.data();
        const userId = rsvpData.userId;
        
        if (!userId || userIds.has(userId) || userId === hostId) continue;
        userIds.add(userId);

        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          const userData = userDoc.data();
          
          // Check if banned
          const bannedEvents = userData?.bannedEvents || [];
          const isBanned = bannedEvents.includes(eventId);

          attendeeList.push({
            userId,
            userName: userData?.name || userData?.displayName || 'User',
            userPhoto: userData?.photoURL || userData?.imageUrl,
            isHost: false,
            hasRSVP: true,
            isBanned,
          });
        } catch (error) {
          console.error('Error loading user:', error);
        }
      }

      setAttendees(attendeeList);
    } catch (error) {
      console.error('Error loading attendees:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-end md:justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white w-full md:w-96 h-[60vh] md:h-[80vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col animate-slide-up md:animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-[#15383c]" />
            <h2 className="text-2xl font-heading font-bold text-[#15383c]">Attendees</h2>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
              {attendees.length}
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
                    </div>
                    <p className="text-xs text-gray-500">
                      {attendee.hasRSVP ? 'RSVP\'d' : 'No RSVP'}
                    </p>
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

