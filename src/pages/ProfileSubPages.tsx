
import React, { useState, useRef, useEffect } from 'react';
import { ViewState } from '../../types';
import { X, DollarSign, ArrowRight, Star, Camera, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { uploadImage } from '../../firebase/storage';
import { createOrUpdateUserProfile } from '../../firebase/db';
import { getDbSafe, getAuthSafe } from '../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
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
  
  // Cover photo for profile background
  const [coverImage, setCoverImage] = useState<string | null>(
    userProfile?.coverPhotoURL || user?.coverPhotoURL || null
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
  
  // Sync cover image when userProfile or user changes
  React.useEffect(() => {
    const latestCover = userProfile?.coverPhotoURL || user?.coverPhotoURL || null;
    if (latestCover !== coverImage) {
      setCoverImage(latestCover);
    }
  }, [userProfile?.coverPhotoURL, user?.coverPhotoURL]);
  
  // Sync userName when userProfile or user changes
  React.useEffect(() => {
    const latestUserName = userProfile?.displayName || userProfile?.name || user?.displayName || user?.name || '';
    if (latestUserName !== userName) {
      setUserName(latestUserName);
    }
  }, [userProfile?.displayName, userProfile?.name, user?.displayName, user?.name]);
  
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB for cover photos)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    try {
      setUploadingCover(true);
      const path = `users/${user.uid}/cover.jpg`;
      const imageUrl = await uploadImage(path, file);
      
      // Update user profile in Firestore
      await createOrUpdateUserProfile(user.uid, {
        coverPhotoURL: imageUrl,
      });

      // Update local state
      setCoverImage(imageUrl);
      
      // Update user store
      useUserStore.getState().updateUser(user.uid, {
        coverPhotoURL: imageUrl,
      });
      
      // Refresh user profile to sync across all components
      await useUserStore.getState().refreshUserProfile();
      
      console.log('[PROFILE] Cover photo updated successfully and synced across all components');
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      alert('Failed to upload cover photo. Please try again.');
    } finally {
      setUploadingCover(false);
      // Reset file input
      if (coverInputRef.current) {
        coverInputRef.current.value = '';
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
    <div className="min-h-screen bg-[#f8fafb] pt-20 sm:pt-24 pb-8 sm:pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
           <div>
             <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c] mb-2">{t('profile.basicDetails')}</h1>
             <p className="text-sm text-gray-500">Update your profile information</p>
           </div>
           <button 
             onClick={() => setViewState(ViewState.PROFILE)}
             className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors touch-manipulation active:scale-95 shrink-0 shadow-sm"
           >
             <X size={18} className="sm:w-5 sm:h-5" />
           </button>
        </div>
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 p-6 sm:p-8">
        <div className="space-y-6 sm:space-y-8">
           {/* Cover Photo Upload - New */}
           <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#15383c]">Cover Photo</label>
              <p className="text-xs text-gray-500">This image appears behind your profile picture</p>
              <div className="relative">
                <div 
                  className="w-full h-32 sm:h-40 rounded-2xl overflow-hidden shadow-md"
                  style={{
                    background: coverImage 
                      ? `url(${coverImage}) center/cover no-repeat` 
                      : `linear-gradient(135deg, #15383c 0%, #1a4549 50%, #15383c 100%)`
                  }}
                >
                  {!coverImage && (
                    <div className="w-full h-full flex items-center justify-center text-white/60 text-sm">
                      No cover photo set
                    </div>
                  )}
                </div>
                {uploadingCover && (
                  <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                <div className="absolute bottom-3 right-3">
                  <input
                    type="file"
                    ref={coverInputRef}
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                    id="cover-photo-input"
                  />
                  <label
                    htmlFor="cover-photo-input"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm text-[#15383c] rounded-xl text-sm font-bold hover:bg-white transition-colors cursor-pointer touch-manipulation active:scale-95 shadow-md border border-gray-200"
                  >
                    <Camera size={16} />
                    {uploadingCover ? 'Uploading...' : (coverImage ? 'Change' : 'Add Cover')}
                  </label>
                </div>
              </div>
              <p className="text-xs text-gray-500">Recommended: 1200x400px, JPG or PNG up to 10MB</p>
           </div>
           
           {/* Profile Picture Upload - Enhanced */}
           <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#15383c]">{t('profile.profilePicture')}</label>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#e35e25] to-[#15383c] overflow-hidden ring-4 ring-white shadow-xl">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#15383c] text-white text-3xl sm:text-4xl font-bold">
                        {userName?.[0] || user?.displayName?.[0] || user?.name?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 rounded-2xl sm:rounded-3xl flex items-center justify-center backdrop-blur-sm">
                      <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1">
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
                    className="inline-flex items-center gap-2.5 px-5 py-3 bg-[#e35e25] text-white rounded-xl text-sm font-bold hover:bg-[#cf4d1d] transition-colors cursor-pointer touch-manipulation active:scale-95 shadow-md shadow-orange-900/20"
                  >
                    <Camera size={18} />
                    {uploading ? t('profile.uploading') : t('profile.changePhoto')}
                  </label>
                  <p className="text-xs text-gray-500 mt-2">JPG, PNG up to 5MB</p>
                </div>
              </div>
           </div>
           {/* User Name (Publicly shown) - Enhanced */}
           <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#15383c]">{t('profile.userName')}</label>
              <p className="text-xs text-gray-500 mb-3">{t('profile.userNameDescription')}</p>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={t('profile.userName')}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3.5 sm:py-4 px-5 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#e35e25] focus:bg-white focus:ring-2 focus:ring-[#e35e25]/10 transition-all" 
              />
           </div>
           {/* Full Name - Enhanced */}
           <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#15383c]">{t('profile.fullName')}</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('profile.fullName')}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3.5 sm:py-4 px-5 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#e35e25] focus:bg-white focus:ring-2 focus:ring-[#e35e25]/10 transition-all" 
              />
           </div>
           {/* Phone Number - Enhanced */}
           <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#15383c]">{t('profile.phoneNumber')}</label>
              <p className="text-xs text-gray-500 mb-3">{t('profile.phoneNumberDescription')}</p>
              <input 
                type="tel" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={t('profile.phoneNumber')}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3.5 sm:py-4 px-5 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#e35e25] focus:bg-white focus:ring-2 focus:ring-[#e35e25]/10 transition-all" 
              />
           </div>
           {/* Bio - Enhanced */}
           <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#15383c]">{t('profile.bio')}</label>
              <textarea 
                rows={5} 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('profile.bio')}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3.5 sm:py-4 px-5 sm:px-6 text-base text-[#15383c] focus:outline-none focus:border-[#e35e25] focus:bg-white focus:ring-2 focus:ring-[#e35e25]/10 transition-all resize-none" 
              />
           </div>
           <div className="pt-4">
             <button 
               onClick={handleSave}
               disabled={saving}
               className="w-full py-4 bg-[#e35e25] text-white font-bold rounded-xl hover:bg-[#cf4d1d] transition-colors shadow-lg shadow-orange-900/20 touch-manipulation active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
             >
               {saving ? (
                 <>
                   <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                   {t('profile.uploading')}
                 </>
               ) : (
                 <>
                   <CheckCircle2 size={20} />
                   {t('profile.saveChanges')}
                 </>
               )}
             </button>
           </div>
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
    <div className="flex items-center justify-between py-5 sm:py-6 px-5 sm:px-6 hover:bg-gray-50 transition-colors">
       <div className="pr-4 min-w-0 flex-1">
          <h3 className="font-bold text-[#15383c] text-base sm:text-lg mb-1.5">{label}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
       </div>
       <button 
         onClick={onToggle} 
         className={`w-14 h-8 rounded-full p-1 transition-all duration-300 shrink-0 relative touch-manipulation active:scale-95 shadow-inner ${
           isOn 
             ? 'bg-[#e35e25] shadow-orange-900/30' 
             : 'bg-gray-300'
         }`}
       >
          <div className={`w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${
            isOn ? 'translate-x-6' : 'translate-x-0'
          }`} />
       </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-20 sm:pt-24 pb-8 sm:pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
           <div>
             <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c] mb-2">Notification Preferences</h1>
             <p className="text-sm text-gray-500">Manage how you receive notifications</p>
           </div>
           <button onClick={() => setViewState(ViewState.PROFILE)} className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors touch-manipulation active:scale-95 shrink-0 shadow-sm">
             <X size={18} className="sm:w-5 sm:h-5" />
           </button>
        </div>
        {saved && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 size={20} className="text-green-600" />
            Settings saved successfully!
          </div>
        )}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
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
    </div>
  );
};

// --- Privacy Settings Page ---
export const PrivacySettingsPage: React.FC<SubPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-[#f8fafb] pt-20 sm:pt-24 pb-8 sm:pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
           <div>
             <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c] mb-2">Privacy Settings</h1>
             <p className="text-sm text-gray-500">Control your privacy and visibility</p>
           </div>
           <button onClick={() => setViewState(ViewState.PROFILE)} className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors touch-manipulation active:scale-95 shadow-sm">
             <X size={18} className="sm:w-5 sm:h-5" />
           </button>
        </div>
        
        {/* Attendee Reservation Section */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 p-6 sm:p-8 mb-6">
           <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#15383c] mb-6">Profile Visibility</h2>
           <div className="space-y-4">
              <label className="flex items-start gap-4 cursor-pointer group p-4 rounded-xl hover:bg-gray-50 transition-colors">
                 <div className="relative pt-1">
                   <input 
                     type="checkbox" 
                     className="w-5 h-5 border-2 border-gray-300 rounded-md appearance-none checked:bg-[#e35e25] checked:border-[#e35e25] transition-all cursor-pointer focus:ring-2 focus:ring-[#e35e25]/20" 
                   />
                 </div>
                 <div className="flex-1">
                   <span className="text-[#15383c] font-medium block group-hover:text-[#e35e25] transition-colors">Show my full name and photo on my public profile</span>
                   <span className="text-gray-500 text-sm mt-1">Make your profile visible to other users</span>
                 </div>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group p-4 rounded-xl hover:bg-gray-50 transition-colors">
                 <div className="relative pt-1">
                   <input 
                     type="checkbox" 
                     className="w-5 h-5 border-2 border-gray-300 rounded-md appearance-none checked:bg-[#e35e25] checked:border-[#e35e25] transition-all cursor-pointer focus:ring-2 focus:ring-[#e35e25]/20" 
                   />
                 </div>
                 <div className="flex-1">
                   <span className="text-[#15383c] font-medium block group-hover:text-[#e35e25] transition-colors">Hide my profile from search results</span>
                   <span className="text-gray-500 text-sm mt-1">Your profile won't appear in search</span>
                 </div>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group p-4 rounded-xl hover:bg-gray-50 transition-colors">
                 <div className="relative pt-1">
                   <input 
                     type="checkbox" 
                     className="w-5 h-5 border-2 border-gray-300 rounded-md appearance-none checked:bg-[#e35e25] checked:border-[#e35e25] transition-all cursor-pointer focus:ring-2 focus:ring-[#e35e25]/20" 
                   />
                 </div>
                 <div className="flex-1">
                   <span className="text-[#15383c] font-medium block group-hover:text-[#e35e25] transition-colors">Only show my profile to people I've interacted with</span>
                   <span className="text-gray-500 text-sm mt-1">Limit profile visibility to connections</span>
                 </div>
              </label>
           </div>
        </div>
        
        {/* Activity Visibility Section */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 p-6 sm:p-8">
           <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#15383c] mb-6">Activity Visibility</h2>
           <div className="space-y-4">
              <label className="flex items-start gap-4 cursor-pointer group p-4 rounded-xl hover:bg-gray-50 transition-colors">
                 <div className="relative pt-1">
                   <input 
                     type="checkbox" 
                     className="w-5 h-5 border-2 border-gray-300 rounded-md appearance-none checked:bg-[#e35e25] checked:border-[#e35e25] transition-all cursor-pointer focus:ring-2 focus:ring-[#e35e25]/20" 
                   />
                 </div>
                 <div className="flex-1">
                   <span className="text-[#15383c] font-medium block group-hover:text-[#e35e25] transition-colors">Show events I'm attending on my profile</span>
                   <span className="text-gray-500 text-sm mt-1">Display your event activity publicly</span>
                 </div>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group p-4 rounded-xl hover:bg-gray-50 transition-colors">
                 <div className="relative pt-1">
                   <input 
                     type="checkbox" 
                     className="w-5 h-5 border-2 border-gray-300 rounded-md appearance-none checked:bg-[#e35e25] checked:border-[#e35e25] transition-all cursor-pointer focus:ring-2 focus:ring-[#e35e25]/20" 
                   />
                 </div>
                 <div className="flex-1">
                   <span className="text-[#15383c] font-medium block group-hover:text-[#e35e25] transition-colors">Keep my event activity private</span>
                   <span className="text-gray-500 text-sm mt-1">Hide your event participation from others</span>
                 </div>
              </label>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Stripe Settings Page ---
export const StripeSettingsPage: React.FC<SubPageProps> = ({ setViewState }) => {
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  const refreshUserProfile = useUserStore((state) => state.refreshUserProfile);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);

  const stripeAccountId = userProfile?.stripeAccountId;
  const onboardingStatus = userProfile?.stripeOnboardingStatus;
  const accountEnabled = userProfile?.stripeAccountEnabled;
  
  // State for verification process
  const [verifying, setVerifying] = useState(false);

  // Handle return from Stripe onboarding - verify and update account status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const returnedFromStripe = urlParams.get('stripe_return');
    
    if (returnedFromStripe === 'true') {
      // Clear the URL parameter to prevent re-verification on refresh
      window.history.replaceState({}, '', window.location.pathname);
      
      // Verify and update account status
      const verifyAndUpdateAccount = async () => {
        const accountId = stripeAccountId;
        if (!accountId || !user?.uid) {
          // No account ID yet - just refresh profile (account creation might still be in progress)
          await refreshUserProfile();
          return;
        }
        
        setVerifying(true);
        
        try {
          console.log('[STRIPE_SETTINGS] Verifying account status after return:', accountId);
          const response = await fetch('/api/stripe/verify-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId }),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('[STRIPE_SETTINGS] Account verification result:', data);
            
            // Update Firestore based on verification result
            const db = getDbSafe();
            if (db) {
              if (data.chargesEnabled && data.payoutsEnabled) {
                // Account is fully enabled - can accept payments
                await updateDoc(doc(db, 'users', user.uid), {
                  stripeOnboardingStatus: 'complete',
                  stripeAccountEnabled: true,
                });
                console.log('[STRIPE_SETTINGS] ✅ Updated Firestore: account enabled');
              } else if (data.detailsSubmitted) {
                // Details submitted but not yet enabled (pending Stripe verification)
                await updateDoc(doc(db, 'users', user.uid), {
                  stripeOnboardingStatus: 'pending_verification',
                  stripeAccountEnabled: false,
                });
                console.log('[STRIPE_SETTINGS] ⏳ Updated Firestore: pending verification');
              } else {
                // Onboarding incomplete
                await updateDoc(doc(db, 'users', user.uid), {
                  stripeOnboardingStatus: 'incomplete',
                  stripeAccountEnabled: false,
                });
                console.log('[STRIPE_SETTINGS] ⚠️ Updated Firestore: incomplete');
              }
            }
          } else {
            console.error('[STRIPE_SETTINGS] Verification API error:', response.status);
          }
        } catch (error) {
          console.error('[STRIPE_SETTINGS] Error verifying account:', error);
        } finally {
          setVerifying(false);
        }
        
        // Refresh profile to get updated data
        await refreshUserProfile();
      };
      
      verifyAndUpdateAccount();
    }
  }, [refreshUserProfile, stripeAccountId, user?.uid]);

  const handleCreateAccount = async () => {
    console.log('[STRIPE_SETTINGS] handleCreateAccount called', { 
      hasUser: !!user, 
      userId: user?.uid, 
      email: user?.email 
    });

    if (!user?.uid) {
      setError('You must be logged in to set up Stripe');
      return;
    }

    if (!user.email) {
      setError('You must have an email address to set up Stripe');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-account-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          returnUrl: `${window.location.origin}/profile`,
          // Pass existing account ID to avoid creating duplicate accounts
          existingAccountId: stripeAccountId || undefined,
        }),
      });

      console.log('[STRIPE_SETTINGS] API response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('[STRIPE_SETTINGS] API error:', errorData);
        throw new Error(errorData.error || `Failed to create Stripe account (${response.status})`);
      }

      const { accountId, onboardingUrl: url } = await response.json();
      console.log('[STRIPE_SETTINGS] API success:', { accountId, hasUrl: !!url });

      if (!accountId || !url) {
        throw new Error('Invalid response from server: missing accountId or onboardingUrl');
      }

      // Save account ID to user profile
      const db = getDbSafe();
      if (db && user.uid) {
        console.log('[STRIPE_SETTINGS] Saving account ID to Firestore:', accountId);
        await updateDoc(doc(db, 'users', user.uid), {
          stripeAccountId: accountId,
          stripeOnboardingStatus: 'pending',
        });
        
        // Refresh profile
        await refreshUserProfile();
      }

      // Redirect to Stripe onboarding
      console.log('[STRIPE_SETTINGS] Redirecting to Stripe onboarding:', url);
      if (url) {
        window.location.href = url;
      } else {
        setOnboardingUrl(url);
        setError('Onboarding URL not received. Please try again.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('[STRIPE_SETTINGS] Error creating Stripe account:', err);
      const errorMessage = err.message || 'Failed to create Stripe account. Please try again.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = () => {
    console.log('[STRIPE_SETTINGS] handleCompleteOnboarding called', { hasOnboardingUrl: !!onboardingUrl });
    if (onboardingUrl) {
      console.log('[STRIPE_SETTINGS] Using existing onboarding URL');
      window.location.href = onboardingUrl;
    } else {
      console.log('[STRIPE_SETTINGS] No existing URL, creating new account');
      handleCreateAccount();
    }
  };

  const getStatusDisplay = () => {
    // Show verifying state while checking account status
    if (verifying) {
      return {
        status: 'verifying',
        title: 'Verifying Account...',
        description: 'We\'re checking your Stripe account status. This will only take a moment.',
        action: null,
      };
    }
    
    if (!stripeAccountId) {
      return {
        status: 'not_setup',
        title: 'Get Paid with Stripe',
        description: 'To receive payouts from your events, you need to connect a Stripe account. It\'s secure, fast, and trusted by millions.',
        action: 'Connect Stripe Account',
      };
    }

    if (onboardingStatus === 'pending' || onboardingStatus === 'incomplete') {
      return {
        status: 'incomplete',
        title: 'Complete Stripe Setup',
        description: 'You\'ve started setting up your Stripe account. Complete the onboarding process to start receiving payouts.',
        action: 'Complete Setup',
      };
    }
    
    if (onboardingStatus === 'pending_verification') {
      return {
        status: 'pending_verification',
        title: 'Verification in Progress',
        description: 'Your details have been submitted to Stripe. They\'re reviewing your account - this usually takes a few minutes but can take up to 24 hours.',
        action: null,
      };
    }

    if (onboardingStatus === 'complete' && accountEnabled) {
      return {
        status: 'complete',
        title: 'Stripe Account Connected',
        description: 'Your Stripe account is set up and ready to receive payouts. You\'ll receive payments 24 hours after each event.',
        action: null,
      };
    }

    return {
      status: 'pending_approval',
      title: 'Account Pending Approval',
      description: 'Your Stripe account is being reviewed. You\'ll be able to receive payouts once approved.',
      action: null,
    };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-20 sm:pt-24 pb-8 sm:pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c] mb-2">Stripe Payout Settings</h1>
            <p className="text-sm text-gray-500">Manage your payment and payout preferences</p>
          </div>
          <button 
            onClick={() => setViewState(ViewState.PROFILE)} 
            className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors touch-manipulation active:scale-95 shadow-sm"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900 mb-1">Error</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 p-8 sm:p-12 text-center">
          <div className={`w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg ${
            statusDisplay.status === 'complete' 
              ? 'bg-green-100' 
              : statusDisplay.status === 'verifying' || statusDisplay.status === 'pending_verification'
              ? 'bg-yellow-100'
              : 'bg-gradient-to-br from-[#635bff] to-[#544dc9]'
          }`}>
            {statusDisplay.status === 'complete' ? (
              <CheckCircle2 size={48} className="text-green-600" />
            ) : statusDisplay.status === 'verifying' ? (
              <Loader2 size={48} className="text-yellow-600 animate-spin" />
            ) : statusDisplay.status === 'pending_verification' ? (
              <AlertCircle size={48} className="text-yellow-600" />
            ) : (
              <DollarSign size={48} className="text-white" />
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#15383c] mb-4">
            {statusDisplay.title}
          </h2>
          <p className="text-gray-600 max-w-lg mx-auto mb-8 text-base leading-relaxed">
            {statusDisplay.description}
          </p>

          {statusDisplay.status === 'complete' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto mb-6">
              <div className="flex items-center gap-2 text-green-800 justify-center">
                <CheckCircle2 className="w-5 h-5" />
                <p className="text-sm font-semibold">Account Active</p>
              </div>
              <p className="text-xs text-green-700 mt-2">
                Account ID: {stripeAccountId?.substring(0, 20)}...
              </p>
            </div>
          )}

          {statusDisplay.action && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[STRIPE_SETTINGS] Button clicked', { loading, action: statusDisplay.action });
                if (!loading) {
                  handleCompleteOnboarding();
                }
              }}
              disabled={loading}
              type="button"
              className="px-8 py-4 bg-[#635bff] text-white font-bold rounded-xl hover:bg-[#544dc9] transition-all flex items-center gap-2 mx-auto shadow-lg shadow-indigo-900/20 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {statusDisplay.action} <ArrowRight size={20} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- My Reviews Page ---
export const MyReviewsPage: React.FC<SubPageProps & { onHostClick?: (hostName: string, hostId?: string) => void }> = ({ setViewState, onHostClick }) => {
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
      onHostClick(userName, userId);
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
           <div>
             <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c] mb-2">My Reviews</h1>
             <p className="text-sm text-gray-500">Manage reviews from your events</p>
           </div>
           <button 
             onClick={() => setViewState(ViewState.PROFILE)}
             className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors touch-manipulation active:scale-95 shadow-sm"
           >
             <X size={18} className="sm:w-5 sm:h-5" />
           </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 p-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-[#e35e25]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star size={40} className="text-[#e35e25]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#15383c] mb-2">No reviews yet</h3>
            <p className="text-gray-500 text-sm sm:text-base">Reviews from your events will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
             {reviews.map((review) => (
               <div key={review.id} className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-md border border-gray-100 hover:shadow-lg transition-all">
                  <div className="flex gap-4 mb-4">
                     <div 
                       className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#e35e25] to-[#15383c] shrink-0 ring-2 ring-white shadow-md cursor-pointer hover:ring-[#e35e25] transition-all"
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
                        <div className="flex justify-between items-start mb-2">
                            <h3 
                              className="font-bold text-[#15383c] text-base sm:text-lg leading-tight cursor-pointer hover:text-[#e35e25] transition-colors"
                              onClick={() => handleReviewerClick(review.userId, review.name)}
                            >
                              {review.name}
                            </h3>
                            <span className="text-xs text-gray-400">{review.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="flex items-center">
                             {[...Array(5)].map((_, i) => (
                               <Star 
                                 key={i}
                                 size={16} 
                                 className={i < review.rating ? 'fill-[#e35e25] text-[#e35e25]' : 'text-gray-300'} 
                               />
                             ))}
                           </div>
                           <span className="text-sm font-bold text-[#15383c]">{review.rating}/5</span>
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
                  
                  {/* Accept/Contest Actions - Enhanced */}
                  {review.status === 'pending' && (
                    <div className="pt-4 border-t border-gray-100 flex gap-3">
                      <button
                        onClick={() => handleAcceptReview(review.id)}
                        className="flex-1 px-5 py-2.5 bg-[#15383c] text-white rounded-xl text-sm font-bold hover:bg-[#1f4d52] transition-colors shadow-md touch-manipulation active:scale-95"
                      >
                        Accept Review
                      </button>
                      <button
                        onClick={() => setContestingReviewId(review.id)}
                        className="flex-1 px-5 py-2.5 bg-white border-2 border-gray-200 text-[#15383c] rounded-xl text-sm font-bold hover:border-[#e35e25] hover:text-[#e35e25] transition-colors touch-manipulation active:scale-95"
                      >
                        Contest
                      </button>
                    </div>
                  )}
                  
                  {/* Contest Form - Enhanced */}
                  {contestingReviewId === review.id && (
                    <div className="pt-4 border-t border-gray-100 mt-4 bg-gray-50 rounded-xl p-4">
                      <label className="block text-sm font-semibold text-[#15383c] mb-2">Contest Reason</label>
                      <textarea
                        value={contestMessage}
                        onChange={(e) => setContestMessage(e.target.value)}
                        placeholder="Please explain why you're contesting this review..."
                        className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#e35e25] focus:ring-2 focus:ring-[#e35e25]/10 mb-3 bg-white"
                        rows={4}
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleContestReview(review.id)}
                          className="flex-1 px-5 py-2.5 bg-[#e35e25] text-white rounded-xl text-sm font-bold hover:bg-[#cf4d1d] transition-colors shadow-md touch-manipulation active:scale-95"
                        >
                          Submit Contest
                        </button>
                        <button
                          onClick={() => {
                            setContestingReviewId(null);
                            setContestMessage('');
                          }}
                          className="px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors touch-manipulation active:scale-95"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Status Badge - Enhanced */}
                  {review.status === 'accepted' && (
                    <div className="pt-4 border-t border-gray-100">
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-200">
                        <CheckCircle2 size={16} />
                        Accepted
                      </span>
                    </div>
                  )}
                  
                  {review.status === 'contested' && (
                    <div className="pt-4 border-t border-gray-100">
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-xs font-bold border border-orange-200">
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
export const FollowingPage: React.FC<SubPageProps & { onHostClick?: (hostName: string, hostId?: string) => void }> = ({ setViewState, onHostClick }) => {
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

  const handleProfileClick = (hostName: string, hostId?: string) => {
    if (onHostClick) {
      onHostClick(hostName, hostId);
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
                    onClick={() => handleProfileClick(host.name, host.id)}
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
export const FollowersPage: React.FC<SubPageProps & { onHostClick?: (hostName: string, hostId?: string) => void }> = ({ setViewState, onHostClick }) => {
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

  const handleProfileClick = (hostName: string, hostId?: string) => {
    if (onHostClick) {
      onHostClick(hostName, hostId);
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
                    onClick={() => handleProfileClick(follower.name, follower.id)}
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
