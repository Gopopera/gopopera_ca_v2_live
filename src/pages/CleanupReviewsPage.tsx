/**
 * Cleanup Reviews Admin Page
 * Only accessible to eatezca@gmail.com
 * Safely runs the cleanup script to remove duplicate reviews and limit to 25
 */

import React, { useState } from 'react';
import { ViewState } from '../../types';
import { ChevronLeft, CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { POPERA_EMAIL } from '../../src/constants/popera';
import { cleanupPoperaReviews } from '../../scripts/cleanupPoperaReviews';

interface CleanupReviewsPageProps {
  setViewState: (view: ViewState) => void;
}

export const CleanupReviewsPage: React.FC<CleanupReviewsPageProps> = ({ setViewState }) => {
  const user = useUserStore((state) => state.user);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const normalizedEmail = user?.email?.toLowerCase().trim();

  // Only show if user is authenticated and is eatezca@gmail.com
  const isAuthorized = normalizedEmail === POPERA_EMAIL;

  const handleCleanup = async () => {
    if (!isAuthorized || !user?.uid) {
      setResult({ success: false, message: 'Unauthorized. Only eatezca@gmail.com can run reviews cleanup.' });
      return;
    }

    setIsRunning(true);
    setResult(null);

    try {
      const cleanupResult = await cleanupPoperaReviews();
      
      setResult({ 
        success: true, 
        message: `Reviews cleanup completed successfully!`,
        details: cleanupResult
      });
    } catch (error: any) {
      console.error('[CLEANUP_REVIEWS] Error:', error);
      setResult({ 
        success: false, 
        message: error.message || 'Failed to cleanup reviews. Check console for details.',
        details: error
      });
    } finally {
      setIsRunning(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#15383c] pt-20 sm:pt-24 pb-8 sm:pb-12 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <button 
            onClick={() => setViewState(ViewState.LANDING)} 
            className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"
          >
            <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
          </button>
          
          <div className="bg-white/10 rounded-2xl p-6 sm:p-8 text-center">
            <XCircle size={48} className="mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-300">
              This page is only accessible to {POPERA_EMAIL}
            </p>
            {user?.email && (
              <p className="text-sm text-gray-400 mt-2">
                Current user: {user.email}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#15383c] pt-20 sm:pt-24 pb-8 sm:pb-12 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <button 
          onClick={() => setViewState(ViewState.LANDING)} 
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#15383c] mb-6 sm:mb-8 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"
        >
          <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
        </button>
        
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">
            Cleanup Popera Reviews
          </h1>
          <p className="text-gray-300 text-sm sm:text-base">
            Remove duplicate reviews, clean names, and limit to 25 most recent reviews
          </p>
        </div>

        <div className="bg-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">About This Cleanup</h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              This cleanup will:
            </p>
            <ul className="text-gray-300 text-sm space-y-2 list-disc list-inside mb-4">
              <li>Remove numbers from reviewer names (e.g., "John123" → "John")</li>
              <li>Remove duplicate reviews from the same users (keeps most recent)</li>
              <li>Limit to 25 most recent unique reviews</li>
              <li>Only affects reviews for Popera-hosted events</li>
            </ul>
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-yellow-400 shrink-0 mt-0.5" />
                <div className="text-yellow-100 text-sm">
                  <p className="font-semibold mb-1">⚠️ Important</p>
                  <p>This action cannot be undone. Make sure you want to proceed before running the cleanup.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/20">
            <button
              onClick={handleCleanup}
              disabled={isRunning}
              className="w-full py-3.5 sm:py-4 bg-[#e35e25] text-white font-bold rounded-full hover:bg-[#cf4d1d] transition-colors shadow-lg touch-manipulation active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Running Cleanup...
                </>
              ) : (
                'Run Reviews Cleanup'
              )}
            </button>
          </div>

          {result && (
            <div className={`pt-4 border-t border-white/20 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle size={24} className="shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={24} className="shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm leading-relaxed font-semibold mb-2">{result.message}</p>
                  {result.details && result.success && (
                    <div className="text-xs text-gray-300 mt-3 space-y-1 bg-white/5 rounded-lg p-3">
                      <p>✅ Updated {result.details.updatedNames || 0} reviewer names</p>
                      <p>✅ Deleted {result.details.deletedDuplicates || 0} duplicate reviews</p>
                      <p>✅ Final review count: {result.details.finalReviewCount || 0} reviews</p>
                    </div>
                  )}
                  {result.details && !result.success && (
                    <div className="text-xs text-gray-300 mt-3 bg-white/5 rounded-lg p-3">
                      <p className="font-mono break-all">{JSON.stringify(result.details, null, 2)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

