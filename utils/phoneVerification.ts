/**
 * Phone Verification Helper using Twilio SMS
 * EU-compatible: supports international phone numbers via libphonenumber-js
 */

import { parsePhoneNumberFromString, CountryCode, isValidPhoneNumber } from 'libphonenumber-js';
import { getDbSafe } from '../src/lib/firebase';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { sendSMSNotification } from './smsNotifications';

const IS_DEV = import.meta.env.DEV;

/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Parse and format phone number to E.164 format using libphonenumber-js
 * @param phone - Raw phone input (can be local or international format)
 * @param defaultCountry - ISO2 country code (e.g., "CA", "BE", "US")
 * @returns E.164 formatted number or null if invalid
 */
export function parseToE164(phone: string, defaultCountry: CountryCode = 'CA'): string | null {
  if (!phone || typeof phone !== 'string') return null;
  
  const cleaned = phone.trim();
  if (!cleaned) return null;

  try {
    const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
    if (parsed && parsed.isValid()) {
      return parsed.format('E.164');
    }
    return null;
  } catch (error) {
    if (IS_DEV) {
      console.warn('[PHONE] Failed to parse phone number:', { phone, defaultCountry, error });
    }
    return null;
  }
}

/**
 * Validate phone number for a given country
 * @param phone - Raw phone input
 * @param defaultCountry - ISO2 country code
 * @returns true if valid
 */
export function isValidPhone(phone: string, defaultCountry: CountryCode = 'CA'): boolean {
  if (!phone || typeof phone !== 'string') return false;
  
  const cleaned = phone.trim();
  if (!cleaned) return false;

  try {
    return isValidPhoneNumber(cleaned, defaultCountry);
  } catch {
    return false;
  }
}

/**
 * Format phone number to E.164 format (legacy compatibility wrapper)
 * @deprecated Use parseToE164 with explicit country instead
 */
export function formatPhoneNumber(phone: string, defaultCountry: CountryCode = 'CA'): string {
  const e164 = parseToE164(phone, defaultCountry);
  return e164 || phone; // Return original if parsing fails
}

/**
 * Validate phone number format (legacy compatibility wrapper)
 * @deprecated Use isValidPhone with explicit country instead
 */
export function validatePhoneNumber(phone: string, defaultCountry: CountryCode = 'CA'): boolean {
  // If already E.164 format (starts with +), validate it directly
  if (phone.trim().startsWith('+')) {
    try {
      const parsed = parsePhoneNumberFromString(phone.trim());
      return parsed ? parsed.isValid() : false;
    } catch {
      return false;
    }
  }
  return isValidPhone(phone, defaultCountry);
}

/**
 * Send verification code to phone number
 * Generates code, stores in Firestore, and sends SMS via Twilio
 */
export async function sendVerificationCode(
  userId: string,
  phoneNumber: string,
  countryCode: CountryCode = 'CA'
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDbSafe();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    // Parse and validate phone number with country context
    const formattedPhone = parseToE164(phoneNumber, countryCode);
    if (!formattedPhone) {
      return { success: false, error: 'Please enter a valid phone number for your selected country' };
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes from now

    // Store code in Firestore
    const codeDocRef = doc(db, 'phone_verification_codes', userId);
    await setDoc(codeDocRef, {
      code,
      phoneNumber: formattedPhone,
      countryCode,
      userId,
      expiresAt,
      createdAt: serverTimestamp(),
      attempts: 0,
    });

    if (IS_DEV) {
      console.log('[PHONE_VERIFY] Verification code stored:', { userId, phoneNumber: formattedPhone, countryCode });
    }

    // Send SMS via existing Twilio SMS function
    const message = `Your Popera verification code is: ${code}. Valid for 10 minutes.`;
    const smsSent = await sendSMSNotification({
      to: formattedPhone,
      message,
    });

    if (!smsSent) {
      if (IS_DEV) {
        console.warn('[PHONE_VERIFY] SMS send failed but code is stored');
      }
      return { success: false, error: 'Failed to send SMS. Please check your phone number and try again.' };
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
  code: string,
  countryCode: CountryCode = 'CA'
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDbSafe();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    const formattedPhone = parseToE164(phoneNumber, countryCode);
    if (!formattedPhone) {
      return { success: false, error: 'Invalid phone number format' };
    }

    // Get verification code from Firestore
    const codeDocRef = doc(db, 'phone_verification_codes', userId);
    const codeDoc = await getDoc(codeDocRef);

    if (!codeDoc.exists()) {
      return { success: false, error: 'Verification code not found. Please request a new code.' };
    }

    const codeData = codeDoc.data();

    // Check if code is expired
    if (Date.now() > codeData.expiresAt) {
      await deleteDoc(codeDocRef);
      return { success: false, error: 'Verification code expired. Please request a new code.' };
    }

    // Check phone number matches
    if (codeData.phoneNumber !== formattedPhone) {
      return { success: false, error: 'Phone number mismatch. Please use the same number you verified.' };
    }

    // Check code
    if (codeData.code !== code) {
      const attempts = (codeData.attempts || 0) + 1;
      await setDoc(codeDocRef, { attempts }, { merge: true });

      if (attempts >= 5) {
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
