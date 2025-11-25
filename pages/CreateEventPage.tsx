import React, { useState, useEffect } from 'react';
import { ViewState } from '../types';
import { ChevronLeft, Upload, MapPin, Calendar, Clock, Plus, X, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { useEventStore } from '../stores/eventStore';
import { useUserStore } from '../stores/userStore';
import { HostPhoneVerificationModal } from '../components/auth/HostPhoneVerificationModal';
import { uploadImage } from '../firebase/storage';

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
  const [imageUrl, setImageUrl] = useState(''); // Legacy single image (for preview)
  const [imageUrls, setImageUrls] = useState<string[]>([]); // Array of uploaded image URLs
  const [imageFiles, setImageFiles] = useState<File[]>([]); // Array of files to upload
  const [imagePreviews, setImagePreviews] = useState<string[]>([]); // Base64 previews for UI
  const [uploadingImage, setUploadingImage] = useState(false);
  const [whatToExpect, setWhatToExpect] = useState('');
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    // Process each selected file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`"${file.name}" is not an image file. Please select image files only.`);
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`"${file.name}" is too large. Image size must be less than 5MB.`);
        continue;
      }

      newFiles.push(file);
      
      // Create preview immediately using data URL (for UI only)
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        setImagePreviews(prev => [...prev, preview]);
      };
      reader.readAsDataURL(file);
    }

    if (newFiles.length > 0) {
      setImageFiles(prev => [...prev, ...newFiles]);
      console.log('[CREATE_EVENT] Images selected, will upload to Storage on submit:', {
        count: newFiles.length,
        files: newFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
      });
    }

    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
    // Update legacy imageUrl if this was the first image
    if (index === 0 && imageUrls.length > 1) {
      setImageUrl(imageUrls[1] || '');
    } else if (index === 0) {
      setImageUrl('');
    }
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === imageFiles.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap files
    const newFiles = [...imageFiles];
    [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]];
    setImageFiles(newFiles);

    // Swap previews
    const newPreviews = [...imagePreviews];
    [newPreviews[index], newPreviews[newIndex]] = [newPreviews[newIndex], newPreviews[index]];
    setImagePreviews(newPreviews);

    // Swap URLs if already uploaded
    if (imageUrls.length > 0) {
      const newUrls = [...imageUrls];
      [newUrls[index], newUrls[newIndex]] = [newUrls[newIndex], newUrls[index]];
      setImageUrls(newUrls);
      // Update legacy imageUrl
      if (newIndex === 0) {
        setImageUrl(newUrls[0] || '');
      }
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

    // Check if device is online before attempting Firestore write
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      alert('You appear to be offline. Please check your internet connection and try again.');
      console.error('[CREATE_EVENT] Device is offline');
      return;
    }
    
    setIsSubmitting(true);
    
    // Log Firebase project info for verification
    const app = (await import('../src/lib/firebase')).getAppSafe();
    const projectId = app?.options?.projectId;
    console.log('[CREATE_EVENT] Starting event creation...', {
      isOnline: navigator?.onLine,
      connectionType: (navigator as any)?.connection?.effectiveType || 'unknown',
      firebaseProjectId: projectId || 'NOT CONNECTED',
      userId: user?.uid,
      userEmail: user?.email
    });
    
    if (!projectId) {
      alert('Firebase is not connected. Please refresh the page and try again.');
      setIsSubmitting(false);
      return;
    }
    
    if (projectId !== 'gopopera2026') {
      console.warn('[CREATE_EVENT] ⚠️ WARNING: Connected to wrong Firebase project!', {
        expected: 'gopopera2026',
        actual: projectId
      });
    }
    
    // Upload images to Firebase Storage if image files were selected
    let finalImageUrls: string[] = [];
    let finalImageUrl = `https://picsum.photos/seed/${title}/800/600`; // Default placeholder
    
    if (imageFiles.length > 0 && user?.uid) {
      try {
        console.log('[CREATE_EVENT] Uploading', imageFiles.length, 'image(s) to Firebase Storage...');
        setUploadingImage(true);
        
        // Upload all images in order
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const imagePath = `events/${user.uid}/${Date.now()}_${i}_${file.name}`;
          const uploadedUrl = await uploadImage(imagePath, file);
          finalImageUrls.push(uploadedUrl);
          console.log(`[CREATE_EVENT] ✅ Image ${i + 1}/${imageFiles.length} uploaded:`, uploadedUrl);
        }
        
        // Set main image (first in array)
        finalImageUrl = finalImageUrls[0] || finalImageUrl;
        console.log('[CREATE_EVENT] ✅ All images uploaded successfully. Main image:', finalImageUrl);
      } catch (uploadError: any) {
        console.error('[CREATE_EVENT] ❌ Image upload failed:', uploadError);
        alert(`Failed to upload image: ${uploadError?.message || 'Unknown error'}. Please try again or use a different image.`);
        setIsSubmitting(false);
        setUploadingImage(false);
        return;
      } finally {
        setUploadingImage(false);
      }
    } else if (imageUrls.length > 0) {
      // Images were already uploaded in a previous attempt
      finalImageUrls = imageUrls;
      finalImageUrl = imageUrls[0] || finalImageUrl;
    } else if (imageUrl && !imageUrl.startsWith('data:')) {
      // Legacy single image URL (not base64)
      finalImageUrl = imageUrl;
      finalImageUrls = [imageUrl];
    }
    
    try {
      // Create event with all required fields
      console.log('[CREATE_EVENT] Calling addEvent with:', {
        title,
        city,
        hostId: user.uid,
        host: user.displayName || user.email || 'You'
      });
      
      // Add timeout to detect if addEvent is hanging
      const EVENT_CREATION_TIMEOUT = 30000; // 30 seconds
      const addEventPromise = addEvent({
        title,
        description,
        city,
        address,
        date,
        time,
        tags,
        host,
        hostId: user?.uid || '',
        imageUrl: finalImageUrl, // Main image (backward compatibility)
        imageUrls: finalImageUrls.length > 0 ? finalImageUrls : undefined, // Array of all images
        whatToExpect: whatToExpect || undefined,
        attendeesCount,
        category: category as typeof CATEGORIES[number],
        price,
        rating: 0,
        reviewCount: 0,
        capacity: attendeesCount || undefined,
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Event creation timed out after 30 seconds. Firestore may be slow or unresponsive.'));
        }, EVENT_CREATION_TIMEOUT);
      });
      
      console.log('[CREATE_EVENT] Waiting for addEvent to complete (timeout: 30s)...');
      const createdEvent = await Promise.race([addEventPromise, timeoutPromise]) as any;

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
      setImageUrls([]);
      setImageFiles([]);
      setImagePreviews([]);
      setUploadingImage(false);
      setWhatToExpect('');
      setAttendeesCount(0);
      setPrice('Free');

      // Redirect to feed
      console.log('[CREATE_EVENT] Redirecting to feed...');
      setViewState(ViewState.FEED);
    } catch (error: any) {
      console.error('[CREATE_EVENT] ❌ Error creating event:', {
        error,
        message: error?.message,
        code: error?.code,
        stack: error?.stack?.substring(0, 300)
      });
      
      // Check for timeout
      if (error?.message?.includes('timed out')) {
        alert('Event creation timed out. This might be a network issue or Firestore is slow. Please try again.');
      } else if (error?.code === 'permission-denied') {
        alert('Permission denied. You may not have permission to create events. Please check your account status.');
      } else if (error?.code === 'unavailable' || error?.message?.includes('offline') || error?.message?.includes('unavailable')) {
        alert('Firestore is unavailable. The device may be offline or Firestore is experiencing issues. Please check your internet connection and try again.');
        console.error('[CREATE_EVENT] Offline/unavailable error:', {
          code: error?.code,
          message: error?.message,
          isOnline: navigator?.onLine
        });
      } else {
        alert(`Failed to create event: ${error?.message || 'Unknown error'}. Please check the console for details.`);
      }
    } finally {
      setIsSubmitting(false);
      console.log('[CREATE_EVENT] Submission state cleared');
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
            
            {/* What to Expect - Optional */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1 flex items-center gap-2">
                <Sparkles size={16} className="text-popera-orange" />
                What to Expect <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea 
                rows={4} 
                placeholder="Describe what attendees can expect at your event..." 
                value={whatToExpect}
                onChange={(e) => setWhatToExpect(e.target.value)}
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

          {/* Image Upload - Multiple Images */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8">
            <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1 mb-3 sm:mb-4 md:mb-5">
              Add Event Pictures <span className="text-gray-400 font-normal">(First image is the main photo)</span>
            </label>
            
            {/* Image Gallery Preview */}
            {(imagePreviews.length > 0 || imageUrls.length > 0) && (
              <div className="mb-4 space-y-3">
                <div className="flex flex-wrap gap-3">
                  {(imagePreviews.length > 0 ? imagePreviews : imageUrls).map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                        <img 
                          src={preview} 
                          alt={`Preview ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        {index === 0 && (
                          <div className="absolute top-1 left-1 bg-popera-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            Main
                          </div>
                        )}
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove image"
                        >
                          <X size={14} />
                        </button>
                        {/* Reorder Buttons */}
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMoveImage(index, 'up')}
                            className="absolute bottom-1 left-1 bg-white/90 text-gray-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            aria-label="Move up"
                          >
                            <ArrowUp size={12} />
                          </button>
                        )}
                        {index < (imagePreviews.length > 0 ? imagePreviews.length : imageUrls.length) - 1 && (
                          <button
                            type="button"
                            onClick={() => handleMoveImage(index, 'down')}
                            className="absolute bottom-1 right-1 bg-white/90 text-gray-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            aria-label="Move down"
                          >
                            <ArrowDown size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploadingImage}
              />
              {uploadingImage ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#15383c] mx-auto mb-2"></div>
                  <p className="text-xs sm:text-sm text-gray-600">Uploading images...</p>
                </div>
              ) : (
                <>
                  <Upload size={24} className="sm:w-7 sm:h-7 md:w-8 md:h-8 text-gray-400 mb-2" />
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 font-medium">Click to upload or drag and drop</p>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB each (multiple images supported)</p>
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
