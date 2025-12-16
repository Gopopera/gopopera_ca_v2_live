import React from 'react';
import { X, MessageCircle } from 'lucide-react';
import { ViewState } from '../../types';

interface ConversationButtonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRSVP: () => void;
  eventTitle: string;
}

export const ConversationButtonModal: React.FC<ConversationButtonModalProps> = ({
  isOpen,
  onClose,
  onRSVP,
  eventTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#eef4f5] rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={32} className="text-[#e35e25]" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-2">
            Reserve Your Spot
          </h2>
          <p className="text-gray-600 text-sm">
            Reserve your spot to join the group conversation for
          </p>
          <p className="text-[#15383c] font-medium mt-1">{eventTitle}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              onRSVP();
              onClose();
            }}
            className="w-full px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors"
          >
            Reserve My Spot
          </button>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-100 text-[#15383c] rounded-full font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

