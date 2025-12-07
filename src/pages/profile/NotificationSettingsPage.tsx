
import React, { useState, useEffect } from 'react';
import { ViewState } from '../../../types';
import { X } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { getUserProfile, createOrUpdateUserProfile } from '../../firebase/db';

interface NotificationSettingsPageProps {
  setViewState: (view: ViewState) => void;
}

export const NotificationSettingsPage: React.FC<NotificationSettingsPageProps> = ({ setViewState }) => {
  const user = useUserStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggles, setToggles] = useState({
    eventLive: true,
    attendeeReservation: true,
    groupMessages: true,
    cancellations: true,
    email: true,
    sms: true
  });

  // Load notification preferences from Firestore
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const userProfile = await getUserProfile(user.uid);
        const settings = (userProfile?.notification_settings as any) || {};
        
        setToggles({
          eventLive: settings.eventLive !== undefined ? settings.eventLive : true,
          attendeeReservation: settings.attendeeReservation !== undefined ? settings.attendeeReservation : true,
          groupMessages: settings.groupMessages !== undefined ? settings.groupMessages : true,
          cancellations: settings.cancellations !== undefined ? settings.cancellations : true,
          email: settings.email_opt_in !== undefined ? settings.email_opt_in : true,
          sms: settings.sms_opt_in !== undefined ? settings.sms_opt_in : true,
        });
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user?.uid]);

  const handleToggle = async (key: keyof typeof toggles) => {
    if (!user?.uid || saving) return;

    const newValue = !toggles[key];
    const updatedToggles = { ...toggles, [key]: newValue };
    setToggles(updatedToggles);
    
    // Save to Firestore
    try {
      setSaving(true);
      const updates: any = {
        notification_settings: {
          eventLive: updatedToggles.eventLive,
          attendeeReservation: updatedToggles.attendeeReservation,
          groupMessages: updatedToggles.groupMessages,
          cancellations: updatedToggles.cancellations,
          // Map UI toggles to Firestore fields
          email_opt_in: updatedToggles.email,
          sms_opt_in: updatedToggles.sms,
        }
      };
      
      await createOrUpdateUserProfile(user.uid, updates);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      // Revert on error
      setToggles(prev => ({ ...prev, [key]: !newValue }));
      alert('Failed to save notification preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const ToggleItem = ({ label, description, isOn, onToggle, disabled }: any) => (
    <div className="flex items-center justify-between py-6 border-b border-gray-100 last:border-0">
       <div className="pr-4">
          <h3 className="font-bold text-[#15383c] text-lg mb-1">{label}</h3>
          <p className="text-gray-500 font-light text-sm">{description}</p>
       </div>
       <button 
         onClick={onToggle} 
         disabled={disabled}
         className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 shrink-0 relative ${isOn ? 'bg-[#e35e25]' : 'bg-[#15383c]'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
       >
          <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${isOn ? 'translate-x-6' : 'translate-x-0'}`} />
       </button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-24 pb-12 font-sans">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#15383c]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
           <h1 className="font-heading font-bold text-3xl text-[#15383c]">Notification Preferences</h1>
           <button onClick={() => setViewState(ViewState.PROFILE)} className="w-10 h-10 bg-[#15383c] rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity">
             <X size={20} />
           </button>
        </div>
        
        {/* Info banner about in-app notifications */}
        <div className="mb-6 p-4 bg-[#eef4f5] border border-[#15383c]/20 rounded-lg">
          <p className="text-sm text-[#15383c]">
            <strong>Note:</strong> In-app notifications are always enabled to keep you informed about important updates like new followers, reservations, and favorites.
          </p>
        </div>

        <div className="space-y-2">
           <ToggleItem 
             label="Event gets live" 
             description="Do you want to be notified when your event becomes public?" 
             isOn={toggles.eventLive} 
             onToggle={() => handleToggle('eventLive')}
             disabled={saving}
           />
           <ToggleItem 
             label="Attendee Reservation" 
             description="Do you want to be notified when someone becomes your attendee?" 
             isOn={toggles.attendeeReservation} 
             onToggle={() => handleToggle('attendeeReservation')}
             disabled={saving}
           />
           <ToggleItem 
             label="Event Group Messages" 
             description="Do you want to be notified when a message is sent in the group chat?" 
             isOn={toggles.groupMessages} 
             onToggle={() => handleToggle('groupMessages')}
             disabled={saving}
           />
           <ToggleItem 
             label="Cancellation Notifications" 
             description="Do you want to be notified when someone cancels their reservation?" 
             isOn={toggles.cancellations} 
             onToggle={() => handleToggle('cancellations')}
             disabled={saving}
           />
           <ToggleItem 
             label="Email Notifications" 
             description="Do you want to be notified by email? (In-app notifications are always enabled)" 
             isOn={toggles.email} 
             onToggle={() => handleToggle('email')}
             disabled={saving}
           />
           <ToggleItem 
             label="SMS Notifications" 
             description="Do you want to be notified by SMS? (Requires verified phone number)" 
             isOn={toggles.sms} 
             onToggle={() => handleToggle('sms')}
             disabled={saving}
           />
        </div>
      </div>
    </div>
  );
};
