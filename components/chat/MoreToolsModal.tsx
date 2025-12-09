import React from 'react';
import { X, MessageSquareOff, Lock, BellOff, Download, CreditCard } from 'lucide-react';

interface MoreToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseChatEarly: () => void;
  onToggleLockMessages: () => void;
  onToggleMuteAll: () => void;
  onDownloadHistory: () => void;
  onManageSubscription?: () => void;
  chatLocked: boolean;
  muteAll: boolean;
  hasSubscription?: boolean;
}

export const MoreToolsModal: React.FC<MoreToolsModalProps> = ({
  isOpen,
  onClose,
  onCloseChatEarly,
  onToggleLockMessages,
  onToggleMuteAll,
  onDownloadHistory,
  onManageSubscription,
  chatLocked,
  muteAll,
  hasSubscription,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-heading font-bold text-[#15383c]">
            More Tools
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {/* Close Chat Early */}
          <button
            onClick={() => {
              if (confirm('Close chat early? This will prevent new messages.')) {
                onCloseChatEarly();
                onClose();
              }
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#e35e25] hover:bg-[#e35e25]/5 transition-all text-left"
          >
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <MessageSquareOff size={20} className="text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#15383c]">Close Chat Early</h3>
              <p className="text-sm text-gray-600">Prevent new messages from being sent</p>
            </div>
          </button>

          {/* Lock/Unlock Messages */}
          <button
            onClick={() => {
              onToggleLockMessages();
              onClose();
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#e35e25] hover:bg-[#e35e25]/5 transition-all text-left"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${chatLocked ? 'bg-orange-100' : 'bg-gray-100'}`}>
              <Lock size={20} className={chatLocked ? 'text-orange-600' : 'text-gray-600'} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#15383c]">
                {chatLocked ? 'Unlock Messages' : 'Lock New Messages'}
              </h3>
              <p className="text-sm text-gray-600">
                {chatLocked ? 'Allow new messages to be sent' : 'Disable new message input'}
              </p>
            </div>
          </button>

          {/* Mute/Unmute All */}
          <button
            onClick={() => {
              onToggleMuteAll();
              onClose();
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#e35e25] hover:bg-[#e35e25]/5 transition-all text-left"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${muteAll ? 'bg-yellow-100' : 'bg-gray-100'}`}>
              <BellOff size={20} className={muteAll ? 'text-yellow-600' : 'text-gray-600'} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#15383c]">
                {muteAll ? 'Unmute All' : 'Mute All'}
              </h3>
              <p className="text-sm text-gray-600">
                {muteAll ? 'Enable all notifications' : 'Disable all notifications'}
              </p>
            </div>
          </button>

          {/* Download Chat History */}
          <button
            onClick={() => {
              onDownloadHistory();
              onClose();
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#e35e25] hover:bg-[#e35e25]/5 transition-all text-left"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <Download size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#15383c]">Download Chat History</h3>
              <p className="text-sm text-gray-600">Export conversation as JSON file</p>
            </div>
          </button>

          {/* Manage Subscription (only for recurring events with subscription) */}
          {hasSubscription && onManageSubscription && (
            <button
              onClick={() => {
                onManageSubscription();
                onClose();
              }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#e35e25] hover:bg-[#e35e25]/5 transition-all text-left"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                <CreditCard size={20} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#15383c]">Manage Subscription</h3>
                <p className="text-sm text-gray-600">Cancel or modify your recurring payment</p>
              </div>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-full font-bold text-base hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

