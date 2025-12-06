import React, { useState, useMemo } from 'react';
import { ViewState, Event } from '../types';
import { ChevronLeft, ChevronRight, MapPin, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { useUserStore } from '../stores/userStore';
import { formatDate } from '../utils/dateFormatter';
import { getMainCategoryLabelFromEvent } from '../utils/categoryMapper';

interface MyCalendarPageProps {
  setViewState: (view: ViewState) => void;
  events: Event[];
  onEventClick: (event: Event) => void;
}

// Minimized Event Component for bottom panel
const MinimizedEventCard: React.FC<{ event: Event; onClick: () => void }> = ({ event, onClick }) => {
  const imageUrl = event.imageUrls && event.imageUrls.length > 0 
    ? event.imageUrls[0] 
    : (event.imageUrl || `https://picsum.photos/seed/${event.id}/200/150`);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
    >
      {/* Event Image */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-popera-teal to-[#1f4d52]">
        <img
          src={imageUrl}
          alt={event.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://picsum.photos/seed/${event.id}/200/150`;
          }}
        />
      </div>

      {/* Event Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-heading font-semibold text-[#15383c] text-sm sm:text-base line-clamp-1">
            {event.title}
          </h3>
          <span className="text-xs font-bold text-[#e35e25] bg-[#e35e25]/10 px-2 py-0.5 rounded-full flex-shrink-0">
            {getMainCategoryLabelFromEvent(event)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600 mb-1">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            <span className="truncate">{event.city}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 line-clamp-1">{event.hostName}</p>
      </div>
    </div>
  );
};

export const MyCalendarPage: React.FC<MyCalendarPageProps> = ({ setViewState, events, onEventClick }) => {
  const user = useUserStore((state) => state.user);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Filter events to only show user's hosting and attending events
  const userEvents = useMemo(() => {
    if (!user) return [];
    
    return events.filter(event => {
      // Include hosting events
      const isHosting = event.hostId === user.uid || user.hostedEvents?.includes(event.id);
      // Include attending events (RSVP'd)
      const isAttending = user.rsvps?.includes(event.id);
      
      return (isHosting || isAttending) && !event.isDraft;
    });
  }, [events, user]);

  // Parse event date string to Date object
  const parseEventDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    
    try {
      // Handle YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      // Try parsing as ISO string
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
    }
    return null;
  };

  // Group events by date (YYYY-MM-DD format)
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    
    userEvents.forEach(event => {
      const eventDate = parseEventDate(event.date);
      if (eventDate) {
        const dateKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
      }
    });
    
    return grouped;
  }, [userEvents]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[selectedDate] || [];
  }, [selectedDate, eventsByDate]);

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: Array<{ date: number; dateKey: string; hasEvents: boolean; eventCount: number }> = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: 0, dateKey: '', hasEvents: false, eventCount: 0 });
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = eventsByDate[dateKey] || [];
      days.push({
        date: day,
        dateKey,
        hasEvents: dayEvents.length > 0,
        eventCount: dayEvents.length
      });
    }
    
    return days;
  }, [year, month, daysInMonth, startingDayOfWeek, eventsByDate]);

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSelectedDate(todayKey);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-20 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center">
            <button 
              onClick={() => setViewState(ViewState.MY_POPS)} 
              className="mr-3 sm:mr-4 w-9 h-9 sm:w-10 sm:h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors touch-manipulation active:scale-95"
            >
              <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
            </button>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c]">Your Calendar</h1>
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-[#15383c] hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden mb-6">
          {/* Month Header */}
          <div className="p-5 sm:p-6 md:p-8 flex items-center justify-between border-b border-gray-100">
            <button
              onClick={goToPreviousMonth}
              className="w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={20} className="text-[#15383c]" />
            </button>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#e35e25] tracking-wide">
              {monthNames[month]} <span className="text-[#15383c]">{year}</span>
            </h2>
            <button
              onClick={goToNextMonth}
              className="w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center transition-colors"
            >
              <ChevronRight size={20} className="text-[#15383c]" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-4 sm:p-6">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const isToday = day.dateKey === todayKey;
                const isSelected = day.dateKey === selectedDate;
                const isEmpty = day.date === 0;

                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (!isEmpty && day.hasEvents) {
                        setSelectedDate(day.dateKey);
                      } else {
                        setSelectedDate(null);
                      }
                    }}
                    disabled={isEmpty}
                    className={`
                      aspect-square rounded-lg transition-all touch-manipulation
                      ${isEmpty 
                        ? 'cursor-default' 
                        : 'cursor-pointer hover:bg-gray-50 active:scale-95'
                      }
                      ${isToday 
                        ? 'ring-2 ring-[#e35e25] ring-offset-1' 
                        : ''
                      }
                      ${isSelected 
                        ? 'bg-[#e35e25] text-white' 
                        : 'bg-white text-[#15383c]'
                      }
                      ${!isEmpty && day.hasEvents && !isSelected
                        ? 'bg-[#e35e25]/10 border border-[#e35e25]/20'
                        : ''
                      }
                    `}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className={`text-sm sm:text-base font-medium ${isSelected ? 'text-white' : ''}`}>
                        {day.date || ''}
                      </span>
                      {day.hasEvents && !isEmpty && (
                        <div className="flex items-center justify-center gap-0.5 mt-0.5">
                          {day.eventCount > 0 && (
                            <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#e35e25]'}`} />
                          )}
                          {day.eventCount > 1 && (
                            <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-[#e35e25]/70'}`} />
                          )}
                          {day.eventCount > 2 && (
                            <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/60' : 'bg-[#e35e25]/50'}`} />
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Date Events Panel */}
        {selectedDate && selectedDateEvents.length > 0 && (
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-gray-100">
              <h3 className="text-lg sm:text-xl font-heading font-bold text-[#15383c]">
                {formatDate(selectedDate)} • {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'Event' : 'Events'}
              </h3>
            </div>
            <div className="p-5 sm:p-6 space-y-3 max-h-[400px] overflow-y-auto">
              {selectedDateEvents.map(event => (
                <MinimizedEventCard
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {userEvents.length === 0 && (
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-gray-100 p-12 text-center">
            <CalendarIcon size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-[#15383c] mb-2">No events scheduled</h3>
            <p className="text-gray-500 text-sm mb-6">
              Start hosting or RSVP to events to see them on your calendar
            </p>
            <button
              onClick={() => setViewState(ViewState.CREATE_EVENT)}
              className="px-6 py-3 bg-[#e35e25] text-white rounded-full font-medium hover:bg-[#cf4d1d] transition-colors"
            >
              Create Your First Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
