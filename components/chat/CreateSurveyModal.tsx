import React, { useState } from 'react';
import { X, FileText, Plus, Trash2 } from 'lucide-react';

interface SurveyQuestion {
  question: string;
  type: 'short' | 'multiple';
  options?: string[];
}

interface CreateSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSurvey: (questions: SurveyQuestion[]) => void;
}

export const CreateSurveyModal: React.FC<CreateSurveyModalProps> = ({
  isOpen,
  onClose,
  onCreateSurvey,
}) => {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([
    { question: '', type: 'short' }
  ]);

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    if (questions.length < 5) {
      setQuestions([...questions, { question: '', type: 'short' }]);
    } else {
      alert('Maximum 5 questions allowed per survey.');
    }
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const handleQuestionChange = (index: number, field: 'question' | 'type', value: string) => {
    const newQuestions = [...questions];
    if (field === 'question') {
      newQuestions[index].question = value;
    } else {
      newQuestions[index].type = value as 'short' | 'multiple';
      if (value === 'multiple' && !newQuestions[index].options) {
        newQuestions[index].options = ['', ''];
      } else if (value === 'short') {
        delete newQuestions[index].options;
      }
    }
    setQuestions(newQuestions);
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    if (!newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options = ['', ''];
    }
    newQuestions[questionIndex].options![optionIndex] = value;
    setQuestions(newQuestions);
  };

  const handleAddOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    if (!newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options = ['', ''];
    }
    if (newQuestions[questionIndex].options!.length < 5) {
      newQuestions[questionIndex].options!.push('');
    } else {
      alert('Maximum 5 options per question.');
    }
    setQuestions(newQuestions);
  };

  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options && newQuestions[questionIndex].options!.length > 2) {
      newQuestions[questionIndex].options = newQuestions[questionIndex].options!.filter((_, i) => i !== optionIndex);
    }
    setQuestions(newQuestions);
  };

  const handleSubmit = () => {
    // Validate all questions
    const validQuestions = questions.filter(q => q.question.trim() !== '');
    if (validQuestions.length === 0) {
      alert('Please add at least one question.');
      return;
    }

    // Validate multiple choice questions have at least 2 options
    for (const q of validQuestions) {
      if (q.type === 'multiple') {
        const validOptions = q.options?.filter(opt => opt.trim() !== '') || [];
        if (validOptions.length < 2) {
          alert(`Question "${q.question}" needs at least 2 options.`);
          return;
        }
      }
    }

    // Create survey with valid questions
    const finalQuestions = validQuestions.map(q => ({
      question: q.question.trim(),
      type: q.type,
      options: q.type === 'multiple' ? q.options?.filter(opt => opt.trim() !== '').map(opt => opt.trim()) : undefined
    }));

    onCreateSurvey(finalQuestions);
    
    // Reset form
    setQuestions([{ question: '', type: 'short' }]);
    onClose();
  };

  const handleClose = () => {
    setQuestions([{ question: '', type: 'short' }]);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#e35e25]/10 rounded-full flex items-center justify-center">
              <FileText size={20} className="text-[#e35e25]" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-[#15383c]">
              Create Survey
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
          <p className="text-sm text-gray-600">
            Create a survey to gather feedback from your attendees. You can add up to 5 questions with short answer or multiple choice formats.
          </p>

          {/* Questions */}
          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="p-4 border-2 border-gray-200 rounded-xl space-y-4">
                {/* Question Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Question {qIndex + 1}</h3>
                  {questions.length > 1 && (
                    <button
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      title="Remove question"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Question Input */}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                    placeholder="Enter your question..."
                    className="w-full p-3 rounded-lg border-2 border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#15383c] transition-all"
                  />
                </div>

                {/* Question Type */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">Question Type</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleQuestionChange(qIndex, 'type', 'short')}
                      className={`flex-1 py-2.5 px-4 rounded-lg border-2 transition-all ${
                        q.type === 'short'
                          ? 'border-[#15383c] bg-[#15383c]/5 text-[#15383c] font-semibold'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      Short Answer
                    </button>
                    <button
                      onClick={() => handleQuestionChange(qIndex, 'type', 'multiple')}
                      className={`flex-1 py-2.5 px-4 rounded-lg border-2 transition-all ${
                        q.type === 'multiple'
                          ? 'border-[#15383c] bg-[#15383c]/5 text-[#15383c] font-semibold'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      Multiple Choice
                    </button>
                  </div>
                </div>

                {/* Options for Multiple Choice */}
                {q.type === 'multiple' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-gray-600">Options</label>
                    <div className="space-y-2">
                      {q.options?.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                            placeholder={`Option ${oIndex + 1}`}
                            className="flex-1 p-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#15383c] transition-all text-sm"
                          />
                          {q.options && q.options.length > 2 && (
                            <button
                              onClick={() => handleRemoveOption(qIndex, oIndex)}
                              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0"
                              title="Remove option"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {q.options && q.options.length < 5 && (
                      <button
                        onClick={() => handleAddOption(qIndex)}
                        className="flex items-center gap-2 text-[#e35e25] font-medium text-sm hover:text-[#cf4d1d] transition-colors"
                      >
                        <Plus size={16} />
                        Add Option
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Question Button */}
          {questions.length < 5 && (
            <button
              onClick={handleAddQuestion}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-[#15383c] hover:text-[#15383c] transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add Question
            </button>
          )}
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
            Create Survey
          </button>
        </div>
      </div>
    </div>
  );
};

