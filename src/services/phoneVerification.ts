import {
  ConfirmationResult,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  multiFactor,
  type Auth,
} from 'firebase/auth';
import { getAuthSafe } from '../lib/firebase';

let cachedVerifier: RecaptchaVerifier | null = null;

const ensureRecaptchaContainer = (containerId: string) => {
  if (typeof document === 'undefined') return null;
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.display = 'none';
    document.body.appendChild(container);
  }
  return containerId;
};

export function getRecaptchaVerifier(containerId = 'recaptcha-container'): RecaptchaVerifier {
  const auth = getAuthSafe();
  if (!auth) {
    throw new Error('[MFA] Auth not initialized');
  }

  if (cachedVerifier) return cachedVerifier;

  const id = ensureRecaptchaContainer(containerId);
  console.log('[MFA] Initializing reCAPTCHA verifier with container', id);
  cachedVerifier = new RecaptchaVerifier(auth as Auth, id || containerId, {
    size: 'invisible',
    callback: () => {
      console.log('[MFA] reCAPTCHA solved');
    },
    'expired-callback': () => {
      console.log('[MFA] reCAPTCHA expired');
      cachedVerifier = null;
    },
  });
  return cachedVerifier;
}

export async function sendVerificationCode(phoneNumber: string): Promise<ConfirmationResult> {
  const auth = getAuthSafe();
  if (!auth) {
    throw new Error('[MFA] Auth not initialized for sendVerificationCode');
  }
  const recaptchaVerifier = getRecaptchaVerifier();
  console.log('[MFA] Sending SMS code to', phoneNumber);
  return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
}

export async function verifySmsCode(confirmationResult: ConfirmationResult, code: string) {
  console.log('[MFA] Verifying SMS code');
  return confirmationResult.confirm(code);
}

export async function startMfaEnrollment(phoneNumber: string): Promise<string> {
  const auth = getAuthSafe();
  if (!auth || !auth.currentUser) {
    throw new Error('[MFA] No authenticated user for enrollment');
  }
  console.log('[MFA] Enrollment started for', phoneNumber);
  const mfaUser = multiFactor(auth.currentUser);
  const session = await mfaUser.getSession();
  const recaptchaVerifier = getRecaptchaVerifier();
  const phoneAuthProvider = new PhoneAuthProvider(auth);
  const verificationId = await phoneAuthProvider.verifyPhoneNumber(
    { phoneNumber, session },
    recaptchaVerifier
  );
  console.log('[MFA] SMS sent');
  return verificationId;
}

export async function finalizeMfaEnrollment(verificationId: string, code: string) {
  const auth = getAuthSafe();
  if (!auth || !auth.currentUser) {
    throw new Error('[MFA] No authenticated user for finalize enrollment');
  }
  console.log('[MFA] Verifying enrollment code');
  const cred = PhoneAuthProvider.credential(verificationId, code);
  const mfaUser = multiFactor(auth.currentUser);
  const assertion = PhoneMultiFactorGenerator.assertion(cred);
  await mfaUser.enroll(assertion, 'Primary SMS');
  console.log('[MFA] Enrollment completed');
}
