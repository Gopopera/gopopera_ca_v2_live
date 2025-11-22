import React from 'react';
import { Lock, Calendar } from 'lucide-react';

interface ChatReservationBlockerProps {
  onReserve: () => void;
  isLoggedIn: boolean;
}

export const ChatReservationBlocker: React.FC<ChatReservationBlockerProps> = ({ onReserve, isLoggedIn }) => {
  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-[#15383c]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={32} className="text-[#15383c]" />
        </div>
        <h3 className="font-heading font-bold text-xl sm:text-2xl text-[#15383c] mb-3">
          Group conversation available only after reservation
        </h3>
        <p className="text-gray-600 text-sm sm:text-base mb-6 leading-relaxed">
          {isLoggedIn 
            ? 'Reserve your spot for this event to join the conversation and connect with other attendees.'
            : 'Sign in and reserve your spot to join the group chat and connect with other attendees.'}
        </p>
        <button
          onClick={onReserve}
          className="w-full py-3.5 sm:py-4 bg-[#e35e25] text-white font-bold rounded-full hover:bg-[#cf4d1d] transition-all shadow-lg touch-manipulation active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <Calendar size={18} className="sm:w-5 sm:h-5" />
          Reserve to access this conversation
        </button>
      </div>
    </div>
  );
};

