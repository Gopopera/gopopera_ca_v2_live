
import React, { useState, useEffect } from 'react';
import { ViewState } from '../../../types';
import { ChevronLeft, Bell, Mail, MessageSquare, Calendar, Users, XCircle, Smartphone } from 'lucide-react';
import { useUserStore } from '../../../stores/userStore';
import { getUserProfile, createOrUpdateUserProfile } from '../../../firebase/db';

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

  const ToggleItem = ({ label, description, isOn, onToggle, disabled, icon }: any) => (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-xl p-4 sm:p-5 hover:border-[#e35e25]/30 hover:shadow-md transition-all group">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3 sm:gap-4 flex-1 pr-4">
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#e35e25]/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#e35e25]/15 transition-colors">
            <div className="text-[#e35e25]">
              {icon}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-[#15383c] text-base sm:text-lg mb-0.5">{label}</h3>
            <p className="text-gray-500 text-sm">{description}</p>
          </div>
        </div>
        <button 
          onClick={onToggle} 
          disabled={disabled}
          className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 shrink-0 relative ${isOn ? 'bg-[#e35e25]' : 'bg-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isOn ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafb] pt-20 sm:pt-24 pb-12 font-sans">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#15383c]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafb] pt-20 sm:pt-24 pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center mb-6 sm:mb-8">
          <button 
            onClick={() => setViewState(ViewState.PROFILE)} 
            className="mr-3 sm:mr-4 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors active:scale-95 touch-manipulation shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c]">Notification Preferences</h1>
            <p className="text-gray-500 text-sm mt-1">Control how and when you receive notifications</p>
          </div>
        </div>
        
        {/* Info banner about in-app notifications */}
        <div className="mb-6 sm:mb-8 p-4 bg-[#e35e25]/5 border border-[#e35e25]/20 rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 bg-[#e35e25]/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Bell size={16} className="text-[#e35e25]" />
          </div>
          <p className="text-sm text-[#15383c]">
            <strong>Note:</strong> In-app notifications are always enabled to keep you informed about important updates like new followers, reservations, and favorites.
          </p>
        </div>

        {/* Event Notifications Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-[#15383c] mb-4">Event Notifications</h2>
          <div className="space-y-3">
            <ToggleItem 
              label="Event Gets Live" 
              description="Be notified when your event becomes public" 
              isOn={toggles.eventLive} 
              onToggle={() => handleToggle('eventLive')}
              disabled={saving}
              icon={<Calendar size={20} />}
            />
            <ToggleItem 
              label="Attendee Reservation" 
              description="Be notified when someone reserves a spot" 
              isOn={toggles.attendeeReservation} 
              onToggle={() => handleToggle('attendeeReservation')}
              disabled={saving}
              icon={<Users size={20} />}
            />
            <ToggleItem 
              label="Event Group Messages" 
              description="Be notified when messages are sent in group chat" 
              isOn={toggles.groupMessages} 
              onToggle={() => handleToggle('groupMessages')}
              disabled={saving}
              icon={<MessageSquare size={20} />}
            />
            <ToggleItem 
              label="Cancellation Notifications" 
              description="Be notified when someone cancels their reservation" 
              isOn={toggles.cancellations} 
              onToggle={() => handleToggle('cancellations')}
              disabled={saving}
              icon={<XCircle size={20} />}
            />
          </div>
        </div>

        {/* Delivery Methods Section */}
        <div>
          <h2 className="text-lg sm:text-xl font-heading font-bold text-[#15383c] mb-4">Delivery Methods</h2>
          <div className="space-y-3">
            <ToggleItem 
              label="Email Notifications" 
              description="Receive notifications via email" 
              isOn={toggles.email} 
              onToggle={() => handleToggle('email')}
              disabled={saving}
              icon={<Mail size={20} />}
            />
            <ToggleItem 
              label="SMS Notifications" 
              description="Receive notifications via SMS (requires verified phone)" 
              isOn={toggles.sms} 
              onToggle={() => handleToggle('sms')}
              disabled={saving}
              icon={<Smartphone size={20} />}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
