import React, { useState } from 'react';
import { ViewState } from '../types';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useUserStore } from '../stores/userStore';
import { getDbSafe } from '../src/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';

interface ReportPageProps {
  setViewState: (view: ViewState) => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({ setViewState }) => {
  const { t } = useLanguage();
  const user = useUserStore((state) => state.user);
  const [name, setName] = useState(user?.displayName || user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError(t('report.allFieldsRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const db = getDbSafe();
      
      // Write to Firestore
      const reportData = {
        userId: user?.uid || null,
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        createdAt: Date.now(),
      };

      if (db) {
        await addDoc(collection(db, 'reports'), reportData);
      }

      // Open mailto link
      const encodedSubject = encodeURIComponent(`Popera Report - ${subject.trim()}`);
      const encodedBody = encodeURIComponent(
        `${message.trim()}\n\n---\nReported by: ${name.trim()}\nEmail: ${email.trim()}\nUser ID: ${user?.uid || 'anonymous'}\nTimestamp: ${new Date().toISOString()}`
      );
      window.location.href = `mailto:support@gopopera.ca?subject=${encodedSubject}&body=${encodedBody}`;

      setSubmitted(true);
      
      // Reset form after delay
      setTimeout(() => {
        setName(user?.displayName || user?.name || '');
        setEmail(user?.email || '');
        setSubject('');
        setMessage('');
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      console.error('Error submitting report:', err);
      setError(t('report.failedSubmit'));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f8fafb] pt-24 pb-12 font-sans">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <button 
            onClick={() => setViewState(ViewState.LANDING)} 
            className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"
          >
            <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
          </button>
          
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#15383c] mb-3">
              {t('report.reportSubmitted')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('report.thankYou')} {email || user?.email}.
            </p>
            <button
              onClick={() => setViewState(ViewState.LANDING)}
              className="px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors"
            >
              {t('report.returnHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <button 
          onClick={() => setViewState(ViewState.LANDING)} 
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"
        >
          <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
        </button>

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4 text-[#15383c]">
            {t('report.title')}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            {t('report.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 md:p-12 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#15383c] mb-2">
              {t('report.name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={t('report.name')}
              className="w-full bg-white border border-gray-200 rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#15383c] mb-2">
              {t('report.email')} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full bg-white border border-gray-200 rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-[#15383c] mb-2">
              {t('report.subject')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder={t('report.subjectPlaceholder')}
              className="w-full bg-white border border-gray-200 rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-[#15383c] mb-2">
              {t('report.message')} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={6}
              placeholder={t('report.messagePlaceholder')}
              className="w-full bg-white border border-gray-200 rounded-2xl sm:rounded-3xl py-3 sm:py-4 px-4 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => setViewState(ViewState.LANDING)}
              className="flex-1 px-6 py-3 bg-gray-100 text-[#15383c] rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              {t('report.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#d14e1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t('report.submitting') : t('report.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
