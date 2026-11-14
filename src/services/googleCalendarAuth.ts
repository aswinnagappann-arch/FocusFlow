import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

const RAW_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const CUSTOM_GOOGLE_CLIENT_ID =
  RAW_CLIENT_ID?.trim().replace(/^["']|["']$/g, '') || '';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of GOOGLE_CALENDAR_SCOPES) {
  provider.addScope(scope);
}

let isSigningIn = false;
// Access token is strictly cached in memory only (never localStorage or sessionStorage).
let cachedAccessToken: string | null = null;

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleAccountsOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
    error_callback?: (err: { message?: string; type?: string }) => void;
  }) => { requestAccessToken: (overrideConfig?: { prompt?: string }) => void };
  revoke?: (token: string, done?: () => void) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleAccountsOAuth2;
      };
    };
  }
}

export interface CalendarAuthUser {
  displayName: string | null;
  email: string | null;
}

export const initGoogleCalendarAuth = (
  onAuthSuccess?: (user: CalendarAuthUser, token: string) => void,
  onAuthUnavailable?: () => void
) => {
  if (CUSTOM_GOOGLE_CLIENT_ID) {
    if (!cachedAccessToken) {
      onAuthUnavailable?.();
    }
    return () => {};
  }

  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(
          { displayName: user.displayName, email: user.email },
          cachedAccessToken
        );
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthUnavailable?.();
      }
    } else {
      cachedAccessToken = null;
      onAuthUnavailable?.();
    }
  });
};

function waitForGISClient(timeoutMs = 6000): Promise<GoogleAccountsOAuth2> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve(window.google.accounts.oauth2);
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src*="accounts.google.com/gsi/client"]'
    );
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const start = Date.now();
    const timer = window.setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        window.clearInterval(timer);
        resolve(window.google.accounts.oauth2);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        window.clearInterval(timer);
        reject(
          new Error(
            'Could not load Google Sign-In script. Check your internet connection or disable ad/tracker blockers for accounts.google.com.'
          )
        );
      }
    }, 100);
  });
}

async function signInWithGIS(clientId: string): Promise<{
  user: CalendarAuthUser;
  accessToken: string;
}> {
  const oauth2 = await waitForGISClient();

  return new Promise((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: `${GOOGLE_CALENDAR_SCOPES.join(' ')} https://www.googleapis.com/auth/userinfo.email`,
      callback: async (response: GoogleTokenResponse) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ||
                response.error ||
                'Google sign-in did not return an access token.'
            )
          );
          return;
        }

        const accessToken = response.access_token;
        cachedAccessToken = accessToken;

        let email: string | null = null;
        let displayName: string | null = null;
        try {
          const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (infoRes.ok) {
            const info = (await infoRes.json()) as { email?: string; name?: string };
            email = info.email || null;
            displayName = info.name || null;
          }
        } catch {
          // Userinfo optional
        }

        resolve({
          user: { displayName, email },
          accessToken,
        });
      },
      error_callback: (err) => {
        if (err?.type === 'popup_failed_to_open') {
          reject(
            new Error(
              'Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.'
            )
          );
          return;
        }
        if (err?.type === 'popup_closed') {
          reject(new Error('Google sign-in popup was closed before completing sign-in.'));
          return;
        }
        reject(new Error(err?.message || 'Google sign-in popup was closed or blocked.'));
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export const googleSignIn = async (): Promise<{
  user: CalendarAuthUser;
  accessToken: string;
} | null> => {
  if (CUSTOM_GOOGLE_CLIENT_ID) {
    return signInWithGIS(CUSTOM_GOOGLE_CLIENT_ID);
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Calendar access token.');
    }
    cachedAccessToken = credential.accessToken;
    return {
      user: {
        displayName: result.user.displayName,
        email: result.user.email,
      },
      accessToken: cachedAccessToken,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/unauthorized-domain') {
      const host =
        typeof window !== 'undefined' ? window.location.hostname : 'your Vercel domain';
      throw new Error(
        `Domain "${host}" is not allowlisted in Firebase Auth. Set VITE_GOOGLE_CLIENT_ID in Vercel Environment Variables (and add https://${host} to Google Cloud OAuth Authorized JavaScript origins), or allowlist "${host}" in Firebase Console.`
      );
    }
    if (code === 'auth/popup-blocked') {
      throw new Error(
        'Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.'
      );
    }
    if (code === 'auth/popup-closed-by-user') {
      throw new Error('Google sign-in popup was closed before finishing.');
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogleCalendar = async (): Promise<void> => {
  const tokenToRevoke = cachedAccessToken;
  cachedAccessToken = null;

  if (CUSTOM_GOOGLE_CLIENT_ID) {
    if (tokenToRevoke && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(tokenToRevoke);
    }
    return;
  }

  await auth.signOut();
};
