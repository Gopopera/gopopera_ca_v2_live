import React, { useState, useMemo } from 'react';
import { ViewState, Event } from '../../types';
import { ChevronLeft, Heart, Filter, Calendar, MapPin, Search } from 'lucide-react';
import { EventCard } from '../../components/events/EventCard';
import { useLanguage } from '../../contexts/LanguageContext';

interface FavoritesPageProps {
  setViewState: (view: ViewState) => void;
  events: Event[];
  onEventClick: (event: Event) => void;
  onChatClick: (e: React.MouseEvent, event: Event) => void;
  onReviewsClick: (e: React.MouseEvent, event: Event) => void;
  favorites: string[];
  onToggleFavorite: (e: React.MouseEvent, eventId: string) => void;
}

type SortOption = 'date' | 'rating' | 'name';

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ 
  setViewState, 
  events, 
  onEventClick, 
  onChatClick, 
  onReviewsClick, 
  favorites, 
  onToggleFavorite 
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [selectedCity, setSelectedCity] = useState<string>('all');

  const favoriteEvents = useMemo(() => {
    let filtered = events.filter(event => favorites.includes(event.id));

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.hostName?.toLowerCase().includes(query)
      );
    }

    // Apply city filter
    if (selectedCity !== 'all') {
      filtered = filtered.filter(event => 
        event.city?.toLowerCase().includes(selectedCity.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'name':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [events, favorites, searchQuery, selectedCity, sortBy]);

  // Get unique cities from favorite events
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    events
      .filter(event => favorites.includes(event.id))
      .forEach(event => {
        if (event.city) citySet.add(event.city);
      });
    return Array.from(citySet).sort();
  }, [events, favorites]);

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-20 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center">
            <button 
              onClick={() => setViewState(ViewState.PROFILE)} 
              className="mr-3 sm:mr-4 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors active:scale-95 touch-manipulation shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c]">{t('favorites.myFavorites')}</h1>
              <Heart className="text-[#e35e25] fill-[#e35e25]" size={24} />
              {favoriteEvents.length > 0 && (
                <span className="px-3 py-1 bg-[#e35e25]/10 text-[#e35e25] rounded-full text-sm font-bold">
                  {favoriteEvents.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        {favoriteEvents.length > 0 && (
          <div className="mb-6 sm:mb-8 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={t('favorites.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#15383c] focus:ring-2 focus:ring-[#15383c]/10 shadow-sm"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* City Filter */}
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gray-400" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#15383c] focus:ring-2 focus:ring-[#15383c]/10 shadow-sm cursor-pointer"
                >
                  <option value="all">{t('favorites.allCities')}</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Sort Filter */}
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#15383c] focus:ring-2 focus:ring-[#15383c]/10 shadow-sm cursor-pointer"
                >
                  <option value="date">{t('favorites.sortByDate')}</option>
                  <option value="rating">{t('favorites.sortByRating')}</option>
                  <option value="name">{t('favorites.sortByName')}</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Events Grid */}
        {favoriteEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {favoriteEvents.map(event => (
              <div key={event.id} className="w-full h-auto">
                <EventCard 
                  event={event} 
                  onClick={onEventClick} 
                  onChatClick={onChatClick} 
                  onReviewsClick={onReviewsClick} 
                  isLoggedIn={true} 
                  isFavorite={true} 
                  onToggleFavorite={onToggleFavorite} 
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl sm:rounded-3xl border-2 border-dashed border-gray-200 shadow-sm">
            <div className="w-20 h-20 bg-[#e35e25]/10 rounded-full flex items-center justify-center mb-4">
              <Heart size={40} className="text-[#e35e25]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#15383c] mb-2">
              {searchQuery || selectedCity !== 'all' ? t('favorites.noMatchingFavorites') : t('favorites.noFavoritesYet')}
            </h3>
            <p className="text-gray-500 text-sm sm:text-base max-w-md mb-6">
              {searchQuery || selectedCity !== 'all' 
                ? t('favorites.tryAdjusting')
                : t('favorites.startFavoriting')}
            </p>
            {(searchQuery || selectedCity !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCity('all');
                }}
                className="px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#cf4d1d] transition-colors shadow-md shadow-orange-900/20"
              >
                {t('favorites.clearFilters')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};