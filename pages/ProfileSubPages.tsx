
import React, { useState, useRef } from 'react';
import { ViewState } from '../types';
import { X, DollarSign, ArrowRight, Star, Camera } from 'lucide-react';
import { useUserStore } from '../stores/userStore';
import { uploadImage } from '../firebase/storage';
import { createOrUpdateUserProfile } from '../firebase/db';

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
      
      // Update user profile in Firestore
      await createOrUpdateUserProfile(user.uid, {
        photoURL: imageUrl,
        imageUrl: imageUrl,
      });

      // Update local state
      setProfileImage(imageUrl);
      
      // Update user store
      useUserStore.getState().updateUser(user.uid, {
        photoURL: imageUrl,
        profileImageUrl: imageUrl,
      });
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
              <label className="block text-xs sm:text-sm font-light text-gray-600 pl-1">Phone Number</label>
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
  const [toggles, setToggles] = useState({
    eventLive: true,
    attendeeReservation: true,
    groupMessages: true,
    cancellations: true,
    email: true,
    sms: true
  });

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
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
        <div className="space-y-1 sm:space-y-2">
           <ToggleItem label="Event gets live" description="Do you want to be notified when your event becomes public?" isOn={toggles.eventLive} onToggle={() => handleToggle('eventLive')} />
           <ToggleItem label="Attendee Reservation" description="Do you want to be notified when someone becomes your attendee?" isOn={toggles.attendeeReservation} onToggle={() => handleToggle('attendeeReservation')} />
           <ToggleItem label="Event Group Messages" description="Do you want to be notified when a message is sent in the group chat?" isOn={toggles.groupMessages} onToggle={() => handleToggle('groupMessages')} />
           <ToggleItem label="Cancellation Notifications" description="Do you want to be notified when someone cancels their reservation?" isOn={toggles.cancellations} onToggle={() => handleToggle('cancellations')} />
           <ToggleItem label="Email Notifications" description="Do you want to be notified by email?" isOn={toggles.email} onToggle={() => handleToggle('email')} />
           <ToggleItem label="SMS Notifications" description="Do you want to be notified by sms?" isOn={toggles.sms} onToggle={() => handleToggle('sms')} />
        </div>
      </div>
    </div>
  );
};

// --- Privacy Settings Page ---
export const PrivacySettingsPage: React.FC<SubPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-white pt-24 pb-12 font-sans">
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
    <div className="min-h-screen bg-white pt-24 pb-12 font-sans">
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
  const reviews = [
    {
      id: 1,
      name: "Fadel Gergab",
      date: "Nov 8, 2025",
      rating: 4.2,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop",
      comment: "The popup and event were well-organized and engaging. The setup attracted good attention, and the flow of activities kept visitors interested throughout. The overall presentation was visually appealing, and the team managed everything efficiently. Attendees appreciated the interactive elements and the professional approach.",
      eventName: "Retro Record Fair Extravaganza"
    },
    {
      id: 2,
      name: "Sarah Jenkins",
      date: "Oct 15, 2025",
      rating: 5.0,
      image: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?q=80&w=2070&auto=format&fit=crop", 
      comment: "Absolutely loved the vibe! The host was incredibly welcoming and the venue was perfect for the occasion. Can't wait for the next one.",
      eventName: "Urban Garden Workshop"
    },
    {
      id: 3,
      name: "Marcus Cole",
      date: "Sep 22, 2025",
      rating: 4.8,
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&auto=format&fit=crop",
      comment: "Great networking opportunity. I met some really interesting people. The only downside was that it ended too soon!",
      eventName: "Tech Networking Night"
    }
  ];

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

        <div className="space-y-4">
           {reviews.map((review) => (
             <div key={review.id} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 transition-transform hover:scale-[1.01] duration-300">
                <div className="flex gap-4 mb-4">
                   <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 shrink-0 ring-2 ring-white shadow-sm">
                      <img src={review.image} alt={review.name} className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between items-start">
                          <h3 className="font-bold text-[#15383c] text-lg leading-tight">{review.name}</h3>
                          <span className="text-xs text-gray-400 mt-1">{review.date}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                         <Star size={16} className="fill-[#e35e25] text-[#e35e25]" />
                         <span className="text-sm font-bold text-[#15383c]">{review.rating}</span>
                      </div>
                   </div>
                </div>
                <p className="text-gray-600 leading-relaxed font-light text-sm md:text-base mb-4">
                  "{review.comment}"
                </p>
                <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Event</span>
                    <span className="text-sm font-medium text-[#15383c]">{review.eventName}</span>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
