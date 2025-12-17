/**
 * Marketing Assets Page
 * View and export marketing assets like Instagram posts
 * 
 * Access at: /marketing-assets (add route in App.tsx)
 * Or import directly in any component for testing
 */

import React from 'react';
import { InstagramLaunchPost } from '../../components/marketing/InstagramLaunchPost';

export const MarketingAssetsPage: React.FC = () => {
  const handleExportInstructions = () => {
    alert(
      'To export this Instagram post:\n\n' +
      '1. Open browser DevTools (F12)\n' +
      '2. Click the device toolbar icon (or Ctrl+Shift+M)\n' +
      '3. Set dimensions to 1080 x 1350\n' +
      '4. Right-click on the post and select "Capture node screenshot"\n\n' +
      'Or use a screenshot tool at 1080x1350 resolution.'
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Marketing Assets</h1>
          <p className="text-gray-400">Preview and export marketing visuals</p>
          <button
            onClick={handleExportInstructions}
            className="mt-4 px-4 py-2 bg-[#e35e25] text-white rounded-lg font-medium hover:bg-[#cf4d1d] transition-colors"
          >
            How to Export
          </button>
        </div>

        {/* Instagram Post Preview */}
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-semibold text-white mb-4">Instagram Launch Post (1080 × 1350)</h2>
          <p className="text-gray-400 text-sm mb-6">Portrait format for Instagram feed</p>
          
          {/* Scaled preview wrapper */}
          <div 
            className="shadow-2xl rounded-lg overflow-hidden"
            style={{
              transform: 'scale(0.5)',
              transformOrigin: 'top center',
              marginBottom: '-337px' // Compensate for scale
            }}
          >
            <InstagramLaunchPost />
          </div>
        </div>

        {/* Image Credits */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Background photo from Unsplash (replace with your own for production)</p>
          <p className="mt-1">
            Suggested: Candid group photos of 3-7 diverse people at a social gathering
          </p>
        </div>
      </div>
    </div>
  );
};

export default MarketingAssetsPage;

