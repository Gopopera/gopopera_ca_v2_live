import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { generateICS, buildGoogleCalendarURL } from '../utils/calendarHelpers';
import { Event } from '../../types';

interface AddToCalendarButtonProps {
  event: Event | any;
}

export const AddToCalendarButton: React.FC<AddToCalendarButtonProps> = ({ event }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAppleCalendar = () => {
    setError(null);
    const icsData = generateICS(event);
    
    if (!icsData) {
      setError('Unable to generate calendar file. Event data may be incomplete.');
      setIsOpen(false);
      return;
    }

    // Create blob and download
    const blob = new Blob([icsData.content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = icsData.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setIsOpen(false);
  };

  const handleGoogleCalendar = () => {
    setError(null);
    const googleUrl = buildGoogleCalendarURL(event);
    
    if (!googleUrl) {
      setError('Unable to generate calendar link. Event data may be incomplete.');
      setIsOpen(false);
      return;
    }

    window.open(googleUrl, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setError(null);
        }}
        className="flex-1 px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-[#15383c]/20 text-[#15383c] rounded-full font-semibold text-sm hover:bg-white hover:border-[#15383c] transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2"
      >
        <Calendar size={18} />
        <span>Add to calendar</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
          <button
            onClick={handleAppleCalendar}
            className="w-full px-4 py-3 text-left text-sm font-medium text-[#15383c] hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <span className="text-lg">🍎</span>
            Apple / iCal
          </button>
          <div className="border-t border-gray-100" />
          <button
            onClick={handleGoogleCalendar}
            className="w-full px-4 py-3 text-left text-sm font-medium text-[#15383c] hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <span className="text-lg">📅</span>
            Google Calendar
          </button>
        </div>
      )}

      {error && (
        <p className="absolute top-full left-0 right-0 mt-2 text-xs text-red-600 text-center bg-red-50 rounded-lg px-2 py-1">
          {error}
        </p>
      )}
    </div>
  );
};

