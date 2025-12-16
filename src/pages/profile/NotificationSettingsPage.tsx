
import React, { useState, useEffect } from 'react';
import { ViewState } from '../../../types';
import { ChevronLeft, Bell, Mail, MessageSquare, Calendar, Users, X as XIcon } from 'lucide-react';
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

  const getIcon = (key: string) => {
    switch (key) {
      case 'eventLive':
        return <Calendar size={20} />;
      case 'attendeeReservation':
        return <Users size={20} />;
      case 'groupMessages':
        return <MessageSquare size={20} />;
      case 'cancellations':
        return <XIcon size={20} />;
      case 'email':
        return <Mail size={20} />;
      case 'sms':
        return <MessageSquare size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  const ToggleItem = ({ label, description, isOn, onToggle, disabled, iconKey }: any) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 hover:bg-white/10 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-4 flex-1 pr-4">
          <div className="text-[#e35e25] mt-0.5">
            {getIcon(iconKey)}
          </div>
          <div>
            <h3 className="font-bold text-white text-base sm:text-lg mb-1">{label}</h3>
            <p className="text-gray-400 text-sm">{description}</p>
          </div>
        </div>
        <button 
          onClick={onToggle} 
          disabled={disabled}
          className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 shrink-0 relative ${isOn ? 'bg-[#e35e25]' : 'bg-white/20'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${isOn ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#15383c] pt-20 sm:pt-24 pb-8 sm:pb-12 text-white font-sans">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#15383c] pt-20 sm:pt-24 pb-8 sm:pb-12 text-white font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <button 
          onClick={() => setViewState(ViewState.PROFILE)} 
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"
        >
          <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">
            Notification Preferences
          </h1>
          <p className="text-gray-300 text-base sm:text-lg max-w-2xl mx-auto">
            Control how and when you receive notifications
          </p>
        </div>
        
        {/* Info banner about in-app notifications */}
        <div className="mb-8 p-4 sm:p-5 bg-[#e35e25]/10 border border-[#e35e25]/20 rounded-2xl">
          <div className="flex items-start gap-3">
            <Bell size={20} className="text-[#e35e25] mt-0.5 shrink-0" />
            <p className="text-sm sm:text-base text-gray-300">
              <strong className="text-white">Note:</strong> In-app notifications are always enabled to keep you informed about important updates like new followers, reservations, and favorites.
            </p>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-4 sm:mb-6">
            Event Notifications
          </h2>
          <div className="space-y-3 sm:space-y-4">
            <ToggleItem 
              label="Event Gets Live" 
              description="Be notified when your event becomes public" 
              isOn={toggles.eventLive} 
              onToggle={() => handleToggle('eventLive')}
              disabled={saving}
              iconKey="eventLive"
            />
            <ToggleItem 
              label="Attendee Reservation" 
              description="Be notified when someone reserves a spot" 
              isOn={toggles.attendeeReservation} 
              onToggle={() => handleToggle('attendeeReservation')}
              disabled={saving}
              iconKey="attendeeReservation"
            />
            <ToggleItem 
              label="Event Group Messages" 
              description="Be notified when messages are sent in group chat" 
              isOn={toggles.groupMessages} 
              onToggle={() => handleToggle('groupMessages')}
              disabled={saving}
              iconKey="groupMessages"
            />
            <ToggleItem 
              label="Cancellation Notifications" 
              description="Be notified when someone cancels their reservation" 
              isOn={toggles.cancellations} 
              onToggle={() => handleToggle('cancellations')}
              disabled={saving}
              iconKey="cancellations"
            />
          </div>
        </div>

        {/* Delivery Methods */}
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-4 sm:mb-6">
            Delivery Methods
          </h2>
          <div className="space-y-3 sm:space-y-4">
            <ToggleItem 
              label="Email Notifications" 
              description="Receive notifications via email" 
              isOn={toggles.email} 
              onToggle={() => handleToggle('email')}
              disabled={saving}
              iconKey="email"
            />
            <ToggleItem 
              label="SMS Notifications" 
              description="Receive notifications via SMS (requires verified phone)" 
              isOn={toggles.sms} 
              onToggle={() => handleToggle('sms')}
              disabled={saving}
              iconKey="sms"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
