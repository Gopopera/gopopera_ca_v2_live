import {
  type Auth,
  type Unsubscribe,
  type User,
  type UserCredential,
  GoogleAuthProvider,
  RecaptchaVerifier,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  getMultiFactorResolver,
  getRedirectResult,
  multiFactor,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  type MultiFactorResolver,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import { getAppSafe } from './firebase';

let authInstance: Auth | null = null;
let persistencePromise: Promise<void> | null = null;
let redirectChecked = false;
let cachedVerifier: RecaptchaVerifier | null = null;

function ensureAuth(): Auth {
  if (authInstance) return authInstance;
  const app = getAppSafe();
  if (!app) {
    throw new Error('[AUTH] Firebase app not initialized');
  }
  authInstance = getAuth(app);
  return authInstance;
}

async function ensurePersistence(auth: Auth) {
  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence).catch((err) => {
      persistencePromise = null;
      console.error('[AUTH] Failed to set persistence', err);
      throw err;
    });
  }
  return persistencePromise;
}

export async function initFirebaseAuth(): Promise<Auth> {
  const auth = ensureAuth();
  await ensurePersistence(auth);
  return auth;
}

export function getAuthInstance(): Auth {
  return ensureAuth();
}

export function listenToAuthChanges(callback: (user: User | null) => void): Unsubscribe {
  const auth = ensureAuth();
  void ensurePersistence(auth);
  return onAuthStateChanged(auth, callback);
}

export async function completeGoogleRedirect(): Promise<UserCredential | null> {
  const auth = await initFirebaseAuth();
  if (redirectChecked) return null;
  redirectChecked = true;
  try {
    return await getRedirectResult(auth);
  } catch (err) {
    console.error('[AUTH] completeGoogleRedirect error', err);
    return null;
  }
}

export async function signInWithGoogle(): Promise<UserCredential | null> {
  const auth = await initFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const preferRedirect = typeof window !== 'undefined' && window.innerWidth <= 768;

  try {
    if (preferRedirect) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    return await signInWithPopup(auth, provider, browserPopupRedirectResolver);
  } catch (err: any) {
    console.error("[AUTH] Google sign-in error:", err);
    const fallbackCodes = [
      'auth/popup-blocked',
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request',
      'auth/operation-not-supported-in-this-environment',
    ];
    if (fallbackCodes.includes(err?.code)) {
      console.warn('[AUTH] Popup failed, falling back to redirect', err?.code);
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  const auth = await initFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string): Promise<UserCredential> {
  const auth = await initFirebaseAuth();
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signOutUser(): Promise<void> {
  const auth = await initFirebaseAuth();
  await signOut(auth);
}

function ensureRecaptchaContainer(containerId: string) {
  if (typeof document === 'undefined') return containerId;
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.display = 'none';
    document.body.appendChild(container);
  }
  return containerId;
}

export function resetRecaptchaVerifier() {
  if (cachedVerifier) {
    try {
      cachedVerifier.clear();
    } catch {
      // ignore cleanup errors
    }
    cachedVerifier = null;
  }
}

export function createRecaptchaVerifier(containerId = 'recaptcha-container'): RecaptchaVerifier {
  const auth = ensureAuth();
  resetRecaptchaVerifier();
  const targetId = ensureRecaptchaContainer(containerId);
  cachedVerifier = new RecaptchaVerifier(auth, targetId, {
    size: 'invisible',
    callback: () => {
      console.log('[MFA] reCAPTCHA solved');
    },
    'expired-callback': () => {
      console.log('[MFA] reCAPTCHA expired');
      resetRecaptchaVerifier();
    },
  });
  return cachedVerifier;
}

export async function startPhoneMfaEnrollment(
  phoneNumber: string,
  verifier?: RecaptchaVerifier
): Promise<string> {
  const auth = await initFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  const recaptcha = verifier ?? createRecaptchaVerifier();
  const mfaUser = multiFactor(user);
  const session = await mfaUser.getSession();
  const phoneAuthProvider = new PhoneAuthProvider(auth);
  return phoneAuthProvider.verifyPhoneNumber({ phoneNumber, session }, recaptcha);
}

export async function verifyPhoneMfaCode(
  verificationId: string,
  code: string,
  displayName = 'Primary phone'
): Promise<User> {
  const auth = await initFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  const cred = PhoneAuthProvider.credential(verificationId, code);
  const assertion = PhoneMultiFactorGenerator.assertion(cred);
  await multiFactor(user).enroll(assertion, displayName);
  return user;
}

export function getMfaResolver(error: any): MultiFactorResolver | null {
  if (!error || error.code !== 'auth/multi-factor-auth-required') return null;
  const auth = ensureAuth();
  return getMultiFactorResolver(auth, error);
}

export async function sendMfaSignInCode(
  resolver: MultiFactorResolver,
  verifier?: RecaptchaVerifier
): Promise<{ verificationId: string; phoneNumber: string }> {
  const auth = await initFirebaseAuth();
  const recaptcha = verifier ?? createRecaptchaVerifier('mfa-sign-in-recaptcha');
  const phoneHint = resolver.hints?.[0];
  const phoneNumber = phoneHint?.phoneNumber || '';
  const phoneAuthProvider = new PhoneAuthProvider(auth);
  const verificationId = await phoneAuthProvider.verifyPhoneNumber(
    { phoneNumber, session: resolver.session },
    recaptcha
  );
  return { verificationId, phoneNumber };
}

export async function finishMfaSignIn(
  resolver: MultiFactorResolver,
  verificationId: string,
  code: string
): Promise<UserCredential> {
  const cred = PhoneAuthProvider.credential(verificationId, code);
  const assertion = PhoneMultiFactorGenerator.assertion(cred);
  return resolver.resolveSignIn(assertion);
}
