import React, { useEffect, useState } from 'react';
import { getAppSafe, getStorageSafe, getAuthSafe, getDbSafe } from '../src/lib/firebase';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { uploadImage } from '../firebase/storage';
import { updateAllEventsHostInfo } from '../firebase/db';

interface VerificationResult {
  category: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string[];
}

export const VerifyFirebasePage: React.FC = () => {
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [uploadTest, setUploadTest] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string; details?: string[] }>({
    status: 'idle',
    message: ''
  });
  const [hostUpdateStatus, setHostUpdateStatus] = useState<{ status: 'idle' | 'running' | 'success' | 'error'; message: string; updated?: number; errors?: number }>({
    status: 'idle',
    message: ''
  });

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

  const testActualUpload = async () => {
    setUploadTest({ status: 'testing', message: 'Testing actual file upload...' });
    
    try {
      const storage = getStorageSafe();
      if (!storage) {
        setUploadTest({ 
          status: 'error', 
          message: '❌ Storage not initialized',
          details: ['Cannot test upload without storage instance']
        });
        return;
      }

      // Create a small test file (1x1 pixel PNG)
      const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const testBlob = new Blob([Uint8Array.from(atob(testImageData), c => c.charCodeAt(0))], { type: 'image/png' });
      const testFile = new File([testBlob], 'test-verification.png', { type: 'image/png' });

      console.log('[VERIFY] Starting test upload...');
      const testPath = `verification/test-${Date.now()}.png`;
      
      // Test with uploadImage function (uses uploadBytesResumable)
      const uploadPromise = uploadImage(testPath, testFile, {
        maxUploadTime: 10000, // 10 second timeout for test
        onProgress: (progress) => {
          console.log(`[VERIFY] Upload progress: ${progress.progress.toFixed(1)}%`);
        }
      });

      // Also test the URL that will be generated
      const testRef = ref(storage, testPath);
      const expectedUrl = `https://firebasestorage.googleapis.com/v0/b/${testRef.bucket}/o/${encodeURIComponent(testRef.fullPath)}`;
      const hasPercent0A = expectedUrl.includes('%0A');
      
      const details: string[] = [
        `Test file: ${testFile.name} (${testFile.size} bytes)`,
        `Upload path: ${testPath}`,
        `Expected URL: ${expectedUrl.substring(0, 100)}...`,
        `URL contains %0A: ${hasPercent0A ? '❌ YES (BAD!)' : '✅ NO (GOOD)'}`
      ];

      if (hasPercent0A) {
        setUploadTest({
          status: 'error',
          message: '❌ URL contains %0A - upload will fail!',
          details
        });
        return;
      }

      // Try the actual upload
      try {
        const downloadUrl = await Promise.race([
          uploadPromise,
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('Upload timeout after 10s')), 10000)
          )
        ]);

        setUploadTest({
          status: 'success',
          message: '✅ Upload test successful!',
          details: [
            ...details,
            `Download URL: ${downloadUrl.substring(0, 80)}...`,
            '✅ CORS is working correctly',
            '✅ Firebase Storage is accessible'
          ]
        });
      } catch (uploadError: any) {
        const errorMessage = uploadError?.message || 'Unknown error';
        const isCorsError = errorMessage.includes('CORS') || errorMessage.includes('cors') || errorMessage.includes('preflight');
        const isNetworkError = errorMessage.includes('ERR_FAILED') || errorMessage.includes('network');
        
        setUploadTest({
          status: 'error',
          message: isCorsError ? '❌ CORS error detected!' : isNetworkError ? '❌ Network error!' : '❌ Upload failed',
          details: [
            ...details,
            `Error: ${errorMessage}`,
            isCorsError ? '⚠️ This is likely a CORS configuration issue' : '',
            isNetworkError ? '⚠️ Check Network tab for blocked requests' : '',
            '💡 Check browser console for more details'
          ].filter(Boolean)
        });
      }
    } catch (error: any) {
      setUploadTest({
        status: 'error',
        message: `❌ Test failed: ${error.message}`,
        details: ['Check browser console for details']
      });
    }
  };

  const testCorsPreflight = async () => {
    setUploadTest({ status: 'testing', message: 'Testing CORS preflight request...' });
    
    try {
      const storage = getStorageSafe();
      if (!storage) {
        setUploadTest({ 
          status: 'error', 
          message: '❌ Storage not initialized',
          details: []
        });
        return;
      }

      const testRef = ref(storage, 'verification/test-preflight.txt');
      const bucket = testRef.bucket;
      const testUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o`;

      // Test OPTIONS preflight request
      const response = await fetch(testUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization,x-goog-resumable'
        }
      });

      const corsHeaders = {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
        'access-control-max-age': response.headers.get('access-control-max-age')
      };

      const allowsPost = corsHeaders['access-control-allow-methods']?.includes('POST') || false;
      const allowsPut = corsHeaders['access-control-allow-methods']?.includes('PUT') || false;
      const allowsOrigin = corsHeaders['access-control-allow-origin'] === '*' || 
                          corsHeaders['access-control-allow-origin']?.includes(window.location.origin);

      const details: string[] = [
        `Test URL: ${testUrl}`,
        `Status: ${response.status} ${response.statusText}`,
        `Allow-Origin: ${corsHeaders['access-control-allow-origin'] || 'NOT SET'}`,
        `Allow-Methods: ${corsHeaders['access-control-allow-methods'] || 'NOT SET'}`,
        `Allows POST: ${allowsPost ? '✅ YES' : '❌ NO'}`,
        `Allows PUT: ${allowsPut ? '✅ YES' : '❌ NO'}`,
        `Allows Origin: ${allowsOrigin ? '✅ YES' : '❌ NO'}`
      ];

      if (response.status === 200 && allowsPost && allowsPut && allowsOrigin) {
        setUploadTest({
          status: 'success',
          message: '✅ CORS preflight test passed!',
          details
        });
      } else {
        setUploadTest({
          status: 'error',
          message: '❌ CORS preflight test failed',
          details: [
            ...details,
            allowsPost ? '' : '⚠️ POST method not allowed',
            allowsPut ? '' : '⚠️ PUT method not allowed',
            allowsOrigin ? '' : '⚠️ Origin not allowed'
          ].filter(Boolean)
        });
      }
    } catch (error: any) {
      setUploadTest({
        status: 'error',
        message: `❌ Preflight test failed: ${error.message}`,
        details: ['Check browser console and Network tab for details']
      });
    }
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

        <div className="mb-6 flex gap-4 flex-wrap">
          <button
            onClick={runVerification}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? 'Running...' : 'Run Verification'}
          </button>
          <button
            onClick={testCorsPreflight}
            disabled={uploadTest.status === 'testing'}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {uploadTest.status === 'testing' ? 'Testing...' : 'Test CORS Preflight'}
          </button>
          <button
            onClick={testActualUpload}
            disabled={uploadTest.status === 'testing'}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {uploadTest.status === 'testing' ? 'Uploading...' : 'Test Actual Upload'}
          </button>
          <button
            onClick={async () => {
              setHostUpdateStatus({ status: 'running', message: 'Updating all events with correct host information...' });
              try {
                const result = await updateAllEventsHostInfo();
                setHostUpdateStatus({
                  status: 'success',
                  message: `✅ Successfully updated ${result.updated} events${result.errors > 0 ? ` (${result.errors} errors)` : ''}`,
                  updated: result.updated,
                  errors: result.errors
                });
              } catch (error: any) {
                setHostUpdateStatus({
                  status: 'error',
                  message: `❌ Error: ${error.message || 'Unknown error'}`,
                });
              }
            }}
            disabled={hostUpdateStatus.status === 'running'}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {hostUpdateStatus.status === 'running' ? 'Updating Events...' : 'Update All Events Host Info'}
          </button>
        </div>
        
        {hostUpdateStatus.status !== 'idle' && (
          <div className={`mb-6 p-4 rounded-lg ${hostUpdateStatus.status === 'success' ? 'bg-green-50 text-green-800' : hostUpdateStatus.status === 'error' ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
            <p className="font-semibold">{hostUpdateStatus.message}</p>
            {hostUpdateStatus.updated !== undefined && (
              <p className="text-sm mt-1">Updated: {hostUpdateStatus.updated}, Errors: {hostUpdateStatus.errors || 0}</p>
            )}
          </div>
        )}

        {uploadTest.status !== 'idle' && (
          <div className={`mb-6 p-4 rounded-lg ${
            uploadTest.status === 'success' ? 'bg-green-50 border border-green-200' :
            uploadTest.status === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center mb-2">
              <span className="text-xl mr-2">
                {uploadTest.status === 'success' ? '✅' : uploadTest.status === 'error' ? '❌' : '⏳'}
              </span>
              <h3 className={`font-semibold ${
                uploadTest.status === 'success' ? 'text-green-900' :
                uploadTest.status === 'error' ? 'text-red-900' :
                'text-blue-900'
              }`}>
                {uploadTest.message}
              </h3>
            </div>
            {uploadTest.details && uploadTest.details.length > 0 && (
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                {uploadTest.details.map((detail, i) => (
                  <li key={i} className={
                    uploadTest.status === 'success' ? 'text-green-800' :
                    uploadTest.status === 'error' ? 'text-red-800' :
                    'text-blue-800'
                  }>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        )}

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

