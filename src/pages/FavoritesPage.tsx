import React, { useState, useMemo } from 'react';
import { ViewState, Event } from '../../types';
import { ChevronLeft, Heart, Filter, Calendar, MapPin, Search, Star, Clock } from 'lucide-react';
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

// Format date helper
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Format rating helper
const formatRating = (rating: number): string => {
  if (!rating || rating === 0) return '0.0';
  return rating.toFixed(1);
};

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
    <div className="min-h-screen bg-[#15383c] pt-20 sm:pt-24 pb-8 sm:pb-12 text-white font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <button 
          onClick={() => setViewState(ViewState.PROFILE)} 
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"
        >
          <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-3 sm:mb-4">
            <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl">
              {t('favorites.myFavorites')}
            </h1>
            <Heart className="text-[#e35e25] fill-[#e35e25]" size={32} />
          </div>
          <p className="text-gray-300 text-base sm:text-lg max-w-2xl mx-auto">
            Events you've saved for later
          </p>
          {favoriteEvents.length > 0 && (
            <span className="inline-block mt-4 px-4 py-1.5 bg-[#e35e25]/10 text-[#e35e25] rounded-full text-sm font-bold border border-[#e35e25]/20">
              {favoriteEvents.length} {favoriteEvents.length === 1 ? 'event' : 'events'}
            </span>
          )}
        </div>

        {/* Filters and Search */}
        {favorites.length > 0 && (
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
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#e35e25]/50 focus:ring-2 focus:ring-[#e35e25]/20"
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
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#e35e25]/50 cursor-pointer appearance-none pr-8"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                >
                  <option value="all" className="bg-[#15383c]">{t('favorites.allCities')}</option>
                  {cities.map(city => (
                    <option key={city} value={city} className="bg-[#15383c]">{city}</option>
                  ))}
                </select>
              </div>

              {/* Sort Filter */}
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#e35e25]/50 cursor-pointer appearance-none pr-8"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                >
                  <option value="date" className="bg-[#15383c]">{t('favorites.sortByDate')}</option>
                  <option value="rating" className="bg-[#15383c]">{t('favorites.sortByRating')}</option>
                  <option value="name" className="bg-[#15383c]">{t('favorites.sortByName')}</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Events Grid */}
        {favoriteEvents.length > 0 ? (
          <div className="space-y-4 sm:space-y-5">
            {favoriteEvents.map(event => {
              const eventImage = event.imageUrls?.[0] || event.imageUrl || `https://picsum.photos/seed/${event.id}/400/300`;
              
              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="bg-white/5 rounded-2xl sm:rounded-3xl border border-white/10 hover:border-[#e35e25]/50 hover:bg-white/10 transition-all cursor-pointer overflow-hidden group active:scale-[0.98] touch-manipulation"
                >
                  <div className="flex flex-col sm:flex-row gap-0 sm:gap-4 p-0 sm:p-4">
                    {/* Event Image */}
                    <div className="w-full sm:w-40 md:w-48 h-48 sm:h-40 md:h-48 rounded-t-2xl sm:rounded-xl overflow-hidden flex-shrink-0 bg-white/10 relative">
                      <img 
                        src={eventImage} 
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://picsum.photos/seed/${event.id}/400/300`;
                        }}
                      />
                      {/* Rating Badge Overlay */}
                      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
                        <Star size={12} className="text-[#e35e25] fill-[#e35e25]" />
                        <span className="text-xs font-bold text-white">{formatRating(event.rating)}</span>
                      </div>
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => onToggleFavorite(e, event.id)}
                        className="absolute top-3 left-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:bg-black/70"
                      >
                        <Heart size={16} className="text-[#e35e25] fill-[#e35e25]" />
                      </button>
                    </div>

                    {/* Event Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between p-4 sm:p-0">
                      <div>
                        <h3 className="font-heading font-bold text-lg sm:text-xl text-white mb-2 line-clamp-2 group-hover:text-[#e35e25] transition-colors">
                          {event.title}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium mb-3">
                          Hosted by {event.hostName}
                        </p>

                        {/* Date, Location */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <div className="w-8 h-8 bg-[#e35e25]/20 rounded-lg flex items-center justify-center">
                              <Calendar size={14} className="text-[#e35e25]" />
                            </div>
                            <span className="font-medium">{formatDate(event.date)}</span>
                            <span className="text-gray-500">•</span>
                            <Clock size={14} className="text-gray-500" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <div className="w-8 h-8 bg-[#e35e25]/20 rounded-lg flex items-center justify-center">
                              <MapPin size={14} className="text-[#e35e25]" />
                            </div>
                            <span className="truncate">{event.location || event.city}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center bg-white/5 rounded-2xl sm:rounded-3xl border border-white/10">
            <div className="w-20 h-20 bg-[#e35e25]/10 rounded-full flex items-center justify-center mb-4">
              <Heart size={40} className="text-[#e35e25]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              {searchQuery || selectedCity !== 'all' ? t('favorites.noMatchingFavorites') : t('favorites.noFavoritesYet')}
            </h3>
            <p className="text-gray-400 text-sm sm:text-base max-w-md px-4 mb-6">
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
                className="px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#cf4d1d] transition-colors shadow-md"
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
