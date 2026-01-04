import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, Search, User, Bell, PlusCircle, Heart, ArrowLeft, Compass, Calendar, UserCircle, Sparkles, LogOut, Trash2, Home, Users, Info, LogIn, BookOpen } from 'lucide-react';
import { ViewState } from '@/types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUserStore } from '../../stores/userStore';
import { getUnreadNotificationCount } from '../../firebase/notifications';
import { Logo } from './Logo';

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
  const userProfile = useUserStore((state) => state.userProfile);
  // REFACTORED: Real-time subscription to /users/{userId} - single source of truth
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    if (!user?.uid || !isLoggedIn) {
      setUserPhoto(null);
      setDisplayName('');
      return;
    }

    if (import.meta.env.DEV) {
      console.log('[HEADER] 📡 Subscribing to user profile:', { userId: user.uid });
    }

    let unsubscribe: (() => void) | null = null;

    // Real-time subscription to user document
    import('../../firebase/userSubscriptions').then(({ subscribeToUserProfile }) => {
      unsubscribe = subscribeToUserProfile(user.uid, (userData) => {
        if (userData) {
          setUserPhoto(userData.photoURL || null);
          setDisplayName(userData.displayName || '');

          if (import.meta.env.DEV) {
            console.log('[HEADER] ✅ User profile updated:', {
              userId: user.uid,
              displayName: userData.displayName,
              hasPhoto: !!userData.photoURL,
            });
          }
        } else {
          setUserPhoto(null);
          setDisplayName('');
        }
      });
    }).catch((error) => {
      console.error('[HEADER] ❌ Error loading user subscriptions:', error);
      setUserPhoto(null);
      setDisplayName('');
    });

    return () => {
      if (unsubscribe) {
        if (import.meta.env.DEV) {
          console.log('[HEADER] 🧹 Unsubscribing from user profile:', { userId: user.uid });
        }
        unsubscribe();
      }
    };
  }, [user?.uid, isLoggedIn]);

  // Get user initials for fallback
  const userInitials = displayName?.[0] || user?.displayName?.[0] || user?.name?.[0] || userProfile?.displayName?.[0] || userProfile?.name?.[0] || 'P';
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  // Real-time subscription to unread notification count
  useEffect(() => {
    if (!user?.uid || !isLoggedIn) {
      setUnreadCount(null);
      return;
    }

    // Use dynamic import for ES module compatibility
    let unsubscribe: (() => void) | null = null;

    import('../../firebase/notifications').then(({ subscribeToUnreadNotificationCount }) => {
      unsubscribe = subscribeToUnreadNotificationCount(user.uid, (count) => {
        setUnreadCount(count);
      });
    }).catch((error) => {
      console.error('[HEADER] Error loading notifications module:', error);
      setUnreadCount(null);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid, isLoggedIn]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    // Check initial scroll position
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      // Lock body scroll - save original value
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const scrollY = window.scrollY;

      // Lock scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      // Cleanup: restore scroll on close or unmount
      return () => {
        document.body.style.overflow = originalOverflow || '';
        document.body.style.position = originalPosition || '';
        document.body.style.top = '';
        document.body.style.width = '';
        // Restore scroll position
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      };
    }
    // No cleanup needed when menu is closed
  }, [mobileMenuOpen]);

  const handleNav = (view: ViewState, event?: any, hostId?: string) => {
    // Safe navigation - ensure we don't navigate to views that require state
    // If navigating from DETAIL view, ensure we have proper state for the target view
    try {
      setViewState(view);
      // Use pushState to create history entries for back button navigation
      if (view === ViewState.FEED) {
        window.history.pushState({ viewState: ViewState.FEED }, '', '/explore');
      } else if (view === ViewState.LANDING) {
        window.history.pushState({ viewState: ViewState.LANDING }, '', '/');
      } else if (view === ViewState.AUTH) {
        window.history.pushState({ viewState: ViewState.AUTH }, '', '/auth');
        window.scrollTo(0, 0);
      } else if (view === ViewState.PROFILE || view === ViewState.MY_POPS || view === ViewState.FAVORITES) {
        // These views don't require additional state, safe to navigate
        window.history.pushState({ viewState: view }, '', `/${view.toLowerCase()}`);
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
      setMobileMenuOpen(false);
    } catch (error) {
      console.error('[HEADER] Navigation error:', error);
      // Fallback to safe view
      setViewState(ViewState.FEED);
      window.history.pushState({ viewState: ViewState.FEED }, '', '/explore');
      setMobileMenuOpen(false);
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    setMobileMenuOpen(false);
  };

  const isDetailView = viewState === ViewState.DETAIL;
  const isLandingPage = viewState === ViewState.LANDING;
  // On landing page at top: transparent header with white text/icons
  // On landing page scrolled or other pages: white header with teal text/icons
  const isLightPage = !isLandingPage || isScrolled;
  const isLandingAtTop = isLandingPage && !isScrolled;

  // Header background: 
  // - Mobile on landing page: always transparent (even when scrolled)
  // - Desktop on landing at top: transparent
  // - Otherwise: white with border/shadow
  const navClasses = isLandingAtTop
    ? 'fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-transparent py-4'
    : isLandingPage
      ? 'fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-transparent lg:bg-white lg:border-b lg:border-gray-100 lg:shadow-sm py-4'
      : 'fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white border-b border-gray-100 shadow-sm py-4';

  // Header text/icons: 
  // - Mobile on landing page: always white (even when scrolled)
  // - Desktop on landing at top: white
  // - Otherwise: teal
  const getTextColor = (isMobile: boolean) => {
    if (isLandingAtTop) return 'text-white';
    if (isMobile && isLandingPage) return 'text-white';
    return 'text-popera-teal';
  };

  return (
    <header className={navClasses}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 flex items-center justify-between">
        {/* Logo - Animates from "Popera." to "P." on scroll */}
        {/* On mobile + landing page: always white. On desktop: white at top, teal when scrolled */}
        <div
          className="cursor-pointer z-50 group"
          onClick={() => handleNav(isLoggedIn ? ViewState.FEED : ViewState.LANDING)}
        >
          <Logo
            size="md"
            textColor={isLandingAtTop ? 'text-white' : isLandingPage ? 'text-white lg:text-popera-teal' : 'text-popera-teal'}
            onClick={() => handleNav(isLoggedIn ? ViewState.FEED : ViewState.LANDING)}
            isCollapsed={isScrolled}
          />
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center space-x-8">
          <button onClick={() => handleNav(ViewState.FEED)} className={`font-medium text-sm hover:opacity-80 transition-opacity ${getTextColor(false)}`}>{t('header.exploreEvents')}</button>
          <button onClick={() => handleNav(ViewState.GUIDELINES)} className={`font-medium text-sm hover:opacity-80 transition-opacity ${getTextColor(false)}`}>{t('header.community')}</button>
          <button onClick={() => handleNav(ViewState.ABOUT)} className={`font-medium text-sm hover:opacity-80 transition-opacity ${getTextColor(false)}`}>{t('header.about')}</button>
          <button onClick={() => handleNav(ViewState.BLOG)} className={`font-medium text-sm hover:opacity-80 transition-opacity ${getTextColor(false)}`}>{t('header.blog')}</button>
        </nav>

        {/* Desktop Actions - Right Side */}
        <div className="hidden lg:flex items-center space-x-6">
          {/* Language Toggle - Glass Style */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
            className={`w-9 h-9 rounded-full font-bold text-xs transition-all hover:scale-105 flex items-center justify-center ${isLandingAtTop
              ? 'border border-white/30 text-white hover:bg-white/10 backdrop-blur-sm'
              : 'bg-white/80 backdrop-blur-sm border border-gray-200/60 text-[#15383c] hover:bg-white hover:border-gray-300'
              }`}
          >
            {language === 'en' ? 'FR' : 'EN'}
          </button>
          <button className={`p-2 rounded-full transition-all ${isLandingAtTop ? 'hover:bg-white/10' : 'bg-white/80 backdrop-blur-sm border border-gray-200/60 hover:bg-white hover:border-gray-300'} ${getTextColor(false)}`}>
            <Search size={18} />
          </button>

          {isLoggedIn ? (
            <>
              {/* Host Event Button - Primary CTA */}
              <button
                onClick={() => handleNav(ViewState.CREATE_EVENT)}
                className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-[#e35e25] hover:bg-[#cf4d1d] text-white font-bold text-sm transition-all shadow-lg shadow-[#e35e25]/25 hover:shadow-xl hover:shadow-[#e35e25]/30 hover:-translate-y-0.5"
              >
                <PlusCircle size={16} /> {t('header.hostEvent')}
              </button>

              {/* Favorites Button - Glass Style */}
              <button
                onClick={() => handleNav(ViewState.FAVORITES)}
                className={`p-2 rounded-full transition-all group ${isLandingAtTop
                  ? 'hover:bg-white/10'
                  : 'bg-white/80 backdrop-blur-sm border border-gray-200/60 hover:bg-white hover:border-gray-300'
                  } ${getTextColor(false)}`}
              >
                <Heart size={18} className="group-hover:text-[#e35e25] transition-colors" />
              </button>

              {/* Notifications Button - Glass Style */}
              <button
                onClick={onNotificationsClick}
                className={`p-2 rounded-full transition-all relative group ${isLandingAtTop
                  ? 'hover:bg-white/10'
                  : 'bg-white/80 backdrop-blur-sm border border-gray-200/60 hover:bg-white hover:border-gray-300'
                  } ${getTextColor(false)}`}
              >
                <Bell size={18} />
                {unreadCount !== null && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#e35e25] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Profile Button */}
              <button
                onClick={onProfileClick}
                className="w-9 h-9 rounded-full bg-[#15383c] flex items-center justify-center text-white font-bold text-sm hover:scale-105 transition-transform ring-2 ring-white/80 overflow-hidden"
              >
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt="Profile"
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('span')) {
                        const fallback = document.createElement('span');
                        fallback.textContent = userInitials;
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <span>{userInitials}</span>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => handleNav(ViewState.AUTH)}
              className="px-5 py-2 rounded-full bg-[#e35e25] text-white font-semibold text-sm hover:bg-[#cf4d1d] transition-all shadow-lg shadow-[#e35e25]/25 hover:shadow-xl hover:-translate-y-0.5"
            >
              {t('header.signIn')}
            </button>
          )}

          {/* Desktop Menu Toggle - Right Side */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`${isLandingAtTop ? 'text-white' : 'text-popera-teal'} w-10 h-10 flex items-center justify-center hover:bg-white/10 transition-colors rounded-full relative`}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            {unreadCount !== null && unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#e35e25] rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>

        {/* Mobile Toggle - Right Side */}
        <div className="lg:hidden z-[55] flex items-center gap-2 relative">
          {/* Language Toggle - Mobile - Glass Style */}
          {/* On landing page (even when scrolled): keep transparent/white style */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
            className={`w-9 h-9 rounded-full font-bold text-xs transition-all active:scale-[0.95] touch-manipulation flex items-center justify-center ${isLandingPage && !mobileMenuOpen
              ? 'border border-white/30 text-white hover:bg-white/10 backdrop-blur-sm'
              : 'bg-white/80 backdrop-blur-sm border border-gray-200/60 text-[#15383c] hover:bg-white'
              }`}
          >
            {language === 'en' ? 'FR' : 'EN'}
          </button>

          {isLoggedIn && (
            <button
              onClick={onProfileClick}
              className="w-10 h-10 rounded-full bg-[#15383c] flex items-center justify-center text-white font-bold text-sm active:scale-[0.95] touch-manipulation ring-2 ring-white/80 overflow-hidden"
            >
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('span')) {
                      const fallback = document.createElement('span');
                      fallback.textContent = userInitials;
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <span>{userInitials}</span>
              )}
            </button>
          )}

          {/* Menu Toggle - Glass Style */}
          {/* On landing page (even when scrolled): keep transparent/white style */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`w-10 h-10 flex items-center justify-center active:scale-[0.95] touch-manipulation rounded-full transition-all relative ${isLandingPage && !mobileMenuOpen
              ? 'text-white hover:bg-white/10'
              : 'bg-white/80 backdrop-blur-sm border border-gray-200/60 text-[#15383c] hover:bg-white'
              }`}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            {unreadCount !== null && unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#e35e25] rounded-full border border-white"></span>
            )}
          </button>
        </div>
      </div>

      {/* Menu Overlay - Rendered via Portal, slides in from right - Works on Mobile and Desktop */}
      {mobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
            style={{ zIndex: 9998 }}
          />
          {/* Menu Panel - Slides in from right - Liquid Glass */}
          <div
            className="fixed top-0 right-0 bottom-0 bg-white/95 backdrop-blur-2xl border-l border-white/60 z-[9999] flex flex-col pt-20 sm:pt-24 md:pt-28 px-4 sm:px-6 md:px-8 overflow-y-auto shadow-2xl w-full max-w-[240px] sm:max-w-[260px] md:max-w-[280px]"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              animation: 'slideInRight 0.3s ease-out'
            }}
            onClick={(e) => {
              // Prevent closing when clicking inside menu
              e.stopPropagation();
            }}
          >
            {/* Back Button - Always visible at top of menu */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-end gap-2 text-popera-teal hover:text-popera-orange active:text-popera-orange transition-all touch-manipulation py-3 sm:py-2 mb-2 sm:mb-3 active:scale-[0.98] font-medium text-base sm:text-lg"
              aria-label="Close menu"
            >
              <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
              <span>{t('ui.back')}</span>
            </button>

            <nav className="flex flex-col space-y-1 sm:space-y-2 md:space-y-3 text-lg sm:text-xl md:text-2xl font-heading font-bold text-popera-teal flex-1 overflow-y-auto pb-8 sm:pb-10 md:pb-12">

              {isLoggedIn ? (
                <>
                  <button onClick={() => handleNav(ViewState.CREATE_EVENT)} className="text-right hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all flex items-center justify-end gap-3 sm:gap-3 text-[#e35e25] touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                    <Sparkles size={20} className="sm:w-5 sm:h-5 shrink-0" />
                    {t('header.hostEvent')} <PlusCircle size={22} className="sm:w-6 sm:h-6" />
                  </button>

                  <button onClick={() => handleNav(ViewState.FEED)} className="text-right hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all flex items-center justify-end gap-2 sm:gap-2 touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                    <Compass size={20} className="sm:w-5 sm:h-5 shrink-0" />
                    <span>{t('header.exploreEvents')}</span>
                  </button>

                  <button onClick={onNotificationsClick} className="text-right hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all flex items-center justify-end gap-2 sm:gap-2 touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                    <div className="relative shrink-0">
                      <Bell size={20} className="sm:w-5 sm:h-5" />
                      {unreadCount !== null && unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-2 sm:h-2 bg-[#e35e25] rounded-full"></span>}
                    </div>
                    <span>{t('header.notifications')}</span>
                  </button>

                  <button onClick={() => handleNav(ViewState.PROFILE)} className="text-right hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all flex items-center justify-end gap-2 sm:gap-2 touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                    <UserCircle size={20} className="sm:w-5 sm:h-5 shrink-0" />
                    <span>{t('header.myProfile')}</span>
                  </button>

                  <button onClick={() => handleNav(ViewState.MY_POPS)} className="text-right hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all flex items-center justify-end gap-2 sm:gap-2 touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                    <Calendar size={20} className="sm:w-5 sm:h-5 shrink-0" />
                    <span>{t('header.myPops')}</span>
                  </button>

                  <button onClick={() => handleNav(ViewState.FAVORITES)} className="text-right hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all flex items-center justify-end gap-2 sm:gap-2 touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                    <Heart size={20} className="sm:w-5 sm:h-5 shrink-0" />
                    <span>{t('header.myFavorites')}</span>
                  </button>

                  <div className="pt-4 sm:pt-6 md:pt-8 border-t border-gray-200 flex flex-col space-y-1 sm:space-y-2 md:space-y-3 mt-auto">
                    <button onClick={handleLogoutClick} className="text-right hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all flex items-center justify-end gap-2 sm:gap-2 touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                      <LogOut size={20} className="sm:w-5 sm:h-5 shrink-0" />
                      <span>{t('header.signOut')}</span>
                    </button>
                    <button onClick={() => handleNav(ViewState.DELETE_ACCOUNT)} className="text-right text-gray-500 sm:text-gray-400 hover:text-red-500 active:text-red-600 active:bg-red-50 transition-all flex items-center justify-end gap-2 sm:gap-2 text-base sm:text-lg touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                      <Trash2 size={20} className="sm:w-5 sm:h-5 shrink-0" />
                      <span>{t('header.deleteAccount')}</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button onClick={() => handleNav(ViewState.LANDING)} className="text-right hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all flex items-center justify-end gap-2 sm:gap-2 touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                    <Home size={20} className="sm:w-5 sm:h-5 shrink-0" />
                    <span>{t('header.home')}</span>
                  </button>
                  <button onClick={() => handleNav(ViewState.FEED)} className="text-right hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all flex items-center justify-end gap-2 sm:gap-2 touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                    <Compass size={20} className="sm:w-5 sm:h-5 shrink-0" />
                    <span>{t('header.exploreEvents')}</span>
                  </button>
                  <button onClick={() => handleNav(ViewState.GUIDELINES)} className="text-right hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all flex items-center justify-end gap-2 sm:gap-2 touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                    <Users size={20} className="sm:w-5 sm:h-5 shrink-0" />
                    <span>{t('header.community')}</span>
                  </button>
                  <button onClick={() => handleNav(ViewState.ABOUT)} className="text-right hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all flex items-center justify-end gap-2 sm:gap-2 touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                    <Info size={20} className="sm:w-5 sm:h-5 shrink-0" />
                    <span>{t('header.about')}</span>
                  </button>
                  <button onClick={() => handleNav(ViewState.BLOG)} className="text-right hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all flex items-center justify-end gap-2 sm:gap-2 touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]">
                    <BookOpen size={20} className="sm:w-5 sm:h-5 shrink-0" />
                    <span>{t('header.blog')}</span>
                  </button>
                  <hr className="border-gray-200 my-3 sm:my-2" />
                  <button
                    onClick={() => handleNav(ViewState.AUTH)}
                    className="text-right flex items-center justify-end text-base sm:text-lg font-medium text-gray-700 sm:text-gray-600 hover:text-popera-orange active:text-popera-orange active:bg-orange-50 transition-all touch-manipulation py-3.5 sm:py-2 min-h-[52px] sm:min-h-0 rounded-xl sm:rounded-none active:scale-[0.98]"
                  >
                    <LogIn size={20} className="sm:w-5 sm:h-5 shrink-0" />
                    <span>{t('header.signIn')}</span>
                    <User size={22} className="sm:w-6 sm:h-6" />
                  </button>
                </>
              )}
            </nav>
          </div>
        </>,
        document.body
      )}
    </header>
  );
};