import React, { useState, useEffect } from 'react';
import { ViewState, Event } from '../../types';
import { ChevronLeft, Upload, MapPin, Calendar, Clock, Plus, X, ArrowUp, ArrowDown, Sparkles, Trash2, FileText } from 'lucide-react';
import { useEventStore } from '../../stores/eventStore';
import { useUserStore } from '../../stores/userStore';
import { uploadImage } from '../../firebase/imageStorage';
import { processImageForUploadLazy, prefetchImageProcessing } from '../lib/imageProcessingLoader';
import { getActiveReservationCountForEvent, getEventById, updateEvent, deleteEvent } from '../../firebase/db';
import { geocodeAddress } from '../../utils/geocoding';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  type EventVibe,
  getVibeLabel,
  presetToEventVibe,
  createCustomVibe,
  validateCustomVibeLabel,
  normalizeLegacyVibes,
  getVibePresetsForCategory,
  MAX_VIBES,
  MIN_VIBES,
  MAX_VIBE_LABEL_LENGTH,
} from '../../src/constants/vibes';
import { 
  MAIN_CATEGORIES, 
  MAIN_CATEGORY_LABELS, 
  MAIN_CATEGORY_LABELS_FR, 
  type MainCategory 
} from '../../utils/categoryMapper';

interface EditEventPageProps {
  setViewState: (view: ViewState) => void;
  eventId?: string; // Event ID to edit
  event?: Event; // Or pass the event directly
}
const POPULAR_CITIES = [
  'Montreal, CA', 'Toronto, CA', 'Vancouver, CA', 'Ottawa, CA', 'Quebec City, CA',
  'Calgary, CA', 'Edmonton, CA', 'New York, US', 'Los Angeles, US', 'Chicago, US'
];

export const EditEventPage: React.FC<EditEventPageProps> = ({ setViewState, eventId, event: initialEvent }) => {
  const { language } = useLanguage();
  const updateEventInStore = useEventStore((state) => state.updateEvent);
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  const [loading, setLoading] = useState(!initialEvent); // Load if no initial event provided
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [city, setCity] = useState(initialEvent?.city || '');
  const [address, setAddress] = useState(initialEvent?.address || '');
  const [date, setDate] = useState(initialEvent?.date || '');
  const [time, setTime] = useState(initialEvent?.time || '');
  // Convert legacy vibes to EventVibe[] format
  const [selectedVibes, setSelectedVibes] = useState<EventVibe[]>(() => {
    if (!initialEvent?.vibes) return [];
    return normalizeLegacyVibes(initialEvent.vibes);
  });
  // Custom vibe input fields
  const [customVibeEN, setCustomVibeEN] = useState('');
  const [customVibeFR, setCustomVibeFR] = useState('');
  const [customVibeError, setCustomVibeError] = useState<string | null>(null);
  // Store mainCategory for preset filtering - now editable
  const [mainCategory, setMainCategory] = useState<MainCategory | ''>(
    (initialEvent?.mainCategory as MainCategory) || ''
  );
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
  const [reservationCount, setReservationCount] = useState<number | null>(null);
  const [originalEvent, setOriginalEvent] = useState<Event | null>(initialEvent || null);

  // Prefetch image processing chunk on mount (non-blocking)
  // This warms the cache before user uploads, improving perceived speed
  useEffect(() => {
    prefetchImageProcessing();
  }, []);

  // Sync original event when provided directly
  useEffect(() => {
    if (initialEvent) {
      setOriginalEvent(initialEvent);
    }
  }, [initialEvent]);

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
            setMainCategory((event.mainCategory as MainCategory) || '');
            setSelectedVibes(event.vibes ? normalizeLegacyVibes(event.vibes) : []);
            setTags(event.tags || []);
            setImageUrl(event.imageUrl);
            setImageUrls(event.imageUrls || []);
            setImagePreviews(event.imageUrls || [event.imageUrl].filter(Boolean));
            setWhatToExpect(event.whatToExpect || '');
            setAttendeesCount(event.attendeesCount || 0);
            setHost(event.host || event.hostName || 'You');
            setPrice(event.price || 'Free');
            setOriginalEvent(event);
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

  useEffect(() => {
    const eventIdToCheck = eventId || initialEvent?.id;
    if (!eventIdToCheck) return;
    let isMounted = true;
    
    const fetchReservationCount = async () => {
      try {
        const count = await getActiveReservationCountForEvent(eventIdToCheck);
        if (isMounted) {
          setReservationCount(count);
        }
      } catch (error) {
        if (isMounted) {
          setReservationCount(0);
        }
      }
    };
    
    fetchReservationCount();
    
    return () => {
      isMounted = false;
    };
  }, [eventId, initialEvent?.id]);

  const handleUpdate = async (e: React.FormEvent) => {
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
    
    // Verify user is the host of this event
    let eventToEdit = initialEvent;
    if (!eventToEdit && eventIdToUpdate) {
      try {
        eventToEdit = await getEventById(eventIdToUpdate);
      } catch (error) {
        console.error('[EDIT_EVENT] Error loading event for verification:', error);
      }
    }
    
    if (!eventToEdit) {
      alert('Event not found.');
      return;
    }
    
    if (eventToEdit.hostId && eventToEdit.hostId !== user.uid) {
      alert('You can only edit events that you are hosting.');
      return;
    }

    // Validate required fields
    if (!title || !description || !city || !date || !time || selectedVibes.length === 0) {
      alert('Please fill in all required fields, including at least one vibe.');
      return;
    }
    
    // Validate vibes selection (1-3)
    if (selectedVibes.length < MIN_VIBES || selectedVibes.length > MAX_VIBES) {
      alert(language === 'fr' 
        ? `Veuillez sélectionner entre ${MIN_VIBES} et ${MAX_VIBES} vibes pour votre cercle.`
        : `Please select ${MIN_VIBES} to ${MAX_VIBES} vibes for your circle.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const original = originalEvent || eventToEdit;
      const dateTimeChanged = !!original && (date !== (original.date || '') || time !== (original.time || ''));
      
      if (dateTimeChanged) {
        const activeCount = await getActiveReservationCountForEvent(eventIdToUpdate);
        if (activeCount > 0) {
          alert('Someone just reserved a spot. Date changes are now locked.');
          if (original) {
            setDate(original.date || '');
            setTime(original.time || '');
          }
          setReservationCount(activeCount);
          setIsSubmitting(false);
          return;
        }
      }
      
      // Store ORIGINAL image URLs from the event (before any user modifications)
      // This ensures we can fall back to original images if upload fails
      const originalImageUrl = initialEvent?.imageUrl || eventToEdit?.imageUrl || '';
      const originalImageUrls = initialEvent?.imageUrls || eventToEdit?.imageUrls || [];
      
      // Start with remaining existing URLs (after user removed some)
      let finalImageUrls = [...imageUrls];
      let finalImageUrl = imageUrl;

      if (imageFiles.length > 0 && user?.uid) {
        try {
          console.log('[EDIT_EVENT] Uploading', imageFiles.length, 'new image(s)...');
          setUploadingImage(true);
          
          // Verify user is authenticated before attempting upload
          if (!user?.uid) {
            throw new Error('You must be logged in to upload images.');
          }
          
          const processAndUploadImage = async (file: File, path: string): Promise<string> => {
            // Process image (HEIC conversion + compression) - ensures images are never too large
            // Using lazy loader to defer loading the heavy image processing chunk until needed
            const processed = await processImageForUploadLazy(file, {
              maxWidth: 1600,
              maxHeight: 1600,
              quality: 0.75, // Slightly lower quality for better compression
              maxSizeMB: 1.5 // Target 1.5MB max for faster uploads
            });
            
            const processedFile = processed.file;
            console.log(`[EDIT_EVENT] Processed image: ${file.name} → ${(processedFile.size / 1024 / 1024).toFixed(2)}MB${processed.wasConverted ? ' (converted from HEIC)' : ''}`);
            
            // Verify path format matches storage rules: events/{userId}/{imageName}
            if (!path.startsWith(`events/${user.uid}/`)) {
              throw new Error(`Invalid image path format. Expected: events/${user.uid}/..., got: ${path}`);
            }
            
            console.log('[EDIT_EVENT] Uploading image to path:', path);
            return await uploadImage(path, processedFile, { 
              retries: 3, // More retries for reliability
              maxUploadTime: 180000 // 180 seconds (3 minutes) - generous timeout
            });
          };
          
          const timestamp = Date.now();
          
          // Upload images one by one for better error handling and progress
          const newImageUrls: string[] = [];
          for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const imagePath = `events/${user.uid}/${timestamp}_${i}_${sanitizedFileName}`;
            
            console.log(`[EDIT_EVENT] Uploading image ${i + 1}/${imageFiles.length}: ${file.name}`);
            
            try {
              const uploadedUrl = await processAndUploadImage(file, imagePath);
              newImageUrls.push(uploadedUrl);
              console.log(`[EDIT_EVENT] ✅ Image ${i + 1}/${imageFiles.length} uploaded successfully`);
            } catch (singleUploadError: any) {
              console.error(`[EDIT_EVENT] Failed to upload image ${i + 1}:`, singleUploadError);
              // Continue trying other images
            }
          }
          
          if (newImageUrls.length > 0) {
            // At least some images uploaded successfully
            finalImageUrls = [...imageUrls, ...newImageUrls];
            finalImageUrl = finalImageUrls[0] || finalImageUrl;
            console.log('[EDIT_EVENT] ✅ Successfully uploaded', newImageUrls.length, 'of', imageFiles.length, 'image(s)');
            
            if (newImageUrls.length < imageFiles.length) {
              alert(`Note: ${newImageUrls.length} of ${imageFiles.length} images uploaded successfully. Some images failed but the event will be saved.`);
            }
          } else {
            // ALL uploads failed - ask user what to do
            console.error('[EDIT_EVENT] ❌ All image uploads failed');
            const keepOriginal = confirm(
              'Failed to upload new images.\n\n' +
              'Click OK to keep the original event images.\n' +
              'Click Cancel to go back and try again.'
            );
            
            if (keepOriginal) {
              // Restore original images
              finalImageUrls = originalImageUrls.length > 0 ? [...originalImageUrls] : [];
              finalImageUrl = originalImageUrl || '';
              console.log('[EDIT_EVENT] Restoring original images:', finalImageUrls);
            } else {
              // User wants to retry - abort the save
              setIsSubmitting(false);
              setUploadingImage(false);
              return;
            }
          }
        } catch (uploadError: any) {
          console.error('[EDIT_EVENT] Image upload failed:', uploadError);
          const errorMessage = uploadError?.message || 'Unknown error';
          
          // Ask user what to do
          const keepOriginal = confirm(
            `Image upload failed: ${errorMessage}\n\n` +
            'Click OK to keep the original event images.\n' +
            'Click Cancel to go back and try again.'
          );
          
          if (keepOriginal) {
            // Restore original images
            finalImageUrls = originalImageUrls.length > 0 ? [...originalImageUrls] : [];
            finalImageUrl = originalImageUrl || '';
            console.log('[EDIT_EVENT] Restoring original images after error');
          } else {
            // User wants to retry - abort the save
            setIsSubmitting(false);
            setUploadingImage(false);
            return;
          }
        } finally {
          setUploadingImage(false);
        }
      }
      
      // SAFETY CHECK: Ensure we always have at least ONE image
      // If somehow we ended up with no images, restore originals
      if (finalImageUrls.length === 0 && !finalImageUrl) {
        console.warn('[EDIT_EVENT] No images after processing, restoring originals');
        if (originalImageUrls.length > 0) {
          finalImageUrls = [...originalImageUrls];
          finalImageUrl = originalImageUrls[0];
        } else if (originalImageUrl) {
          finalImageUrl = originalImageUrl;
          finalImageUrls = [originalImageUrl];
        }
      }

      // Geocode address if address changed
      let lat = initialEvent?.lat;
      let lng = initialEvent?.lng;
      if (address && (address !== initialEvent?.address || city !== initialEvent?.city)) {
        try {
          // geocodeAddress requires (address, city) as separate arguments
          const coords = await geocodeAddress(address, city);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
          }
        } catch (geocodeError) {
          console.warn('[EDIT_EVENT] Geocoding failed:', geocodeError);
          // Continue without coordinates
        }
      }

      // Get host name from user profile (most accurate)
      const hostName = userProfile?.name || userProfile?.displayName || user?.displayName || user?.name || user?.email?.split('@')[0] || 'Unknown Host';
      const hostPhotoURL = userProfile?.photoURL || userProfile?.imageUrl || user?.photoURL || user?.profileImageUrl || undefined;

      // Update event in Firestore using the db function (ensures proper sync)
      console.log('[EDIT_EVENT] Updating event:', eventIdToUpdate);
      await updateEvent(eventIdToUpdate, {
        title,
        description,
        city,
        address,
        date,
        time,
        mainCategory: mainCategory || undefined, // Category can now be updated
        vibes: selectedVibes.length > 0 ? selectedVibes : undefined,
        tags,
        imageUrl: finalImageUrl,
        imageUrls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
        whatToExpect: whatToExpect || undefined,
        attendeesCount,
        price,
        host: hostName, // Use actual name, never 'You'
        hostPhotoURL, // Store host photo URL
        capacity: attendeesCount || undefined,
        lat,
        lng,
      });

      // Also update in store for immediate UI sync
      await updateEventInStore(eventIdToUpdate, {
        title,
        description,
        city,
        address,
        date,
        time,
        mainCategory: mainCategory || undefined, // Category can now be updated
        vibes: selectedVibes.length > 0 ? selectedVibes : undefined,
        tags,
        imageUrl: finalImageUrl,
        imageUrls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
        whatToExpect: whatToExpect || undefined,
        attendeesCount,
        price,
        host: hostName,
        capacity: attendeesCount || undefined,
      });

      alert('Event updated successfully!');
      setViewState(ViewState.MY_POPS);
    } catch (error: any) {
      console.error('[EDIT_EVENT] Error updating event:', error);
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        alert('Someone just reserved a spot. Date changes are now locked.');
      } else {
        alert(`Failed to update event: ${error?.message || 'Unknown error'}. Please try again.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDraft = async () => {
    if (!user?.uid) {
      alert('You must be logged in to edit an event.');
      return;
    }

    const eventIdToUpdate = eventId || initialEvent?.id || '';
    if (!eventIdToUpdate) {
      alert('Event ID is required.');
      return;
    }

    if (!confirm('Convert this event to draft? It will be hidden from public pages but remain visible in your drafts.')) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert to draft by setting isDraft=true and isPublic=false
      await updateEvent(eventIdToUpdate, {
        isDraft: true,
        isPublic: false,
      });

      // Also update in store
      await updateEventInStore(eventIdToUpdate, {
        isDraft: true,
        isPublic: false,
      });

      alert('Event converted to draft successfully!');
      setViewState(ViewState.MY_POPS);
    } catch (error: any) {
      console.error('[EDIT_EVENT] Error converting to draft:', error);
      alert(`Failed to convert to draft: ${error?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user?.uid) {
      alert('You must be logged in to delete an event.');
      return;
    }

    const eventIdToDelete = eventId || initialEvent?.id || '';
    if (!eventIdToDelete) {
      alert('Event ID is required.');
      return;
    }

    // Show confirmation modal
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    const eventIdToDelete = eventId || initialEvent?.id || '';
    if (!eventIdToDelete) return;

    setIsDeleting(true);
    setShowDeleteConfirm(false);

    try {
      // Delete event from Firestore and Storage
      await deleteEvent(eventIdToDelete, true);

      // Also remove from store
      useEventStore.getState().deleteEvent(eventIdToDelete);

      alert('Event deleted successfully!');
      setViewState(ViewState.MY_POPS);
    } catch (error: any) {
      console.error('[EDIT_EVENT] Error deleting event:', error);
      alert(`Failed to delete event: ${error?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type - HEIC will be converted automatically
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const isHEIC = fileExtension === 'heic' || fileExtension === 'heif';
      const isValidImageType = file.type.startsWith('image/') || isHEIC;
      
      if (!isValidImageType) {
        alert(`"${file.name}" is not a supported image file. Please select JPEG, PNG, GIF, WebP, or HEIC files.`);
        continue;
      }
      
      // Accept larger files - they will be compressed before upload
      const MAX_INPUT_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_INPUT_FILE_SIZE) {
        alert(`"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 50MB. Please use a smaller image.`);
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

  const isDateTimeLocked = (reservationCount ?? 0) > 0;
  const normalizeStrings = (values: string[] = []) => [...values].sort().join('|');
  const originalVibeKeys = originalEvent ? normalizeStrings(normalizeLegacyVibes(originalEvent.vibes || []).map(v => v.key)) : '';
  const currentVibeKeys = normalizeStrings(selectedVibes.map(v => v.key));
  const dateTimeChanged = originalEvent
    ? date !== (originalEvent.date || '') || time !== (originalEvent.time || '')
    : false;
  const hasNonDateTimeChanges = originalEvent
    ? (
      title !== (originalEvent.title || '') ||
      description !== (originalEvent.description || '') ||
      city !== (originalEvent.city || '') ||
      address !== (originalEvent.address || '') ||
      mainCategory !== ((originalEvent.mainCategory as MainCategory) || '') ||
      normalizeStrings(tags) !== normalizeStrings(originalEvent.tags || []) ||
      imageUrl !== (originalEvent.imageUrl || '') ||
      normalizeStrings(imageUrls) !== normalizeStrings(originalEvent.imageUrls || []) ||
      imageFiles.length > 0 ||
      whatToExpect !== (originalEvent.whatToExpect || '') ||
      attendeesCount !== (originalEvent.attendeesCount || 0) ||
      price !== (originalEvent.price || 'Free') ||
      currentVibeKeys !== originalVibeKeys
    )
    : false;
  const isSaveDisabled = isSubmitting || uploadingImage || isDeleting || (isDateTimeLocked && dateTimeChanged && !hasNonDateTimeChanges);

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

        <form onSubmit={handleUpdate}>
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

            {/* Main Category Selector */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                {language === 'fr' ? 'Catégorie principale' : 'Main Category'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select 
                  value={mainCategory}
                  onChange={(e) => {
                    const newCategory = e.target.value as MainCategory | '';
                    setMainCategory(newCategory);
                    // Clear vibes when category changes (they're filtered by category)
                    setSelectedVibes([]);
                  }}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all appearance-none cursor-pointer"
                >
                  <option value="">{language === 'fr' ? 'Sélectionner une catégorie' : 'Select a category'}</option>
                  {MAIN_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {language === 'fr' ? MAIN_CATEGORY_LABELS_FR[cat] : MAIN_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vibes / Subcategories - Multi-select */}
            <div className="space-y-3">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                {language === 'fr' ? 'Vibes' : 'Vibes'} <span className="text-red-500">*</span> <span className="text-gray-400 font-normal text-xs">{language === 'fr' ? `(Sélectionnez ${MIN_VIBES}-${MAX_VIBES})` : `(Select ${MIN_VIBES}-${MAX_VIBES})`}</span>
              </label>
              
              {/* Selected vibes display */}
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[60px]">
                {selectedVibes.length === 0 ? (
                  <span className="text-gray-400 text-sm">
                    {mainCategory 
                      ? (language === 'fr' ? 'Aucun vibe sélectionné' : 'No vibes selected')
                      : (language === 'fr' ? 'Sélectionnez d\'abord une catégorie principale' : 'Select a main category first')
                    }
                  </span>
                ) : (
                  selectedVibes.map((vibe) => (
                    <span
                      key={vibe.key}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#15383c] text-white text-sm font-medium"
                    >
                      {getVibeLabel(vibe, language)}
                      {vibe.isCustom && <span className="text-xs opacity-70">✨</span>}
                      <button
                        type="button"
                        onClick={() => setSelectedVibes(selectedVibes.filter(v => v.key !== vibe.key))}
                        className="ml-1 hover:text-red-200"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))
                )}
              </div>
              
              {/* Preset vibes - show based on mainCategory */}
              {mainCategory ? (
                <div className="flex flex-wrap gap-2">
                  {getVibePresetsForCategory(mainCategory as MainCategory)
                    .filter(preset => !selectedVibes.some(v => v.key === preset.key))
                    .map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => {
                          if (selectedVibes.length < MAX_VIBES) {
                            setSelectedVibes([...selectedVibes, presetToEventVibe(preset)]);
                          }
                        }}
                        disabled={selectedVibes.length >= MAX_VIBES}
                        className="px-3 py-1.5 rounded-full bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:border-[#15383c] hover:text-[#15383c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {language === 'fr' ? preset.label.fr : preset.label.en}
                      </button>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  {language === 'fr' ? 'Veuillez d\'abord sélectionner une catégorie principale ci-dessus' : 'Please select a main category above first'}
                </p>
              )}
              
              {/* Custom vibe input */}
              <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  {language === 'fr' ? 'Ajouter un vibe personnalisé' : 'Add a custom vibe'}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={language === 'fr' ? 'Vibe en anglais (EN)' : 'Custom vibe (EN)'}
                      value={customVibeEN}
                      onChange={(e) => {
                        setCustomVibeEN(e.target.value.slice(0, MAX_VIBE_LABEL_LENGTH));
                        setCustomVibeError(null);
                      }}
                      maxLength={MAX_VIBE_LABEL_LENGTH}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#15383c]"
                    />
                    <span className="text-xs text-gray-400">{customVibeEN.length}/{MAX_VIBE_LABEL_LENGTH}</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={language === 'fr' ? 'Vibe en français (FR)' : 'Vibe in French (FR)'}
                      value={customVibeFR}
                      onChange={(e) => {
                        setCustomVibeFR(e.target.value.slice(0, MAX_VIBE_LABEL_LENGTH));
                        setCustomVibeError(null);
                      }}
                      maxLength={MAX_VIBE_LABEL_LENGTH}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#15383c]"
                    />
                    <span className="text-xs text-gray-400">{customVibeFR.length}/{MAX_VIBE_LABEL_LENGTH}</span>
                  </div>
                </div>
                {customVibeError && (
                  <p className="text-xs text-red-500 mb-2">{customVibeError}</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const error = validateCustomVibeLabel(customVibeEN, customVibeFR, selectedVibes);
                    if (error) {
                      setCustomVibeError(language === 'fr' ? 'Les deux labels sont requis et doivent être uniques' : error);
                      return;
                    }
                    if (selectedVibes.length >= MAX_VIBES) {
                      setCustomVibeError(language === 'fr' 
                        ? `Maximum ${MAX_VIBES} vibes atteint`
                        : `Maximum ${MAX_VIBES} vibes reached`);
                      return;
                    }
                    const newVibe = createCustomVibe(customVibeEN, customVibeFR);
                    setSelectedVibes([...selectedVibes, newVibe]);
                    setCustomVibeEN('');
                    setCustomVibeFR('');
                    setCustomVibeError(null);
                  }}
                  disabled={!customVibeEN.trim() || !customVibeFR.trim() || selectedVibes.length >= MAX_VIBES}
                  className="px-4 py-2 bg-[#15383c] text-white rounded-lg text-sm font-medium hover:bg-[#1a454a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {language === 'fr' ? 'Ajouter' : 'Add'}
                </button>
              </div>
              
              {/* Max vibes warning */}
              {selectedVibes.length >= MAX_VIBES && (
                <p className="text-xs text-amber-600 pl-1">
                  {language === 'fr' 
                    ? `Maximum de ${MAX_VIBES} vibes atteint`
                    : `Maximum of ${MAX_VIBES} vibes reached`}
                </p>
              )}
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
                Date <span className="text-red-500">*</span>
              </label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={isDateTimeLocked}
                className={`w-full border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base transition-all ${isDateTimeLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50 focus:outline-none focus:border-[#15383c]'}`} 
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
                disabled={isDateTimeLocked}
                className={`w-full border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base transition-all ${isDateTimeLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50 focus:outline-none focus:border-[#15383c]'}`} 
              />
            </div>
            
            {isDateTimeLocked && (
              <p className="text-sm text-amber-600">
                You can’t change the date once someone has reserved a spot. Create a new event or contact support.
              </p>
            )}
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

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:gap-4 md:gap-5">
            {/* Update Button */}
            <button 
              type="submit"
              disabled={isSaveDisabled}
              className="w-full py-3.5 sm:py-4 md:py-4.5 bg-[#15383c] text-white font-bold rounded-full hover:bg-[#1f4d52] transition-colors shadow-lg touch-manipulation active:scale-95 text-sm sm:text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingImage ? 'Uploading Images...' : isSubmitting ? 'Updating Event...' : 'Update'}
            </button>
            
            {/* Draft Button */}
            <button 
              type="button"
              onClick={handleDraft}
              disabled={isSubmitting || uploadingImage || isDeleting}
              className="w-full py-3.5 sm:py-4 md:py-4.5 bg-orange-100 text-[#e35e25] font-bold rounded-full hover:bg-orange-200 transition-colors border border-orange-200 touch-manipulation active:scale-95 text-sm sm:text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FileText size={18} />
              Draft
            </button>
            
            {/* Delete Button */}
            <button 
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting || uploadingImage || isDeleting}
              className="w-full py-3.5 sm:py-4 md:py-4.5 bg-red-50 text-red-600 font-bold rounded-full hover:bg-red-100 transition-colors border border-red-200 touch-manipulation active:scale-95 text-sm sm:text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
            
            {/* Cancel Button */}
            <button 
              type="button"
              onClick={() => setViewState(ViewState.MY_POPS)}
              disabled={isSubmitting || uploadingImage || isDeleting}
              className="w-full py-3.5 sm:py-4 md:py-4.5 bg-gray-100 text-gray-500 font-bold rounded-full hover:bg-gray-200 transition-colors border border-gray-200 touch-manipulation active:scale-95 text-sm sm:text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-xl">
              <h3 className="text-xl font-bold text-[#15383c] mb-4">Delete Event</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this event? This action cannot be undone. All associated images will also be deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  No, Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

