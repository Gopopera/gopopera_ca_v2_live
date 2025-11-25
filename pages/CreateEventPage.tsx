import React, { useState, useEffect } from 'react';
import { ViewState } from '../types';
import { ChevronLeft, Upload, MapPin, Calendar, Clock, Plus } from 'lucide-react';
import { useEventStore } from '../stores/eventStore';
import { useUserStore } from '../stores/userStore';
import { HostPhoneVerificationModal } from '../components/auth/HostPhoneVerificationModal';

interface CreateEventPageProps {
  setViewState: (view: ViewState) => void;
}

const CATEGORIES = ['Music', 'Community', 'Markets', 'Workshop', 'Wellness', 'Shows', 'Food & Drink', 'Sports', 'Social'] as const;
const POPULAR_CITIES = [
  'Montreal, CA', 'Toronto, CA', 'Vancouver, CA', 'Ottawa, CA', 'Quebec City, CA',
  'Calgary, CA', 'Edmonton, CA', 'New York, US', 'Los Angeles, US', 'Chicago, US'
];

export const CreateEventPage: React.FC<CreateEventPageProps> = ({ setViewState }) => {
  const addEvent = useEventStore((state) => state.addEvent);
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  const refreshUserProfile = useUserStore((state) => state.refreshUserProfile);
  const [showHostVerificationModal, setShowHostVerificationModal] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number] | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [attendeesCount, setAttendeesCount] = useState(0);
  const [host, setHost] = useState('You'); // Default host name
  const [price, setPrice] = useState('Free');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check host phone verification status on mount
  // This determines if user can create events (phoneVerifiedForHosting must be true)
  useEffect(() => {
    const checkHostPhoneVerification = async () => {
      if (!user?.uid) {
        return;
      }
      
      // Refresh user profile to get latest phoneVerifiedForHosting status
      await refreshUserProfile();
    };
    
    checkHostPhoneVerification();
  }, [user, refreshUserProfile]);

  const handleHostVerificationSuccess = async () => {
    // Pull fresh profile from Firestore and close the modal
    await refreshUserProfile();
    setShowHostVerificationModal(false);
    // User can now click Submit again and this time the gating will allow publishing
    // without reopening the modal (phoneVerifiedForHosting is now true)
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Mock upload - create a data URL or use a placeholder
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      console.log('[CREATE_EVENT] Already submitting, ignoring duplicate call');
      return;
    }
    
    console.log('[CREATE_EVENT] Form submitted', {
      hasUser: !!user,
      userId: user?.uid,
      title,
      city,
      date,
      time,
      category
    });
    
    // TEMPORARILY DISABLED: Phone verification gating
    // TODO: Re-enable phone verification once SMS delivery issues are resolved
    // Gate: Check if user has verified phone for hosting
    // Refresh profile first to ensure we have latest data
    // await refreshUserProfile();
    // const freshProfile = useUserStore.getState().userProfile;
    
    // Use OR logic: userProfile.phoneVerifiedForHosting OR user.phone_verified (backward compatibility)
    // const isHostPhoneVerified = !!(freshProfile?.phoneVerifiedForHosting || user?.phone_verified);
    
    // if (!isHostPhoneVerified) {
    //   setShowHostVerificationModal(true);
    //   return;
    // }
    
    // Check if user is logged in
    if (!user?.uid) {
      alert('You must be logged in to create an event. Please sign in first.');
      console.error('[CREATE_EVENT] No user logged in');
      return;
    }
    
    // Validate required fields
    if (!title || !description || !city || !date || !time || !category) {
      const missingFields = [];
      if (!title) missingFields.push('Title');
      if (!description) missingFields.push('Description');
      if (!city) missingFields.push('City');
      if (!date) missingFields.push('Date');
      if (!time) missingFields.push('Time');
      if (!category) missingFields.push('Category');
      alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
      console.warn('[CREATE_EVENT] Missing required fields:', missingFields);
      return;
    }

    setIsSubmitting(true);
    console.log('[CREATE_EVENT] Starting event creation...');

    try {
      // Create event with all required fields
      console.log('[CREATE_EVENT] Calling addEvent with:', {
        title,
        city,
        hostId: user.uid,
        host: user.displayName || user.email || 'You'
      });
      
      const createdEvent = await addEvent({
        title,
        description,
        city,
        address,
        date,
        time,
        tags,
        host,
        hostId: user?.uid || '',
        imageUrl: imageUrl || `https://picsum.photos/seed/${title}/800/600`,
        attendeesCount,
        category: category as typeof CATEGORIES[number],
        price,
        rating: 0,
        reviewCount: 0,
        capacity: attendeesCount || undefined,
      });

      console.log('[CREATE_EVENT] ✅ Event created successfully:', {
        eventId: createdEvent.id,
        title: createdEvent.title,
        hostId: createdEvent.hostId
      });

      // Reset form
      setTitle('');
      setDescription('');
      setCity('');
      setAddress('');
      setDate('');
      setTime('');
      setCategory('');
      setTags([]);
      setImageUrl('');
      setAttendeesCount(0);
      setPrice('Free');

      // Redirect to feed
      console.log('[CREATE_EVENT] Redirecting to feed...');
      setViewState(ViewState.FEED);
    } catch (error: any) {
      console.error('[CREATE_EVENT] ❌ Error creating event:', {
        error,
        message: error?.message,
        stack: error?.stack?.substring(0, 300)
      });
      alert(`Failed to create event: ${error?.message || 'Unknown error'}. Please check the console for details.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCities = POPULAR_CITIES.filter(c => 
    c.toLowerCase().includes(city.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-20 sm:pt-24 md:pt-28 pb-12 sm:pb-16 md:pb-20 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8 md:mb-10 flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => setViewState(ViewState.FEED)} 
            className="w-9 h-9 sm:w-10 sm:h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors touch-manipulation active:scale-95 shrink-0"
          >
            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
          </button>
          <h1 className="font-heading font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[#15383c]">
            Create your next pop-up
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8 space-y-4 sm:space-y-5 md:space-y-6">
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                Event Title <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="Enter Event Title Here" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all" 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                Pop-Up Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select...</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                Event Description <span className="text-red-500">*</span>
              </label>
              <textarea 
                rows={4} 
                placeholder="Enter Description Here" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all resize-none" 
              />
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8 space-y-4 sm:space-y-5 md:space-y-6">
            <h3 className="text-base sm:text-lg font-medium text-[#15383c] mb-4">Location</h3>
            
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                City <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Enter City" 
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onFocus={() => setShowCitySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 pl-12 pr-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all" 
                />
                {showCitySuggestions && filteredCities.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-60 overflow-y-auto">
                    {filteredCities.map((cityOption) => (
                      <button
                        key={cityOption}
                        type="button"
                        onClick={() => {
                          setCity(cityOption);
                          setShowCitySuggestions(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-[#15383c] hover:bg-[#eef4f5] hover:text-[#e35e25] transition-colors border-b border-gray-50 last:border-0"
                      >
                        {cityOption}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                Address (Optional)
              </label>
              <input 
                type="text" 
                placeholder="Enter Street Address" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all" 
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8 space-y-4 sm:space-y-5 md:space-y-6">
            <h3 className="text-base sm:text-lg font-medium text-[#15383c] mb-4">Date & Time</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 pl-12 pr-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                  Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="time" 
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 pl-12 pr-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8">
            <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1 mb-3 sm:mb-4 md:mb-5">
              Add Event Picture
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="max-w-full max-h-64 rounded-lg" />
              ) : (
                <>
                  <Upload size={24} className="sm:w-7 sm:h-7 md:w-8 md:h-8 text-gray-400 mb-2" />
                  <span className="text-xs sm:text-sm md:text-base font-medium text-gray-500">Click to Upload</span>
                </>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 border border-gray-100 shadow-sm mb-6 sm:mb-8">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 pl-1 mb-2">
              Add Tags (for helping attendees search and find topics)
            </label>
            <div className="relative mb-4">
              <input 
                type="text" 
                placeholder="Enter Your Tags Here" 
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-4 pl-4 pr-16 sm:pr-20 text-base focus:outline-none focus:border-[#15383c] transition-all" 
              />
              <button 
                type="button"
                onClick={handleAddTag}
                className="absolute right-1.5 sm:right-2 top-1.5 sm:top-2 bottom-1.5 sm:bottom-2 bg-[#15383c] text-white px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold hover:bg-[#1f4d52] transition-colors touch-manipulation active:scale-95"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 bg-[#15383c]/10 text-[#15383c] px-3 py-1.5 rounded-full text-sm font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8 space-y-4 sm:space-y-5 md:space-y-6">
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                Attendees Limit (Optional)
              </label>
              <input 
                type="number" 
                placeholder="Enter Event Limit Here" 
                value={attendeesCount || ''}
                onChange={(e) => setAttendeesCount(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all" 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                Price
              </label>
              <input 
                type="text" 
                placeholder="e.g., Free, $25.00, Donation" 
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all" 
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col gap-3 sm:gap-4 md:gap-5">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 sm:py-4 md:py-4.5 bg-[#15383c] text-white font-bold rounded-full hover:bg-[#1f4d52] transition-colors shadow-lg touch-manipulation active:scale-95 text-sm sm:text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Event...' : 'Host Event'}
            </button>
            <button 
              type="button"
              onClick={() => setViewState(ViewState.FEED)}
              className="w-full py-3.5 sm:py-4 md:py-4.5 bg-gray-100 text-gray-500 font-bold rounded-full hover:bg-gray-200 transition-colors border border-gray-200 touch-manipulation active:scale-95 text-sm sm:text-base md:text-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Host Phone Verification Modal */}
      {/* This modal gates event creation - users must verify phone once to host events */}
      <HostPhoneVerificationModal
        isOpen={showHostVerificationModal}
        onClose={() => setShowHostVerificationModal(false)}
        onSuccess={handleHostVerificationSuccess}
        required={true}
      />
    </div>
  );
};
