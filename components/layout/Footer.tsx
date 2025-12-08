import React from 'react';
import { Instagram, MessageCircle, Music } from 'lucide-react';
import { ViewState } from '@/types';
import { useLanguage } from '../../contexts/LanguageContext';
import { Logo } from './Logo';

interface FooterProps {
  setViewState?: (view: ViewState) => void;
  isLoggedIn?: boolean;
  onProtectedNav?: (view: ViewState) => void;
}

export const Footer: React.FC<FooterProps> = ({ setViewState, isLoggedIn = false, onProtectedNav }) => {
  const { t } = useLanguage();
  
  const handleNav = (view: ViewState, requiresAuth: boolean = false) => {
    if (setViewState) {
      // If route requires auth and user is not logged in, use protected nav callback
      if (requiresAuth && !isLoggedIn) {
        if (onProtectedNav) {
          onProtectedNav(view);
        } else {
          setViewState(ViewState.AUTH);
        }
      } else {
        setViewState(view);
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  return (
    <footer className="bg-[#15383c] pt-10 sm:pt-12 md:pt-16 lg:pt-20 pb-8 sm:pb-10 md:pb-12 lg:pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Logo Section */}
        <div className="mb-8 sm:mb-10 md:mb-12">
          <Logo 
            size="md" 
            textColor="text-white" 
            onClick={() => handleNav(ViewState.LANDING)}
          />
        </div>

        {/* Links Grid - Mobile: 2 cols, Tablet: 3 cols, Desktop: 6 cols */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 sm:gap-x-5 md:gap-x-6 gap-y-8 sm:gap-y-10 md:gap-y-12 lg:gap-8">
          
          {/* Explore */}
          <div className="col-span-1">
            <h3 className="font-heading font-bold text-white text-sm sm:text-base md:text-lg mb-3 sm:mb-4 md:mb-6">{t('footer.explore')}</h3>
            <ul className="space-y-2 sm:space-y-2.5 md:space-y-3 text-xs sm:text-sm text-gray-300">
              <li><button onClick={() => handleNav(ViewState.CREATE_EVENT, true)} className="hover:text-[#e35e25] transition-colors text-left">{t('footer.becomeHost')}</button></li>
              <li><button onClick={() => handleNav(ViewState.MY_CALENDAR, true)} className="hover:text-[#e35e25] transition-colors text-left">{t('footer.eventCalendar')}</button></li>
            </ul>
          </div>

          {/* My Account */}
          <div className="col-span-1">
            <h3 className="font-heading font-bold text-white text-base sm:text-lg mb-4 sm:mb-6">{t('footer.myAccount')}</h3>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-300">
              <li><button onClick={() => handleNav(ViewState.MY_POPS, true)} className="hover:text-[#e35e25] transition-colors text-left">{t('footer.myReservations')}</button></li>
              <li><button onClick={() => handleNav(ViewState.FAVORITES, true)} className="hover:text-[#e35e25] transition-colors text-left">{t('footer.favouriteEvents')}</button></li>
              <li><button onClick={() => handleNav(ViewState.PROFILE, true)} className="hover:text-[#e35e25] transition-colors text-left">{t('footer.profileSettings')}</button></li>
            </ul>
          </div>

          {/* Company */}
          <div className="col-span-1">
            <h3 className="font-heading font-bold text-white text-base sm:text-lg mb-4 sm:mb-6">{t('footer.company')}</h3>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-300">
              <li><button onClick={() => handleNav(ViewState.ABOUT)} className="hover:text-[#e35e25] transition-colors text-left">{t('footer.aboutPopera')}</button></li>
              <li><button onClick={() => handleNav(ViewState.CAREERS)} className="hover:text-[#e35e25] transition-colors text-left">{t('footer.careers')}</button></li>
              <li><button onClick={() => handleNav(ViewState.CONTACT)} className="hover:text-[#e35e25] transition-colors text-left">{t('footer.contactUs')}</button></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="col-span-1">
            <h3 className="font-heading font-bold text-white text-base sm:text-lg mb-4 sm:mb-6">{t('footer.legal')}</h3>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-300">
              <li><button onClick={() => handleNav(ViewState.TERMS)} className="hover:text-[#e35e25] transition-colors text-left">{t('footer.termsOfUse')}</button></li>
              <li><button onClick={() => handleNav(ViewState.PRIVACY)} className="hover:text-[#e35e25] transition-colors text-left">{t('footer.privacyPolicy')}</button></li>
              <li><button onClick={() => handleNav(ViewState.CANCELLATION)} className="hover:text-[#e35e25] transition-colors text-left">{t('footer.cancellationPolicy')}</button></li>
              <li><button onClick={() => handleNav(ViewState.GUIDELINES)} className="hover:text-[#e35e25] transition-colors text-left">{t('footer.communityGuidelines')}</button></li>
            </ul>
          </div>

          {/* Other */}
          <div className="col-span-1">
            <h3 className="font-heading font-bold text-white text-base sm:text-lg mb-4 sm:mb-6">{t('footer.other')}</h3>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-300">
              <li><button onClick={() => handleNav(ViewState.REPORT_EVENT)} className="hover:text-[#e35e25] transition-colors text-left">{t('footer.reportEvent')}</button></li>
              <li><button onClick={() => handleNav(ViewState.HELP)} className="hover:text-[#e35e25] transition-colors text-left">{t('footer.helpSupport')}</button></li>
            </ul>
          </div>

           {/* Social */}
           <div className="col-span-1">
            <h3 className="font-heading font-bold text-white text-sm sm:text-base md:text-lg mb-3 sm:mb-4 md:mb-6">{t('footer.social')}</h3>
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
               {/* Reddit */}
              <a href="https://www.reddit.com/user/Visible-Citron-4632/" target="_blank" rel="noopener noreferrer" className="text-[#e35e25] hover:bg-[#e35e25] hover:text-white transition-all border-2 border-[#e35e25] rounded-xl p-2 sm:p-2.5 touch-manipulation active:scale-95">
                <MessageCircle size={18} className="sm:w-5 sm:h-5" />
              </a>
              {/* Instagram */}
              <a href="https://www.instagram.com/gopopera.ca/" target="_blank" rel="noopener noreferrer" className="text-[#e35e25] hover:bg-[#e35e25] hover:text-white transition-all border-2 border-[#e35e25] rounded-xl p-2 sm:p-2.5 touch-manipulation active:scale-95">
                <Instagram size={18} className="sm:w-5 sm:h-5" />
              </a>
              {/* TikTok */}
              <a href="https://www.tiktok.com/@gopopera.ca?lang=en" target="_blank" rel="noopener noreferrer" className="text-[#e35e25] hover:bg-[#e35e25] hover:text-white transition-all border-2 border-[#e35e25] rounded-xl p-2 sm:p-2.5 touch-manipulation active:scale-95">
                <Music size={18} className="sm:w-5 sm:h-5" />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-10 sm:mt-12 md:mt-16 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center text-xs sm:text-sm text-gray-500">
           <p className="mb-2 md:mb-0 text-center md:text-left">{t('footer.copyright').replace('{year}', new Date().getFullYear().toString())}</p>
        </div>
      </div>
    </footer>
  );
};