import React from 'react';
import { ViewState } from '../types';
import { ChevronLeft, FileText, Mail, Download } from 'lucide-react';

interface PressPageProps {
  setViewState: (view: ViewState) => void;
}

export const PressPage: React.FC<PressPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <button 
          onClick={() => setViewState(ViewState.LANDING)} 
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"
        >
          <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
        </button>

        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#e35e25]/10 rounded-full mb-4">
            <FileText size={32} className="text-[#e35e25]" />
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4 text-[#15383c]">
            Press & Media
          </h1>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
            Media inquiries, press releases, and brand assets for journalists and content creators.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 md:p-12 space-y-8">
          <section>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4">
              About Popera
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Popera is Canada's first community-powered pop-up platform, connecting people through real-world experiences. From garage sales to art shows, local meetups, and cultural events, Popera makes it easy for anyone to create, discover, and join meaningful pop-up moments in their community.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Founded with a mission to bring people together through authentic, local connections, Popera combines simple RSVPs, built-in group chats, and transparent reviews to create a safe, engaging platform for community events.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4">
              Media Inquiries
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              For press inquiries, interview requests, or media partnerships, please contact our press team:
            </p>
            <div className="bg-[#eef4f5] rounded-2xl p-6 border border-[#15383c]/10">
              <div className="flex items-center gap-3 mb-2">
                <Mail size={20} className="text-[#e35e25]" />
                <span className="font-bold text-[#15383c]">Press Contact</span>
              </div>
              <a 
                href="mailto:press@gopopera.ca" 
                className="text-[#e35e25] font-medium hover:underline text-lg"
              >
                press@gopopera.ca
              </a>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4">
              Brand Assets
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Download our logo, brand guidelines, and press kit materials:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <button className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-[#e35e25] transition-colors">
                <Download size={20} className="text-[#e35e25]" />
                <span className="font-medium text-[#15383c]">Logo Pack</span>
              </button>
              <button className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-[#e35e25] transition-colors">
                <Download size={20} className="text-[#e35e25]" />
                <span className="font-medium text-[#15383c]">Brand Guidelines</span>
              </button>
              <button className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-[#e35e25] transition-colors">
                <Download size={20} className="text-[#e35e25]" />
                <span className="font-medium text-[#15383c]">Press Kit</span>
              </button>
              <button className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-[#e35e25] transition-colors">
                <Download size={20} className="text-[#e35e25]" />
                <span className="font-medium text-[#15383c]">Product Screenshots</span>
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4">
              Key Facts
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-[#e35e25] font-bold">•</span>
                <span className="text-gray-600"><strong>Platform:</strong> Community-powered pop-up event platform</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#e35e25] font-bold">•</span>
                <span className="text-gray-600"><strong>Founded:</strong> 2024</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#e35e25] font-bold">•</span>
                <span className="text-gray-600"><strong>Headquarters:</strong> Canada</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#e35e25] font-bold">•</span>
                <span className="text-gray-600"><strong>Mission:</strong> Connect communities through real-world pop-up experiences</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

