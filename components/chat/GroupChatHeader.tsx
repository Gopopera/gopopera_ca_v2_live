import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, UserPlus, UserCheck } from 'lucide-react';
import { FAKE_HOSTS } from '@/data/fakeHosts';
import { POPERA_HOST_NAME } from '@/stores/userStore';
import { getUserProfile } from '../../firebase/db';
import { Event } from '@/types';

interface GroupChatHeaderProps {
  event: Event;
  onClose: () => void;
  onViewDetails?: () => void;
  isMobile?: boolean;
  isHost?: boolean;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
  followLoading?: boolean;
}

export const GroupChatHeader: React.FC<GroupChatHeaderProps> = ({ 
  event, 
  onClose, 
  onViewDetails, 
  isMobile = false,
  isHost = false,
  isFollowing = false,
  onFollowToggle,
  followLoading = false
}) => {
  const [hostProfilePicture, setHostProfilePicture] = useState<string | null>(null);
  const [displayHostName, setDisplayHostName] = useState<string>(event.hostName || '');

  // Fetch host profile from Firestore for accurate data
  useEffect(() => {
    const fetchHostProfile = async () => {
      if (!event.hostId) return;
      
      try {
        const hostProfile = await getUserProfile(event.hostId);
        if (hostProfile) {
          const profilePic = hostProfile.photoURL || hostProfile.imageUrl || null;
          setHostProfilePicture(profilePic);
          const name = hostProfile.name || hostProfile.displayName || event.hostName || '';
          setDisplayHostName(name);
        }
      } catch (error) {
        console.warn('[GROUP_CHAT_HEADER] Failed to fetch host profile:', error);
      }
    };
    
    fetchHostProfile();
  }, [event.hostId, event.hostName]);

  // Get host profile image with fallback
  const getHostImage = () => {
    if (hostProfilePicture) return hostProfilePicture;
    if (event.hostId) {
      const fakeHost = FAKE_HOSTS.find(h => h.id === event.hostId);
      if (fakeHost) return fakeHost.profileImageUrl;
    }
    if (event.hostName === POPERA_HOST_NAME) {
      return 'https://i.pravatar.cc/150?img=1';
    }
    return `https://picsum.photos/seed/${displayHostName || event.hostName}/100/100`;
  };

  if (isMobile) {
    return (
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="w-10 h-10 flex items-center justify-center text-[#15383c] hover:bg-gray-100 rounded-full transition-colors shrink-0 touch-manipulation active:scale-95"
              aria-label="Back to Event"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <img
            src={getHostImage()}
            alt={displayHostName || event.hostName}
            className="w-12 h-12 rounded-full object-cover border-2 border-[#15383c]/10 shrink-0 aspect-square"
            style={{ aspectRatio: '1 / 1' }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5 font-semibold">Group Conversation</p>
            <h2 className="font-heading font-bold text-base text-[#15383c] truncate mb-0.5">{event.title}</h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-600 truncate">{displayHostName || event.hostName}</p>
              <span className="text-[10px] bg-[#e35e25]/10 text-[#e35e25] px-2 py-0.5 rounded-full font-bold uppercase">
                Host
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Follow Button - Only for attendees (not host) */}
          {!isHost && onFollowToggle && (
            <button
              onClick={onFollowToggle}
              disabled={followLoading}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 touch-manipulation flex items-center gap-1.5 ${
                isFollowing
                  ? 'bg-[#15383c] text-white hover:bg-[#1f4d52]'
                  : 'bg-[#e35e25] text-white hover:bg-[#d14e1a]'
              } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isFollowing ? (
                <>
                  <UserCheck size={14} />
                  Following
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  Follow
                </>
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 shrink-0"
          >
            <X size={20} />
          </button>
        </div>
      </header>
    );
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 lg:px-8 py-5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="flex items-center gap-2 px-4 py-2 text-[#15383c] hover:bg-gray-100 rounded-full transition-colors shrink-0 font-medium text-sm"
            aria-label="Back to Event"
          >
            <ArrowLeft size={18} />
            <span>Back to Event</span>
          </button>
        )}
        <img
          src={getHostImage()}
          alt={displayHostName || event.hostName}
          className="w-14 h-14 lg:w-16 lg:h-16 rounded-full object-cover border-2 border-[#15383c]/10 shrink-0 aspect-square"
          style={{ aspectRatio: '1 / 1' }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs lg:text-sm text-gray-500 uppercase tracking-wider mb-1 font-semibold">Group Conversation</p>
          <h2 className="font-heading font-bold text-lg lg:text-xl text-[#15383c] mb-1.5 truncate">{event.title}</h2>
          <div className="flex items-center gap-3">
            <p className="text-sm lg:text-base text-gray-700 font-medium truncate">{displayHostName || event.hostName}</p>
            <span className="text-[10px] lg:text-xs bg-[#e35e25]/10 text-[#e35e25] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">
              Host
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {/* Follow Button - Only for attendees (not host) */}
        {!isHost && onFollowToggle && (
          <button
            onClick={onFollowToggle}
            disabled={followLoading}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95 touch-manipulation flex items-center gap-2 shadow-sm ${
              isFollowing
                ? 'bg-[#15383c] text-white hover:bg-[#1f4d52]'
                : 'bg-[#e35e25] text-white hover:bg-[#d14e1a]'
            } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isFollowing ? (
              <>
                <UserCheck size={16} />
                Following
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Follow
              </>
            )}
          </button>
        )}
        <button
          onClick={onClose}
          className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors shrink-0"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

