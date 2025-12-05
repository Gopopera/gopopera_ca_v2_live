import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useFilterStore } from '../../stores/filterStore';
import { ALL_VIBES } from '../../utils/vibes';
import { createPortal } from 'react-dom';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: any[]; // Event[] - using any to avoid circular import
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({ isOpen, onClose, events }) => {
  const { filters, setFilter, resetFilters, getActiveFilterCount } = useFilterStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    location: true,
    groupSize: true,
    sessionFrequency: true,
    sessionMode: true,
    vibes: true,
    circleContinuity: true,
  });

  // Get unique countries and cities from events
  const countries = React.useMemo(() => {
    const countrySet = new Set<string>();
    events.forEach(event => {
      if (event.country) countrySet.add(event.country);
    });
    return Array.from(countrySet).sort();
  }, [events]);

  const cities = React.useMemo(() => {
    const citySet = new Set<string>();
    events.forEach(event => {
      if (event.city) citySet.add(event.city);
      // Also check if country filter is set, only show cities from that country
      if (filters.country && event.country === filters.country && event.city) {
        citySet.add(event.city);
      } else if (!filters.country && event.city) {
        citySet.add(event.city);
      }
    });
    return Array.from(citySet).sort();
  }, [events, filters.country]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCountryChange = (country: string) => {
    if (filters.country === country) {
      setFilter('country', null);
      setFilter('city', null); // Reset city when country is cleared
    } else {
      setFilter('country', country);
      setFilter('city', null); // Reset city when country changes
    }
  };

  const handleCityChange = (city: string) => {
    if (filters.city === city) {
      setFilter('city', null);
    } else {
      setFilter('city', city);
    }
  };

  const handleGroupSizeChange = (size: 'tiny' | 'small' | 'larger' | null) => {
    setFilter('groupSize', filters.groupSize === size ? null : size);
  };

  const handleSessionFrequencyToggle = (frequency: string) => {
    const current = filters.sessionFrequency;
    if (current.includes(frequency)) {
      setFilter('sessionFrequency', current.filter(f => f !== frequency));
    } else {
      setFilter('sessionFrequency', [...current, frequency]);
    }
  };

  const handleSessionModeToggle = (mode: string) => {
    const current = filters.sessionMode;
    if (current.includes(mode)) {
      setFilter('sessionMode', current.filter(m => m !== mode));
    } else {
      setFilter('sessionMode', [...current, mode]);
    }
  };

  const handleVibeToggle = (vibe: string) => {
    const current = filters.vibes;
    if (current.includes(vibe)) {
      setFilter('vibes', current.filter(v => v !== vibe));
    } else {
      setFilter('vibes', [...current, vibe]);
    }
  };

  const handleCircleContinuityChange = (continuity: 'startingSoon' | 'ongoing' | null) => {
    setFilter('circleContinuity', filters.circleContinuity === continuity ? null : continuity);
  };

  const activeFilterCount = getActiveFilterCount();

  if (!isOpen) return null;

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div 
        className="fixed top-0 right-0 bottom-0 bg-white z-[9999] flex flex-col w-full max-w-[420px] shadow-2xl overflow-y-auto"
        style={{ 
          animation: 'slideInRight 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Filter size={20} className="text-[#15383c]" />
            <h2 className="text-xl font-heading font-bold text-[#15383c]">Filters</h2>
            {activeFilterCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#e35e25] text-white text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            aria-label="Close filters"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="flex-1 px-6 py-6 space-y-6">
          {/* Location Section */}
          <div className="border-b border-gray-200 pb-6">
            <button
              onClick={() => toggleSection('location')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-heading font-bold text-[#15383c]">Location</h3>
              {expandedSections.location ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </button>
            
            {expandedSections.location && (
              <div className="space-y-4">
                {/* Country Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <div className="space-y-2">
                    {countries.map(country => (
                      <button
                        key={country}
                        onClick={() => handleCountryChange(country)}
                        className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors ${
                          filters.country === country
                            ? 'bg-[#15383c] text-white border-[#15383c]'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-[#e35e25] hover:text-[#e35e25]'
                        }`}
                      >
                        {country}
                      </button>
                    ))}
                  </div>
                </div>

                {/* City Selector */}
                {filters.country && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {cities.map(city => (
                        <button
                          key={city}
                          onClick={() => handleCityChange(city)}
                          className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors ${
                            filters.city === city
                              ? 'bg-[#15383c] text-white border-[#15383c]'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-[#e35e25] hover:text-[#e35e25]'
                          }`}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Group Size Section */}
          <div className="border-b border-gray-200 pb-6">
            <button
              onClick={() => toggleSection('groupSize')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-heading font-bold text-[#15383c]">Group Size</h3>
              {expandedSections.groupSize ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </button>
            
            {expandedSections.groupSize && (
              <div className="space-y-2">
                {[
                  { value: 'tiny', label: 'Tiny Circles (2–5)' },
                  { value: 'small', label: 'Small Circles (5–10)' },
                  { value: 'larger', label: 'Larger Circles (10+)' },
                ].map(size => (
                  <button
                    key={size.value}
                    onClick={() => handleGroupSizeChange(size.value as any)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors ${
                      filters.groupSize === size.value
                        ? 'bg-[#15383c] text-white border-[#15383c]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#e35e25] hover:text-[#e35e25]'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Session Frequency Section */}
          <div className="border-b border-gray-200 pb-6">
            <button
              onClick={() => toggleSection('sessionFrequency')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-heading font-bold text-[#15383c]">Session Frequency</h3>
              {expandedSections.sessionFrequency ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </button>
            
            {expandedSections.sessionFrequency && (
              <div className="space-y-2">
                {['Weekly', 'Monthly', 'One-Time', 'Flexible'].map(frequency => (
                  <button
                    key={frequency}
                    onClick={() => handleSessionFrequencyToggle(frequency)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors flex items-center justify-between ${
                      filters.sessionFrequency.includes(frequency)
                        ? 'bg-[#15383c] text-white border-[#15383c]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#e35e25] hover:text-[#e35e25]'
                    }`}
                  >
                    <span>{frequency === 'One-Time' ? 'One-Time Session' : frequency}</span>
                    {filters.sessionFrequency.includes(frequency) && (
                      <span className="text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Session Mode Section */}
          <div className="border-b border-gray-200 pb-6">
            <button
              onClick={() => toggleSection('sessionMode')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-heading font-bold text-[#15383c]">Session Mode</h3>
              {expandedSections.sessionMode ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </button>
            
            {expandedSections.sessionMode && (
              <div className="space-y-2">
                {['In-Person', 'Remote'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => handleSessionModeToggle(mode)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors flex items-center justify-between ${
                      filters.sessionMode.includes(mode)
                        ? 'bg-[#15383c] text-white border-[#15383c]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#e35e25] hover:text-[#e35e25]'
                    }`}
                  >
                    <span>{mode === 'In-Person' ? 'In-Person Session' : 'Remote Session'}</span>
                    {filters.sessionMode.includes(mode) && (
                      <span className="text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vibes Section */}
          <div className="border-b border-gray-200 pb-6">
            <button
              onClick={() => toggleSection('vibes')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-heading font-bold text-[#15383c]">Vibes</h3>
              {expandedSections.vibes ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </button>
            
            {expandedSections.vibes && (
              <div className="flex flex-wrap gap-2">
                {ALL_VIBES.map(vibe => (
                  <button
                    key={vibe}
                    onClick={() => handleVibeToggle(vibe)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      filters.vibes.includes(vibe)
                        ? 'bg-[#15383c] text-white border-[#15383c]'
                        : 'bg-white text-[#15383c] border-[#15383c]/20 hover:border-[#e35e25] hover:text-[#e35e25]'
                    }`}
                  >
                    {vibe}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Circle Continuity Section */}
          <div className="border-b border-gray-200 pb-6">
            <button
              onClick={() => toggleSection('circleContinuity')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-heading font-bold text-[#15383c]">Circle Continuity</h3>
              {expandedSections.circleContinuity ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </button>
            
            {expandedSections.circleContinuity && (
              <div className="space-y-2">
                {[
                  { value: 'startingSoon', label: 'Starting Soon ↠ Circles beginning their first sessions' },
                  { value: 'ongoing', label: 'Ongoing ↠ Circles that already started and still have available spots' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleCircleContinuityChange(option.value as any)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors ${
                      filters.circleContinuity === option.value
                        ? 'bg-[#15383c] text-white border-[#15383c]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#e35e25] hover:text-[#e35e25]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={resetFilters}
            className="flex-1 px-4 py-3 rounded-full border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-full bg-[#15383c] text-white font-medium hover:bg-[#1f4d52] transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : null;
};

