import React, { useState } from 'react';
import { ViewState } from '../types';
import { Users, Globe, Briefcase, Lightbulb, Mail, ArrowRight, ChevronLeft, X, CheckCircle2 } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

interface CareersPageProps {
  setViewState: (view: ViewState) => void;
}

export const CareersPage: React.FC<CareersPageProps> = ({ setViewState }) => {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setIsSubmitting(true);
    try {
      // Save to Firestore
      await addDoc(collection(db, 'career_inquiries'), {
        name: formData.name,
        email: formData.email,
        message: formData.message,
        createdAt: new Date().toISOString(),
      });

      // Open mailto with prefilled content
      const subject = encodeURIComponent('Career Inquiry - ' + formData.name);
      const body = encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`);
      window.location.href = `mailto:support@gopopera.ca?subject=${subject}&body=${body}`;

      setSubmitSuccess(true);
      setTimeout(() => {
        setShowEmailModal(false);
        setFormData({ name: '', email: '', message: '' });
        setSubmitSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting career inquiry:', error);
      // Still open mailto as fallback
      const subject = encodeURIComponent('Career Inquiry - ' + formData.name);
      const body = encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`);
      window.location.href = `mailto:support@gopopera.ca?subject=${subject}&body=${body}`;
      setShowEmailModal(false);
      setFormData({ name: '', email: '', message: '' });
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
            <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-4 sm:mb-6">Careers</h1>
            <p className="text-base sm:text-lg text-gray-300 mb-2">Last updated: 1/10/2023</p>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-200 font-light leading-relaxed max-w-3xl mx-auto px-4 mt-4">
              We're building a platform for real-world pop-up sales, micro-communities, social gatherings, and grassroots movements. If that excites you, we want to hear from you.
            </p>
          </div>

          <section className="mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-white mb-6 sm:mb-8">How we work</h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-[2rem] border border-white/10 mb-6">
              <ul className="space-y-4 text-gray-300 text-sm sm:text-base">
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span><strong>Lean & part-time:</strong> All co-founders invest 5–20 hours/week.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span><strong>Rhythm:</strong> We run bi-weekly sprints with one team meeting per week.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span><strong>Mindset:</strong> Low-ego, mature, hands-on. Impact over titles.</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-white mb-6 sm:mb-8">Who we welcome</h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-[2rem] border border-white/10 mb-6">
              <p className="text-gray-300 text-sm sm:text-base mb-4 leading-relaxed">
                We collaborate with passionate, mature professionals across:
              </p>
              <ul className="grid md:grid-cols-2 gap-3 text-gray-300 text-sm sm:text-base">
                <li className="flex items-start gap-2">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>Product Management</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>Software Engineering (web, mobile)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>AI/ML</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>Sales & Partnerships</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>Communications & Community</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>Marketing & Growth</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>…and other fields where you can move the needle.</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-white mb-6 sm:mb-8">What you'll do</h2>
            <div className="bg-white/5 p-6 sm:p-8 rounded-[2rem] border border-white/10">
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4">
                Whether you're exploring for experience or confident you can create immediate impact, you're welcome here. You'll:
              </p>
              <ul className="space-y-3 text-gray-300 text-sm sm:text-base">
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>Own clear outcomes inside a bi-weekly sprint cadence</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold">•</span>
                  <span>Ship small, learn fast, and iterate with data and community feedback</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-12 sm:mb-16 md:mb-20">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                { icon: <Users size={24} />, title: "Real Impact", desc: "Your work connects people meaningfully." },
                { icon: <Globe size={24} />, title: "Remote Friendly", desc: "Work from anywhere, stay connected." },
                { icon: <Lightbulb size={24} />, title: "Creative Culture", desc: "Experiment and support bold ideas." },
                { icon: <Briefcase size={24} />, title: "Growth Stage", desc: "Join a small ambitious team." }
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
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white mb-6 sm:mb-8">How to get in touch</h2>
            <p className="text-gray-300 text-sm sm:text-base mb-6 max-w-2xl mx-auto">
              Email <strong>support@gopopera.ca</strong> with:
            </p>
            <ul className="text-left max-w-md mx-auto mb-8 space-y-2 text-gray-300 text-sm sm:text-base">
              <li className="flex items-start gap-2">
                <span className="text-[#e35e25] font-bold">•</span>
                <span>A short intro (what you want to contribute and why)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#e35e25] font-bold">•</span>
                <span>Your résumé</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#e35e25] font-bold">•</span>
                <span>Links (LinkedIn, portfolio, GitHub, or anything relevant)</span>
              </li>
            </ul>
            <div className="mt-6 sm:mt-8 md:mt-10">
              <button 
                onClick={() => setShowEmailModal(true)}
                className="px-8 sm:px-10 py-3.5 sm:py-4 bg-white text-[#15383c] rounded-full font-bold text-base sm:text-lg hover:bg-[#e35e25] hover:text-white transition-all flex items-center gap-2 mx-auto shadow-lg touch-manipulation active:scale-95"
              >
                <Mail size={18} className="sm:w-5 sm:h-5" /> Email Us
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
              <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#15383c]">Get in Touch</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            {submitSuccess ? (
              <div className="text-center py-8">
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                <p className="text-gray-700 font-medium">Message sent! Check your email client.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15383c] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15383c] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message / Role Interest</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15383c] focus:border-transparent resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#15383c] text-white rounded-full font-bold hover:bg-[#1f4d52] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
