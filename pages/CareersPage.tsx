import React, { useState } from 'react';
import { ViewState } from '../types';
import { Users, Globe, Briefcase, Lightbulb, Mail, ArrowRight, ChevronLeft, X, CheckCircle2 } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { getDbSafe } from '../src/lib/firebase';
import { sendEmail } from '../src/lib/email';
import { CareerApplicationEmailTemplate } from '../src/emails/templates/CareerApplicationEmail';
import { useLanguage } from '../contexts/LanguageContext';

interface CareersPageProps {
  setViewState: (view: ViewState) => void;
}

export const CareersPage: React.FC<CareersPageProps> = ({ setViewState }) => {
  const { t } = useLanguage();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    // Check for missing config before starting
    const db = getDbSafe();
    const resendKey = import.meta.env.VITE_RESEND_API_KEY;
    
    if (!db && !resendKey) {
      alert('⚠️ Configuration error: Firebase and Resend are not configured. Please contact support.'); // Keep in English as it's a technical error
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(false);
    
    // Timeout fallback - never stay stuck on "Sending..."
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false);
      if (!submitSuccess) {
        alert('⚠️ Request timed out. Your application may have been sent. Please check your email or try again.'); // Keep in English as it's a technical error
      }
    }, 10000); // 10 second timeout

    try {
      const timestamp = new Date().toLocaleString('en-US', { 
        dateStyle: 'long', 
        timeStyle: 'short' 
      });

      // Save to Firestore (non-blocking)
      if (db) {
        const inquiryData: any = {
          name: formData.name,
          email: formData.email,
          message: formData.message,
          createdAt: new Date().toISOString(),
        };
        if (selectedFile) {
          inquiryData.fileName = selectedFile.name;
          inquiryData.fileSize = selectedFile.size;
          inquiryData.fileType = selectedFile.type;
        }
        addDoc(collection(db, 'career_inquiries'), inquiryData).catch((error) => {
          console.error('Error saving to Firestore:', error);
        });
      }

      // Convert file to base64 for attachment
      let attachment = undefined;
      if (selectedFile) {
        try {
          const fileBuffer = await selectedFile.arrayBuffer();
          // Convert to base64 string (Resend expects base64)
          const bytes = new Uint8Array(fileBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          attachment = [{
            filename: selectedFile.name,
            content: base64,
            contentType: selectedFile.type || 'application/pdf',
          }];
        } catch (error) {
          console.error('Error processing file attachment:', error);
          // Continue without attachment if conversion fails
        }
      }

      // Send email via Resend
      if (resendKey) {
        const emailHtml = CareerApplicationEmailTemplate({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          timestamp,
          hasResume: !!selectedFile,
          fileName: selectedFile?.name,
        });

        const emailResult = await sendEmail({
          to: 'support@gopopera.ca',
          subject: `Career Application - ${formData.name}`,
          html: emailHtml,
          attachments: attachment,
          templateName: 'career-application',
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
      setSelectedFile(null);
      setTimeout(() => {
        setShowEmailModal(false);
        setSubmitSuccess(false);
      }, 2000);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Error submitting career inquiry:', error);
      alert(`⚠️ Error: ${error.message || 'Failed to submit application. Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#15383c] pt-24 pb-20 text-white font-sans">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-6 sm:mb-10">
          <button onClick={() => setViewState(ViewState.LANDING)} className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors touch-manipulation active:scale-95">
            <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-4 sm:mb-6">{t('careers.title')}</h1>
            <p className="text-base sm:text-lg text-gray-300 mb-2">{t('careers.lastUpdated')}</p>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-200 font-light leading-relaxed max-w-3xl mx-auto px-4 mt-4">
              {t('careers.description')}
            </p>
          </div>

          <section className="mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-white mb-6 sm:mb-8">{t('careers.howWeWork')}</h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-[2rem] border border-white/10 mb-6">
              <ul className="space-y-4 text-gray-300 text-sm sm:text-base">
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span><strong>{t('careers.leanPartTime')}</strong> {t('careers.leanPartTimeDesc')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span><strong>{t('careers.rhythm')}</strong> {t('careers.rhythmDesc')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span><strong>{t('careers.mindset')}</strong> {t('careers.mindsetDesc')}</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-white mb-6 sm:mb-8">{t('careers.whoWeWelcome')}</h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-[2rem] border border-white/10 mb-6">
              <p className="text-gray-300 text-sm sm:text-base mb-4 leading-relaxed">
                {t('careers.collaborate')}
              </p>
              <ul className="grid md:grid-cols-2 gap-3 text-gray-300 text-sm sm:text-base">
                <li className="flex items-start gap-2">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>{t('careers.productManagement')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>{t('careers.softwareEngineering')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>{t('careers.aiMl')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>{t('careers.salesPartnerships')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>{t('careers.communications')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>{t('careers.marketing')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>{t('careers.otherFields')}</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-white mb-6 sm:mb-8">{t('careers.whatYoullDo')}</h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-[2rem] border border-white/10">
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4">
                {t('careers.whatYoullDoDesc')}
              </p>
              <ul className="space-y-3 text-gray-300 text-sm sm:text-base">
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>{t('careers.ownOutcomes')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>{t('careers.shipLearn')}</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-12 sm:mb-16 md:mb-20">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                { icon: <Users size={24} />, title: t('careers.realImpact'), desc: t('careers.realImpactDesc') },
                { icon: <Globe size={24} />, title: t('careers.remoteFriendly'), desc: t('careers.remoteFriendlyDesc') },
                { icon: <Lightbulb size={24} />, title: t('careers.creativeCulture'), desc: t('careers.creativeCultureDesc') },
                { icon: <Briefcase size={24} />, title: t('careers.growthStage'), desc: t('careers.growthStageDesc') }
              ].map((item, idx) => (
                <div key={idx} className="bg-white/5 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 hover:-translate-y-1 transition-transform duration-300">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-[#e35e25] mb-4 sm:mb-6">{item.icon}</div>
                  <h3 className="text-base sm:text-lg font-heading font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#1f4d52] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10 lg:p-16 text-center relative overflow-hidden border border-white/10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white mb-6 sm:mb-8">{t('careers.howToGetInTouch')}</h2>
            <p className="text-gray-300 text-sm sm:text-base mb-6 max-w-2xl mx-auto">
              {t('careers.emailWith')} <strong>support@gopopera.ca</strong> {t('careers.emailWithDesc')}
            </p>
            <ul className="text-left max-w-md mx-auto mb-8 space-y-2 text-gray-300 text-sm sm:text-base">
              <li className="flex items-start gap-2">
                <span className="text-[#e35e25] font-bold">•</span>
                <span>{t('careers.shortIntro')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#e35e25] font-bold">•</span>
                <span>{t('careers.resume')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#e35e25] font-bold">•</span>
                <span>{t('careers.links')}</span>
              </li>
            </ul>
            <div className="mt-6 sm:mt-8 md:mt-10">
              <button 
                onClick={() => setShowEmailModal(true)}
                className="px-8 sm:px-10 py-3.5 sm:py-4 bg-white text-[#15383c] rounded-full font-bold text-base sm:text-lg hover:bg-[#e35e25] hover:text-white transition-all flex items-center gap-2 mx-auto shadow-lg touch-manipulation active:scale-95"
              >
                <Mail size={18} className="sm:w-5 sm:h-5" /> {t('careers.emailUs')}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowEmailModal(false)}>
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#15383c]">{t('careers.getInTouch')}</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            {submitSuccess ? (
              <div className="text-center py-8">
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                <p className="text-gray-700 font-medium">{t('careers.applicationSent')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('careers.name')}</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-white border border-gray-200 rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('careers.email')}</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-white border border-gray-200 rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('careers.messageRoleInterest')}</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={5}
                    className="w-full bg-white border border-gray-200 rounded-2xl sm:rounded-3xl py-3 sm:py-4 px-4 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('careers.resumeOptional')}</label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15383c] focus:border-transparent text-sm"
                  />
                  {selectedFile && (
                    <p className="mt-2 text-xs text-gray-500">{t('careers.selected')} {selectedFile.name}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#15383c] text-white rounded-full font-bold hover:bg-[#1f4d52] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t('careers.sending') : t('careers.sendMessage')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
