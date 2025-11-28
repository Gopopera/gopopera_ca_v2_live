import React, { useState } from 'react';
import { X, Megaphone } from 'lucide-react';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAnnouncement: (title: string, message: string) => void;
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({
  isOpen,
  onClose,
  onCreateAnnouncement,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    // Validate inputs
    if (!title.trim()) {
      alert('Please enter an announcement title.');
      return;
    }

    if (!message.trim()) {
      alert('Please enter an announcement message.');
      return;
    }

    // Create announcement
    onCreateAnnouncement(title.trim(), message.trim());
    
    // Reset form
    setTitle('');
    setMessage('');
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setMessage('');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#e35e25]/10 rounded-full flex items-center justify-center">
              <Megaphone size={20} className="text-[#e35e25]" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-[#15383c]">
              Create Announcement
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Announcement Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a clear, concise title..."
              className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#15383c] transition-all"
            />
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share important updates, reminders, or information with your attendees..."
              rows={6}
              className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#15383c] transition-all resize-none"
            />
            <p className="text-xs text-gray-500">
              This announcement will be sent to all event attendees via in-app notifications, email, and SMS (based on their preferences).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-full font-bold text-base hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3.5 bg-[#15383c] text-white rounded-full font-bold text-base hover:bg-[#1f4d52] transition-colors shadow-lg shadow-teal-900/20"
          >
            Post Announcement
          </button>
        </div>
      </div>
    </div>
  );
};

