import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface SupabaseAuthState {
  isAuthenticated: boolean;
  userId?: string;
  email?: string;
  pendingCount?: number;
  lastSyncTime?: number;
}

export function SupabaseAuth() {
  const [authState, setAuthState] = useState<SupabaseAuthState>({ isAuthenticated: false });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    loadAuthStatus();
  }, []);

  async function loadAuthStatus() {
    try {
      setLoading(true);
      const response = await chrome.runtime.sendMessage({ type: 'SUPABASE_AUTH_STATUS' });
      if (response?.success) {
        setAuthState({
          isAuthenticated: response.data.isAuthenticated,
          userId: response.data.userId,
          email: response.data.email,
          pendingCount: response.data.pendingCount,
          lastSyncTime: response.data.lastSyncTime,
        });
      }
    } catch (error) {
      console.error('Error loading Supabase auth status:', error);
    } finally {
      setLoading(false);
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
      setSuccess(null);

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
        setSuccess('Signed in successfully! Data sync started.');
        setEmail('');
        setPassword('');

        // Reload status to get sync info
        setTimeout(loadAuthStatus, 1000);
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
      setSuccess(null);

      const response = await chrome.runtime.sendMessage({
        type: 'SUPABASE_AUTH_SIGN_UP',
        data: { email, password },
      });

      if (response?.success) {
        if (response.data?.requiresConfirmation) {
          setSuccess('Account created! Please check your email to confirm.');
          setIsSignUp(false);
        } else {
          setAuthState({
            isAuthenticated: true,
            userId: response.data?.userId,
            email: response.data?.email || email,
          });
          setSuccess('Account created and signed in!');
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

  /**
   * Handle Google OAuth sign in via chrome.identity
   */
  async function handleGoogleSignIn() {
    try {
      setGoogleLoading(true);
      setError(null);
      setSuccess(null);

      const response = await chrome.runtime.sendMessage({ type: 'SUPABASE_AUTH_GOOGLE' });

      if (response?.success) {
        setAuthState({
          isAuthenticated: true,
          userId: response.data?.user?.id,
          email: response.data?.user?.email,
        });
        setSuccess('Signed in with Google successfully!');
        setTimeout(loadAuthStatus, 1000);
      } else {
        setError(response?.error || 'Google sign in failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Google sign in failed');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      setLoading(true);
      setError(null);

      await chrome.runtime.sendMessage({ type: 'SUPABASE_AUTH_SIGN_OUT' });

      setAuthState({ isAuthenticated: false });
      setSuccess('Signed out successfully');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign out failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncNow() {
    try {
      setSyncing(true);
      setError(null);

      const response = await chrome.runtime.sendMessage({ type: 'SUPABASE_SYNC_NOW' });

      if (response?.success) {
        setSuccess(`Synced ${response.data?.success || 0} items`);
        await loadAuthStatus();
      } else {
        setError(response?.error || 'Sync failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function handleMigrateData() {
    try {
      setSyncing(true);
      setError(null);

      const response = await chrome.runtime.sendMessage({ type: 'SUPABASE_MIGRATE_DATA' });

      if (response?.success) {
        setSuccess(`Migrated ${response.data?.migrated || 0} items to cloud`);
        await loadAuthStatus();
      } else {
        setError(response?.error || 'Migration failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Migration failed');
    } finally {
      setSyncing(false);
    }
  }

  if (loading && !authState.isAuthenticated) {
    return (
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-slate-400 text-sm">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Authenticated state
  if (authState.isAuthenticated) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">ChainLinked Cloud</CardTitle>
            <Badge variant="success" className="text-[10px]">Connected</Badge>
          </div>
          <CardDescription className="text-xs">
            Real-time sync with ChainLinked dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 text-sm font-medium">
                {authState.email?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{authState.email}</p>
              <p className="text-[10px] text-slate-500">
                {authState.pendingCount ? `${authState.pendingCount} pending changes` : 'All synced'}
              </p>
            </div>
          </div>

          {authState.lastSyncTime && (
            <p className="text-[10px] text-slate-500">
              Last sync: {new Date(authState.lastSyncTime).toLocaleString()}
            </p>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
          {success && <p className="text-xs text-green-600">{success}</p>}

          <div className="flex gap-2">
            <Button
              onClick={handleSyncNow}
              disabled={syncing}
              size="sm"
              className="flex-1 text-xs"
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Button
              onClick={handleMigrateData}
              disabled={syncing}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Full Sync
            </Button>
          </div>

          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="w-full text-xs text-slate-500"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Not authenticated - show sign in/sign up form
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">ChainLinked Cloud</CardTitle>
        <CardDescription className="text-xs">
          Sign in to sync data with ChainLinked dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-3">
          <div>
            <label className="text-xs text-slate-600 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-xs text-slate-600 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? 'Min 6 characters' : 'Your password'}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {success && <p className="text-xs text-green-600">{success}</p>}

          <Button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-2 text-slate-400">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-2 text-sm"
            onClick={handleGoogleSignIn}
          >
            {googleLoading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuccess(null);
            }}
            className="w-full text-xs text-blue-600 hover:text-blue-700"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 text-center">
            Sync your LinkedIn data with the ChainLinked dashboard for team analytics and scheduling.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
