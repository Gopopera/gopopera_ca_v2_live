import React from 'react';
import { ViewState } from '../../types';
import { Bell, Calendar, User, ChevronLeft, Circle } from 'lucide-react';

interface NotificationsPageProps {
  setViewState: (view: ViewState) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ setViewState }) => {
  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex items-center mb-8"><button onClick={() => setViewState(ViewState.FEED)} className="mr-4 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15383c] hover:bg-gray-50 transition-colors"><ChevronLeft size={20} /></button><h1 className="font-heading font-bold text-3xl text-[#15383c]">Notifications</h1></div>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"><div className="p-12 text-center text-gray-400"><Bell size={48} className="mx-auto mb-4 opacity-20" /><p>No notifications yet.</p></div></div>
      </div>
    </div>
  );
};