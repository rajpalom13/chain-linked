/**
 * App - Minimal popup for ChainLinked extension
 * Focused on authentication and essential navigation
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

/**
 * Main App component - Minimal auth-focused UI
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
              href="https://chainlinked.app"
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

            {/* LinkedIn Links */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Visit LinkedIn to capture data</p>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { href: 'https://www.linkedin.com/feed/', label: 'Feed', desc: 'Posts & updates' },
                  { href: 'https://www.linkedin.com/in/me/', label: 'My Profile', desc: 'Your profile data' },
                  { href: 'https://www.linkedin.com/mynetwork/', label: 'My Network', desc: 'Connections' },
                  { href: 'https://www.linkedin.com/analytics/', label: 'Analytics', desc: 'Post performance' },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors group"
                  >
                    <div>
                      <span className="text-xs font-medium text-slate-700">{link.label}</span>
                      <span className="text-[10px] text-slate-400 ml-2">{link.desc}</span>
                    </div>
                    <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </a>
                ))}
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

            {/* Getting Started Info */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 text-center mb-3">After signing in, visit these pages to capture data:</p>
              <div className="bg-slate-50 rounded-lg overflow-hidden divide-y divide-slate-100">
                {[
                  { href: 'https://www.linkedin.com/feed/', label: 'Feed' },
                  { href: 'https://www.linkedin.com/in/me/', label: 'My Profile' },
                  { href: 'https://www.linkedin.com/mynetwork/', label: 'My Network' },
                  { href: 'https://www.linkedin.com/analytics/', label: 'Analytics' },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <span>{link.label}</span>
                    <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </a>
                ))}
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
