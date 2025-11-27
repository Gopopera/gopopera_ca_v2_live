import React, { useState, useEffect } from 'react';
import { ViewState, Event } from '../types';
import { ChevronLeft, Upload, MapPin, Calendar, Clock, Plus, X, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { useEventStore } from '../stores/eventStore';
import { useUserStore } from '../stores/userStore';
import { uploadImage } from '../firebase/storage';
import { compressImage, shouldCompressImage } from '../utils/imageCompression';
import { getEventById } from '../firebase/db';

interface EditEventPageProps {
  setViewState: (view: ViewState) => void;
  eventId?: string; // Event ID to edit
  event?: Event; // Or pass the event directly
}

const CATEGORIES = ['Music', 'Community', 'Markets', 'Workshop', 'Wellness', 'Shows', 'Food & Drink', 'Sports', 'Social'] as const;
const POPULAR_CITIES = [
  'Montreal, CA', 'Toronto, CA', 'Vancouver, CA', 'Ottawa, CA', 'Quebec City, CA',
  'Calgary, CA', 'Edmonton, CA', 'New York, US', 'Los Angeles, US', 'Chicago, US'
];

export const EditEventPage: React.FC<EditEventPageProps> = ({ setViewState, eventId, event: initialEvent }) => {
  const updateEvent = useEventStore((state) => state.updateEvent);
  const user = useUserStore((state) => state.user);
  const [loading, setLoading] = useState(!!initialEvent); // Load if no initial event provided
  
  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [city, setCity] = useState(initialEvent?.city || '');
  const [address, setAddress] = useState(initialEvent?.address || '');
  const [date, setDate] = useState(initialEvent?.date || '');
  const [time, setTime] = useState(initialEvent?.time || '');
  const [category, setCategory] = useState<typeof CATEGORIES[number] | ''>(initialEvent?.category || '');
  const [tags, setTags] = useState<string[]>(initialEvent?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [imageUrl, setImageUrl] = useState(initialEvent?.imageUrl || '');
  const [imageUrls, setImageUrls] = useState<string[]>(initialEvent?.imageUrls || []);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>(initialEvent?.imageUrls || []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [whatToExpect, setWhatToExpect] = useState(initialEvent?.whatToExpect || '');
  const [attendeesCount, setAttendeesCount] = useState(initialEvent?.attendeesCount || 0);
  const [host, setHost] = useState(initialEvent?.host || 'You');
  const [price, setPrice] = useState(initialEvent?.price || 'Free');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load event if eventId provided but no initial event
  useEffect(() => {
    if (eventId && !initialEvent) {
      const loadEvent = async () => {
        setLoading(true);
        try {
          const event = await getEventById(eventId);
          if (event) {
            setTitle(event.title);
            setDescription(event.description);
            setCity(event.city);
            setAddress(event.address);
            setDate(event.date);
            setTime(event.time);
            setCategory(event.category);
            setTags(event.tags || []);
            setImageUrl(event.imageUrl);
            setImageUrls(event.imageUrls || []);
            setImagePreviews(event.imageUrls || [event.imageUrl].filter(Boolean));
            setWhatToExpect(event.whatToExpect || '');
            setAttendeesCount(event.attendeesCount || 0);
            setHost(event.host || event.hostName || 'You');
            setPrice(event.price || 'Free');
          }
        } catch (error) {
          console.error('Error loading event:', error);
          alert('Failed to load event. Please try again.');
          setViewState(ViewState.MY_POPS);
        } finally {
          setLoading(false);
        }
      };
      loadEvent();
    }
  }, [eventId, initialEvent, setViewState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      alert('You must be logged in to edit an event.');
      return;
    }

    if (!eventId && !initialEvent?.id) {
      alert('Event ID is required.');
      return;
    }

    const eventIdToUpdate = eventId || initialEvent?.id || '';

    // Validate required fields
    if (!title || !description || !city || !time || !category) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload new images if any
      let finalImageUrls = imageUrls;
      let finalImageUrl = imageUrl;

      if (imageFiles.length > 0 && user?.uid) {
        try {
          console.log('[EDIT_EVENT] Uploading', imageFiles.length, 'new image(s)...');
          setUploadingImage(true);
          
          const compressAndUploadImage = async (file: File, path: string): Promise<string> => {
            let fileToUpload = file;
            
            if (shouldCompressImage(file, 1)) {
              try {
                fileToUpload = await compressImage(file, {
                  maxWidth: 1600,
                  maxHeight: 1600,
                  quality: 0.80,
                  maxSizeMB: 2
                });
              } catch (compressError) {
                console.warn('[EDIT_EVENT] Compression failed, uploading original:', compressError);
              }
            }
            
            return await uploadImage(path, fileToUpload, { timeout: 90000 });
          };
          
          const timestamp = Date.now();
          const uploadPromises = imageFiles.map(async (file, i) => {
            const imagePath = `events/${user.uid}/${timestamp}_${i}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            return await compressAndUploadImage(file, imagePath);
          });
          
          const newImageUrls = await Promise.all(uploadPromises);
          finalImageUrls = [...imageUrls, ...newImageUrls];
          finalImageUrl = finalImageUrls[0] || finalImageUrl;
        } catch (uploadError: any) {
          console.error('[EDIT_EVENT] Image upload failed:', uploadError);
          alert(`Failed to upload images: ${uploadError?.message || 'Unknown error'}. The event will be updated without new images.`);
        } finally {
          setUploadingImage(false);
        }
      }

      // Update event in Firestore
      console.log('[EDIT_EVENT] Updating event:', eventIdToUpdate);
      await updateEvent(eventIdToUpdate, {
        title,
        description,
        city,
        address,
        time, // Date is NOT editable
        category: category as typeof CATEGORIES[number],
        tags,
        imageUrl: finalImageUrl,
        imageUrls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
        whatToExpect: whatToExpect || undefined,
        attendeesCount,
        price,
        host,
        capacity: attendeesCount || undefined,
      });

      alert('Event updated successfully!');
      setViewState(ViewState.MY_POPS);
    } catch (error: any) {
      console.error('[EDIT_EVENT] Error updating event:', error);
      alert(`Failed to update event: ${error?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        alert(`"${file.name}" is not an image file.`);
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert(`"${file.name}" is too large. Maximum size is 50MB.`);
        continue;
      }
      newFiles.push(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        setImagePreviews(prev => [...prev, preview]);
      };
      reader.readAsDataURL(file);
    }

    if (newFiles.length > 0) {
      setImageFiles(prev => [...prev, ...newFiles]);
    }

    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    if (index < imageUrls.length) {
      // Remove from existing URLs
      setImageUrls(prev => prev.filter((_, i) => i !== index));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
      if (index === 0 && imageUrls.length > 1) {
        setImageUrl(imageUrls[1] || '');
      } else if (index === 0) {
        setImageUrl('');
      }
    } else {
      // Remove from new files
      const fileIndex = index - imageUrls.length;
      setImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const filteredCities = POPULAR_CITIES.filter(c => 
    c.toLowerCase().includes(city.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafb] pt-20 sm:pt-24 md:pt-28 pb-12 sm:pb-16 md:pb-20 font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#15383c] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-20 sm:pt-24 md:pt-28 pb-12 sm:pb-16 md:pb-20 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8 md:mb-10 flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => setViewState(ViewState.MY_POPS)} 
            className="w-9 h-9 sm:w-10 sm:h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors touch-manipulation active:scale-95 shrink-0"
          >
            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
          </button>
          <h1 className="font-heading font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[#15383c]">
            Edit Event
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
                  onChange={(e) => {
                    setCity(e.target.value);
                    setShowCitySuggestions(true);
                  }}
                  onFocus={() => setShowCitySuggestions(true)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 pl-11 pr-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all" 
                />
                {showCitySuggestions && filteredCities.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {filteredCities.map((cityOption) => (
                      <button
                        key={cityOption}
                        type="button"
                        onClick={() => {
                          setCity(cityOption);
                          setShowCitySuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
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
                placeholder="Enter Address" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all" 
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8 space-y-4 sm:space-y-5 md:space-y-6">
            <h3 className="text-base sm:text-lg font-medium text-[#15383c] mb-4">Date & Time</h3>
            
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                Date <span className="text-gray-400 font-normal">(Not editable)</span>
              </label>
              <input 
                type="text" 
                value={date}
                disabled
                className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base text-gray-500 cursor-not-allowed" 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                Time <span className="text-red-500">*</span>
              </label>
              <input 
                type="time" 
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all" 
              />
            </div>
          </div>

          {/* Images - Same as CreateEventPage */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-medium text-[#15383c] mb-4">Event Images</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#15383c] transition-colors">
                <Upload size={24} className="text-gray-400 mb-2" />
                <span className="text-xs text-gray-500">Add Image</span>
                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Tags - Same as CreateEventPage */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-medium text-[#15383c] mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-[#15383c] text-white rounded-full text-sm">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-200">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-[#15383c]"
              />
              <button type="button" onClick={addTag} className="px-4 py-2 bg-[#15383c] text-white rounded-xl hover:bg-[#1f4d52] transition-colors">
                Add
              </button>
            </div>
          </div>

          {/* Capacity & Price - Same as CreateEventPage */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8 space-y-4 sm:space-y-5 md:space-y-6">
            <h3 className="text-base sm:text-lg font-medium text-[#15383c] mb-4">Capacity & Pricing</h3>
            
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                Maximum Attendees (0 for unlimited)
              </label>
              <input 
                type="number" 
                value={attendeesCount}
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
              disabled={isSubmitting || uploadingImage}
              className="w-full py-3.5 sm:py-4 md:py-4.5 bg-[#15383c] text-white font-bold rounded-full hover:bg-[#1f4d52] transition-colors shadow-lg touch-manipulation active:scale-95 text-sm sm:text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingImage ? 'Uploading Images...' : isSubmitting ? 'Updating Event...' : 'Update Event'}
            </button>
            <button 
              type="button"
              onClick={() => setViewState(ViewState.MY_POPS)}
              className="w-full py-3.5 sm:py-4 md:py-4.5 bg-gray-100 text-gray-500 font-bold rounded-full hover:bg-gray-200 transition-colors border border-gray-200 touch-manipulation active:scale-95 text-sm sm:text-base md:text-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

