
import React, { useState, useRef, useEffect } from 'react';
import { ViewState } from '../types';
import { X, DollarSign, ArrowRight, Star, Camera } from 'lucide-react';
import { useUserStore } from '../stores/userStore';
import { uploadImage } from '../firebase/storage';
import { createOrUpdateUserProfile } from '../firebase/db';
import { getDbSafe, getAuthSafe } from '../src/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

interface SubPageProps {
  setViewState: (view: ViewState) => void;
}

// --- Basic Details Page ---
export const BasicDetailsPage: React.FC<SubPageProps> = ({ setViewState }) => {
  const user = useUserStore((state) => state.user);
  const [profileImage, setProfileImage] = useState<string | null>(user?.photoURL || user?.profileImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const path = `users/${user.uid}/avatar.jpg`;
      const imageUrl = await uploadImage(path, file);
      
      // Update Firebase Auth photoURL for immediate sync
      const auth = getAuthSafe();
      if (auth?.currentUser) {
        try {
          await updateProfile(auth.currentUser, { photoURL: imageUrl });
          console.log('[PROFILE] Updated Firebase Auth photoURL');
        } catch (authError) {
          console.warn('[PROFILE] Failed to update Firebase Auth photoURL (non-critical):', authError);
          // Continue even if Auth update fails - Firestore update is more important
        }
      }
      
      // Update user profile in Firestore
      await createOrUpdateUserProfile(user.uid, {
        photoURL: imageUrl,
        imageUrl: imageUrl,
      });

      // Update local state
      setProfileImage(imageUrl);
      
      // Update user store (this will trigger Header to re-render)
      useUserStore.getState().updateUser(user.uid, {
        photoURL: imageUrl,
        profileImageUrl: imageUrl,
      });
      
      // Refresh user profile to sync across all components
      await useUserStore.getState().refreshUserProfile();
      
      console.log('[PROFILE] Profile picture updated successfully and synced across all components');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-white pt-20 sm:pt-24 pb-8 sm:pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6 sm:mb-8 border-b border-gray-100 pb-4 sm:pb-6">
           <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c]">Basic Details</h1>
           <button 
             onClick={() => setViewState(ViewState.PROFILE)}
             className="w-9 h-9 sm:w-10 sm:h-10 bg-[#15383c] rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity touch-manipulation active:scale-95 shrink-0"
           >
             <X size={18} className="sm:w-5 sm:h-5" />
           </button>
        </div>
        <div className="space-y-5 sm:space-y-6">
           {/* Profile Picture Upload */}
           <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-light text-gray-600 pl-1">Profile Picture</label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-200 overflow-hidden ring-2 ring-gray-200">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-2xl font-bold">
                        {user?.displayName?.[0] || user?.name?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="profile-picture-input"
                  />
                  <label
                    htmlFor="profile-picture-input"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#15383c] text-white rounded-full text-sm font-medium hover:bg-[#1f4d52] transition-colors cursor-pointer touch-manipulation active:scale-95"
                  >
                    <Camera size={16} />
                    {uploading ? 'Uploading...' : 'Change Photo'}
                  </label>
                </div>
              </div>
           </div>
           <div className="space-y-2">
              <div className="w-full bg-gray-100 rounded-xl sm:rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-sm sm:text-base text-[#15383c]">{user?.displayName || user?.name || 'User'}</div>
           </div>
           <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-light text-gray-600 pl-1">Full Name</label>
              <input type="text" defaultValue="Jason" className="w-full bg-white border border-gray-200 rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all" />
           </div>
           <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-light text-gray-600 pl-1">Phone Number <span className="text-gray-400 font-normal">(not shared with anyone)</span></label>
              <input type="tel" defaultValue="(+1) 999-888-000" className="w-full bg-white border border-gray-200 rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all" />
           </div>
           <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-light text-gray-600 pl-1">Bio</label>
              <textarea rows={4} defaultValue="Discover & host pop-up events in your city. We're commited to empowering pop-culture by creating a safe hub around connections and opportunities to be safely accessible." className="w-full bg-white border border-gray-200 rounded-2xl sm:rounded-3xl py-3 sm:py-4 px-4 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all resize-none" />
           </div>
           <div className="pt-6 sm:pt-8">
             <button className="w-full py-3.5 sm:py-4 bg-[#15383c] text-white font-bold rounded-xl sm:rounded-2xl hover:bg-[#1f4d52] transition-colors shadow-lg touch-manipulation active:scale-95 text-sm sm:text-base">Update</button>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Notification Settings Page ---
export const NotificationSettingsPage: React.FC<SubPageProps> = ({ setViewState }) => {
  const user = useUserStore((state) => state.user);
  const [toggles, setToggles] = useState({
    email_opt_in: true,
    sms_opt_in: false,
    notification_opt_in: true,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load current settings
  React.useEffect(() => {
    if (user?.uid) {
      const settings = user.notification_settings || {};
      setToggles({
        email_opt_in: settings.email_opt_in ?? true,
        sms_opt_in: settings.sms_opt_in ?? false,
        notification_opt_in: settings.notification_opt_in ?? true,
      });
    }
  }, [user]);

  const handleToggle = async (key: keyof typeof toggles) => {
    const newValue = !toggles[key];
    setToggles(prev => ({ ...prev, [key]: newValue }));

    // Save to Firestore
    if (user?.uid) {
      setLoading(true);
      try {
        const db = getDbSafe();
        if (db) {
          await setDoc(doc(db, 'users', user.uid), {
            notification_settings: {
              ...toggles,
              [key]: newValue,
            },
          }, { merge: true });

          // Update user store
          useUserStore.getState().updateUser(user.uid, {
            notification_settings: {
              ...toggles,
              [key]: newValue,
            },
          });

          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      } catch (error) {
        console.error('Error saving notification settings:', error);
        // Revert on error
        setToggles(prev => ({ ...prev, [key]: !newValue }));
      } finally {
        setLoading(false);
      }
    }
  };

  const ToggleItem = ({ label, description, isOn, onToggle }: any) => (
    <div className="flex items-center justify-between py-4 sm:py-5 md:py-6 border-b border-gray-100 last:border-0">
       <div className="pr-3 sm:pr-4 min-w-0 flex-1">
          <h3 className="font-bold text-[#15383c] text-base sm:text-lg mb-1">{label}</h3>
          <p className="text-gray-500 font-light text-xs sm:text-sm">{description}</p>
       </div>
       <button onClick={onToggle} className={`w-12 h-7 sm:w-14 sm:h-8 rounded-full p-1 transition-colors duration-300 shrink-0 relative touch-manipulation active:scale-95 ${isOn ? 'bg-[#e35e25]' : 'bg-[#15383c]'}`}>
          <div className={`w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${isOn ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'}`} />
       </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pt-20 sm:pt-24 pb-8 sm:pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6 sm:mb-8 border-b border-gray-100 pb-4 sm:pb-6">
           <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c]">Notification Preferences</h1>
           <button onClick={() => setViewState(ViewState.PROFILE)} className="w-9 h-9 sm:w-10 sm:h-10 bg-[#15383c] rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity touch-manipulation active:scale-95 shrink-0">
             <X size={18} className="sm:w-5 sm:h-5" />
           </button>
        </div>
        {saved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            Settings saved!
          </div>
        )}
        <div className="space-y-1 sm:space-y-2">
           <ToggleItem 
             label="In-App Notifications" 
             description="Receive notifications in the app" 
             isOn={toggles.notification_opt_in} 
             onToggle={() => handleToggle('notification_opt_in')} 
           />
           <ToggleItem 
             label="Email Notifications" 
             description="Receive notifications via email (requires email address)" 
             isOn={toggles.email_opt_in} 
             onToggle={() => handleToggle('email_opt_in')} 
           />
           <ToggleItem 
             label="SMS Notifications" 
             description="Receive notifications via SMS (requires phone verification)" 
             isOn={toggles.sms_opt_in} 
             onToggle={() => handleToggle('sms_opt_in')} 
           />
        </div>
      </div>
    </div>
  );
};

// --- Privacy Settings Page ---
export const PrivacySettingsPage: React.FC<SubPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-white pt-20 sm:pt-24 pb-8 sm:pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
           <h1 className="font-heading font-bold text-3xl text-[#15383c]">Privacy Settings</h1>
           <button onClick={() => setViewState(ViewState.PROFILE)} className="w-10 h-10 bg-[#15383c] rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity">
             <X size={20} />
           </button>
        </div>
        <div className="mb-12">
           <h2 className="font-heading font-bold text-2xl text-[#15383c] mb-6">Attendee Reservation</h2>
           <div className="space-y-6">
              <label className="flex items-start gap-4 cursor-pointer group">
                 <div className="relative pt-1"><input type="checkbox" className="w-6 h-6 border-2 border-gray-200 rounded-md appearance-none checked:bg-[#15383c] checked:border-[#15383c] transition-all cursor-pointer" /></div>
                 <span className="text-gray-600 group-hover:text-[#15383c] transition-colors font-light">Show my full name and photo on my public profile</span>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group">
                 <div className="relative pt-1"><input type="checkbox" className="w-6 h-6 border-2 border-gray-200 rounded-md appearance-none checked:bg-[#15383c] checked:border-[#15383c] transition-all cursor-pointer" /></div>
                 <span className="text-gray-600 group-hover:text-[#15383c] transition-colors font-light">Hide my profile from search results</span>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group">
                 <div className="relative pt-1"><input type="checkbox" className="w-6 h-6 border-2 border-gray-200 rounded-md appearance-none checked:bg-[#15383c] checked:border-[#15383c] transition-all cursor-pointer" /></div>
                 <span className="text-gray-600 group-hover:text-[#15383c] transition-colors font-light">Only show my profile to people I've interacted with</span>
              </label>
           </div>
        </div>
        <div>
           <h2 className="font-heading font-bold text-2xl text-[#15383c] mb-6">Activity Visibility</h2>
           <div className="space-y-6">
              <label className="flex items-start gap-4 cursor-pointer group">
                 <div className="relative pt-1"><input type="checkbox" className="w-6 h-6 border-2 border-gray-200 rounded-md appearance-none checked:bg-[#15383c] checked:border-[#15383c] transition-all cursor-pointer" /></div>
                 <span className="text-gray-600 group-hover:text-[#15383c] transition-colors font-light">Show events I'm attending on my profile</span>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group">
                 <div className="relative pt-1"><input type="checkbox" className="w-6 h-6 border-2 border-gray-200 rounded-md appearance-none checked:bg-[#15383c] checked:border-[#15383c] transition-all cursor-pointer" /></div>
                 <span className="text-gray-600 group-hover:text-[#15383c] transition-colors font-light">Keep my event activity private</span>
              </label>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Stripe Settings Page ---
export const StripeSettingsPage: React.FC<SubPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-white pt-20 sm:pt-24 pb-8 sm:pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
           <h1 className="font-heading font-bold text-3xl text-[#15383c]">Stripe Payout Settings</h1>
           <button onClick={() => setViewState(ViewState.PROFILE)} className="w-10 h-10 bg-[#15383c] rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity">
             <X size={20} />
           </button>
        </div>
        <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 text-center py-16">
           <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm text-[#635bff]">
             <DollarSign size={40} />
           </div>
           <h2 className="text-2xl font-heading font-bold text-[#15383c] mb-4">Get Paid with Stripe</h2>
           <p className="text-gray-500 max-w-lg mx-auto mb-8">To receive payouts from your events, you need to connect a Stripe account. It's secure, fast, and trusted by millions.</p>
           <button className="px-8 py-4 bg-[#635bff] text-white font-bold rounded-full hover:bg-[#544dc9] transition-colors flex items-center gap-2 mx-auto shadow-lg shadow-indigo-200">
             Connect Stripe Account <ArrowRight size={20} />
           </button>
        </div>
      </div>
    </div>
  );
};

// --- My Reviews Page ---
export const MyReviewsPage: React.FC<SubPageProps> = ({ setViewState }) => {
  const user = useUserStore((state) => state.user);
  const [reviews, setReviews] = useState<Array<{
    id: string;
    name: string;
    date: string;
    rating: number;
    image: string;
    comment: string;
    eventName: string;
    userId: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReviews = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { listHostReviews, getEventById, getUserProfile } = await import('@/firebase/db');
        const firestoreReviews = await listHostReviews(user.uid);
        
        // Fetch event and user details for each review
        const reviewsWithDetails = await Promise.all(
          firestoreReviews.map(async (review) => {
            const [event, reviewer] = await Promise.all([
              review.eventId ? getEventById(review.eventId) : null,
              getUserProfile(review.userId),
            ]);

            return {
              id: review.id,
              name: review.userName,
              date: formatReviewDate(review.createdAt as number),
              rating: review.rating,
              image: reviewer?.photoURL || reviewer?.imageUrl || `https://i.pravatar.cc/150?img=${review.userId}`,
              comment: review.comment || '',
              eventName: event?.title || 'Unknown Event',
              userId: review.userId,
            };
          })
        );

        setReviews(reviewsWithDetails);
      } catch (error) {
        console.error('Error loading reviews:', error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [user?.uid]);

  const formatReviewDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleReviewerClick = (userId: string, userName: string) => {
    // Navigate to reviewer's profile
    // This will be handled by App.tsx
    console.log('Reviewer clicked:', userId, userName);
  };

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-20 font-sans">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
           <h1 className="font-heading font-bold text-3xl text-[#15383c]">My Reviews</h1>
           <button 
             onClick={() => setViewState(ViewState.PROFILE)}
             className="w-10 h-10 bg-[#15383c] rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-sm"
           >
             <X size={20} />
           </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No reviews yet</p>
            <p className="text-sm">Reviews from your events will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
             {reviews.map((review) => (
               <div key={review.id} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 transition-transform hover:scale-[1.01] duration-300">
                  <div className="flex gap-4 mb-4">
                     <div 
                       className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 shrink-0 ring-2 ring-white shadow-sm cursor-pointer hover:ring-[#e35e25] transition-all"
                       onClick={() => handleReviewerClick(review.userId, review.name)}
                     >
                        <img 
                          src={review.image} 
                          alt={review.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://i.pravatar.cc/150?img=${review.userId}`;
                          }}
                        />
                     </div>
                     <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h3 
                              className="font-bold text-[#15383c] text-lg leading-tight cursor-pointer hover:text-[#e35e25] transition-colors"
                              onClick={() => handleReviewerClick(review.userId, review.name)}
                            >
                              {review.name}
                            </h3>
                            <span className="text-xs text-gray-400 mt-1">{review.date}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                           <Star size={16} className="fill-[#e35e25] text-[#e35e25]" />
                           <span className="text-sm font-bold text-[#15383c]">{review.rating}</span>
                        </div>
                     </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-600 leading-relaxed font-light text-sm md:text-base mb-4">
                      "{review.comment}"
                    </p>
                  )}
                  <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Event</span>
                      <span className="text-sm font-medium text-[#15383c]">{review.eventName}</span>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};
