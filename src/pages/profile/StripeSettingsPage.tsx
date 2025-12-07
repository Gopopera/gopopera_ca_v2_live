
import React from 'react';
import { ViewState } from '../../../types';
import { X, DollarSign, ArrowRight } from 'lucide-react';

interface StripeSettingsPageProps {
  setViewState: (view: ViewState) => void;
}

export const StripeSettingsPage: React.FC<StripeSettingsPageProps> = ({ setViewState }) => {
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
