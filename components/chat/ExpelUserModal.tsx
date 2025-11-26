import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface ExpelUserModalProps {
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, description: string) => void;
}

const EXPEL_REASONS = [
  'Abusive or offensive messages',
  'Spamming or unauthorized links',
  'Impersonating others',
  'Ignoring moderator warnings',
  'Breaking event chat rules',
  'Other',
] as const;

export const ExpelUserModal: React.FC<ExpelUserModalProps> = ({
  userName,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!selectedReason) {
      alert('Please select a reason for expelling this user.');
      return;
    }
    
    onConfirm(selectedReason, description.trim());
    // Reset form
    setSelectedReason('');
    setDescription('');
  };

  const handleClose = () => {
    setSelectedReason('');
    setDescription('');
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
          <h2 className="text-2xl font-heading font-bold text-[#15383c]">
            Choose Expelling Reason
          </h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Reason Selection */}
          <div className="space-y-3">
            {EXPEL_REASONS.map((reason) => (
              <label
                key={reason}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedReason === reason
                    ? 'border-[#15383c] bg-[#eef4f5]'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <input
                    type="radio"
                    name="expelReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedReason === reason
                        ? 'border-[#15383c] bg-[#15383c]'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {selectedReason === reason && (
                      <Check size={12} className="text-white" />
                    )}
                  </div>
                </div>
                <span className={`text-sm font-medium flex-1 ${
                  selectedReason === reason ? 'text-[#15383c]' : 'text-gray-700'
                }`}>
                  {reason}
                </span>
              </label>
            ))}
          </div>

          {/* Description Text Area */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Tell us more
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter Description Here"
              className="w-full p-4 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#15383c] focus:bg-white transition-all resize-none"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={handleSubmit}
            className="w-full py-3.5 bg-[#e35e25] text-white rounded-full font-bold text-base hover:bg-[#cf4d1d] transition-colors shadow-lg shadow-orange-900/20"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

