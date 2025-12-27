import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MapPin, Search } from 'lucide-react';
import { useSelectedCity, useSetCity } from '../../src/stores/cityStore';

// =============================================================================
// CONSTANTS
// =============================================================================

const POPULAR_CITIES = [
  // Show all events
  'All Locations',
  // Canada
  'Canada',
  'Montreal, CA',
  'Toronto, CA',
  'Ottawa, CA',
  'Quebec City, CA',
  'Gatineau, CA',
  'Vancouver, CA',
  // United States
  'United States',
  'New York, US',
  'Los Angeles, US',
  'Chicago, US',
  'Austin, US',
  'Miami, US',
  'San Francisco, US',
  'Seattle, US',
  'Boston, US',
];

/**
 * Aliases map EXACT normalized inputs to canonical options.
 * Keys must be fully normalized (lowercase, no punctuation).
 * IMPORTANT: "ca" is intentionally short - only triggers on exact "ca" input,
 * not on "california" or "canada" (those go through normal matching).
 */
const COUNTRY_ALIASES: Record<string, string> = {
  // United States aliases
  'us': 'United States',
  'usa': 'United States',
  'unitedstates': 'United States',
  'united states': 'United States',
  'america': 'United States',
  // Canada aliases (note: "ca" is 2 chars, won't match "california")
  'ca': 'Canada',
  'can': 'Canada',
  'canada': 'Canada',
  // All Locations aliases
  'all': 'All Locations',
  'alllocations': 'All Locations',
  'all locations': 'All Locations',
  'everywhere': 'All Locations',
};

const MAX_SUGGESTIONS = 8;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Normalize input for matching: lowercase, trim, collapse whitespace, remove punctuation
 */
function normalizeInput(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[,.']/g, '')
    .replace(/\s+/g, ' ')
    .replace(/-/g, ' ');
}

/**
 * Check if option starts with input (prefix match)
 */
function isPrefixMatch(normalized: string, normalizedInput: string): boolean {
  return normalized.startsWith(normalizedInput);
}

/**
 * Check if any word in option starts with input (word-start match)
 * e.g., "san f" matches "San Francisco, US"
 */
function isWordStartMatch(normalized: string, normalizedInput: string): boolean {
  const words = normalized.split(' ');
  const inputWords = normalizedInput.split(' ');
  
  // Check if all input words match start of corresponding option words
  let wordIndex = 0;
  for (const inputWord of inputWords) {
    // Find a word in option that starts with this input word (from current position)
    let found = false;
    for (let i = wordIndex; i < words.length; i++) {
      if (words[i].startsWith(inputWord)) {
        wordIndex = i + 1;
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

/**
 * Check if option contains input (substring match)
 * Only used for inputs >= 3 chars to avoid false positives
 */
function isContainsMatch(normalized: string, normalizedInput: string): boolean {
  return normalizedInput.length >= 3 && normalized.includes(normalizedInput);
}

// =============================================================================
// COMPONENT
// =============================================================================

interface CityInputProps {
  className?: string;
}

export const CityInput: React.FC<CityInputProps> = ({ className = '' }) => {
  const selectedCity = useSelectedCity();
  const setCity = useSetCity();
  const [inputValue, setInputValue] = useState(selectedCity || 'All Locations');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Initialize input value from selected city
  useEffect(() => {
    setInputValue(selectedCity || 'All Locations');
  }, [selectedCity]);

  // Build ranked suggestions based on input
  // RANKING ORDER (highest to lowest priority):
  // 1. Alias match (e.g., "us" → "United States") - EXACT alias key match only
  // 2. Exact match (normalized input === normalized option)
  // 3. Prefix match (option starts with input)
  // 4. Word-start match (e.g., "san f" → "San Francisco, US")
  // 5. Contains match (substring, only for input >= 3 chars)
  const suggestions = useMemo(() => {
    const rawInput = inputValue.trim();
    const normalizedInput = normalizeInput(rawInput);
    
    // Empty input: show popular cities as default
    if (!normalizedInput) {
      return POPULAR_CITIES.slice(0, MAX_SUGGESTIONS);
    }
    
    // Check for EXACT alias match (e.g., "us" or "usa" → "United States")
    // This is a strict equality check, so "california" won't match "ca"
    const aliasMatch = COUNTRY_ALIASES[normalizedInput];
    
    // Categorize matches by quality
    const exact: string[] = [];
    const prefix: string[] = [];
    const wordStart: string[] = [];
    const contains: string[] = [];
    
    for (const city of POPULAR_CITIES) {
      const normalized = normalizeInput(city);
      
      if (normalized === normalizedInput) {
        exact.push(city);
      } else if (isPrefixMatch(normalized, normalizedInput)) {
        prefix.push(city);
      } else if (isWordStartMatch(normalized, normalizedInput)) {
        wordStart.push(city);
      } else if (isContainsMatch(normalized, normalizedInput)) {
        contains.push(city);
      }
    }
    
    // Combine in priority order: alias first (if not already matched), then by match quality
    const results: string[] = [];
    if (aliasMatch && !exact.includes(aliasMatch)) {
      results.push(aliasMatch);
    }
    results.push(...exact, ...prefix, ...wordStart, ...contains);
    
    // De-duplicate and limit to MAX_SUGGESTIONS
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const r of results) {
      if (!seen.has(r)) {
        seen.add(r);
        deduped.push(r);
      }
      if (deduped.length >= MAX_SUGGESTIONS) break;
    }
    
    return deduped;
  }, [inputValue]);

  // Show "Search for..." option when:
  // 1. Input has >= 2 characters (avoid single-char searches)
  // 2. Input doesn't exactly match a preset option (case-insensitive)
  const showSearchOption = useMemo(() => {
    const rawInput = inputValue.trim();
    if (rawInput.length < 2) return false;
    
    const lowerInput = rawInput.toLowerCase();
    const hasExactMatch = POPULAR_CITIES.some(
      city => city.toLowerCase() === lowerInput
    );
    
    return !hasExactMatch;
  }, [inputValue]);

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions, showSuggestions]);

  // Handle selection from preset options
  // Updates both inputValue (display) and selectedCity (store) simultaneously
  const handleSelectCity = useCallback((city: string) => {
    setInputValue(city);
    setCity(city);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  }, [setCity]);

  // Handle "Search for..." or Enter key submission
  // Uses raw input value (trimmed) - no suffix appended
  const handleSearchFor = useCallback(() => {
    const rawInput = inputValue.trim();
    if (rawInput) {
      setCity(rawInput);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    }
  }, [inputValue, setCity]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setShowSuggestions(true);
        e.preventDefault();
      }
      return;
    }
    
    const totalItems = suggestions.length + (showSearchOption ? 1 : 0);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < totalItems - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : totalItems - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectCity(suggestions[highlightedIndex]);
        } else if (highlightedIndex === suggestions.length && showSearchOption) {
          handleSearchFor();
        } else if (inputValue.trim()) {
          // No highlight but has input - submit as search
          handleSearchFor();
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
        
      case 'Tab':
        // Allow tab to close suggestions naturally
        setShowSuggestions(false);
        break;
    }
  }, [showSuggestions, suggestions, showSearchOption, highlightedIndex, handleSelectCity, handleSearchFor, inputValue]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && suggestionsRef.current) {
      const items = suggestionsRef.current.querySelectorAll('[data-suggestion]');
      const item = items[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleInputBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      // If input is empty, reset to selected city
      if (!inputValue.trim()) {
        setInputValue(selectedCity || 'All Locations');
      }
    }, 200);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasSuggestions = suggestions.length > 0 || showSearchOption;

  return (
    <form 
      ref={containerRef} 
      onSubmit={(e) => { e.preventDefault(); handleSearchFor(); }} 
      className={`relative w-full ${className}`}
    >
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
          onKeyDown={handleKeyDown}
          placeholder="City or Country (e.g. Montreal, New York)"
          className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-white border border-gray-200 rounded-full text-sm sm:text-base font-bold text-[#15383c] focus:outline-none focus:border-[#15383c] focus:ring-2 focus:ring-[#15383c]/10 shadow-sm hover:shadow-md transition-all placeholder-gray-400"
          role="combobox"
          aria-expanded={showSuggestions && hasSuggestions}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          autoComplete="off"
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && hasSuggestions && (
        <div 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-80 overflow-y-auto animate-fade-in z-50"
          role="listbox"
        >
          {suggestions.length > 0 && (
            <>
              <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50">
                Suggestions
              </div>
              {suggestions.map((city, index) => {
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={city}
                    type="button"
                    data-suggestion
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectCity(city);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors border-b border-gray-50 last:border-0 ${
                      isHighlighted 
                        ? 'bg-[#eef4f5] text-[#e35e25]' 
                        : 'text-[#15383c] hover:bg-[#eef4f5] hover:text-[#e35e25]'
                    }`}
                    role="option"
                    aria-selected={isHighlighted}
                  >
                    {city}
                  </button>
                );
              })}
            </>
          )}
          
          {/* "Search for..." option */}
          {showSearchOption && (
            <>
              {suggestions.length > 0 && (
                <div className="border-t border-gray-100" />
              )}
              <button
                type="button"
                data-suggestion
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSearchFor();
                }}
                onMouseEnter={() => setHighlightedIndex(suggestions.length)}
                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
                  highlightedIndex === suggestions.length
                    ? 'bg-[#eef4f5] text-[#e35e25]' 
                    : 'text-gray-600 hover:bg-[#eef4f5] hover:text-[#e35e25]'
                }`}
                role="option"
                aria-selected={highlightedIndex === suggestions.length}
              >
                <Search size={14} className="opacity-60" />
                <span>Search for "<span className="font-semibold">{inputValue.trim()}</span>"</span>
              </button>
            </>
          )}
        </div>
      )}
    </form>
  );
};
