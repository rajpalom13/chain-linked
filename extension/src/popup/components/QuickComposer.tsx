/**
 * QuickComposer - Mini post composer for quick LinkedIn posting from extension popup
 * @module popup/components/QuickComposer
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

/** Maximum character limit for LinkedIn posts */
const MAX_POST_LENGTH = 3000;

/** Post state type */
type PostState = 'idle' | 'posting' | 'success' | 'error';

/**
 * QuickComposer component for composing and posting LinkedIn content
 */
export function QuickComposer() {
  const [content, setContent] = useState('');
  const [postState, setPostState] = useState<PostState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [recentPosts, setRecentPosts] = useState<Array<{ id: string; content: string; timestamp: string }>>([]);

  const charactersRemaining = MAX_POST_LENGTH - content.length;
  const isOverLimit = charactersRemaining < 0;
  const canPost = content.trim().length > 0 && !isOverLimit && isAuthenticated;

  useEffect(() => {
    checkAuth();
    loadRecentPosts();
  }, []);

  async function checkAuth() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_COOKIES' });
      setIsAuthenticated(response?.isAuthenticated || false);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    }
  }

  async function loadRecentPosts() {
    try {
      const result = await chrome.storage.local.get('quick_posts_history');
      if (result.quick_posts_history) {
        setRecentPosts(result.quick_posts_history.slice(0, 3));
      }
    } catch (error) {
      console.error('Failed to load recent posts:', error);
    }
  }

  async function handlePost() {
    if (!canPost) return;

    setPostState('posting');
    setErrorMessage('');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_LINKEDIN_POST',
        data: {
          content: content.trim(),
          visibility: 'PUBLIC',
        },
      });

      if (response?.success) {
        setPostState('success');

        const newPost = {
          id: Date.now().toString(),
          content: content.trim().substring(0, 80) + (content.length > 80 ? '...' : ''),
          timestamp: new Date().toISOString(),
        };

        const updatedPosts = [newPost, ...recentPosts].slice(0, 10);
        await chrome.storage.local.set({ quick_posts_history: updatedPosts });
        setRecentPosts(updatedPosts.slice(0, 3));

        setTimeout(() => {
          setContent('');
          setPostState('idle');
        }, 2000);
      } else {
        throw new Error(response?.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Post failed:', error);
      setPostState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to post');

      setTimeout(() => {
        setPostState('idle');
      }, 3000);
    }
  }

  function openLinkedIn() {
    chrome.tabs.create({ url: 'https://www.linkedin.com/feed/' });
  }

  function useTemplate(template: string) {
    setContent(template);
  }

  const templates = [
    { label: 'Thought', text: "I've been thinking about..." },
    { label: 'Tip', text: "Here's a quick tip: " },
    { label: 'Question', text: "Quick question: " },
  ];

  return (
    <div className="space-y-2">
      {/* Main Composer Card */}
      <Card className="overflow-hidden">
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[11px] font-medium text-slate-600">Quick Post</CardTitle>
            {isAuthenticated ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[9px] px-1.5 py-0">
                Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] px-1.5 py-0">
                Login required
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0 space-y-2">
          {/* Text Area */}
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isAuthenticated
                ? "What's on your mind?"
                : "Log in to LinkedIn first"
              }
              disabled={!isAuthenticated || postState === 'posting'}
              className={`w-full h-20 p-2.5 text-[11px] rounded-md border resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${
                isOverLimit
                  ? 'border-red-300 bg-red-50'
                  : 'border-slate-200 bg-white'
              } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <div className={`absolute bottom-1.5 right-2 text-[9px] font-medium ${
              isOverLimit ? 'text-red-500' : charactersRemaining < 200 ? 'text-amber-500' : 'text-slate-400'
            }`}>
              {charactersRemaining}
            </div>
          </div>

          {/* Quick Templates */}
          <div className="flex gap-1 flex-wrap">
            {templates.map((template) => (
              <button
                key={template.label}
                onClick={() => useTemplate(template.text)}
                disabled={!isAuthenticated || postState === 'posting'}
                className="px-2 py-0.5 text-[9px] bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors disabled:opacity-50"
              >
                {template.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1.5">
            <Button
              onClick={handlePost}
              disabled={!canPost || postState === 'posting'}
              className={`flex-1 h-8 text-[10px] font-medium transition-all ${
                postState === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : postState === 'error'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {postState === 'posting' && (
                <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {postState === 'idle' && 'Post to LinkedIn'}
              {postState === 'posting' && 'Posting...'}
              {postState === 'success' && 'Posted!'}
              {postState === 'error' && 'Failed'}
            </Button>
            <Button
              variant="outline"
              onClick={openLinkedIn}
              className="h-8 px-2.5"
              title="Open LinkedIn"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
            </Button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <p className="text-[9px] text-red-500 bg-red-50 px-2 py-1 rounded">
              {errorMessage}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="py-1.5 px-3">
            <CardTitle className="text-[10px] font-medium text-slate-500">Recent Posts</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0">
            <div className="space-y-1.5">
              {recentPosts.map((post) => (
                <div key={post.id} className="flex items-start gap-1.5 p-1.5 bg-slate-50 rounded">
                  <div className="w-1 h-1 mt-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-600 truncate">{post.content}</p>
                    <p className="text-[8px] text-slate-400">
                      {new Date(post.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips Card */}
      <Card className="overflow-hidden bg-blue-50 border-blue-100">
        <CardContent className="p-2.5">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <svg className="w-2.5 h-2.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[9px] text-blue-700 leading-relaxed">
              For images and scheduling, use the full ChainLinked dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
