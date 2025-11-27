import React, { useState, useRef, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { useSelectedCity, useSetCity } from '../../src/stores/cityStore';

const POPULAR_CITIES = [
  'Canada',
  'Montreal, CA',
  'Toronto, CA',
  'Ottawa, CA',
  'Quebec City, CA',
  'Gatineau, CA',
  'Vancouver, CA',
];

interface CityInputProps {
  className?: string;
}

export const CityInput: React.FC<CityInputProps> = ({ className = '' }) => {
  const selectedCity = useSelectedCity();
  const setCity = useSetCity();
  const [inputValue, setInputValue] = useState(selectedCity || 'Canada');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize input value from selected city
  useEffect(() => {
    setInputValue(selectedCity || 'Canada');
  }, [selectedCity]);

  // Filter suggestions based on input
  const filteredCities = POPULAR_CITIES.filter(city =>
    city.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(value.length > 0);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setCity(inputValue.trim());
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSelectCity = (city: string) => {
    setInputValue(city);
    setCity(city);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    setShowSuggestions(inputValue.length > 0);
  };

  const handleInputBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setShowSuggestions(false);
      // If input is empty, reset to selected city
      if (!inputValue.trim()) {
        setInputValue(selectedCity || 'Canada');
      }
    }, 200);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <form ref={containerRef} onSubmit={handleInputSubmit} className={`relative w-full ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <MapPin size={18} className="text-[#e35e25]" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder="City or Country (e.g. Canada, Montreal)"
          className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-white border border-gray-200 rounded-full text-sm sm:text-base font-bold text-[#15383c] focus:outline-none focus:border-[#15383c] focus:ring-2 focus:ring-[#15383c]/10 shadow-sm hover:shadow-md transition-all placeholder-gray-400"
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredCities.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto animate-fade-in z-50">
          <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50">
            Popular Cities
          </div>
          {filteredCities.map((city) => (
            <button
              key={city}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectCity(city);
              }}
              className="w-full text-left px-4 py-3 text-sm font-medium text-[#15383c] hover:bg-[#eef4f5] hover:text-[#e35e25] transition-colors border-b border-gray-50 last:border-0"
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </form>
  );
};

