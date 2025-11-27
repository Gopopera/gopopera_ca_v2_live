# Question for Gemini: Firebase Storage Image Upload Requirements and Best Practices

## Context
We're building a React/TypeScript web application using Firebase Storage to upload event images. Users can upload one or multiple images when creating events. We're experiencing issues where image uploads sometimes hang indefinitely, even with timeout mechanisms in place.

## Current Implementation
- Using Firebase Storage (`uploadBytes` and `getDownloadURL`)
- Client-side image compression before upload (using canvas API)
- Timeout mechanisms (15s per image, 20s overall)
- Retry logic (2 retries = 3 total attempts)
- Parallel uploads for multiple images

## Question for Gemini

**"What are the Firebase Storage requirements, best practices, and common pitfalls for uploading images from a React web application? Specifically:**

1. **Firebase Storage Configuration Requirements:**
   - What Firebase Storage security rules are necessary for allowing authenticated users to upload images?
   - Are there any CORS configuration requirements for web applications?
   - What are the recommended storage bucket settings (location, storage class, etc.)?

2. **Upload Best Practices:**
   - What is the recommended approach for uploading images: `uploadBytes` vs `uploadBytesResumable`?
   - What are optimal timeout values for image uploads?
   - Should we use `getDownloadURL` immediately after `uploadBytes`, or is there a better pattern?
   - How should we handle large images (e.g., >5MB) before upload?

3. **Common Issues and Solutions:**
   - Why might `uploadBytes` hang indefinitely without resolving or rejecting?
   - What could cause `getDownloadURL` to hang after a successful `uploadBytes`?
   - Are there known issues with Firebase Storage in certain browsers or network conditions?
   - How do we properly handle network interruptions during uploads?

4. **Error Handling:**
   - What are the most common error codes from Firebase Storage and how should they be handled?
   - How should we handle quota exceeded errors?
   - What's the best way to detect if an upload is truly hung vs. just slow?

5. **Performance Optimization:**
   - Is there a recommended maximum file size for client-side uploads?
   - Should we compress images on the client before upload, and if so, what are best practices?
   - Are there any Firebase Storage quotas or rate limits we should be aware of?

6. **Alternative Approaches:**
   - Should we consider using Firebase Storage with signed URLs or direct client uploads?
   - Are there better patterns for handling multiple image uploads in parallel?
   - Should we implement a progress tracking mechanism, and if so, how?

**Please provide specific code examples for React/TypeScript and any Firebase Storage configuration recommendations that would help prevent uploads from hanging and ensure reliable image uploads."**

## Additional Context for Gemini

### Current Code Pattern:
```typescript
// Compression (if needed)
const compressedFile = await compressImage(file, {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.80,
  maxSizeMB: 2
});

// Upload with timeout
const uploadPromise = uploadBytes(storageRef, compressedFile);
const url = await getDownloadURL(ref(storage, path));
```

### Current Issues:
- Uploads sometimes hang at `uploadBytes` (never resolves/rejects)
- Uploads sometimes hang at `getDownloadURL` (after successful upload)
- Timeout mechanisms don't always work as expected
- Users experience "uploading images" spinner that never completes

### Environment:
- React 18 with TypeScript
- Firebase v9+ (modular SDK)
- Vite build tool
- Deployed on Vercel
- Images typically 1-5MB after compression
- Multiple images uploaded in parallel

### What We Need:
- Reliable upload mechanism that never hangs
- Clear error messages when uploads fail
- Proper timeout handling
- Best practices for Firebase Storage configuration
- Recommendations for handling edge cases

