/**
 * CloudSync - Supabase cloud sync and authentication component
 * Provides user authentication and automatic data sync to ChainLinked cloud
 * @module popup/components/CloudSync
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { formatRelativeTime } from '../lib/utils';

/** Authentication state interface */
interface AuthState {
  isAuthenticated: boolean;
  userId?: string;
  email?: string;
  pendingCount?: number;
  lastSyncTime?: number;
  autoSyncEnabled?: boolean;
}

/** Sync history item interface */
interface SyncHistoryItem {
  timestamp: number;
  itemsCount: number;
  type: 'auto' | 'manual';
}

/**
 * CloudSync component for Supabase authentication and data synchronization
 * Handles user login, session management, and automatic cloud sync
 */
export function CloudSync() {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);

  // Form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    loadAuthStatus();
    loadSyncHistory();
  }, []);

  /**
   * Load authentication status from service worker
   */
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
          autoSyncEnabled: response.data.autoSyncEnabled ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading auth status:', error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Load sync history from storage
   */
  async function loadSyncHistory() {
    try {
      const result = await chrome.storage.local.get('sync_history');
      if (result.sync_history) {
        setSyncHistory(result.sync_history.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading sync history:', error);
    }
  }

  /**
   * Handle user sign in
   */
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
          autoSyncEnabled: true,
        });
        setSuccess('Signed in! Auto-sync enabled.');
        setEmail('');
        setPassword('');

        // Trigger initial sync and reload status
        setTimeout(async () => {
          await chrome.runtime.sendMessage({ type: 'SUPABASE_SYNC_NOW' });
          await loadAuthStatus();
          await loadSyncHistory();
        }, 500);
      } else {
        setError(response?.error || 'Sign in failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle user sign up
   */
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
          setSuccess('Account created! Check your email to confirm.');
          setIsSignUp(false);
        } else {
          setAuthState({
            isAuthenticated: true,
            userId: response.data?.userId,
            email: response.data?.email || email,
            autoSyncEnabled: true,
          });
          setSuccess('Account created! Auto-sync enabled.');
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
   * Handle user sign out
   */
  async function handleSignOut() {
    try {
      setLoading(true);
      setError(null);
      await chrome.runtime.sendMessage({ type: 'SUPABASE_AUTH_SIGN_OUT' });
      setAuthState({ isAuthenticated: false });
      setSuccess('Signed out');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign out failed');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle manual sync trigger
   */
  async function handleSyncNow() {
    try {
      setSyncing(true);
      setError(null);

      const response = await chrome.runtime.sendMessage({ type: 'SUPABASE_SYNC_NOW' });

      if (response?.success) {
        const count = response.data?.success || 0;
        setSuccess(`Synced ${count} items to cloud`);
        await loadAuthStatus();
        await loadSyncHistory();
      } else {
        setError(response?.error || 'Sync failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  /**
   * Handle full data migration
   */
  async function handleFullSync() {
    try {
      setSyncing(true);
      setError(null);

      const response = await chrome.runtime.sendMessage({ type: 'SUPABASE_MIGRATE_DATA' });

      if (response?.success) {
        const count = response.data?.migrated || 0;
        setSuccess(`Migrated ${count} items to cloud`);
        await loadAuthStatus();
        await loadSyncHistory();
      } else {
        setError(response?.error || 'Migration failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Migration failed');
    } finally {
      setSyncing(false);
    }
  }

  // Loading state
  if (loading && !authState.isAuthenticated) {
    return (
      <div className="space-y-3">
        <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Checking authentication...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated state
  if (authState.isAuthenticated) {
    return (
      <div className="space-y-3">
        {/* Account Card */}
        <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-[13px] font-semibold text-slate-800">ChainLinked Cloud</CardTitle>
                  <CardDescription className="text-[10px] text-slate-500">
                    Data syncs automatically
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[9px] px-2 py-0.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 inline-block" />
                Connected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {authState.email?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-slate-800 truncate">{authState.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {authState.pendingCount ? (
                    <span className="text-[10px] text-amber-600 font-medium">
                      {authState.pendingCount} pending
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-medium">All synced</span>
                  )}
                  {authState.lastSyncTime && (
                    <span className="text-[10px] text-slate-400">
                      • {formatRelativeTime(authState.lastSyncTime)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-lg border border-red-100">
                <svg className="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-[11px] text-red-600">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p className="text-[11px] text-emerald-600">{success}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleSyncNow}
                disabled={syncing}
                className="h-9 text-[11px] font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm"
              >
                {syncing ? (
                  <>
                    <svg className="w-3.5 h-3.5 mr-1.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                    </svg>
                    Sync Now
                  </>
                )}
              </Button>
              <Button
                onClick={handleFullSync}
                disabled={syncing}
                variant="outline"
                className="h-9 text-[11px] font-medium border-slate-200 hover:bg-slate-50"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Full Sync
              </Button>
            </div>

            {/* Sign Out */}
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full h-8 text-[10px] text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Sync Info Card */}
        <Card className="overflow-hidden border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-700">Auto-Sync Active</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  Your LinkedIn data automatically syncs to ChainLinked cloud as you browse.
                  View your full analytics in the dashboard at chainlinked.app
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authenticated - Sign In/Sign Up Form
  return (
    <div className="space-y-3">
      <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-slate-50 to-white">
        <CardHeader className="pb-3 pt-4 px-4 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <CardTitle className="text-[15px] font-semibold text-slate-800">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription className="text-[11px] text-slate-500 mt-1">
            {isSignUp
              ? 'Sign up to sync your data with ChainLinked'
              : 'Sign in to sync your LinkedIn data'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-5">
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 text-[12px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'Min 6 characters' : '••••••••'}
                className="w-full px-3 py-2.5 text-[12px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-lg border border-red-100">
                <svg className="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-[11px] text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p className="text-[11px] text-emerald-600">{success}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 text-[12px] font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm mt-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Please wait...
                </>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
              }}
              className="w-full text-[11px] text-blue-600 hover:text-blue-700 font-medium mt-2"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Benefits Card */}
      <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="p-4">
          <p className="text-[11px] font-medium text-slate-700 mb-3">Why connect to ChainLinked?</p>
          <div className="space-y-2.5">
            {[
              { icon: '⚡', text: 'Real-time data sync across devices' },
              { icon: '📊', text: 'Advanced analytics dashboard' },
              { icon: '👥', text: 'Team collaboration features' },
              { icon: '📅', text: 'Schedule and manage posts' },
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="text-[12px]">{benefit.icon}</span>
                <span className="text-[10px] text-slate-600">{benefit.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
