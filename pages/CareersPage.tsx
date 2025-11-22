import React from 'react';
import { ViewState } from '../types';
import { Clock, Users, Zap, Globe, Briefcase, Lightbulb, Rocket, Mail, ArrowRight, CheckCircle2, ChevronLeft } from 'lucide-react';

interface CareersPageProps {
  setViewState: (view: ViewState) => void;
}

export const CareersPage: React.FC<CareersPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-[#15383c] pt-24 pb-20 text-white font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-6 sm:mb-10"><button onClick={() => setViewState(ViewState.LANDING)} className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors touch-manipulation active:scale-95"><ChevronLeft size={20} className="sm:w-6 sm:h-6" /></button></div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-12 md:mb-16"><h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-4 sm:mb-6">Careers</h1><p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-200 font-light leading-relaxed max-w-3xl mx-auto px-4">We're building a platform for real-world pop-up sales, stories, communities, and movements.</p></div>
        <section className="mb-12 sm:mb-16 md:mb-20"><div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">{[{ icon: <Users size={24} />, title: "Real Impact", desc: "Your work connects people meaningfully." }, { icon: <Globe size={24} />, title: "Remote Friendly", desc: "Work from anywhere, stay connected." }].map((item, idx) => (<div key={idx} className="bg-white/5 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 hover:-translate-y-1 transition-transform duration-300"><div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-[#e35e25] mb-4 sm:mb-6">{item.icon}</div><h3 className="text-base sm:text-lg font-heading font-bold text-white mb-2">{item.title}</h3><p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{item.desc}</p></div>))}</div></section>
        <section className="bg-[#1f4d52] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10 lg:p-16 text-center relative overflow-hidden border border-white/10"><h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white mb-6 sm:mb-8">How to get in touch</h2><div className="mt-6 sm:mt-8 md:mt-10"><button onClick={() => window.location.href = 'mailto:support@gopopera.ca'} className="px-8 sm:px-10 py-3.5 sm:py-4 bg-white text-[#15383c] rounded-full font-bold text-base sm:text-lg hover:bg-[#e35e25] hover:text-white transition-all flex items-center gap-2 mx-auto shadow-lg touch-manipulation active:scale-95">Email Us <ArrowRight size={18} className="sm:w-5 sm:h-5" /></button></div></section>
      </div>
    </div>
  );
};