import {
  GoogleAuthProvider,
  type Auth,
  type UserCredential,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';

let popupSupportLogged = false;

export function isPopupSupported(): boolean {
  if (typeof window === 'undefined' || !navigator) {
    return false;
  }
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isInApp = /FBAN|FBAV|FB_IAB|Instagram|Twitter/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  const supported = !(isIOS || isInApp || isSafari || isMobile);
  if (!popupSupportLogged) {
    console.log('[AUTH] Popup support:', supported);
    popupSupportLogged = true;
  }
  return supported;
}

export async function loginWithGoogle(auth: Auth): Promise<UserCredential | null> {
  console.log('[AUTH] loginWithGoogle: starting');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  if (isPopupSupported()) {
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('[AUTH] loginWithGoogle: popup success', { uid: result.user?.uid, email: result.user?.email });
      return result;
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user') {
        console.warn('[AUTH] loginWithGoogle: popup blocked, falling back to redirect');
        await signInWithRedirect(auth, provider);
        return null;
      }
      console.error('[AUTH] loginWithGoogle: popup error', err);
      throw err;
    }
  }

  console.log('[AUTH] loginWithGoogle: using redirect (popup not supported)');
  await signInWithRedirect(auth, provider);
  return null;
}

export async function completeGoogleRedirect(auth: Auth): Promise<UserCredential | null> {
  console.log('[AUTH] completeGoogleRedirect: checking redirect result');
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      console.log('[AUTH] completeGoogleRedirect: success', { uid: result.user.uid, email: result.user.email });
      return result;
    }
    console.log('[AUTH] completeGoogleRedirect: no redirect result');
    return null;
  } catch (err: any) {
    console.error('[AUTH] completeGoogleRedirect: error', { code: err?.code, message: err?.message });
    throw err;
  }
}

export async function loginWithEmail(auth: Auth, email: string, password: string): Promise<UserCredential> {
  console.log('[AUTH] loginWithEmail: starting', { emailMasked: email.replace(/(.{2}).+(@.*)/, '$1***$2') });
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log('[AUTH] loginWithEmail: success', { uid: cred.user?.uid, email: cred.user?.email });
    return cred;
  } catch (err: any) {
    console.error('[AUTH] loginWithEmail: error', { code: err?.code, message: err?.message });
    throw err;
  }
}

export async function signupWithEmail(auth: Auth, email: string, password: string): Promise<UserCredential> {
  console.log('[AUTH] signupWithEmail: starting', { emailMasked: email.replace(/(.{2}).+(@.*)/, '$1***$2') });
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    console.log('[AUTH] signupWithEmail: success', { uid: cred.user?.uid, email: cred.user?.email });
    return cred;
  } catch (err: any) {
    console.error('[AUTH] signupWithEmail: error', { code: err?.code, message: err?.message });
    throw err;
  }
}

// Backward compatibility export
export async function handleGoogleSignIn() {
  const { auth } = await import('./firebase');
  return loginWithGoogle(auth);
}

/*
Manual QA (local):
1) npm run dev and open http://localhost:5173, clear console.
2) Click “Continue with Google”: see [AUTH_UI] Google button clicked, then popup or redirect logs; on success see [USER_STORE] onAuthStateChanged fired and handleAuthUser called.
3) If popup blocked, redirect kicks in; on return see [AUTH_UI] AuthPage mounted... and [AUTH] completeGoogleRedirect: success.
4) Email login/sign-up: see [AUTH] loginWithEmail/signupWithEmail success then onAuthStateChanged logs.
5) Sign in as eatezca@gmail.com: see [USER_STORE] Detected Popera account... and [POPERA_SEED] logs; demo events appear in feeds.
*/
