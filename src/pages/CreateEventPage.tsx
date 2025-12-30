import React, { useState, useEffect } from 'react';
import { ViewState } from '../../types';
import { ChevronLeft, Upload, MapPin, Calendar, Clock, X, ArrowUp, ArrowDown, Sparkles, Info } from 'lucide-react';
import { useEventStore } from '../../stores/eventStore';
import { useUserStore } from '../../stores/userStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { HostPhoneVerificationModal } from '../../components/auth/HostPhoneVerificationModal';
import { uploadImage } from '../../firebase/imageStorage';
import { processImageForUploadLazy, prefetchImageProcessing } from '../lib/imageProcessingLoader';
import { geocodeAddress } from '../../utils/geocoding';
import { 
  type EventVibe,
  getVibePresetsForCategory,
  getVibeLabel,
  presetToEventVibe,
  createCustomVibe,
  validateCustomVibeLabel,
  MAX_VIBES,
  MIN_VIBES,
  MAX_VIBE_LABEL_LENGTH,
} from '../../src/constants/vibes';
import { MAIN_CATEGORIES, MAIN_CATEGORY_LABELS, MAIN_CATEGORY_LABELS_FR, type MainCategory } from '../../utils/categoryMapper';

interface CreateEventPageProps {
  setViewState: (view: ViewState) => void;
}

const CATEGORIES = ['Music', 'Community', 'Markets', 'Workshop', 'Wellness', 'Shows', 'Food & Drink', 'Sports', 'Social'] as const;
const POPULAR_CITIES = [
  'Montreal, CA', 'Toronto, CA', 'Vancouver, CA', 'Ottawa, CA', 'Quebec City, CA',
  'Calgary, CA', 'Edmonton, CA', 'New York, US', 'Los Angeles, US', 'Chicago, US'
];

export const CreateEventPage: React.FC<CreateEventPageProps> = ({ setViewState }) => {
  const { t, language } = useLanguage();
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
  const [imageUrl, setImageUrl] = useState(''); // Legacy single image (for preview)
  const [imageUrls, setImageUrls] = useState<string[]>([]); // Array of uploaded image URLs
  const [imageFiles, setImageFiles] = useState<File[]>([]); // Array of files to upload
  const [imagePreviews, setImagePreviews] = useState<string[]>([]); // Base64 previews for UI
  const [uploadingImage, setUploadingImage] = useState(false);
  const [whatToExpect, setWhatToExpect] = useState('');
  const [attendeesCount, setAttendeesCount] = useState(0);
  // Host name will be determined from user profile when creating event
  // Don't use 'You' - always use actual name from profile
  const [price, setPrice] = useState('Free');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionFrequency, setSessionFrequency] = useState<'weekly' | 'monthly' | 'oneTime' | ''>('');
  const [sessionMode, setSessionMode] = useState<'inPerson' | 'remote' | ''>('');
  const [mainCategory, setMainCategory] = useState<MainCategory | ''>('');
  const [selectedVibes, setSelectedVibes] = useState<EventVibe[]>([]);
  // Custom vibe input fields
  const [customVibeEN, setCustomVibeEN] = useState('');
  const [customVibeFR, setCustomVibeFR] = useState('');
  const [customVibeError, setCustomVibeError] = useState<string | null>(null);
  const [groupSize, setGroupSize] = useState<{ min: number; max: number } | null>(null);
  const [repeatDay, setRepeatDay] = useState<string>('');
  const [repeatTime, setRepeatTime] = useState<string>('');
  const [weeklyDayOfWeek, setWeeklyDayOfWeek] = useState<number | undefined>(undefined);
  const [monthlyDayOfMonth, setMonthlyDayOfMonth] = useState<number | undefined>(undefined);
  // Payment fields
  const [hasFee, setHasFee] = useState(false);
  const [feeAmount, setFeeAmount] = useState<number>(0); // Fee in dollars (will convert to cents)
  const [currency, setCurrency] = useState<'cad' | 'usd'>('cad');
  
  // Privacy settings
  const [isPrivate, setIsPrivate] = useState(false);
  const [showPrivateTooltip, setShowPrivateTooltip] = useState(false);

  // Auto-calculate groupSize from attendeesCount
  useEffect(() => {
    if (attendeesCount > 0) {
      // Calculate groupSize based on attendeesCount
      // If attendeesCount is set, use it as both min and max
      setGroupSize({ min: attendeesCount, max: attendeesCount });
    } else {
      // If attendeesCount is 0 or not set, clear groupSize
      setGroupSize(null);
    }
  }, [attendeesCount]);

  // Prefetch image processing chunk on mount (non-blocking)
  // This warms the cache before user uploads, improving perceived speed
  useEffect(() => {
    prefetchImageProcessing();
  }, []);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    // Process each selected file
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
      
      // Note: HEIC files will be automatically converted to JPEG during processing

      // Accept larger files - they will be compressed before upload
      // Increased limit to 50MB (will be compressed to ~5MB or less)
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

  const handleSubmit = async (e: React.FormEvent, saveAsDraft: boolean = false) => {
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
    
    // Phone verification gating: Check if user has verified phone for hosting
    await refreshUserProfile();
    const freshProfile = useUserStore.getState().userProfile;
    
    // Use OR logic: userProfile.phoneVerifiedForHosting OR user.phone_verified (backward compatibility)
    const isHostPhoneVerified = !!(freshProfile?.phoneVerifiedForHosting || user?.phone_verified);
    
    if (!isHostPhoneVerified) {
      setShowHostVerificationModal(true);
      return;
    }
    
    // Check if user is logged in
    if (!user?.uid) {
      alert('You must be logged in to create an event. Please sign in first.');
      console.error('[CREATE_EVENT] No user logged in');
      return;
    }
    
    // Auto-calculate groupSize from attendeesCount if not already set
    let finalGroupSize = groupSize;
    if (!finalGroupSize && attendeesCount > 0) {
      finalGroupSize = { min: attendeesCount, max: attendeesCount };
    }

    // Validate required fields (skip some validations for drafts)
    const isDraft = saveAsDraft;
    if (!title || !description || !date || !time || !mainCategory || !sessionFrequency || !sessionMode || (!isDraft && !finalGroupSize) || selectedVibes.length === 0) {
      const missingFields = [];
      if (!title) missingFields.push('Title');
      if (!description) missingFields.push('Description');
      if (!date) missingFields.push('Date');
      if (!time) missingFields.push('Time');
      if (!mainCategory) missingFields.push('Main Category');
      if (!sessionFrequency) missingFields.push('Session Frequency');
      if (!sessionMode) missingFields.push('Session Mode');
      if (!isDraft && !finalGroupSize) missingFields.push('Group Size (set Attendees Limit)');
      if (selectedVibes.length === 0) missingFields.push('Vibes (at least 1)');
      // City is required only for in-person sessions
      if (sessionMode === 'inPerson' && !city) {
        missingFields.push('City');
      }
      alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
      console.warn('[CREATE_EVENT] Missing required fields:', missingFields);
      return;
    }
    
    // Validate vibes selection (1-3)
    if (selectedVibes.length < MIN_VIBES || selectedVibes.length > MAX_VIBES) {
      alert(language === 'fr' 
        ? `Veuillez sélectionner entre ${MIN_VIBES} et ${MAX_VIBES} vibes pour votre cercle.`
        : `Please select ${MIN_VIBES} to ${MAX_VIBES} vibes for your circle.`);
      return;
    }
    
    // Validate Stripe account for paid events
    if (hasFee && feeAmount > 0) {
      if (!userProfile?.stripeAccountId) {
        alert('Please set up your Stripe account before creating paid events. Go to Profile → Stripe Payout Settings to connect your account.');
        setViewState(ViewState.PROFILE_STRIPE);
        return;
      }
      
      if (userProfile?.stripeOnboardingStatus !== 'complete' || !userProfile?.stripeAccountEnabled) {
        alert('Your Stripe account setup is incomplete. Please complete the onboarding process to charge fees for events.');
        setViewState(ViewState.PROFILE_STRIPE);
        return;
      }
    }
    
    // Validate repeat settings for weekly/monthly (only for non-drafts)
    if (!isDraft) {
      if (sessionFrequency === 'weekly' && weeklyDayOfWeek === undefined) {
        // Auto-calculate from date if not set
        if (date) {
          const dateObj = new Date(date);
          setWeeklyDayOfWeek(dateObj.getDay());
        } else {
          alert('Please select the day of week for weekly sessions.');
          return;
        }
      }
      if (sessionFrequency === 'monthly' && monthlyDayOfMonth === undefined) {
        // Auto-calculate from date if not set
        if (date) {
          const dateObj = new Date(date);
          setMonthlyDayOfMonth(dateObj.getDate());
        } else {
          alert('Please select the day of month for monthly sessions.');
          return;
        }
      }
    }

    // Check if device is online before attempting Firestore write
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      alert('You appear to be offline. Please check your internet connection and try again.');
      console.error('[CREATE_EVENT] Device is offline');
      return;
    }
    
    setIsSubmitting(true);
    
    // Log Firebase project info for verification
    const app = (await import('../lib/firebase')).getAppSafe();
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
    
    // Validate text field sizes to prevent Firestore document size issues (1MB limit)
    // Firestore has a 1MB document size limit, so we need to ensure text fields aren't too large
    const MAX_DESCRIPTION_LENGTH = 50000; // ~50KB of text (safe margin)
    const MAX_WHAT_TO_EXPECT_LENGTH = 20000; // ~20KB of text
    
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      alert(`Description is too long (${description.length} characters). Please keep it under ${MAX_DESCRIPTION_LENGTH.toLocaleString()} characters.`);
      setIsSubmitting(false);
      return;
    }
    
    if (whatToExpect.length > MAX_WHAT_TO_EXPECT_LENGTH) {
      alert(`"What to Expect" is too long (${whatToExpect.length} characters). Please keep it under ${MAX_WHAT_TO_EXPECT_LENGTH.toLocaleString()} characters.`);
      setIsSubmitting(false);
      return;
    }
    
    // Upload images to Firebase Storage if image files were selected
    let finalImageUrls: string[] = [];
    let finalImageUrl = `https://picsum.photos/seed/${title || 'event'}/800/600`; // Default placeholder
    
    console.log('[CREATE_EVENT] Image upload check:', {
      imageFilesCount: imageFiles.length,
      imageUrlsCount: imageUrls?.length || 0,
      hasImageUrl: !!imageUrl,
      userId: user?.uid
    });
    
    if (imageFiles.length > 0 && user?.uid) {
      try {
        console.log('[CREATE_EVENT] Uploading', imageFiles.length, 'image(s) to Firebase Storage...');
        setUploadingImage(true);
        
        // Helper function to process (HEIC conversion + compression) and upload a single image
        const processAndUploadImage = async (file: File, path: string): Promise<string> => {
          console.log(`[CREATE_EVENT] Starting processAndUploadImage for "${file.name}"`);
          
          // Process image: convert HEIC to JPEG if needed, then compress if needed
          // Using lazy loader to defer loading the heavy image processing chunk until needed
          const processed = await processImageForUploadLazy(file, {
            maxWidth: 1600,
            maxHeight: 1600,
            quality: 0.80,
            maxSizeMB: 2
          });
          
          if (processed.wasConverted) {
            console.log(`[CREATE_EVENT] ✅ Converted HEIC to JPEG: ${processed.originalName} → ${processed.file.name}`);
          }
          
          console.log(`[CREATE_EVENT] Uploading image "${processed.file.name}" (${(processed.file.size / 1024 / 1024).toFixed(2)}MB)...`);
          // uploadImage handles retries internally (2 retries = 3 total attempts)
          // Increased timeout to 120 seconds for large images (compressed images should be < 5MB, but allow time for slow connections)
          const uploadedUrl = await uploadImage(path, processed.file, { 
            retries: 2, // 3 total attempts
            maxUploadTime: 120000 // 120 seconds (2 minutes) - enough for large compressed images on slow connections
          });
          console.log(`[CREATE_EVENT] ✅ Uploaded successfully: ${uploadedUrl.substring(0, 50)}...`);
          return uploadedUrl;
        };
        
        // Upload all images in PARALLEL - uploadImage handles timeouts internally
        const timestamp = Date.now();
        
        const uploadPromises = imageFiles.map((file, i) => {
          const imagePath = `events/${user.uid}/${timestamp}_${i}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          console.log(`[CREATE_EVENT] Processing image ${i + 1}/${imageFiles.length}: "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)}MB, ${file.type})...`);
          
          // Process and upload - uploadImage handles timeouts and retries internally
          return processAndUploadImage(file, imagePath)
            .then((url) => {
              console.log(`[CREATE_EVENT] ✅ Image ${i + 1}/${imageFiles.length} uploaded successfully`);
              return url;
            })
            .catch((error: any) => {
              console.error(`[CREATE_EVENT] ❌ Failed to upload image ${i + 1}/${imageFiles.length}:`, error);
              // Re-throw to ensure Promise.allSettled sees it as rejected
              throw error;
            });
        });
        
        // Wait for all uploads to complete - allSettled ALWAYS resolves
        // Each upload has its own 120s timeout, so we allow up to 180s overall (3 minutes) for all uploads
        console.log(`[CREATE_EVENT] Waiting for Promise.allSettled with ${uploadPromises.length} promise(s) (120s timeout per image, 180s overall timeout)...`);
        
        // Add overall timeout to prevent hanging - if Promise.allSettled takes too long, force completion
        type UploadResult = PromiseSettledResult<string>;
        const overallTimeoutPromise = new Promise<UploadResult[]>((resolve) => {
          setTimeout(() => {
            console.warn('[CREATE_EVENT] ⚠️ Overall upload timeout reached (180s) - forcing completion with placeholder images');
            // Return rejected results to force placeholder usage
            resolve(uploadPromises.map(() => ({ status: 'rejected' as const, reason: new Error('Overall timeout after 180s') })));
          }, 180000); // 180 seconds (3 minutes) overall timeout - enough for multiple large images
        });
        
        const uploadResults = await Promise.race([
          Promise.allSettled(uploadPromises),
          overallTimeoutPromise
        ]);
        console.log(`[CREATE_EVENT] Promise.allSettled completed. Processing ${uploadResults.length} results...`);
        
        // Process results - allSettled guarantees all promises have settled
        const successfulUploads: string[] = [];
        const failedUploads: Array<{ fileName: string; error: string }> = [];
        
        uploadResults.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            // Success - we got a URL
            successfulUploads.push(result.value);
          } else {
            // Failed - record the error
            const fileName = imageFiles[i]?.name || `Image ${i + 1}`;
            const errorMessage = result.reason?.message || 'Unknown error';
            failedUploads.push({ fileName, error: errorMessage });
          }
        });
        
        // If all uploads failed or timed out, show error and ask user
        if (successfulUploads.length === 0 && imageFiles.length > 0) {
          const errorMessages = failedUploads.map(f => `${f.fileName}: ${f.error}`).join('; ');
          console.error(`[CREATE_EVENT] ❌ All image uploads failed or timed out: ${errorMessages}`);
          
          // Ask user if they want to continue without images or retry
          const userChoice = confirm(
            `Failed to upload images: ${errorMessages}\n\n` +
            `Would you like to:\n` +
            `- Click OK to create event WITHOUT images (you can add them later via edit)\n` +
            `- Click Cancel to go back and try uploading again`
          );
          
          if (!userChoice) {
            // User cancelled - stop event creation
            setIsSubmitting(false);
            setUploadingImage(false);
            return;
          }
          
          // User chose to continue - use placeholder but log clearly
          console.warn('[CREATE_EVENT] ⚠️ User chose to continue without images. Event will be created with placeholder.');
          finalImageUrl = `https://picsum.photos/seed/${title || 'event'}/800/600`;
          finalImageUrls = [finalImageUrl];
          // Note: Images that timed out will need to be uploaded later via edit functionality
          console.log('[CREATE_EVENT] Event will be created with placeholder. Images can be added later via edit.');
        } else if (failedUploads.length > 0) {
          // If some uploads failed, warn but continue with successful ones
          console.warn(`[CREATE_EVENT] ⚠️ Some images failed to upload:`, failedUploads);
          const failedNames = failedUploads.map(f => f.fileName).join(', ');
          // Don't show alert - just log and continue
          console.log(`[CREATE_EVENT] Continuing with ${successfulUploads.length} successful upload(s). Failed: ${failedNames}`);
          finalImageUrls = successfulUploads;
          if (finalImageUrls.length > 0) {
            finalImageUrl = finalImageUrls[0];
          } else {
            finalImageUrl = `https://picsum.photos/seed/${title || 'event'}/800/600`;
            finalImageUrls = [finalImageUrl];
          }
        } else {
          // All uploads succeeded
          finalImageUrls = successfulUploads;
          if (finalImageUrls.length > 0) {
            finalImageUrl = finalImageUrls[0];
            console.log('[CREATE_EVENT] ✅ All images uploaded successfully. Main image:', finalImageUrl);
          } else {
            // Fallback to placeholder if no images uploaded (shouldn't happen, but safety)
            finalImageUrl = `https://picsum.photos/seed/${title || 'event'}/800/600`;
            finalImageUrls = [finalImageUrl];
            console.log('[CREATE_EVENT] ⚠️ No images uploaded, using placeholder');
          }
        }
      } catch (uploadError: any) {
        console.error('[CREATE_EVENT] ❌ Image upload failed:', uploadError);
        const errorMessage = uploadError?.message || 'Unknown error';
        
        // If all uploads failed, show error and stop
        if (errorMessage.includes('All image uploads failed')) {
          alert(`Failed to upload images: ${errorMessage}. Please try again with smaller images or check your internet connection.`);
          setIsSubmitting(false);
          setUploadingImage(false);
          return;
        }
        
        // For other errors, ask user if they want to continue without images
        const shouldContinue = confirm(`Image upload failed: ${errorMessage}. Would you like to create the event without images?`);
        if (!shouldContinue) {
          setIsSubmitting(false);
          setUploadingImage(false);
          return;
        }
        
        // Use placeholder if user chooses to continue
        finalImageUrl = `https://picsum.photos/seed/${title || 'event'}/800/600`;
        finalImageUrls = [finalImageUrl];
        console.log('[CREATE_EVENT] Continuing with placeholder image after upload failure');
      } finally {
        // CRITICAL: Always reset state - this ensures spinner stops even if something goes wrong
        setUploadingImage(false);
        console.log('[CREATE_EVENT] Image upload process completed, uploadingImage set to false');
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
      // Geocode address to get coordinates (if API key is available)
      let lat: number | undefined;
      let lng: number | undefined;
      
      if (address && city) {
        try {
          console.log('[CREATE_EVENT] Geocoding address:', address, city);
          const geocodeResult = await geocodeAddress(address, city);
          if (geocodeResult) {
            lat = geocodeResult.lat;
            lng = geocodeResult.lng;
            console.log('[CREATE_EVENT] Geocoding successful:', { lat, lng });
          } else {
            console.warn('[CREATE_EVENT] Geocoding failed or API key not available. Event will be created without coordinates.');
          }
        } catch (error) {
          console.error('[CREATE_EVENT] Error geocoding address:', error);
          // Continue without coordinates - not a critical error
        }
      }
      
      // Get host phone number from user profile
      const hostPhoneNumber = userProfile?.phone_number || userProfile?.hostPhoneNumber || user?.phone_number || null;
      
      // Get host name from user profile (Firestore - most accurate) or Auth, NEVER use 'You'
      // Priority: userProfile (Firestore) > user (Auth) > email fallback
      // CRITICAL: hostName must never be empty, 'You', or 'Unknown'
      const hostName = (userProfile?.name || userProfile?.displayName || user?.displayName || user?.name || user?.email?.split('@')[0] || 'Unknown Host').trim();
      
      // Get host profile picture URL (for better performance and consistency)
      const hostPhotoURL = userProfile?.photoURL || userProfile?.imageUrl || user?.photoURL || user?.profileImageUrl || undefined;
      
      // Extract country from city (e.g., "Montreal, CA" → "Canada")
      let country: string | undefined;
      if (city.includes(', CA')) {
        country = 'Canada';
      } else if (city.includes(', US')) {
        country = 'United States';
      }
      
      // Calculate startDateTime from date and time
      const startDateTime = date && time ? new Date(`${date}T${time}`).getTime() : undefined;
      
      // Calculate repeatDay and repeatTime for weekly/monthly sessions
      let calculatedRepeatDay: string | undefined;
      let calculatedRepeatTime: string | undefined;
      
      if (date && time && (sessionFrequency === 'weekly' || sessionFrequency === 'monthly')) {
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        if (sessionFrequency === 'weekly') {
          // Use state variable if set, otherwise calculate from date
          const dayOfWeek = weeklyDayOfWeek !== undefined ? weeklyDayOfWeek : (date ? new Date(date).getDay() : 0);
          calculatedRepeatDay = daysOfWeek[dayOfWeek];
        } else if (sessionFrequency === 'monthly') {
          // Use state variable if set, otherwise calculate from date
          const dayOfMonth = monthlyDayOfMonth !== undefined ? monthlyDayOfMonth : (date ? new Date(date).getDate() : 1);
          calculatedRepeatDay = dayOfMonth.toString(); // Day of month (1-31)
        }
        
        // Convert time to 24-hour format
        const [hours, minutes] = time.split(':');
        calculatedRepeatTime = `${hours}:${minutes}`;
      }
      
      // Calculate circleContinuity (auto-generated)
      let circleContinuity: 'startingSoon' | 'ongoing' = 'startingSoon';
      if (startDateTime) {
        const now = Date.now();
        if (sessionFrequency === 'oneTime') {
          circleContinuity = 'startingSoon';
        } else if (sessionFrequency === 'weekly' || sessionFrequency === 'monthly') {
          if (startDateTime > now) {
            circleContinuity = 'startingSoon';
          } else {
            // If started and has open spots, it's ongoing
            // We'll check capacity later, but for now assume ongoing if started
            circleContinuity = 'ongoing';
          }
        }
      }
      
      // Validate hostName - should never be empty or 'You'
      if (!hostName || hostName === 'You' || hostName.trim() === '') {
        console.error('[CREATE_EVENT] ❌ Invalid hostName:', hostName);
        alert('Error: Could not determine host name. Please update your profile and try again.');
        setIsSubmitting(false);
        setUploadingImage(false);
        return;
      }
      
      // Create event with all required fields
      console.log('[CREATE_EVENT] Calling addEvent with:', {
        title,
        city,
        hostId: user.uid,
        host: hostName,
        hostPhotoURL: hostPhotoURL ? '***' : 'not set',
        hostPhoneNumber: hostPhoneNumber ? '***' : 'not set',
        imageUrl: finalImageUrl.substring(0, 50) + '...',
        imageUrlsCount: finalImageUrls.length,
        lat,
        lng
      });
      
      // Add timeout to detect if addEvent is hanging
      // Increased timeout to 60 seconds to account for network latency and large data
      const EVENT_CREATION_TIMEOUT = 45000; // 45 seconds (reduced for faster feedback)
      const addEventPromise = addEvent({
        title,
        description,
        city,
        address,
        date,
        time,
        tags: [], // Tags removed - using vibes instead
        host: hostName, // Always use actual name, never 'You'
        hostId: user?.uid || '',
        hostPhotoURL: hostPhotoURL, // Store host photo URL for consistency
        imageUrl: finalImageUrl, // Main image (backward compatibility)
        imageUrls: finalImageUrls.length > 0 ? finalImageUrls : undefined, // Array of all images
        whatToExpect: whatToExpect || undefined,
        attendeesCount,
        category: (category || 'Community') as typeof CATEGORIES[number], // Keep for backward compatibility, default to Community
        // Set price field correctly based on hasFee and feeAmount
        price: hasFee && feeAmount > 0 
          ? `$${feeAmount.toFixed(2)} ${currency.toUpperCase()}`
          : (price && price.trim() !== '' ? price : 'Free'),
        rating: 0,
        reviewCount: 0,
        capacity: attendeesCount || undefined,
        // Ensure events are public and joinable by default (unless draft or explicitly private)
        // isPublic is false if: saving as draft OR marked as private
        isPublic: !saveAsDraft && !isPrivate,
        allowRsvp: !saveAsDraft,
        allowChat: !saveAsDraft,
        isDraft: saveAsDraft,
        lat, // Add geocoded coordinates
        lng, // Add geocoded coordinates
        hostPhoneNumber: hostPhoneNumber || undefined, // Add host phone number to event
        sessionFrequency: sessionFrequency || undefined,
        sessionMode: sessionMode || undefined,
        country: country, // Extract country from city
        mainCategory: mainCategory || undefined,
        vibes: selectedVibes.length > 0 ? selectedVibes : undefined,
        groupSize: finalGroupSize || undefined,
        startDateTime: startDateTime,
        repeatDay: calculatedRepeatDay,
        repeatTime: calculatedRepeatTime,
        circleContinuity: circleContinuity,
        // Keep old fields for backward compatibility
        weeklyDayOfWeek: sessionFrequency === 'weekly' ? (weeklyDayOfWeek !== undefined ? weeklyDayOfWeek : (date ? new Date(date).getDay() : undefined)) : undefined,
        monthlyDayOfMonth: sessionFrequency === 'monthly' ? (monthlyDayOfMonth !== undefined ? monthlyDayOfMonth : (date ? new Date(date).getDate() : undefined)) : undefined,
        // Payment fields
        hasFee: hasFee && feeAmount > 0,
        feeAmount: hasFee && feeAmount > 0 ? Math.round(feeAmount * 100) : undefined, // Convert to cents
        currency: hasFee && feeAmount > 0 ? currency : undefined,
      } as any); // Type assertion needed for optional fields
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Event creation timed out after 60 seconds. Firestore may be slow or unresponsive. Please check your internet connection and try again.'));
        }, EVENT_CREATION_TIMEOUT);
      });
      
      console.log('[CREATE_EVENT] Waiting for addEvent to complete (timeout: 60s)...');
      const createdEvent = await Promise.race([addEventPromise, timeoutPromise]) as any;

      console.log('[CREATE_EVENT] ✅ Event created successfully:', {
        eventId: createdEvent.id,
        title: createdEvent.title,
        hostId: createdEvent.hostId,
        isDraft: saveAsDraft
      });

      // Show success message
      if (saveAsDraft) {
        alert('Circle saved as draft! You can find it in the Drafts tab in My Circles.');
      } else {
        alert('Event created successfully!');
      }

      // Reset form
      setTitle('');
      setDescription('');
      setCity('');
      setAddress('');
      setDate('');
      setTime('');
      setCategory('');
      setImageUrl('');
      setImageUrls([]);
      setImageFiles([]);
      setImagePreviews([]);
      setUploadingImage(false);
      setWhatToExpect('');
      setAttendeesCount(0);
      setPrice('Free');
      setHasFee(false);
      setFeeAmount(0);
      setCurrency('cad');
      setIsPrivate(false);
      setSessionFrequency('');
      setSessionMode('');
      setMainCategory('');
      setSelectedVibes([]);
      setGroupSize(null);
      setWeeklyDayOfWeek(undefined);
      setMonthlyDayOfMonth(undefined);
      setRepeatDay('');
      setRepeatTime('');

      // Redirect to feed - ensure proper navigation without 404 errors
      console.log('[CREATE_EVENT] Redirecting to feed...');
      // Clear any selected event to prevent navigation issues
      // Navigate directly without setTimeout to avoid race conditions
      setViewState(ViewState.FEED);
      // Ensure URL is updated correctly (but don't force it if already correct)
      if (typeof window !== 'undefined' && window.location.pathname !== '/explore') {
        // Use replaceState instead of pushState to avoid creating history entry
        window.history.replaceState({ viewState: ViewState.FEED }, '', '/explore');
      }
    } catch (error: any) {
      console.error('[CREATE_EVENT] ❌ Error creating event:', {
        error,
        message: error?.message,
        code: error?.code,
        stack: error?.stack?.substring(0, 300)
      });
      
      // Always reset UI state, even on error
      setIsSubmitting(false);
      setUploadingImage(false);
      
      // Check for timeout
      if (error?.message?.includes('timed out') || error?.message?.includes('timeout')) {
        alert('Event creation timed out. This might be a network issue or the server is slow. Please check your internet connection and try again. If the problem persists, try creating the event without images first.');
      } else if (error?.code === 'permission-denied') {
        alert('Permission denied. You may not have permission to create events. Please check your account status or contact support.');
      } else if (error?.code === 'unavailable' || error?.message?.includes('offline') || error?.message?.includes('unavailable')) {
        alert('Service is unavailable. The device may be offline or the server is experiencing issues. Please check your internet connection and try again.');
        console.error('[CREATE_EVENT] Offline/unavailable error:', {
          code: error?.code,
          message: error?.message,
          isOnline: navigator?.onLine
        });
      } else if (error?.message?.includes('upload') || error?.message?.includes('image')) {
        // Image upload specific errors
        alert(`Image upload failed: ${error?.message || 'Unknown error'}. You can try creating the event without images, or use smaller/different images.`);
      } else {
        alert(`Failed to create event: ${error?.message || 'Unknown error'}. Please check the console for details or try again.`);
      }
      
      console.log('[CREATE_EVENT] Error handled, UI state reset');
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
            {t('createEvent.createYourNextCircle')}
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8 space-y-4 sm:space-y-5 md:space-y-6">
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                {t('createEvent.eventTitle')} <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder={t('createEvent.enterEventTitleHere')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all" 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                {t('createEvent.mainCategory')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select 
                  value={mainCategory}
                  onChange={(e) => {
                    const newCategory = e.target.value as typeof mainCategory;
                    setMainCategory(newCategory);
                    // Clear vibes when category changes (since they're filtered by category)
                    setSelectedVibes([]);
                  }}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all appearance-none cursor-pointer"
                >
                  <option value="">{t('createEvent.select')}</option>
                  {MAIN_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{language === 'fr' ? MAIN_CATEGORY_LABELS_FR[cat] : MAIN_CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Vibes / Subcategories - Multi-select, filtered by Main Category */}
            <div className="space-y-3">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                {t('createEvent.vibes')} <span className="text-red-500">*</span> <span className="text-gray-400 font-normal text-xs">{language === 'fr' ? `(Sélectionnez ${MIN_VIBES}-${MAX_VIBES})` : `(Select ${MIN_VIBES}-${MAX_VIBES})`}</span>
              </label>
              
              {/* Selected vibes display */}
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[60px]">
                {selectedVibes.length === 0 ? (
                  <span className="text-gray-400 text-sm">
                    {mainCategory ? t('createEvent.noVibesSelected') : t('createEvent.selectMainCategoryFirst')}
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
              
              {/* Preset vibes filtered by selected main category */}
              {mainCategory ? (
                <>
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
                </>
              ) : (
                <p className="text-xs text-gray-400 pl-1">{t('createEvent.selectMainCategoryFirst')}</p>
              )}
              
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
                {t('createEvent.eventDescription')} <span className="text-red-500">*</span>
              </label>
              <textarea 
                rows={4} 
                placeholder={t('createEvent.enterDescriptionHere')}
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
                {t('createEvent.whatToExpect')} <span className="text-gray-400 font-normal">{t('createEvent.whatToExpectOptional')}</span>
              </label>
              <textarea 
                rows={4} 
                placeholder={t('createEvent.describeWhatAttendeesCanExpect')}
                value={whatToExpect}
                onChange={(e) => setWhatToExpect(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all resize-none" 
              />
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8 space-y-4 sm:space-y-5 md:space-y-6">
            <h3 className="text-base sm:text-lg font-medium text-[#15383c] mb-4">{t('createEvent.location')}</h3>
            
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                {t('createEvent.city')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder={t('createEvent.enterCity')}
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
                {t('createEvent.addressOptional')}
              </label>
              <input 
                type="text" 
                placeholder={t('createEvent.enterStreetAddress')}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all" 
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8 space-y-4 sm:space-y-5 md:space-y-6">
            <h3 className="text-base sm:text-lg font-medium text-[#15383c] mb-4">{t('createEvent.dateAndTime')}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                  {t('createEvent.date')} <span className="text-red-500">*</span>
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
                  {t('createEvent.time')} <span className="text-red-500">*</span>
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

          {/* Session Details */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8 space-y-4 sm:space-y-5 md:space-y-6">
            <h3 className="text-base sm:text-lg font-medium text-[#15383c] mb-4">{t('createEvent.sessionDetails')}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                  {t('createEvent.sessionFrequency')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select 
                    value={sessionFrequency}
                    onChange={(e) => {
                      const value = e.target.value as 'weekly' | 'monthly' | 'oneTime' | '';
                      setSessionFrequency(value);
                      // Reset repeat settings when frequency changes
                      if (value !== 'weekly' && value !== 'monthly') {
                        setRepeatDay('');
                        setRepeatTime('');
                      }
                    }}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all appearance-none cursor-pointer"
                  >
                    <option value="">{t('createEvent.select')}</option>
                    <option value="weekly">{t('createEvent.weekly')}</option>
                    <option value="monthly">{t('createEvent.monthly')}</option>
                    <option value="oneTime">{t('createEvent.oneTimeSession')}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                  {t('createEvent.sessionMode')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select 
                    value={sessionMode}
                    onChange={(e) => setSessionMode(e.target.value as 'inPerson' | 'remote' | '')}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all appearance-none cursor-pointer"
                  >
                    <option value="">{t('createEvent.select')}</option>
                    <option value="inPerson">{t('createEvent.inPersonSession')}</option>
                    <option value="remote">{t('createEvent.remoteSession')}</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Repeat Controls for Weekly Sessions */}
            {sessionFrequency === 'weekly' && date && time && (
              <div className="space-y-2 p-4 bg-[#eef4f5] rounded-xl border border-[#15383c]/10">
                <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                  {t('createEvent.weeklyRepeatSchedule')}
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-600">{t('createEvent.repeatsEvery')}</span>
                  <select
                    value={weeklyDayOfWeek !== undefined ? weeklyDayOfWeek : (date ? new Date(date).getDay() : 0)}
                    onChange={(e) => setWeeklyDayOfWeek(parseInt(e.target.value))}
                    className="bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#15383c]"
                  >
                    <option value="0">{t('common.sunday')}</option>
                    <option value="1">{t('common.monday')}</option>
                    <option value="2">{t('common.tuesday')}</option>
                    <option value="3">{t('common.wednesday')}</option>
                    <option value="4">{t('common.thursday')}</option>
                    <option value="5">{t('common.friday')}</option>
                    <option value="6">{t('common.saturday')}</option>
                  </select>
                  <span className="text-sm text-gray-600">{t('createEvent.at')}</span>
                  <input
                    type="time"
                    value={time}
                    readOnly
                    className="bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm"
                  />
                </div>
              </div>
            )}
            
            {/* Repeat Controls for Monthly Sessions */}
            {sessionFrequency === 'monthly' && date && time && (
              <div className="space-y-2 p-4 bg-[#eef4f5] rounded-xl border border-[#15383c]/10">
                <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                  {t('createEvent.monthlyRepeatSchedule')}
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-600">{t('createEvent.repeatsEvery')}</span>
                  <select
                    value={monthlyDayOfMonth !== undefined ? monthlyDayOfMonth : (date ? new Date(date).getDate() : 1)}
                    onChange={(e) => setMonthlyDayOfMonth(parseInt(e.target.value))}
                    className="bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#15383c]"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-600">{t('createEvent.ofTheMonthAt')}</span>
                  <input
                    type="time"
                    value={time}
                    readOnly
                    className="bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Image Upload - Multiple Images */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8">
            <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1 mb-3 sm:mb-4 md:mb-5">
              {t('createEvent.addEventPictures')} <span className="text-gray-400 font-normal">{t('createEvent.firstImageIsMainPhoto')}</span>
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
                  <p className="text-xs sm:text-sm text-gray-600">{t('createEvent.uploadingImages')}</p>
                </div>
              ) : (
                <>
                  <Upload size={24} className="sm:w-7 sm:h-7 md:w-8 md:h-8 text-gray-400 mb-2" />
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 font-medium">{t('createEvent.clickToUploadOrDragAndDrop')}</p>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{t('createEvent.imageUploadHint')}</p>
                </>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 border border-gray-100 shadow-sm mb-6 sm:mb-8 space-y-4 sm:space-y-5 md:space-y-6">
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                {t('createEvent.attendeesLimitOptional')}
              </label>
              <input 
                type="number" 
                placeholder={t('createEvent.enterEventLimitHere')}
                value={attendeesCount || ''}
                onChange={(e) => setAttendeesCount(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all" 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
                {t('createEvent.price')}
              </label>
              <input 
                type="text" 
                placeholder={t('createEvent.pricePlaceholder')}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all" 
              />
            </div>

            {/* Fee Option */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hasFee"
                  checked={hasFee}
                  onChange={(e) => {
                    setHasFee(e.target.checked);
                    if (!e.target.checked) {
                      setFeeAmount(0);
                    }
                  }}
                  className="w-5 h-5 text-[#15383c] border-gray-300 rounded focus:ring-[#15383c]"
                />
                <label htmlFor="hasFee" className="text-sm font-medium text-gray-700 cursor-pointer">
                  {t('createEvent.chargeFeeForThisEvent')}
                </label>
              </div>
              
              {hasFee && (
                <div className="space-y-2 pl-8">
                  {userProfile?.stripeAccountId && userProfile?.stripeOnboardingStatus === 'complete' ? (
                    <>
                      <div className="flex gap-2">
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value as 'cad' | 'usd')}
                          className="bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#15383c]"
                        >
                          <option value="cad">CAD ($)</option>
                          <option value="usd">USD ($)</option>
                        </select>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={feeAmount || ''}
                          onChange={(e) => setFeeAmount(parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="flex-1 bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#15383c]"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {t('createEvent.platformFee')}
                      </p>
                    </>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800 mb-2">
                        {t('createEvent.needToSetupStripe')}
                      </p>
                      <button
                        type="button"
                        onClick={() => setViewState(ViewState.PROFILE_STRIPE)}
                        className="text-sm font-semibold text-[#e35e25] hover:underline"
                      >
                        {t('createEvent.setUpStripeAccount')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Private Event Option */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-5 h-5 text-[#15383c] border-gray-300 rounded focus:ring-[#15383c]"
                />
                <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700 cursor-pointer">
                  {t('createEvent.makeEventPrivate')}
                </label>
                {/* Info icon with tooltip */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPrivateTooltip(!showPrivateTooltip)}
                    onMouseEnter={() => setShowPrivateTooltip(true)}
                    onMouseLeave={() => setShowPrivateTooltip(false)}
                    className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-200"
                    aria-label="More info about private events"
                  >
                    <Info size={16} />
                  </button>
                  {/* Tooltip */}
                  {showPrivateTooltip && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 sm:w-72 p-3 bg-[#15383c] text-white text-xs sm:text-sm rounded-lg shadow-lg z-50">
                      <div className="relative">
                        {t('createEvent.privateEventTooltip')}
                        {/* Arrow pointing down */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#15383c]"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col gap-3 sm:gap-4 md:gap-5">
            <button 
              type="submit"
              disabled={isSubmitting || uploadingImage}
              className="w-full py-3.5 sm:py-4 md:py-4.5 bg-[#15383c] text-white font-bold rounded-full hover:bg-[#1f4d52] transition-colors shadow-lg touch-manipulation active:scale-95 text-sm sm:text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingImage ? t('createEvent.uploadingImages') : isSubmitting ? t('createEvent.creatingEvent') : t('createEvent.hostEvent')}
            </button>
            <button 
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                await handleSubmit(e as any, true); // Pass true for draft
              }}
              disabled={isSubmitting || uploadingImage}
              className="w-full py-3.5 sm:py-4 md:py-4.5 bg-white border-2 border-[#15383c] text-[#15383c] font-bold rounded-full hover:bg-gray-50 transition-colors touch-manipulation active:scale-95 text-sm sm:text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('createEvent.saving') : t('createEvent.saveAsDraft')}
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
