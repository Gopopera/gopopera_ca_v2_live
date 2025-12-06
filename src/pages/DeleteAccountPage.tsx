import React from 'react';
import { ViewState } from '../../types';
import { ChevronLeft, AlertTriangle } from 'lucide-react';

interface DeleteAccountPageProps {
  setViewState: (view: ViewState) => void;
  onConfirmDelete: () => void;
}

export const DeleteAccountPage: React.FC<DeleteAccountPageProps> = ({ setViewState, onConfirmDelete }) => {
  return (
    <div className="min-h-screen bg-[#f8fafb] pt-24 pb-20 font-sans">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        <div className="mb-6 sm:mb-8"><button onClick={() => setViewState(ViewState.PROFILE)} className="flex items-center text-gray-400 hover:text-[#15383c] text-sm sm:text-base touch-manipulation active:scale-95"><ChevronLeft size={18} className="sm:w-5 sm:h-5 mr-1" /> Back to Profile</button></div>
        <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm text-center"><h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#15383c] mb-4 sm:mb-6">Delete Account</h1><button onClick={onConfirmDelete} className="w-full py-3.5 sm:py-4 bg-red-50 text-red-600 font-bold rounded-xl sm:rounded-2xl border border-red-100 touch-manipulation active:scale-95 text-sm sm:text-base">Yes, Delete</button></div>
      </div>
    </div>
  );
};