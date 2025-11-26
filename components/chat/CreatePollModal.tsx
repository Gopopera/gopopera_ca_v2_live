import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (question: string, options: string[]) => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  onCreatePoll,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']); // Start with 2 empty options

  if (!isOpen) return null;

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      // Keep at least 2 options
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = () => {
    // Validate question
    if (!question.trim()) {
      alert('Please enter a poll question.');
      return;
    }

    // Validate options (at least 2 non-empty)
    const validOptions = options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      alert('Please provide at least 2 options for your poll.');
      return;
    }

    // Create poll
    onCreatePoll(question.trim(), validOptions);
    
    // Reset form
    setQuestion('');
    setOptions(['', '']);
    onClose();
  };

  const handleClose = () => {
    setQuestion('');
    setOptions(['', '']);
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
            Create Poll
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
          {/* Question Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              What is your poll question or topic?
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Write something..."
              className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#15383c] transition-all"
            />
          </div>

          {/* Options Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Create options
            </label>
            
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">Option {index + 1}</div>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder="Write an option"
                      className="w-full p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#15383c] transition-all"
                    />
                  </div>
                  {options.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(index)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors mt-6 shrink-0"
                      title="Remove option"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Option Button */}
            <button
              onClick={handleAddOption}
              className="flex items-center gap-2 text-[#e35e25] font-medium text-sm hover:text-[#cf4d1d] transition-colors"
            >
              <Plus size={18} />
              Add Options
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={handleSubmit}
            className="w-full py-3.5 bg-[#15383c] text-white rounded-full font-bold text-base hover:bg-[#1f4d52] transition-colors shadow-lg shadow-teal-900/20"
          >
            Create Poll
          </button>
        </div>
      </div>
    </div>
  );
};

