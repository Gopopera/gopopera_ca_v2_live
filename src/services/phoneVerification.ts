import { RecaptchaVerifier, linkWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { getAuthInstance } from '../lib/firebaseAuth';

let recaptchaVerifier: RecaptchaVerifier | null = null;

function ensureRecaptcha(containerId = 'phone-recaptcha-container'): RecaptchaVerifier {
  if (recaptchaVerifier) return recaptchaVerifier;
  const auth = getAuthInstance();
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  return recaptchaVerifier;
}

export async function startPhoneVerification(phoneNumber: string): Promise<ConfirmationResult> {
  const auth = getAuthInstance();
  const verifier = ensureRecaptcha('phone-recaptcha-container');
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to verify your phone number.');
  }
  console.log('[PHONE_VERIFY] Starting phone verification');
  return linkWithPhoneNumber(user, phoneNumber, verifier);
}

export async function confirmPhoneVerification(confirmation: ConfirmationResult, code: string) {
  console.log('[PHONE_VERIFY] Confirming phone verification code');
  return confirmation.confirm(code.trim());
}

export function resetPhoneRecaptcha() {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // ignore
    }
    recaptchaVerifier = null;
  }
}
