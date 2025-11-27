import React, { useEffect, useState } from 'react';
import { getAppSafe, getStorageSafe, getAuthSafe, getDbSafe } from '../src/lib/firebase';
import { ref } from 'firebase/storage';

interface VerificationResult {
  category: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string[];
}

export const VerifyFirebasePage: React.FC = () => {
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runVerification = async () => {
    setIsRunning(true);
    const verificationResults: VerificationResult[] = [];

    // 1. Check Environment Variables
    const env = import.meta.env;
    const bucket = env.VITE_FIREBASE_STORAGE_BUCKET;
    const hasBucket = !!bucket;
    const hasNewline = bucket ? (bucket.includes('\n') || bucket.includes('\r')) : false;
    
    verificationResults.push({
      category: 'Environment Variables',
      status: hasBucket && !hasNewline ? 'pass' : hasNewline ? 'fail' : 'warning',
      message: hasBucket 
        ? (hasNewline ? '❌ Storage bucket contains newline!' : '✅ Storage bucket is set and clean')
        : '⚠️ Storage bucket not set',
      details: [
        `VITE_FIREBASE_STORAGE_BUCKET: ${bucket || 'NOT SET'}`,
        `Has newline: ${hasNewline ? 'YES (BAD!)' : 'NO (GOOD)'}`,
        `Length: ${bucket?.length || 0}, Trimmed: ${bucket?.trim().length || 0}`
      ]
    });

    // 2. Check Firebase App
    const app = getAppSafe();
    if (app) {
      const appBucket = app.options.storageBucket;
      const appBucketHasNewline = appBucket ? (appBucket.includes('\n') || appBucket.includes('\r')) : false;
      
      verificationResults.push({
        category: 'Firebase App',
        status: !appBucketHasNewline ? 'pass' : 'fail',
        message: appBucketHasNewline ? '❌ App bucket contains newline!' : '✅ App initialized correctly',
        details: [
          `Project ID: ${app.options.projectId}`,
          `Storage Bucket: "${appBucket}"`,
          `Has newline: ${appBucketHasNewline ? 'YES (BAD!)' : 'NO (GOOD)'}`
        ]
      });
    } else {
      verificationResults.push({
        category: 'Firebase App',
        status: 'fail',
        message: '❌ App not initialized',
        details: []
      });
    }

    // 3. Check Storage
    const storage = getStorageSafe();
    if (storage) {
      try {
        const testRef = ref(storage, 'test/verification.txt');
        const storageBucket = testRef.bucket;
        const urlHasNewline = storageBucket.includes('\n') || storageBucket.includes('\r');
        
        // Check the full URL that would be generated
        const fullPath = testRef.fullPath;
        const expectedUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(fullPath)}`;
        const urlContainsPercent0A = expectedUrl.includes('%0A');
        
        verificationResults.push({
          category: 'Firebase Storage',
          status: !urlHasNewline && !urlContainsPercent0A ? 'pass' : 'fail',
          message: urlContainsPercent0A ? '❌ URL contains %0A (newline encoding)!' : '✅ Storage initialized correctly',
          details: [
            `Bucket: ${storageBucket}`,
            `Full Path: ${fullPath}`,
            `Expected URL: ${expectedUrl.substring(0, 80)}...`,
            `URL contains %0A: ${urlContainsPercent0A ? 'YES (BAD!)' : 'NO (GOOD)'}`
          ]
        });
      } catch (error: any) {
        verificationResults.push({
          category: 'Firebase Storage',
          status: 'fail',
          message: `❌ Error: ${error.message}`,
          details: []
        });
      }
    } else {
      verificationResults.push({
        category: 'Firebase Storage',
        status: 'fail',
        message: '❌ Storage not initialized',
        details: []
      });
    }

    // 4. Check Auth
    const auth = getAuthSafe();
    verificationResults.push({
      category: 'Firebase Auth',
      status: auth ? 'pass' : 'fail',
      message: auth ? '✅ Auth initialized' : '❌ Auth not initialized',
      details: auth ? [
        `Current user: ${auth.currentUser ? (auth.currentUser.email || auth.currentUser.uid) : 'Not logged in'}`
      ] : []
    });

    // 5. Check Firestore
    const db = getDbSafe();
    verificationResults.push({
      category: 'Firestore',
      status: db ? 'pass' : 'fail',
      message: db ? '✅ Firestore initialized' : '❌ Firestore not initialized',
      details: []
    });

    setResults(verificationResults);
    setIsRunning(false);
  };

  useEffect(() => {
    runVerification();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-600';
      case 'fail': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Firebase SDK Verification</h1>
        <p className="text-gray-600 mb-6">Check if Firebase is properly configured and enabled</p>

        <button
          onClick={runVerification}
          disabled={isRunning}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Run Verification'}
        </button>

        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">{getStatusIcon(result.status)}</span>
                <h2 className={`text-xl font-semibold ${getStatusColor(result.status)}`}>
                  {result.category}
                </h2>
              </div>
              <p className="text-gray-700 mb-2">{result.message}</p>
              {result.details && result.details.length > 0 && (
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {result.details.map((detail, i) => (
                    <li key={i}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {results.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
            <p className="text-blue-800">
              {results.filter(r => r.status === 'pass').length} / {results.length} checks passed
            </p>
            {results.some(r => r.status === 'fail') && (
              <p className="text-red-600 mt-2">
                ⚠️ Some checks failed. Review the details above and check the console for more information.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-100 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">💡 Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Check the browser console (F12) for detailed logs</li>
            <li>Look for %0A in URLs - this indicates a newline issue</li>
            <li>Ensure environment variables are set in your .env file</li>
            <li>Clear browser cache if you see old values</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

