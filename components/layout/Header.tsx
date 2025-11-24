import React, { useState, useEffect } from 'react';
import { Menu, X, Search, User, Bell, PlusCircle, Heart } from 'lucide-react';
import { ViewState } from '@/types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserStore } from '../../stores/userStore';
import { getUnreadNotificationCount } from '../../firebase/notifications';

interface HeaderProps {
  setViewState: (view: ViewState) => void;
  viewState: ViewState;
  isLoggedIn: boolean;
  onProfileClick: () => void;
  onNotificationsClick: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ setViewState, viewState, isLoggedIn, onProfileClick, onNotificationsClick, onLogout }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const user = useUserStore((state) => state.user);
  const userPhoto = user?.photoURL || user?.profileImageUrl;
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread notification count
  useEffect(() => {
    if (user?.uid) {
      const loadUnreadCount = async () => {
        const count = await getUnreadNotificationCount(user.uid);
        setUnreadCount(count);
      };
      loadUnreadCount();
      // Refresh every 30 seconds
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [user?.uid]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNav = (view: ViewState) => {
    setViewState(view);
    window.scrollTo({ top: 0, behavior: 'instant' });
    setMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    setMobileMenuOpen(false);
  };

  const isDetailView = viewState === ViewState.DETAIL;
  
  const navClasses = `fixed top-0 left-0 right-0 z-50 transition-base ${
    isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm py-fluid' : 'bg-transparent py-fluid'
  } ${isDetailView ? 'hidden lg:block' : ''}`;

  const isLightPage = viewState === ViewState.FEED || viewState === ViewState.PROFILE || viewState === ViewState.NOTIFICATIONS || viewState === ViewState.MY_POPS || viewState === ViewState.FAVORITES || viewState === ViewState.DELETE_ACCOUNT || viewState === ViewState.CREATE_EVENT;

  const getTextColor = (isMobile: boolean) => {
     if (isMobile) return 'text-popera-teal';
     if (isLightPage) return 'text-popera-teal'; 
     return isScrolled ? 'text-popera-teal' : 'text-white';
  };

  return (
    <header className={navClasses}>
      <div className="max-w-7xl mx-auto px-fluid flex items-center justify-between">
        {/* Logo */}
        <div 
          className="cursor-pointer z-50 group" 
          onClick={() => handleNav(isLoggedIn ? ViewState.FEED : ViewState.LANDING)}
        >
           <h1 className={`font-heading font-bold fluid-heading-2 tracking-tight transition-base ${getTextColor(false)}`}>
            Popera
           </h1>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center space-x-8">
          <button onClick={() => handleNav(ViewState.FEED)} className={`font-medium fluid-small hover:opacity-80 transition-base ${getTextColor(false)}`}>{t('header.exploreEvents')}</button>
          <button onClick={() => handleNav(ViewState.GUIDELINES)} className={`font-medium fluid-small hover:opacity-80 transition-base ${getTextColor(false)}`}>{t('header.community')}</button>
          <button onClick={() => handleNav(ViewState.ABOUT)} className={`font-medium fluid-small hover:opacity-80 transition-base ${getTextColor(false)}`}>{t('header.about')}</button>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center space-x-6">
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
            className={`w-9 h-9 rounded-full border-2 font-bold text-xs transition-all hover:scale-105 flex items-center justify-center ${
              isScrolled || isLightPage
                ? 'border-[#15383c] text-[#15383c] hover:bg-[#15383c]/5'
                : 'border-white/30 text-white hover:bg-white/10'
            }`}
          >
            {language === 'en' ? 'FR' : 'EN'}
          </button>
          <button className={`p-2 rounded-full hover:bg-white/10 transition-colors ${getTextColor(false)}`}>
            <Search size={20} />
          </button>

          {isLoggedIn ? (
             <>
               {/* Host Event Button */}
               <button 
                 onClick={() => handleNav(ViewState.CREATE_EVENT)}
                 className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-[#e35e25] hover:bg-[#cf4d1d] text-white font-bold fluid-small transition-base shadow-md hover:shadow-lg hover:-translate-y-0.5"
               >
                 <PlusCircle size={18} /> {t('header.hostEvent')}
               </button>
               
               {/* Favorites Button */}
               <button
                 onClick={() => handleNav(ViewState.FAVORITES)}
                 className={`p-2 rounded-full hover:bg-black/5 transition-colors group ${getTextColor(false)}`}
               >
                 <Heart size={20} className="group-hover:text-[#e35e25] transition-colors" />
               </button>

               <button 
                 onClick={onNotificationsClick}
                 className={`p-2 rounded-full hover:bg-black/5 transition-colors relative group ${getTextColor(false)}`}
               >
                 <Bell size={20} />
                 {unreadCount > 0 && (
                   <span className="absolute top-0 right-0 w-5 h-5 bg-[#e35e25] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                     {unreadCount > 9 ? '9+' : unreadCount}
                   </span>
                 )}
               </button>

               <button 
                 onClick={onProfileClick}
                 className="w-10 h-10 rounded-full bg-[#e35e25] flex items-center justify-center text-white font-bold text-sm shadow-md hover:scale-105 transition-transform ring-2 ring-white overflow-hidden"
               >
                 {userPhoto ? (
                   <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                   <span>{user?.displayName?.[0] || user?.name?.[0] || 'P'}</span>
                 )}
               </button>
             </>
          ) : (
              <button 
                onClick={() => handleNav(ViewState.AUTH)}
                className="px-6 py-2.5 rounded-full bg-popera-orange text-white font-medium fluid-small hover:bg-[#cf4d1d] transition-base shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                {t('header.signIn')}
              </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="lg:hidden z-50 flex items-center gap-2.5">
          {/* Language Toggle - Mobile */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
            className={`w-10 h-10 rounded-full border-2 font-bold text-xs transition-all active:scale-[0.95] touch-manipulation flex items-center justify-center ${
              isScrolled || isLightPage || mobileMenuOpen
                ? 'border-[#15383c] text-[#15383c] hover:bg-[#15383c]/5'
                : 'border-white/40 text-white hover:bg-white/10'
            }`}
          >
            {language === 'en' ? 'FR' : 'EN'}
          </button>
          
          {isLoggedIn && (
             <button 
               onClick={onProfileClick}
               className="w-11 h-11 rounded-full bg-[#e35e25] flex items-center justify-center text-white font-bold text-sm shadow-md active:scale-[0.95] touch-manipulation ring-2 ring-white/20"
             >
               P
             </button>
          )}
          
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`${isScrolled || isLightPage || mobileMenuOpen ? 'text-popera-teal' : 'text-white'} w-11 h-11 flex items-center justify-center active:scale-[0.95] touch-manipulation rounded-full hover:bg-white/10 transition-colors`}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay - Fixed z-index and overflow */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col pt-20 sm:pt-24 md:pt-28 px-4 sm:px-6 md:px-8 lg:hidden animate-fade-in safe-area-inset-top overflow-y-auto" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <nav className="flex flex-col space-y-1 sm:space-y-2 md:space-y-3 text-lg sm:text-xl md:text-2xl font-heading font-bold text-popera-teal h-full overflow-y-auto pb-8 sm:pb-10 md:pb-12">
            
            {isLoggedIn ? (
               <>
                 <button onClick={() => handleNav(ViewState.CREATE_EVENT)} className="text-left hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all flex items-center gap-3 sm:gap-3 text-[#e35e25] touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                   <PlusCircle size={22} className="sm:w-6 sm:h-6" /> {t('header.hostEvent')}
                 </button>

                 <button onClick={() => handleNav(ViewState.FEED)} className="text-left hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                   {t('header.exploreEvents')}
                 </button>
                 
                 <button onClick={onNotificationsClick} className="text-left hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all flex items-center gap-3 sm:gap-3 touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                   {t('header.notifications')} <span className="w-2 h-2 sm:w-2 sm:h-2 bg-[#e35e25] rounded-full"></span>
                 </button>
                 
                 <button onClick={() => handleNav(ViewState.PROFILE)} className="text-left hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                   {t('header.myProfile')}
                 </button>
                 
                 <button onClick={() => handleNav(ViewState.MY_POPS)} className="text-left hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                   {t('header.myPops')}
                 </button>
                 
                 <button onClick={() => handleNav(ViewState.FAVORITES)} className="text-left hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                   {t('header.myFavorites')}
                 </button>
                 
                 <div className="pt-4 sm:pt-6 md:pt-8 border-t border-gray-200 flex flex-col space-y-1 sm:space-y-2 md:space-y-3 mt-auto">
                     <button onClick={handleLogoutClick} className="text-left hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                       {t('header.signOut')}
                     </button>
                     <button onClick={() => handleNav(ViewState.DELETE_ACCOUNT)} className="text-left text-gray-500 sm:text-gray-400 hover:text-red-500 active:text-red-600 active:bg-red-50 transition-all text-base sm:text-lg touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                       {t('header.deleteAccount')}
                     </button>
                 </div>
               </>
            ) : (
               <>
                 <button onClick={() => handleNav(ViewState.FEED)} className="text-left hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">{t('header.exploreEvents')}</button>
                 <button onClick={() => handleNav(ViewState.GUIDELINES)} className="text-left hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">{t('header.community')}</button>
                 <button onClick={() => handleNav(ViewState.ABOUT)} className="text-left hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">{t('header.about')}</button>
                 <hr className="border-gray-200 my-3 sm:my-2" />
                 <button 
                   onClick={() => handleNav(ViewState.AUTH)}
                   className="text-left flex items-center text-base sm:text-lg font-medium text-gray-700 sm:text-gray-600 hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]"
                 >
                   <User size={22} className="sm:w-6 sm:h-6 mr-3 sm:mr-3" /> {t('header.signIn')}
                 </button>
               </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};