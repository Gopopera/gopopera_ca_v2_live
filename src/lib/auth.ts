import {
  getMultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  type UserCredential,
} from 'firebase/auth';
import { getAuthSafe } from './firebase';
import { getRecaptchaVerifier } from '../services/phoneVerification';

export async function resolveMfaSignIn(error: any): Promise<UserCredential | null> {
  const auth = getAuthSafe();
  if (!auth) {
    throw new Error('[MFA] Auth not available for resolver');
  }

  if (!error || error.code !== 'auth/multi-factor-auth-required') {
    return null;
  }

  console.log('[MFA] Sign-in second factor required');

  const resolver = getMultiFactorResolver(auth, error);
  const phoneInfoHint = resolver.hints[0];
  const recaptcha = getRecaptchaVerifier();

  const verificationId = await PhoneAuthProvider.verifyPhoneNumber(
    { session: resolver.session, phoneNumber: phoneInfoHint?.phoneNumber },
    recaptcha
  );
  console.log('[MFA] SMS sent for sign-in');

  const smsCode =
    typeof window !== 'undefined'
      ? window.prompt(`Enter the verification code sent to ${phoneInfoHint?.phoneNumber || 'your phone'}`) || ''
      : '';

  if (!smsCode) {
    throw new Error('[MFA] SMS code entry cancelled');
  }

  const cred = PhoneAuthProvider.credential(verificationId, smsCode);
  const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
  const finalUserCredential = await resolver.resolveSignIn(multiFactorAssertion);
  console.log('[MFA] Resolved MFA sign-in');
  return finalUserCredential;
}
