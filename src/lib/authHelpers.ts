import { type UserCredential } from 'firebase/auth';
import {
  completeGoogleRedirect as completeGoogleRedirectCore,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from './firebaseAuth';

export async function loginWithGoogle(): Promise<UserCredential | null> {
  console.log('[AUTH] loginWithGoogle: starting');
  return signInWithGoogle();
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
    console.error('[AUTH] loginWithEmail: error', { code: err?.code, message: err?.message });
    throw err;
  }
}

export async function signupWithEmail(email: string, password: string): Promise<UserCredential> {
  console.log('[AUTH] signupWithEmail: starting', { emailMasked: email.replace(/(.{2}).+(@.*)/, '$1***$2') });
  try {
    const cred = await signUpWithEmail(email, password);
    console.log('[AUTH] signupWithEmail: success', { uid: cred.user?.uid, email: cred.user?.email });
    return cred;
  } catch (err: any) {
    console.error('[AUTH] signupWithEmail: error', { code: err?.code, message: err?.message });
    throw err;
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
