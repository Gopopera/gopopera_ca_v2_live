
import React, { useState } from 'react';
import { ViewState } from '../../types';
import { X } from 'lucide-react';

interface NotificationSettingsPageProps {
  setViewState: (view: ViewState) => void;
}

export const NotificationSettingsPage: React.FC<NotificationSettingsPageProps> = ({ setViewState }) => {
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
    <div className="flex items-center justify-between py-6 border-b border-gray-100 last:border-0">
       <div className="pr-4">
          <h3 className="font-bold text-[#15383c] text-lg mb-1">{label}</h3>
          <p className="text-gray-500 font-light text-sm">{description}</p>
       </div>
       <button onClick={onToggle} className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 shrink-0 relative ${isOn ? 'bg-[#e35e25]' : 'bg-[#15383c]'}`}>
          <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${isOn ? 'translate-x-6' : 'translate-x-0'}`} />
       </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pt-24 pb-12 font-sans">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
           <h1 className="font-heading font-bold text-3xl text-[#15383c]">Notification Preferences</h1>
           <button onClick={() => setViewState(ViewState.PROFILE)} className="w-10 h-10 bg-[#15383c] rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity">
             <X size={20} />
           </button>
        </div>
        <div className="space-y-2">
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
