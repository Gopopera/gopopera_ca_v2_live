import React, { useState } from 'react';
import { ViewState } from '../../types';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { getDbSafe } from '../lib/firebase';
import { sendEmail } from '../lib/email';
import { ContactEmailTemplate } from '../emails/templates/ContactEmail';
import { useLanguage } from '../../contexts/LanguageContext';

interface ContactPageProps {
  setViewState: (view: ViewState) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ setViewState }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    // Check for missing config before starting
    const db = getDbSafe();
    const resendKey = import.meta.env.VITE_RESEND_API_KEY;
    
    if (!db && !resendKey) {
      alert('⚠️ Configuration error: Firebase and Resend are not configured. Please contact support.');
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(false);
    
    // Timeout fallback - never stay stuck on "Sending..."
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false);
      if (!submitSuccess) {
        alert('⚠️ Request timed out. Your message may have been sent. Please check your email or try again.');
      }
    }, 10000); // 10 second timeout

    try {
      const timestamp = new Date().toLocaleString('en-US', { 
        dateStyle: 'long', 
        timeStyle: 'short' 
      });

      // Save to Firestore (non-blocking)
      if (db) {
        addDoc(collection(db, 'contact_inquiries'), {
          name: formData.name,
          email: formData.email,
          message: formData.message,
          createdAt: new Date().toISOString(),
        }).catch((error) => {
          console.error('Error saving to Firestore:', error);
        });
      }

      // Send email via Resend
      if (resendKey) {
        const emailHtml = ContactEmailTemplate({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          timestamp,
        });

        const emailResult = await sendEmail({
          to: 'support@gopopera.ca',
          subject: `Popera Contact Form - ${formData.name}`,
          html: emailHtml,
          templateName: 'contact-form',
        });

        if (!emailResult.success && emailResult.error) {
          console.warn('Email send result:', emailResult);
        }
      } else {
        console.warn('Resend API key not configured, skipping email send');
      }

      // Show success
      clearTimeout(timeoutId);
      setSubmitSuccess(true);
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Error submitting contact form:', error);
      alert(`⚠️ Error: ${error.message || 'Failed to submit form. Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#15383c] pt-20 sm:pt-24 pb-8 sm:pb-12 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <button onClick={() => setViewState(ViewState.LANDING)} className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"><ChevronLeft size={20} className="sm:w-6 sm:h-6" /></button>
        <div className="text-center mb-8 sm:mb-12"><h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">{t('contact.title')}</h1></div>
        {submitSuccess ? (
          <div className="bg-white/10 rounded-2xl p-8 text-center mb-12">
            <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
            <p className="text-white font-medium">{t('contact.messageSent')}</p>
          </div>
        ) : (
          <form className="space-y-5 sm:space-y-6 mb-12 sm:mb-16 md:mb-20" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium pl-1">{t('contact.name')} *</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder={t('contact.namePlaceholder')} 
                className="w-full bg-[#1a454a] border border-[#2d6a70] rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#e35e25] focus:ring-1 focus:ring-[#e35e25] transition-all" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium pl-1">{t('contact.email')} *</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder={t('contact.emailPlaceholder')} 
                className="w-full bg-[#1a454a] border border-[#2d6a70] rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#e35e25] focus:ring-1 focus:ring-[#e35e25] transition-all" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium pl-1">{t('contact.message')} *</label>
              <textarea 
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                required
                rows={5}
                placeholder={t('contact.messagePlaceholder')} 
                className="w-full bg-[#1a454a] border border-[#2d6a70] rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#e35e25] focus:ring-1 focus:ring-[#e35e25] transition-all resize-none" 
              />
            </div>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3.5 sm:py-4 rounded-full transition-colors mt-6 sm:mt-8 border border-white/5 touch-manipulation active:scale-95 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('contact.sending') : t('contact.submit')}
            </button>
          </form>
        )}
        <div className="text-center border-t border-white/10 pt-10 sm:pt-12 md:pt-16"><h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl mb-4 sm:mb-6">{t('contact.reachUs')}</h2><p className="text-gray-300 text-base sm:text-lg font-light px-4">{t('contact.reachUsDesc')} <a href="mailto:support@gopopera.ca" className="text-white font-bold hover:text-[#e35e25] transition-colors">support@gopopera.ca</a></p></div>
      </div>
    </div>
  );
};