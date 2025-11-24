/**
 * Debug Seed Demo Events Page
 * Only accessible to eatezca@gmail.com
 * Idempotent seeding of demo events
 */

import React, { useState } from 'react';
import { ViewState } from '../types';
import { ChevronLeft, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useUserStore, POPERA_EMAIL } from '../stores/userStore';
import { seedDemoEventsForPoperaHost } from '../firebase/demoSeed';

interface DebugSeedDemoEventsPageProps {
  setViewState: (view: ViewState) => void;
}

export const DebugSeedDemoEventsPage: React.FC<DebugSeedDemoEventsPageProps> = ({ setViewState }) => {
  const user = useUserStore((state) => state.user);
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Only show if user is authenticated and is eatezca@gmail.com
  const isAuthorized = user?.email === POPERA_EMAIL;

  const handleSeed = async () => {
    if (!isAuthorized) {
      setResult({ success: false, message: 'Unauthorized. Only eatezca@gmail.com can seed demo events.' });
      return;
    }

    setIsSeeding(true);
    setResult(null);

    try {
      await seedDemoEventsForPoperaHost({ dryRun: false });
      setResult({ 
        success: true, 
        message: 'Demo events seeded successfully! Check Firestore events collection and reload the app to see them.' 
      });
    } catch (error: any) {
      console.error('[DEBUG SEED] Error:', error);
      setResult({ 
        success: false, 
        message: error.message || 'Failed to seed demo events. Check console for details.' 
      });
    } finally {
      setIsSeeding(false);
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
            Seed Demo Popera Events
          </h1>
          <p className="text-gray-300 text-sm sm:text-base">
            Idempotent seeding of demo events for early users
          </p>
        </div>

        <div className="bg-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">About Demo Events</h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              These demo events are examples for early users to explore the app, ask questions, and connect with others. 
              They are not real events and cannot be actually attended.
            </p>
            <ul className="text-gray-300 text-sm space-y-2 list-disc list-inside">
              <li>Events will be created for Montreal, Ottawa, Toronto, and Quebec</li>
              <li>Each city gets 5 demo events (2 early-user Q&A, 3 archetype examples)</li>
              <li>All events are marked with <code className="bg-white/10 px-1 rounded">isDemo: true</code></li>
              <li>Popera host profile will be updated with <code className="bg-white/10 px-1 rounded">isDemoHost: true</code></li>
              <li>Seeding is idempotent — safe to run multiple times</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-white/20">
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="w-full py-3.5 sm:py-4 bg-[#e35e25] text-white font-bold rounded-full hover:bg-[#cf4d1d] transition-colors shadow-lg touch-manipulation active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSeeding ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Seeding...
                </>
              ) : (
                'Seed demo events now'
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
                <p className="text-sm leading-relaxed">{result.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

