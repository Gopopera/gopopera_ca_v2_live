import {
  type UserCredential,
} from 'firebase/auth';
import {
  createRecaptchaVerifier,
  finishMfaSignIn,
  getMfaResolver,
  sendMfaSignInCode,
  resetRecaptchaVerifier,
} from './firebaseAuth';

export async function resolveMfaSignIn(error: any): Promise<UserCredential | null> {
  const resolver = getMfaResolver(error);
  if (!resolver) return null;

  console.log('[MFA] Sign-in second factor required');

  resetRecaptchaVerifier();
  const recaptcha = createRecaptchaVerifier('auth-mfa-recaptcha');
  const { verificationId, phoneNumber } = await sendMfaSignInCode(resolver, recaptcha);
  console.log('[MFA] SMS sent for sign-in');

  const smsCode =
    typeof window !== 'undefined'
      ? window.prompt(`Enter the verification code sent to ${phoneNumber || 'your phone'}`) || ''
      : '';

  if (!smsCode) {
    throw new Error('[MFA] SMS code entry cancelled');
  }

  try {
    const finalUserCredential = await finishMfaSignIn(resolver, verificationId, smsCode);
    console.log('[MFA] Resolved MFA sign-in');
    return finalUserCredential;
  } catch (err) {
    console.error("PHONE MFA ERROR:", err);
    throw err;
  }
}
