import {
  createRecaptchaVerifier,
  resetRecaptchaVerifier,
  startPhoneMfaEnrollment,
  verifyPhoneMfaCode,
} from '../lib/firebaseAuth';

export function getRecaptchaVerifier(containerId = 'recaptcha-container') {
  return createRecaptchaVerifier(containerId);
}

export function clearRecaptchaVerifier() {
  resetRecaptchaVerifier();
}

export async function startMfaEnrollment(phoneNumber: string): Promise<string> {
  const verifier = createRecaptchaVerifier('phone-recaptcha-container');
  return startPhoneMfaEnrollment(phoneNumber, verifier);
}

export async function finalizeMfaEnrollment(verificationId: string, code: string) {
  await verifyPhoneMfaCode(verificationId, code);
}
