import React, { useState } from 'react';
import { ViewState } from '../../types';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { getDbSafe } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useLanguage } from '../../contexts/LanguageContext';

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
      <div className="min-h-screen bg-[#15383c] pt-20 sm:pt-24 pb-8 sm:pb-12 text-white font-sans">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <button 
            onClick={() => setViewState(ViewState.LANDING)} 
            className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"
          >
            <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
          </button>
          
          <div className="bg-white/10 rounded-2xl p-8 text-center">
            <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-3">
              {t('report.reportSubmitted')}
            </h2>
            <p className="text-gray-300 mb-6">
              {t('report.thankYou')} {email || user?.email}.
            </p>
            <button
              onClick={() => setViewState(ViewState.LANDING)}
              className="px-8 py-3.5 sm:py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full transition-colors border border-white/5 touch-manipulation active:scale-95 text-sm sm:text-base"
            >
              {t('report.returnHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#15383c] pt-20 sm:pt-24 pb-8 sm:pb-12 text-white font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <button 
          onClick={() => setViewState(ViewState.LANDING)} 
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"
        >
          <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
        </button>

        <div className="text-center mb-8 sm:mb-12">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">
            {t('report.title')}
          </h1>
          <p className="text-gray-300 text-base sm:text-lg font-light">
            {t('report.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 mb-12 sm:mb-16 md:mb-20">
          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-medium pl-1">
              {t('report.name')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={t('report.name')}
              className="w-full bg-[#1a454a] border border-[#2d6a70] rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#e35e25] focus:ring-1 focus:ring-[#e35e25] transition-all"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-medium pl-1">
              {t('report.email')} *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full bg-[#1a454a] border border-[#2d6a70] rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#e35e25] focus:ring-1 focus:ring-[#e35e25] transition-all"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-medium pl-1">
              {t('report.subject')} *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder={t('report.subjectPlaceholder')}
              className="w-full bg-[#1a454a] border border-[#2d6a70] rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#e35e25] focus:ring-1 focus:ring-[#e35e25] transition-all"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-medium pl-1">
              {t('report.message')} *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              placeholder={t('report.messagePlaceholder')}
              className="w-full bg-[#1a454a] border border-[#2d6a70] rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#e35e25] focus:ring-1 focus:ring-[#e35e25] transition-all resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3.5 sm:py-4 rounded-full transition-colors mt-6 sm:mt-8 border border-white/5 touch-manipulation active:scale-95 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t('report.submitting') : t('report.submit')}
          </button>
        </form>

        {/* Footer info - matching Contact page pattern */}
        <div className="text-center border-t border-white/10 pt-10 sm:pt-12 md:pt-16">
          <p className="text-gray-300 text-base sm:text-lg font-light px-4">
            {t('report.subtitle')} <a href="mailto:support@gopopera.ca" className="text-white font-bold hover:text-[#e35e25] transition-colors">support@gopopera.ca</a>
          </p>
        </div>
      </div>
    </div>
  );
};
