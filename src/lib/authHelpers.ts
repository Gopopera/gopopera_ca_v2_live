import { type UserCredential } from 'firebase/auth';
import {
  completeGoogleRedirect as completeGoogleRedirectCore,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from './firebaseAuth';

type AuthErrorInfo = { code?: string; message: string; mfaRequired?: boolean; mfaError?: any };

function mapAuthError(err: any, context: 'google' | 'email-signin' | 'email-signup'): AuthErrorInfo {
  const code = err?.code || err?.message || 'auth/unknown';

  if (code === 'auth/multi-factor-auth-required') {
    console.log('[AUTH] MFA required - will be handled by MFA flow');
    return {
      code,
      mfaRequired: true,
      mfaError: err,
      message: 'Multi-factor authentication is required. Please enter the verification code sent to your phone.',
    };
  }

  const common: Record<string, string> = {
    'auth/invalid-email': 'The email address is not valid.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with these credentials.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/popup-closed-by-user': 'Sign-in was canceled before completion.',
    'auth/popup-blocked': 'Popup was blocked. Please allow popups or try again.',
    'auth/cancelled-popup-request': 'Another sign-in is already in progress.',
    'auth/operation-not-supported-in-this-environment': 'This sign-in method is not supported in this environment.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
  };

  const message = common[code] || 'Something went wrong signing you in. Please try again.';
  return { code, message };
}

export async function loginWithGoogle(): Promise<UserCredential | null> {
  console.log('[AUTH] loginWithGoogle: starting');
  try {
    return await signInWithGoogle();
  } catch (err: any) {
    const mapped = mapAuthError(err, 'google');
    if (mapped.mfaRequired) {
      // Return the error with MFA info attached for handling
      const errorToThrow = new Error(mapped.message);
      (errorToThrow as any).code = mapped.code;
      (errorToThrow as any).mfaRequired = true;
      (errorToThrow as any).mfaError = mapped.mfaError;
      throw errorToThrow;
    }
    console.error('[AUTH] Google sign-in error:', { code: mapped.code, original: err });
    const errorToThrow = new Error(mapped.message);
    (errorToThrow as any).code = mapped.code;
    throw errorToThrow;
  }
}

export async function completeGoogleRedirect(): Promise<UserCredential | null> {
  console.log('[AUTH] completeGoogleRedirect: checking redirect result');
  return completeGoogleRedirectCore();
}

export async function loginWithEmail(email: string, password: string): Promise<UserCredential> {
  console.log('[AUTH] loginWithEmail: starting', { emailMasked: email.replace(/(.{2}).+(@.*)/, '$1***$2') });
  try {
    const cred = await signInWithEmail(email, password);
    console.log('[AUTH] loginWithEmail: success', { uid: cred.user?.uid, email: cred.user?.email });
    return cred;
  } catch (err: any) {
    const mapped = mapAuthError(err, 'email-signin');
    if (mapped.mfaRequired) {
      // Return the error with MFA info attached for handling
      const errorToThrow = new Error(mapped.message);
      (errorToThrow as any).code = mapped.code;
      (errorToThrow as any).mfaRequired = true;
      (errorToThrow as any).mfaError = mapped.mfaError;
      throw errorToThrow;
    }
    console.error('[AUTH] Email sign-in error:', { code: mapped.code, original: err });
    const errorToThrow = new Error(mapped.message);
    (errorToThrow as any).code = mapped.code;
    throw errorToThrow;
  }
}

export async function signupWithEmail(email: string, password: string): Promise<UserCredential> {
  console.log('[AUTH] signupWithEmail: starting', { emailMasked: email.replace(/(.{2}).+(@.*)/, '$1***$2') });
  try {
    const cred = await signUpWithEmail(email, password);
    console.log('[AUTH] signupWithEmail: success', { uid: cred.user?.uid, email: cred.user?.email });
    return cred;
  } catch (err: any) {
    const mapped = mapAuthError(err, 'email-signup');
    console.error('[AUTH] Email sign-up error:', { code: mapped.code, original: err });
    const errorToThrow = new Error(mapped.message);
    (errorToThrow as any).code = mapped.code;
    throw errorToThrow;
  }
}

// Backward compatibility export
export async function handleGoogleSignIn() {
  return loginWithGoogle();
}

/*
Manual QA (local):
1) npm run dev and open http://localhost:5173, clear console.
2) Click “Continue with Google”: see [AUTH_UI] Google button clicked, then popup or redirect logs; on success see [USER_STORE] onAuthStateChanged fired and handleAuthUser called.
3) If popup blocked, redirect kicks in; on return see [AUTH_UI] AuthPage mounted... and [AUTH] completeGoogleRedirect: success.
4) Email login/sign-up: see [AUTH] loginWithEmail/signupWithEmail success then onAuthStateChanged logs.
5) Sign in as eatezca@gmail.com: see [USER_STORE] Detected Popera account... and [POPERA_SEED] logs; demo events appear in feeds.
*/
