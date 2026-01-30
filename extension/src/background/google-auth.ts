/**
 * LinkedIn Data Extractor - Google OAuth Authentication
 * Handles Google OAuth flow for Drive API access
 */

import type { GoogleAuthState } from '../shared/types';

// Storage key for auth state
const AUTH_STORAGE_KEY = 'google_auth_state';

// OAuth scopes needed for Drive appdata access
const SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

/**
 * Get stored auth state
 */
export async function getAuthState(): Promise<GoogleAuthState> {
  try {
    const result = await chrome.storage.local.get(AUTH_STORAGE_KEY);
    const state = result[AUTH_STORAGE_KEY] as GoogleAuthState | undefined;

    if (state?.accessToken && state?.expiresAt) {
      // Check if token is expired
      if (Date.now() >= state.expiresAt) {
        console.log('[GoogleAuth] Token expired, clearing auth state');
        await clearAuthState();
        return { isAuthenticated: false };
      }
      return state;
    }

    return { isAuthenticated: false };
  } catch (error) {
    console.error('[GoogleAuth] Error getting auth state:', error);
    return { isAuthenticated: false };
  }
}

/**
 * Save auth state to storage
 */
async function saveAuthState(state: GoogleAuthState): Promise<void> {
  await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: state });
}

/**
 * Clear auth state
 */
export async function clearAuthState(): Promise<void> {
  await chrome.storage.local.remove(AUTH_STORAGE_KEY);
}

/**
 * Start OAuth flow using chrome.identity
 */
export async function startAuthFlow(): Promise<GoogleAuthState> {
  console.log('[GoogleAuth] Starting OAuth flow...');

  try {
    // Use chrome.identity.getAuthToken for OAuth
    const token = await new Promise<string>((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!token) {
          reject(new Error('No token received'));
        } else {
          resolve(token);
        }
      });
    });

    console.log('[GoogleAuth] Got access token');

    // Get user info
    const userInfo = await fetchUserInfo(token);

    // Token from chrome.identity doesn't have explicit expiry,
    // but we'll set a reasonable cache time (1 hour)
    const expiresAt = Date.now() + 3600 * 1000;

    const authState: GoogleAuthState = {
      isAuthenticated: true,
      accessToken: token,
      expiresAt,
      userEmail: userInfo.email,
      userName: userInfo.name,
      userPhoto: userInfo.picture,
    };

    await saveAuthState(authState);
    console.log('[GoogleAuth] Auth successful:', userInfo.email);

    return authState;
  } catch (error) {
    console.error('[GoogleAuth] Auth flow error:', error);
    throw error;
  }
}

/**
 * Fetch user info from Google API
 */
async function fetchUserInfo(accessToken: string): Promise<{
  email?: string;
  name?: string;
  picture?: string;
}> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[GoogleAuth] Error fetching user info:', error);
    return {};
  }
}

/**
 * Logout - revoke token and clear state
 */
export async function logout(): Promise<void> {
  console.log('[GoogleAuth] Logging out...');

  try {
    const state = await getAuthState();

    if (state.accessToken) {
      // Revoke the token
      await new Promise<void>((resolve) => {
        chrome.identity.removeCachedAuthToken({ token: state.accessToken! }, () => {
          resolve();
        });
      });

      // Also try to revoke on Google's servers
      try {
        await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${state.accessToken}`);
      } catch (e) {
        // Ignore revoke errors
      }
    }

    await clearAuthState();
    console.log('[GoogleAuth] Logged out successfully');
  } catch (error) {
    console.error('[GoogleAuth] Logout error:', error);
    // Clear state anyway
    await clearAuthState();
  }
}

/**
 * Refresh the access token if needed
 */
export async function refreshTokenIfNeeded(): Promise<string | null> {
  const state = await getAuthState();

  if (!state.isAuthenticated) {
    return null;
  }

  // Check if token is about to expire (within 5 minutes)
  if (state.expiresAt && Date.now() >= state.expiresAt - 5 * 60 * 1000) {
    console.log('[GoogleAuth] Token expiring soon, refreshing...');

    try {
      // Remove cached token to force refresh
      if (state.accessToken) {
        await new Promise<void>((resolve) => {
          chrome.identity.removeCachedAuthToken({ token: state.accessToken! }, () => {
            resolve();
          });
        });
      }

      // Get new token
      const token = await new Promise<string>((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!token) {
            reject(new Error('No token received'));
          } else {
            resolve(token);
          }
        });
      });

      // Update state with new token
      const newState: GoogleAuthState = {
        ...state,
        accessToken: token,
        expiresAt: Date.now() + 3600 * 1000,
      };

      await saveAuthState(newState);
      return token;
    } catch (error) {
      console.error('[GoogleAuth] Token refresh failed:', error);
      await clearAuthState();
      return null;
    }
  }

  return state.accessToken || null;
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidToken(): Promise<string | null> {
  return refreshTokenIfNeeded();
}

/**
 * Check if user is authenticated with valid token
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getValidToken();
  return !!token;
}
