/**
 * Firebase SDK Verification Script
 * Run this in the browser console to verify Firebase is properly configured
 * 
 * Usage: Copy and paste this entire script into your browser console on your app
 */

(async function verifyFirebaseSDK() {
  console.log('🔍 Firebase SDK Verification');
  console.log('============================\n');

  const results = {
    env: { status: '❌', details: [] },
    initialization: { status: '❌', details: [] },
    storage: { status: '❌', details: [] },
    auth: { status: '❌', details: [] },
    firestore: { status: '❌', details: [] },
    bucket: { status: '❌', details: [] }
  };

  // 1. Check Environment Variables
  console.log('1️⃣ Checking Environment Variables...');
  try {
    const env = import.meta.env;
    const required = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID'
    ];

    let allPresent = true;
    required.forEach(key => {
      const value = env[key];
      if (!value || value.trim() === '') {
        results.env.details.push(`❌ ${key}: Missing or empty`);
        allPresent = false;
      } else {
        const trimmed = value.trim();
        const hasNewline = value.includes('\n') || value.includes('\r');
        if (hasNewline) {
          results.env.details.push(`⚠️ ${key}: Contains newline (should be trimmed)`);
        } else {
          results.env.details.push(`✅ ${key}: ${trimmed.substring(0, 20)}...`);
        }
      }
    });

    if (allPresent) {
      results.env.status = '✅';
    }
  } catch (error) {
    results.env.details.push(`❌ Error checking env: ${error.message}`);
  }
  console.log(results.env.details.join('\n'));
  console.log('');

  // 2. Check Firebase Initialization
  console.log('2️⃣ Checking Firebase Initialization...');
  try {
    // Try to access Firebase app
    const { getAppSafe } = await import('./src/lib/firebase.ts');
    const app = getAppSafe();
    
    if (app) {
      const config = app.options;
      results.initialization.details.push(`✅ Firebase App initialized`);
      results.initialization.details.push(`   Project ID: ${config.projectId}`);
      results.initialization.details.push(`   Storage Bucket: ${config.storageBucket}`);
      results.initialization.details.push(`   Auth Domain: ${config.authDomain}`);
      
      // Check for newlines in bucket name
      if (config.storageBucket && (config.storageBucket.includes('\n') || config.storageBucket.includes('\r'))) {
        results.initialization.details.push(`⚠️ Storage Bucket contains newline: "${config.storageBucket}"`);
      } else {
        results.initialization.details.push(`✅ Storage Bucket is clean: "${config.storageBucket}"`);
      }
      
      results.initialization.status = '✅';
    } else {
      results.initialization.details.push(`❌ Firebase App not initialized`);
    }
  } catch (error) {
    results.initialization.details.push(`❌ Error: ${error.message}`);
  }
  console.log(results.initialization.details.join('\n'));
  console.log('');

  // 3. Check Storage
  console.log('3️⃣ Checking Firebase Storage...');
  try {
    const { getStorageSafe } = await import('./src/lib/firebase.ts');
    const storage = getStorageSafe();
    
    if (storage) {
      results.storage.details.push(`✅ Storage instance created`);
      
      // Try to create a test reference
      const { ref } = await import('firebase/storage');
      const testRef = ref(storage, 'test/verification.txt');
      const bucket = testRef.bucket;
      
      results.storage.details.push(`✅ Storage bucket: ${bucket}`);
      
      // Check for newlines in bucket
      if (bucket && (bucket.includes('\n') || bucket.includes('\r'))) {
        results.storage.details.push(`⚠️ Bucket name contains newline: "${bucket}"`);
      } else {
        results.storage.details.push(`✅ Bucket name is clean`);
      }
      
      results.storage.status = '✅';
    } else {
      results.storage.details.push(`❌ Storage not initialized`);
    }
  } catch (error) {
    results.storage.details.push(`❌ Error: ${error.message}`);
  }
  console.log(results.storage.details.join('\n'));
  console.log('');

  // 4. Check Auth
  console.log('4️⃣ Checking Firebase Auth...');
  try {
    const { getAuthSafe } = await import('./src/lib/firebase.ts');
    const auth = getAuthSafe();
    
    if (auth) {
      results.auth.details.push(`✅ Auth instance created`);
      results.auth.details.push(`   Current user: ${auth.currentUser ? auth.currentUser.email || auth.currentUser.uid : 'Not logged in'}`);
      results.auth.status = '✅';
    } else {
      results.auth.details.push(`❌ Auth not initialized`);
    }
  } catch (error) {
    results.auth.details.push(`❌ Error: ${error.message}`);
  }
  console.log(results.auth.details.join('\n'));
  console.log('');

  // 5. Check Firestore
  console.log('5️⃣ Checking Firestore...');
  try {
    const { getDbSafe } = await import('./src/lib/firebase.ts');
    const db = getDbSafe();
    
    if (db) {
      results.firestore.details.push(`✅ Firestore instance created`);
      results.firestore.status = '✅';
    } else {
      results.firestore.details.push(`❌ Firestore not initialized`);
    }
  } catch (error) {
    results.firestore.details.push(`❌ Error: ${error.message}`);
  }
  console.log(results.firestore.details.join('\n'));
  console.log('');

  // 6. Check Storage Bucket URL
  console.log('6️⃣ Checking Storage Bucket URL...');
  try {
    const { getStorageSafe } = await import('./src/lib/firebase.ts');
    const storage = getStorageSafe();
    
    if (storage) {
      const { ref } = await import('firebase/storage');
      const testRef = ref(storage, 'test/url-check.txt');
      
      // Get the full URL that would be used
      const bucket = testRef.bucket;
      const fullPath = testRef.fullPath;
      
      // Construct the URL that Firebase would use
      const expectedUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(fullPath)}`;
      
      results.bucket.details.push(`✅ Bucket: ${bucket}`);
      results.bucket.details.push(`✅ Full Path: ${fullPath}`);
      results.bucket.details.push(`✅ Expected URL: ${expectedUrl}`);
      
      // Check for %0A in URL
      if (expectedUrl.includes('%0A')) {
        results.bucket.details.push(`❌ URL contains %0A (newline encoding)!`);
      } else {
        results.bucket.details.push(`✅ URL is clean (no %0A)`);
      }
      
      results.bucket.status = expectedUrl.includes('%0A') ? '❌' : '✅';
    }
  } catch (error) {
    results.bucket.details.push(`❌ Error: ${error.message}`);
  }
  console.log(results.bucket.details.join('\n'));
  console.log('');

  // Summary
  console.log('📊 Summary');
  console.log('==========');
  console.log(`Environment Variables: ${results.env.status}`);
  console.log(`Firebase Initialization: ${results.initialization.status}`);
  console.log(`Storage: ${results.storage.status}`);
  console.log(`Auth: ${results.auth.status}`);
  console.log(`Firestore: ${results.firestore.status}`);
  console.log(`Bucket URL: ${results.bucket.status}`);
  console.log('');

  const allPassed = Object.values(results).every(r => r.status === '✅');
  if (allPassed) {
    console.log('✅ All checks passed! Firebase SDK is properly configured.');
  } else {
    console.log('⚠️ Some checks failed. Review the details above.');
  }

  return results;
})();

