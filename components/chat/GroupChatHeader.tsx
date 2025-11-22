import React from 'react';
import { X } from 'lucide-react';
import { FAKE_HOSTS } from '@/data/fakeHosts';
import { POPERA_HOST_NAME } from '@/stores/userStore';

import { Event } from '@/types';

interface GroupChatHeaderProps {
  event: Event;
  onClose: () => void;
  isMobile?: boolean;
}

export const GroupChatHeader: React.FC<GroupChatHeaderProps> = ({ event, onClose, isMobile = false }) => {
  // Get host profile image
  const getHostImage = () => {
    if (event.hostId) {
      const fakeHost = FAKE_HOSTS.find(h => h.id === event.hostId);
      if (fakeHost) return fakeHost.profileImageUrl;
    }
    // Default to Popera or generic
    if (event.hostName === POPERA_HOST_NAME) {
      return 'https://i.pravatar.cc/150?img=1';
    }
    return `https://picsum.photos/seed/${event.hostName}/100/100`;
  };

  if (isMobile) {
    return (
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img
            src={getHostImage()}
            alt={event.hostName}
            className="w-12 h-12 rounded-full object-cover border-2 border-[#15383c]/10 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h2 className="font-heading font-bold text-lg text-[#15383c] truncate">Group conversation</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-600 truncate">{event.hostName}</p>
              <span className="text-[10px] bg-[#e35e25]/10 text-[#e35e25] px-2 py-0.5 rounded-full font-bold uppercase">
                Host
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 shrink-0"
        >
          <X size={20} />
        </button>
      </header>
    );
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 lg:px-8 py-5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <img
          src={getHostImage()}
          alt={event.hostName}
          className="w-14 h-14 lg:w-16 lg:h-16 rounded-full object-cover border-2 border-[#15383c]/10 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-heading font-bold text-xl lg:text-2xl text-[#15383c] mb-1">Group conversation</h2>
          <div className="flex items-center gap-3">
            <p className="text-sm lg:text-base text-gray-700 font-medium truncate">{event.hostName}</p>
            <span className="text-[10px] lg:text-xs bg-[#e35e25]/10 text-[#e35e25] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">
              Host
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors shrink-0"
      >
        <X size={20} />
      </button>
    </div>
  );
};

