import React from 'react';
import { X, Calendar, Search } from 'lucide-react';
import { ViewState } from '@/types';

interface FakeEventReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBrowseEvents: () => void;
}

export const FakeEventReservationModal: React.FC<FakeEventReservationModalProps> = ({
  isOpen,
  onClose,
  onBrowseEvents,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#15383c]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} className="text-[#15383c]" />
          </div>
          <h3 className="font-heading font-bold text-xl sm:text-2xl text-[#15383c] mb-3">
            Example Event
          </h3>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            This is an example Popera event and cannot be reserved. As the Popera community grows, real events will appear here and you'll be able to reserve and join their group conversations.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 sm:py-3.5 bg-gray-100 text-gray-700 font-bold rounded-full hover:bg-gray-200 transition-colors touch-manipulation active:scale-95 text-sm sm:text-base"
          >
            Close
          </button>
          <button
            onClick={onBrowseEvents}
            className="flex-1 py-3 sm:py-3.5 bg-[#e35e25] text-white font-bold rounded-full hover:bg-[#cf4d1d] transition-colors shadow-lg touch-manipulation active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <Search size={18} className="sm:w-5 sm:h-5" />
            Browse other events
          </button>
        </div>
      </div>
    </div>
  );
};


