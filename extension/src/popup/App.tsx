/**
 * App - Minimal popup for ChainLinked extension
 * Focused on authentication and auto-capture status
 * @module popup/App
 */

import { useState, useEffect } from 'react';
import { Button } from './components/ui/button';
import logoImg from './logo.png';

/** Authentication state interface */
interface AuthState {
  isAuthenticated: boolean;
  userId?: string;
  email?: string;
  pendingCount?: number;
}

/** Dashboard URL */
const DASHBOARD_URL = 'https://chain-linked-theta.vercel.app/login';

/**
 * Main App component - Minimal auth-focused UI with auto-capture status
 */
function App() {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false });
  const [loading, setLoading] = useState(true);
  const [linkedInConnected, setLinkedInConnected] = useState<boolean | null>(null);

  // Form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
    checkLinkedInStatus();
  }, []);

  async function checkAuthStatus() {
    try {
      setLoading(true);
      const response = await chrome.runtime.sendMessage({ type: 'SUPABASE_AUTH_STATUS' });
      if (response?.success) {
        setAuthState({
          isAuthenticated: response.data.isAuthenticated,
          userId: response.data.userId,
          email: response.data.email,
          pendingCount: response.data.pendingCount,
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkLinkedInStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_COOKIES' });
      setLinkedInConnected(response?.isAuthenticated || false);
    } catch (error) {
      console.error('Error checking LinkedIn:', error);
      setLinkedInConnected(false);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await chrome.runtime.sendMessage({
        type: 'SUPABASE_AUTH_SIGN_IN',
        data: { email, password },
      });

      if (response?.success) {
        setAuthState({
          isAuthenticated: true,
          userId: response.data?.userId,
          email: response.data?.email || email,
        });
        setSuccess('Welcome back!');
        setEmail('');
        setPassword('');
        setTimeout(() => chrome.runtime.sendMessage({ type: 'SUPABASE_SYNC_NOW' }), 500);
      } else {
        setError(response?.error || 'Sign in failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await chrome.runtime.sendMessage({
        type: 'SUPABASE_AUTH_SIGN_UP',
        data: { email, password },
      });

      if (response?.success) {
        if (response.data?.requiresConfirmation) {
          setSuccess('Check your email to confirm your account');
          setIsSignUp(false);
        } else {
          setAuthState({
            isAuthenticated: true,
            userId: response.data?.userId,
            email: response.data?.email || email,
          });
          setSuccess('Account created!');
        }
        setEmail('');
        setPassword('');
      } else {
        setError(response?.error || 'Sign up failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      setLoading(true);
      await chrome.runtime.sendMessage({ type: 'SUPABASE_AUTH_SIGN_OUT' });
      setAuthState({ isAuthenticated: false });
      setSuccess(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-[320px] h-[480px] bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col overflow-hidden">
      {/* Header with Logo */}
      <header className="pt-6 pb-4 px-6 text-center shrink-0">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white shadow-lg shadow-blue-500/10 flex items-center justify-center overflow-hidden border border-slate-100">
          <img
            src={logoImg}
            alt="ChainLinked"
            className="w-16 h-16 object-contain"
          />
        </div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">ChainLinked</h1>
        <p className="text-xs text-slate-500 mt-1">LinkedIn Analytics & Data Sync</p>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pb-4 overflow-y-auto min-h-0">
        {loading && !authState.isAuthenticated ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400">Loading...</p>
          </div>
        ) : authState.isAuthenticated ? (
          /* Authenticated View */
          <div className="space-y-4">
            {/* Account Status */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {authState.email?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{authState.email}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-emerald-600 font-medium">Connected</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Link */}
            <a
              href={DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-sm hover:from-blue-700 hover:to-blue-800 transition-all group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <span className="text-sm font-medium">Open Dashboard</span>
              </div>
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>

            {/* Auto-Capture Status */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Auto-Capture Active</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Data is captured automatically as you browse LinkedIn</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Your profile, analytics, posts, and audience data are synced to the cloud whenever you visit LinkedIn. No action needed.
                    </p>
                  </div>
                </div>
              </div>

              {/* LinkedIn Connection Status */}
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">LinkedIn</span>
                {linkedInConnected === null ? (
                  <span className="text-[11px] text-slate-400">Checking...</span>
                ) : linkedInConnected ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-emerald-600 font-medium">Logged in</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-[11px] text-amber-600 font-medium">Not logged in</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="w-full text-xs text-slate-400 hover:text-slate-600 py-2 transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          /* Sign In / Sign Up Form */
          <div className="space-y-4">
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-3">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
                  disabled={loading}
                />
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'Password (min 6 chars)' : 'Password'}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 text-center">{error}</p>
              )}
              {success && (
                <p className="text-xs text-emerald-600 text-center">{success}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-sm"
              >
                {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
              }}
              className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>

            {/* Auto-Capture Info */}
            <div className="pt-4 border-t border-slate-100">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-blue-800 mb-1">Automatic Data Capture</p>
                <p className="text-[11px] text-blue-600 leading-relaxed">
                  Sign in and browse LinkedIn normally. Your data will be captured and synced automatically.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-slate-100 shrink-0 bg-white">
        <p className="text-[9px] text-slate-400 text-center">
          Data syncs automatically as you browse LinkedIn
        </p>
      </footer>
    </div>
  );
}

export default App;
