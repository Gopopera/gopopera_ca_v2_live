import React from 'react';
import { Lock } from 'lucide-react';

export const DemoEventBlocker: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={32} className="text-gray-400" />
        </div>
        <h3 className="font-heading font-bold text-xl sm:text-2xl text-[#15383c] mb-3">
          Demo Event
        </h3>
        <p className="text-gray-600 text-sm sm:text-base mb-6 leading-relaxed">
          This is a demo event. Group chat is only available for real, upcoming events.
        </p>
      </div>
    </div>
  );
};


