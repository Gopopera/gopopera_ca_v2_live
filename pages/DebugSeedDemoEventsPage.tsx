/**
 * Debug Seed Demo Events Page
 * Only accessible to eatezca@gmail.com
 * Idempotent seeding of demo events
 */

import React, { useState, useEffect } from 'react';
import { ViewState } from '../types';
import { ChevronLeft, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useUserStore, POPERA_EMAIL } from '../stores/userStore';
import { getPoperaDemoEventsSnapshot } from '../firebase/demoSeed';
import { ensurePoperaProfileAndSeed } from '../firebase/poperaProfile';
import { getAppSafe, getDbSafe } from '../src/lib/firebase';
import { Timestamp } from 'firebase/firestore';

interface DebugSeedDemoEventsPageProps {
  setViewState: (view: ViewState) => void;
}

export const DebugSeedDemoEventsPage: React.FC<DebugSeedDemoEventsPageProps> = ({ setViewState }) => {
  const user = useUserStore((state) => state.user);
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [seededEvents, setSeededEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const normalizedEmail = user?.email?.toLowerCase().trim();

  // Only show if user is authenticated and is eatezca@gmail.com
  const isAuthorized = normalizedEmail === POPERA_EMAIL;

  // Load seeded events on mount
  useEffect(() => {
    const app = getAppSafe();
    if (app?.options?.projectId) {
      setProjectId(app.options.projectId);
    }

    if (isAuthorized && user?.uid && normalizedEmail) {
      loadSeededEvents(normalizedEmail);
    }
  }, [isAuthorized, normalizedEmail, user?.uid]);

  const loadSeededEvents = async (poperaEmail: string) => {
    setLoadingEvents(true);
    try {
      const db = getDbSafe();
      if (!db) {
        setLoadingEvents(false);
        return 0;
      }

      const snap = await getPoperaDemoEventsSnapshot(db, poperaEmail);
      const events = snap.docs.map(doc => {
        const data = doc.data();
        let startDate: string | undefined;
        if (data?.startDate instanceof Timestamp) {
          startDate = data.startDate.toDate().toISOString();
        } else if (typeof data?.startDate === 'number') {
          startDate = new Date(data.startDate).toISOString();
        } else if (typeof data?.startDate === 'string') {
          startDate = data.startDate;
        } else if (data?.date) {
          startDate = data.date;
        }

        return {
          id: doc.id,
          ...data,
          startDateText: startDate,
        };
      });
      setSeededEvents(events);
      return events.length;
    } catch (error: any) {
      console.error('[DEBUG] Error loading seeded events:', error);
      return 0;
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSeed = async () => {
    if (!isAuthorized || !user?.uid) {
      setResult({ success: false, message: 'Unauthorized. Only eatezca@gmail.com can seed demo events.' });
      return;
    }

    setIsSeeding(true);
    setResult(null);

    try {
      // Use the same function as login flow
      await ensurePoperaProfileAndSeed(user);

      // Reload events after seeding
      const count = await loadSeededEvents(normalizedEmail || POPERA_EMAIL);

      setResult({ 
        success: true, 
        message: `Popera launch events seeded successfully! ${count} events found.` 
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
          {projectId && (
            <p className="text-xs text-gray-400 mt-2">
              Firebase project: <span className="font-mono">{projectId}</span>
            </p>
          )}
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

          {/* Seeded Events List */}
          <div className="pt-4 border-t border-white/20">
            <h3 className="text-lg font-bold mb-1">Seeded Launch Events ({seededEvents.length})</h3>
            <p className="text-gray-300 text-sm mb-2">Found {seededEvents.length} demo events</p>
            <div className="flex flex-wrap gap-3 mb-3">
              <button
                onClick={() => normalizedEmail && loadSeededEvents(normalizedEmail)}
                className="px-4 py-2 text-sm rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                disabled={loadingEvents}
              >
                {loadingEvents ? 'Refreshing…' : 'Refresh list'}
              </button>
            </div>
            {loadingEvents ? (
              <div className="text-gray-300 text-sm">Loading events...</div>
            ) : seededEvents.length === 0 ? (
              <div className="text-gray-400 text-sm">No seeded events found. Click the button below to seed.</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {seededEvents.map((event) => (
                  <div key={event.id} className="bg-white/5 rounded-lg p-3 text-sm">
                    <div className="font-medium text-white">{event.title}</div>
                    <div className="text-gray-300 text-xs mt-1">
                      City: {event.city} | status: {event.status || 'unknown'} | isPublic: {String(event.isPublic ?? false)}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      Start: {event.startDateText ? new Date(event.startDateText).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                'Force re-run Popera seeding'
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
