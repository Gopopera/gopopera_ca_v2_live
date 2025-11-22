import React from 'react';
import { ViewState } from '../types';
import { ChevronLeft, ArrowRight } from 'lucide-react';

interface ContactPageProps {
  setViewState: (view: ViewState) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-[#15383c] pt-20 sm:pt-24 pb-8 sm:pb-12 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <button onClick={() => setViewState(ViewState.LANDING)} className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"><ChevronLeft size={20} className="sm:w-6 sm:h-6" /></button>
        <div className="text-center mb-8 sm:mb-12"><h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">Contact Us</h1></div>
        <form className="space-y-5 sm:space-y-6 mb-12 sm:mb-16 md:mb-20" onSubmit={(e) => e.preventDefault()}>
           <div className="space-y-2"><label className="block text-xs sm:text-sm font-medium pl-1">Email *</label><input type="email" placeholder="Enter Your Email Here" className="w-full bg-[#1a454a] border border-[#2d6a70] rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#e35e25] focus:ring-1 focus:ring-[#e35e25] transition-all" /></div>
           <button className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3.5 sm:py-4 rounded-full transition-colors mt-6 sm:mt-8 border border-white/5 touch-manipulation active:scale-95 text-sm sm:text-base">Submit</button>
        </form>
        <div className="text-center border-t border-white/10 pt-10 sm:pt-12 md:pt-16"><h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl mb-4 sm:mb-6">Reach Us At</h2><p className="text-gray-300 text-base sm:text-lg font-light px-4">If you have questions, reach out to us at <a href="mailto:contact@gopopera.ca" className="text-white font-bold hover:text-[#e35e25] transition-colors">contact@gopopera.ca</a></p></div>
      </div>
    </div>
  );
};