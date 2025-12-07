/**
 * Phone Verification Helper using Twilio SMS
 * Simple client-side implementation with Firestore for code storage
 */

import { getDbSafe } from '../src/lib/firebase';
import { collection, doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { sendSMSNotification } from './smsNotifications';

const IS_DEV = import.meta.env.DEV;

/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Format phone number to E.164 format
 * Automatically adds +1 for US/Canada (10-digit numbers)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.trim();
  const digitsOnly = cleaned.replace(/\D/g, '');
  
  // If already starts with +, clean and return
  if (cleaned.startsWith('+')) {
    const cleanedPlus = '+' + cleaned.replace(/\D/g, '');
    return cleanedPlus;
  }
  
  // Handle 10-digit numbers (US/Canada) - auto-add +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  // Handle 11-digit numbers starting with 1 (US/Canada with country code)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // For other valid lengths, try to add + prefix
  if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }
  
  return phone; // Return as-is if format is unclear
}

/**
 * Validate phone number format (E.164)
 * Validates AFTER formatting - number should start with + and have valid digits
 */
export function validatePhoneNumber(phone: string): boolean {
  const cleanPhone = phone.trim().replace(/\s/g, '');
  
  // Must start with +
  if (!cleanPhone.startsWith('+')) {
    return false;
  }
  
  const digitsOnly = cleanPhone.slice(1).replace(/\D/g, '');
  
  // E.164: + followed by 1-15 digits, first digit must be 1-9
  if (digitsOnly.length < 1 || digitsOnly.length > 15) {
    return false;
  }
  
  // First digit after + must be 1-9 (country codes don't start with 0)
  if (!/^[1-9]/.test(digitsOnly)) {
    return false;
  }
  
  return true;
}

/**
 * Send verification code to phone number
 * Generates code, stores in Firestore, and sends SMS via Twilio
 */
export async function sendVerificationCode(
  userId: string,
  phoneNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDbSafe();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!validatePhoneNumber(formattedPhone)) {
      return { success: false, error: 'Please enter a valid 10-digit phone number (US or Canada)' };
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes from now

    // Store code in Firestore
    const codeDocRef = doc(db, 'phone_verification_codes', userId);
    await setDoc(codeDocRef, {
      code,
      phoneNumber: formattedPhone,
      userId,
      expiresAt,
      createdAt: serverTimestamp(),
      attempts: 0,
    });

    if (IS_DEV) {
      console.log('[PHONE_VERIFY] Verification code stored:', { userId, phoneNumber: formattedPhone });
    }

    // Send SMS via existing Twilio SMS function
    const message = `Your Popera verification code is: ${code}. Valid for 10 minutes.`;
    const smsSent = await sendSMSNotification({
      to: formattedPhone,
      message,
    });

    if (!smsSent) {
      // SMS failed but code is stored - user can request new one if needed
      if (IS_DEV) {
        console.warn('[PHONE_VERIFY] SMS send failed but code is stored');
      }
      return { success: false, error: 'Failed to send SMS. Please try again.' };
    }

    if (IS_DEV) {
      console.log('[PHONE_VERIFY] ✅ Verification code sent successfully');
    }

    return { success: true };

  } catch (error: any) {
    console.error('[PHONE_VERIFY] Error sending verification code:', error);
    return { success: false, error: error.message || 'Failed to send verification code' };
  }
}

/**
 * Verify code entered by user
 * Checks code against Firestore and marks user as verified if valid
 */
export async function verifyPhoneCode(
  userId: string,
  phoneNumber: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDbSafe();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Get verification code from Firestore
    const codeDocRef = doc(db, 'phone_verification_codes', userId);
    const codeDoc = await getDoc(codeDocRef);

    if (!codeDoc.exists()) {
      return { success: false, error: 'Verification code not found. Please request a new code.' };
    }

    const codeData = codeDoc.data();

    // Check if code is expired
    if (Date.now() > codeData.expiresAt) {
      // Delete expired code
      await deleteDoc(codeDocRef);
      return { success: false, error: 'Verification code expired. Please request a new code.' };
    }

    // Check phone number matches
    if (codeData.phoneNumber !== formattedPhone) {
      return { success: false, error: 'Phone number mismatch. Please use the same number you verified.' };
    }

    // Check code
    if (codeData.code !== code) {
      // Increment attempts
      const attempts = (codeData.attempts || 0) + 1;
      await setDoc(codeDocRef, { attempts }, { merge: true });

      if (attempts >= 5) {
        // Too many attempts - delete code
        await deleteDoc(codeDocRef);
        return { success: false, error: 'Too many failed attempts. Please request a new code.' };
      }

      return { success: false, error: 'Invalid verification code. Please try again.' };
    }

    // Code is valid! Update user profile
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      phoneVerifiedForHosting: true,
      hostPhoneNumber: formattedPhone,
    }, { merge: true });

    // Delete verification code after successful verification
    await deleteDoc(codeDocRef);

    if (IS_DEV) {
      console.log('[PHONE_VERIFY] ✅ Phone verified successfully:', { userId, phoneNumber: formattedPhone });
    }

    return { success: true };

  } catch (error: any) {
    console.error('[PHONE_VERIFY] Error verifying code:', error);
    return { success: false, error: error.message || 'Failed to verify code' };
  }
}

