
import React, { useState, useRef, useEffect } from 'react';
import { ViewState } from '../../types';
import { X, DollarSign, ArrowRight, Star, Camera, CheckCircle2 } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { uploadImage } from '../../firebase/storage';
import { createOrUpdateUserProfile } from '../../firebase/db';
import { getDbSafe, getAuthSafe } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useLanguage } from '../../contexts/LanguageContext';

interface SubPageProps {
  setViewState: (view: ViewState) => void;
}

// --- Basic Details Page ---
export const BasicDetailsPage: React.FC<SubPageProps> = ({ setViewState }) => {
  const { t } = useLanguage();
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  // Priority: userProfile (Firestore - most up-to-date) > user (Auth) > fallback
  const [profileImage, setProfileImage] = useState<string | null>(
    userProfile?.photoURL || userProfile?.imageUrl || user?.photoURL || user?.profileImageUrl || null
  );
  
  // User name (publicly shown) - editable
  const [userName, setUserName] = useState<string>(
    userProfile?.displayName || userProfile?.name || user?.displayName || user?.name || ''
  );
  
  // Full name, phone, bio - not auto-filled, user must fill
  const [fullName, setFullName] = useState<string>(userProfile?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(userProfile?.phone_number || '');
  const [bio, setBio] = useState<string>(userProfile?.bio || '');
  
  // Sync profile image when userProfile or user changes
  React.useEffect(() => {
    const latestPic = userProfile?.photoURL || userProfile?.imageUrl || user?.photoURL || user?.profileImageUrl || null;
    if (latestPic !== profileImage) {
      setProfileImage(latestPic);
    }
  }, [userProfile?.photoURL, userProfile?.imageUrl, user?.photoURL, user?.profileImageUrl]);
  
  // Sync userName when userProfile or user changes
  React.useEffect(() => {
    const latestUserName = userProfile?.displayName || userProfile?.name || user?.displayName || user?.name || '';
    if (latestUserName !== userName) {
      setUserName(latestUserName);
    }
  }, [userProfile?.displayName, userProfile?.name, user?.displayName, user?.name]);
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const handleSave = async () => {
    if (!user?.uid) {
      alert('You must be logged in to update your profile.');
      return;
    }

    try {
      setSaving(true);
      
      // Update user profile in Firestore
      const updates: any = {
        displayName: userName.trim() || user?.displayName || user?.name || 'User',
        name: userName.trim() || user?.displayName || user?.name || 'User',
      };
      
      // Only update fields that have values (don't overwrite with empty strings)
      if (fullName.trim()) {
        updates.fullName = fullName.trim();
      }
      if (phoneNumber.trim()) {
        updates.phone_number = phoneNumber.trim();
      }
      if (bio.trim()) {
        updates.bio = bio.trim();
      }
      
      await createOrUpdateUserProfile(user.uid, updates);
      
      // Update Firebase Auth displayName if userName changed
      if (userName.trim() && userName.trim() !== user?.displayName) {
        const auth = getAuthSafe();
        if (auth?.currentUser) {
          try {
            await updateProfile(auth.currentUser, { displayName: userName.trim() });
            console.log('[PROFILE] Updated Firebase Auth displayName');
          } catch (authError) {
            console.warn('[PROFILE] Failed to update Firebase Auth displayName (non-critical):', authError);
          }
        }
      }
      
      // Update local state
      useUserStore.getState().updateUser(user.uid, {
        displayName: userName.trim() || user?.displayName || user?.name || 'User',
        name: userName.trim() || user?.displayName || user?.name || 'User',
      });
      
      // Refresh user profile to sync across all components
      await useUserStore.getState().refreshUserProfile();
      
      alert('Profile updated successfully!');
      console.log('[PROFILE] Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-20 sm:pt-24 pb-8 sm:pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6 sm:mb-8 border-b border-gray-100 pb-4 sm:pb-6">
           <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c]">{t('profile.basicDetails')}</h1>
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
              <label className="block text-xs sm:text-sm font-light text-gray-600 pl-1">{t('profile.profilePicture')}</label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-200 overflow-hidden ring-2 ring-gray-200">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-2xl font-bold">
                        {userName?.[0] || user?.displayName?.[0] || user?.name?.[0] || 'U'}
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
                    {uploading ? t('profile.uploading') : t('profile.changePhoto')}
                  </label>
                </div>
              </div>
           </div>
           {/* User Name (Publicly shown) - Editable */}
           <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-light text-gray-600 pl-1">{t('profile.userName')} <span className="text-gray-400 font-normal text-[10px]">({t('profile.userNameDescription')})</span></label>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={t('profile.userName')}
                className="w-full bg-white border border-gray-200 rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all" 
              />
           </div>
           {/* Full Name - Not auto-filled */}
           <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-light text-gray-600 pl-1">{t('profile.fullName')}</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('profile.fullName')}
                className="w-full bg-white border border-gray-200 rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all" 
              />
           </div>
           {/* Phone Number - Not auto-filled */}
           <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-light text-gray-600 pl-1">{t('profile.phoneNumber')} <span className="text-gray-400 font-normal">({t('profile.phoneNumberDescription')})</span></label>
              <input 
                type="tel" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={t('profile.phoneNumber')}
                className="w-full bg-white border border-gray-200 rounded-full py-3 sm:py-4 px-4 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all" 
              />
           </div>
           {/* Bio - Not auto-filled */}
           <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-light text-gray-600 pl-1">{t('profile.bio')}</label>
              <textarea 
                rows={4} 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('profile.bio')}
                className="w-full bg-white border border-gray-200 rounded-2xl sm:rounded-3xl py-3 sm:py-4 px-4 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#15383c] transition-all resize-none" 
              />
           </div>
           <div className="pt-6 sm:pt-8">
             <button 
               onClick={handleSave}
               disabled={saving}
               className="w-full py-3.5 sm:py-4 bg-[#15383c] text-white font-bold rounded-xl sm:rounded-2xl hover:bg-[#1f4d52] transition-colors shadow-lg touch-manipulation active:scale-95 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {saving ? t('profile.uploading') : t('profile.saveChanges')}
             </button>
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
export const MyReviewsPage: React.FC<SubPageProps & { onHostClick?: (hostName: string) => void }> = ({ setViewState, onHostClick }) => {
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
    eventId: string;
    status?: 'pending' | 'accepted' | 'contested';
    contestMessage?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [contestingReviewId, setContestingReviewId] = useState<string | null>(null);
  const [contestMessage, setContestMessage] = useState('');

  useEffect(() => {
    const loadReviews = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { listHostReviews, getEventById, getUserProfile } = await import('@/firebase/db');
        // For host's own reviews page, show all reviews (including pending) for management
        // But the count shown should match accepted reviews only
        const firestoreReviews = await listHostReviews(user.uid, true); // Include pending for host management
        
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
              eventId: review.eventId || '',
              status: (review as any).status || 'pending', // Default to pending for new reviews
              contestMessage: (review as any).contestMessage || '',
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
    if (onHostClick) {
      onHostClick(userName);
    }
  };

  const handleAcceptReview = async (reviewId: string) => {
    try {
      // Update review status to accepted in Firestore
      const { getDbSafe } = await import('../lib/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      const { recalculateEventRating } = await import('@/firebase/db');
      const db = getDbSafe();
      if (!db) return;
      
      // Find the review's eventId
      const review = reviews.find(r => r.id === reviewId);
      if (!review?.eventId) return;
      
      const reviewRef = doc(db, 'events', review.eventId, 'reviews', reviewId);
      await updateDoc(reviewRef, { status: 'accepted' });
      
      // Recalculate event rating to include this accepted review
      // This ensures the event's rating and review count are synced everywhere
      await recalculateEventRating(review.eventId);
      
      // Update local state
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: 'accepted' as const } : r));
    } catch (error) {
      console.error('Error accepting review:', error);
      alert('Failed to accept review. Please try again.');
    }
  };

  const handleContestReview = async (reviewId: string) => {
    if (!contestMessage.trim()) {
      alert('Please provide a reason for contesting this review.');
      return;
    }

    try {
      const review = reviews.find(r => r.id === reviewId);
      if (!review) return;

      // Send contest email to support
      const { sendEmail } = await import('../lib/email');
      const hostName = user?.displayName || user?.name || 'Unknown';
      const hostId = user?.uid || 'unknown';
      const subject = `Review contest_${hostName}_${hostId}`;
      
      const emailHtml = `
        <h2 style="margin: 0 0 24px 0; color: #15383c; font-size: 24px; font-weight: bold;">Review Contest</h2>
        <div style="background-color: #f8fafb; padding: 24px; border-radius: 12px;">
          <p style="margin: 0 0 12px 0; color: #374151; font-size: 16px; line-height: 1.6;">
            <strong style="color: #15383c;">Host:</strong> ${hostName} (${hostId})
          </p>
          <p style="margin: 0 0 12px 0; color: #374151; font-size: 16px; line-height: 1.6;">
            <strong style="color: #15383c;">Reviewer:</strong> ${review.name}
          </p>
          <p style="margin: 0 0 12px 0; color: #374151; font-size: 16px; line-height: 1.6;">
            <strong style="color: #15383c;">Event:</strong> ${review.eventName}
          </p>
          <p style="margin: 0 0 12px 0; color: #374151; font-size: 16px; line-height: 1.6;">
            <strong style="color: #15383c;">Rating:</strong> ${review.rating}/5
          </p>
          <p style="margin: 0 0 12px 0; color: #374151; font-size: 16px; line-height: 1.6;">
            <strong style="color: #15383c;">Review Comment:</strong> ${review.comment || 'No comment'}
          </p>
          <div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid #e5e7eb;">
            <p style="margin: 0 0 12px 0; color: #15383c; font-size: 18px; font-weight: bold;">Contest Message:</p>
            <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${contestMessage}</p>
          </div>
        </div>
      `;

      await sendEmail({
        to: 'support@gopopera.ca',
        subject,
        html: emailHtml,
        templateName: 'review-contest',
      });

      // Update review status to contested in Firestore
      const { getDbSafe } = await import('../lib/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      const db = getDbSafe();
      if (db && review.eventId) {
        const reviewRef = doc(db, 'events', review.eventId, 'reviews', reviewId);
        await updateDoc(reviewRef, { 
          status: 'contested',
          contestMessage: contestMessage,
          contestedAt: Date.now(),
        });
      }

      // Update local state
      setReviews(prev => prev.map(r => 
        r.id === reviewId 
          ? { ...r, status: 'contested' as const, contestMessage } 
          : r
      ));

      // Reset contest form
      setContestingReviewId(null);
      setContestMessage('');
      alert('Review contest submitted. Our support team will review it shortly.');
    } catch (error) {
      console.error('Error contesting review:', error);
      alert('Failed to submit contest. Please try again.');
    }
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
                  <div className="pt-4 border-t border-gray-50 flex justify-between items-center mb-4">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Event</span>
                      <span className="text-sm font-medium text-[#15383c]">{review.eventName}</span>
                  </div>
                  
                  {/* Accept/Contest Actions - Only show for pending reviews */}
                  {review.status === 'pending' && (
                    <div className="pt-4 border-t border-gray-50 flex gap-3">
                      <button
                        onClick={() => handleAcceptReview(review.id)}
                        className="flex-1 px-4 py-2 bg-[#15383c] text-white rounded-full text-sm font-medium hover:bg-[#1f4d52] transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setContestingReviewId(review.id)}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        Contest
                      </button>
                    </div>
                  )}
                  
                  {/* Contest Form */}
                  {contestingReviewId === review.id && (
                    <div className="pt-4 border-t border-gray-50 mt-4">
                      <textarea
                        value={contestMessage}
                        onChange={(e) => setContestMessage(e.target.value)}
                        placeholder="Please explain why you're contesting this review..."
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#15383c] mb-3"
                        rows={4}
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleContestReview(review.id)}
                          className="flex-1 px-4 py-2 bg-[#e35e25] text-white rounded-full text-sm font-medium hover:bg-[#cf4d1d] transition-colors"
                        >
                          Submit Contest
                        </button>
                        <button
                          onClick={() => {
                            setContestingReviewId(null);
                            setContestMessage('');
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  {review.status === 'accepted' && (
                    <div className="pt-4 border-t border-gray-50">
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                        <CheckCircle2 size={14} />
                        Accepted
                      </span>
                    </div>
                  )}
                  
                  {review.status === 'contested' && (
                    <div className="pt-4 border-t border-gray-50">
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
                        Under Review
                      </span>
                    </div>
                  )}
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Following Page ---
export const FollowingPage: React.FC<SubPageProps & { onHostClick?: (hostName: string) => void }> = ({ setViewState, onHostClick }) => {
  const user = useUserStore((state) => state.user);
  const [following, setFollowing] = useState<Array<{ id: string; name: string; photoURL?: string; imageUrl?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFollowing = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { getFollowingHosts } = await import('../../firebase/follow');
        const { getUserProfile } = await import('../../firebase/db');
        const followingIds = await getFollowingHosts(user.uid);
        
        const followingProfiles = await Promise.all(
          followingIds.map(async (hostId) => {
            const profile = await getUserProfile(hostId);
            return {
              id: hostId,
              name: profile?.name || profile?.displayName || 'Unknown',
              photoURL: profile?.photoURL,
              imageUrl: profile?.imageUrl,
            };
          })
        );
        
        setFollowing(followingProfiles);
      } catch (error) {
        console.error('Error loading following:', error);
        setFollowing([]);
      } finally {
        setLoading(false);
      }
    };

    loadFollowing();
  }, [user?.uid]);

  const handleUnfollow = async (hostId: string) => {
    if (!user?.uid) return;
    
    try {
      const { unfollowHost } = await import('../../firebase/follow');
      await unfollowHost(user.uid, hostId);
      setFollowing(prev => prev.filter(f => f.id !== hostId));
    } catch (error) {
      console.error('Error unfollowing:', error);
      alert('Failed to unfollow. Please try again.');
    }
  };

  const handleProfileClick = (hostName: string) => {
    if (onHostClick) {
      onHostClick(hostName);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-20 font-sans">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading font-bold text-3xl text-[#15383c]">Following</h1>
          <button 
            onClick={() => setViewState(ViewState.PROFILE)}
            className="w-10 h-10 bg-[#15383c] rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : following.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">Not following anyone yet</p>
            <p className="text-sm">Start following hosts to see their events in your feed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {following.map((host) => {
              const photo = host.photoURL || host.imageUrl;
              const initials = host.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              
              return (
                <div key={host.id} className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div 
                    className="flex items-center gap-4 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleProfileClick(host.name)}
                  >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#e35e25] flex items-center justify-center overflow-hidden shrink-0">
                      {photo ? (
                        <img src={photo} alt={host.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-heading font-bold text-white text-lg">{initials}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#15383c] text-base md:text-lg">{host.name}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnfollow(host.id)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Unfollow
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Followers Page ---
export const FollowersPage: React.FC<SubPageProps & { onHostClick?: (hostName: string) => void }> = ({ setViewState, onHostClick }) => {
  const user = useUserStore((state) => state.user);
  const [followers, setFollowers] = useState<Array<{ id: string; name: string; photoURL?: string; imageUrl?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFollowers = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { getHostFollowers } = await import('../../firebase/follow');
        const { getUserProfile } = await import('../../firebase/db');
        const followersIds = await getHostFollowers(user.uid);
        
        const followersProfiles = await Promise.all(
          followersIds.map(async (followerId) => {
            const profile = await getUserProfile(followerId);
            return {
              id: followerId,
              name: profile?.name || profile?.displayName || 'Unknown',
              photoURL: profile?.photoURL,
              imageUrl: profile?.imageUrl,
            };
          })
        );
        
        setFollowers(followersProfiles);
      } catch (error) {
        console.error('Error loading followers:', error);
        setFollowers([]);
      } finally {
        setLoading(false);
      }
    };

    loadFollowers();
  }, [user?.uid]);

  const handleProfileClick = (hostName: string) => {
    if (onHostClick) {
      onHostClick(hostName);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-20 font-sans">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading font-bold text-3xl text-[#15383c]">Followers</h1>
          <button 
            onClick={() => setViewState(ViewState.PROFILE)}
            className="w-10 h-10 bg-[#15383c] rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : followers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No followers yet</p>
            <p className="text-sm">Start hosting events to gain followers.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {followers.map((follower) => {
              const photo = follower.photoURL || follower.imageUrl;
              const initials = follower.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              
              return (
                <div key={follower.id} className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div 
                    className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleProfileClick(follower.name)}
                  >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#e35e25] flex items-center justify-center overflow-hidden shrink-0">
                      {photo ? (
                        <img src={photo} alt={follower.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-heading font-bold text-white text-lg">{initials}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#15383c] text-base md:text-lg">{follower.name}</h3>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
