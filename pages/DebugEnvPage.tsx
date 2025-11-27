/**
 * Debug Environment Variables Page
 * Temporary debugging route to log all import.meta.env.* values
 * Access via ViewState.DEBUG_ENV
 */

import React, { useEffect } from 'react';
import { ViewState } from '../types';
import { ChevronLeft } from 'lucide-react';

interface DebugEnvPageProps {
  setViewState: (view: ViewState) => void;
}

export const DebugEnvPage: React.FC<DebugEnvPageProps> = ({ setViewState }) => {
  useEffect(() => {
    // Log all environment variables to console (redact secrets)
    const env = import.meta.env;
    const envKeys = Object.keys(env).filter(key => key.startsWith('VITE_'));
    
    console.group('🔍 Environment Variables Debug');
    console.log('Full import.meta.env:', env);
    console.log('Mode:', env.MODE);
    console.log('Dev:', env.DEV);
    console.log('Prod:', env.PROD);
    console.log('');
    console.log('Firebase Variables:');
    console.log('  VITE_FIREBASE_API_KEY:', env.VITE_FIREBASE_API_KEY ? `${env.VITE_FIREBASE_API_KEY.substring(0, 10)}...` : '❌ MISSING');
    console.log('  VITE_FIREBASE_AUTH_DOMAIN:', env.VITE_FIREBASE_AUTH_DOMAIN || '❌ MISSING');
    console.log('  VITE_FIREBASE_PROJECT_ID:', env.VITE_FIREBASE_PROJECT_ID || '❌ MISSING');
    console.log('  VITE_FIREBASE_STORAGE_BUCKET:', env.VITE_FIREBASE_STORAGE_BUCKET || '❌ MISSING');
    console.log('  VITE_FIREBASE_MESSAGING_SENDER_ID:', env.VITE_FIREBASE_MESSAGING_SENDER_ID || '❌ MISSING');
    console.log('  VITE_FIREBASE_APP_ID:', env.VITE_FIREBASE_APP_ID || '❌ MISSING');
    console.log('  VITE_FIREBASE_MEASUREMENT_ID:', env.VITE_FIREBASE_MEASUREMENT_ID || '❌ MISSING');
    console.log('');
    console.log('Resend Variables:');
    console.log('  VITE_RESEND_API_KEY:', env.VITE_RESEND_API_KEY ? `${env.VITE_RESEND_API_KEY.substring(0, 10)}...` : '❌ MISSING');
    console.log('  VITE_RESEND_FROM:', env.VITE_RESEND_FROM || '❌ MISSING (defaults to support@gopopera.ca)');
    console.log('');
    console.log('All VITE_* variables:', envKeys);
    
    // Check Firebase Apps
    import('firebase/app').then(({ getApps }) => {
      const apps = getApps();
      console.log('');
      console.log('Firebase Apps:', apps.length, 'app(s) initialized');
      apps.forEach((app, idx) => {
        console.log(`  App ${idx + 1}:`, app.name, app.options.projectId);
      });
    });
    
    console.groupEnd();
  }, []);

  const env = import.meta.env;
  const firebaseVars = {
    apiKey: env.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing',
    projectId: env.VITE_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ? '✅ Set' : '❌ Missing',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ? '✅ Set' : '❌ Missing',
    appId: env.VITE_FIREBASE_APP_ID ? '✅ Set' : '❌ Missing',
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ? '✅ Set' : '❌ Missing',
  };

  const resendVars = {
    apiKey: env.VITE_RESEND_API_KEY ? '✅ Set' : '❌ Missing',
    from: env.VITE_RESEND_FROM || 'support@gopopera.ca (default)',
  };

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
            Environment Variables Debug
          </h1>
          <p className="text-gray-300 text-sm sm:text-base">
            Check browser console for detailed logs (redacted secrets)
          </p>
        </div>

        <div className="bg-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">Firebase Configuration</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>VITE_FIREBASE_API_KEY:</span>
                <span className={firebaseVars.apiKey.includes('✅') ? 'text-green-400' : 'text-red-400'}>
                  {firebaseVars.apiKey}
                </span>
              </div>
              <div className="flex justify-between">
                <span>VITE_FIREBASE_AUTH_DOMAIN:</span>
                <span className={firebaseVars.authDomain.includes('✅') ? 'text-green-400' : 'text-red-400'}>
                  {firebaseVars.authDomain}
                </span>
              </div>
              <div className="flex justify-between">
                <span>VITE_FIREBASE_PROJECT_ID:</span>
                <span className={firebaseVars.projectId.includes('✅') ? 'text-green-400' : 'text-red-400'}>
                  {firebaseVars.projectId}
                </span>
              </div>
              <div className="flex justify-between">
                <span>VITE_FIREBASE_STORAGE_BUCKET:</span>
                <span className={firebaseVars.storageBucket.includes('✅') ? 'text-green-400' : 'text-red-400'}>
                  {firebaseVars.storageBucket}
                </span>
              </div>
              <div className="flex justify-between">
                <span>VITE_FIREBASE_MESSAGING_SENDER_ID:</span>
                <span className={firebaseVars.messagingSenderId.includes('✅') ? 'text-green-400' : 'text-red-400'}>
                  {firebaseVars.messagingSenderId}
                </span>
              </div>
              <div className="flex justify-between">
                <span>VITE_FIREBASE_APP_ID:</span>
                <span className={firebaseVars.appId.includes('✅') ? 'text-green-400' : 'text-red-400'}>
                  {firebaseVars.appId}
                </span>
              </div>
              <div className="flex justify-between">
                <span>VITE_FIREBASE_MEASUREMENT_ID:</span>
                <span className={firebaseVars.measurementId.includes('✅') ? 'text-green-400' : 'text-red-400'}>
                  {firebaseVars.measurementId}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">Resend Configuration</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>VITE_RESEND_API_KEY:</span>
                <span className={resendVars.apiKey.includes('✅') ? 'text-green-400' : 'text-red-400'}>
                  {resendVars.apiKey}
                </span>
              </div>
              <div className="flex justify-between">
                <span>VITE_RESEND_FROM:</span>
                <span className="text-green-400">{resendVars.from}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/20">
            <p className="text-xs text-gray-400">
              Mode: {env.MODE} | Dev: {env.DEV ? 'Yes' : 'No'} | Prod: {env.PROD ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

