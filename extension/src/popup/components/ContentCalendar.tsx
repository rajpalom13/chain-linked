import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { formatNumber, formatRelativeTime, formatDate } from '../lib/utils';
import type { ContentItem, ContentCalendarData } from '../../shared/types';

type PostType = 'post' | 'article' | 'poll' | 'video' | 'document';

const POST_TYPE_COLORS: Record<PostType, string> = {
  post: 'bg-blue-100 text-blue-700',
  article: 'bg-purple-100 text-purple-700',
  poll: 'bg-orange-100 text-orange-700',
  video: 'bg-red-100 text-red-700',
  document: 'bg-green-100 text-green-700',
};

const POST_TYPE_ICONS: Record<PostType, string> = {
  post: 'feed',
  article: 'article',
  poll: 'poll',
  video: 'play',
  document: 'file',
};

export function ContentCalendar() {
  const [calendarData, setCalendarData] = useState<ContentCalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PostType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'engagement'>('date');

  useEffect(() => {
    loadCalendarData();
  }, []);

  async function loadCalendarData() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_CONTENT_CALENDAR',
        data: { companyId: 'personal' },
      });
      if (response?.success && response.data) {
        setCalendarData(response.data);
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = calendarData?.items?.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  }) || [];

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'engagement') {
      return (b.engagement || 0) - (a.engagement || 0);
    }
    return (b.publishedAt || 0) - (a.publishedAt || 0);
  });

  const typeCounts = calendarData?.items?.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalEngagement = calendarData?.items?.reduce(
    (sum, item) => sum + (item.engagement || 0),
    0
  ) || 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-slate-400">Loading content...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!calendarData || !calendarData.items || calendarData.items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Content Calendar</CardTitle>
          <CardDescription className="text-xs">
            No content captured yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500">
            Visit a company posts page on LinkedIn to capture content automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Content Overview</CardTitle>
            {calendarData.period && (
              <Badge variant="secondary" className="text-[10px]">
                {calendarData.period.start} - {calendarData.period.end}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold">{calendarData.items.length}</p>
              <p className="text-[10px] text-slate-500">Total Posts</p>
            </div>
            <div>
              <p className="text-lg font-bold">{formatNumber(totalEngagement)}</p>
              <p className="text-[10px] text-slate-500">Engagements</p>
            </div>
            <div>
              <p className="text-lg font-bold">
                {calendarData.items.length > 0
                  ? Math.round(totalEngagement / calendarData.items.length)
                  : 0}
              </p>
              <p className="text-[10px] text-slate-500">Avg. Engagement</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Type Breakdown */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className="text-xs"
        >
          All ({calendarData.items.length})
        </Button>
        {Object.entries(typeCounts).map(([type, count]) => (
          <Button
            key={type}
            variant={filter === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(type as PostType)}
            className="text-xs"
          >
            {type.charAt(0).toUpperCase() + type.slice(1)} ({count})
          </Button>
        ))}
      </div>

      {/* Sort Options */}
      <div className="flex gap-2">
        <Button
          variant={sortBy === 'date' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('date')}
          className="text-xs flex-1"
        >
          By Date
        </Button>
        <Button
          variant={sortBy === 'engagement' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('engagement')}
          className="text-xs flex-1"
        >
          By Engagement
        </Button>
      </div>

      {/* Content List */}
      <div className="space-y-2">
        {sortedItems.slice(0, 10).map((item, index) => (
          <ContentCard key={item.id || index} item={item} />
        ))}
        {sortedItems.length > 10 && (
          <p className="text-xs text-slate-500 text-center">
            +{sortedItems.length - 10} more posts
          </p>
        )}
      </div>

      {/* Refresh Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={loadCalendarData}
        className="w-full"
      >
        Refresh
      </Button>
    </div>
  );
}

interface ContentCardProps {
  item: ContentItem;
}

function ContentCard({ item }: ContentCardProps) {
  const typeColor = POST_TYPE_COLORS[item.type] || POST_TYPE_COLORS.post;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Badge className={`${typeColor} text-[10px] shrink-0`}>
            {item.type}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">
              {item.title || 'Untitled post'}
            </p>
            {item.content && (
              <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                {item.content.substring(0, 100)}
                {item.content.length > 100 ? '...' : ''}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
              {item.publishedAt && (
                <span>{formatRelativeTime(item.publishedAt)}</span>
              )}
              {item.reactions !== undefined && (
                <span>{formatNumber(item.reactions)} reactions</span>
              )}
              {item.comments !== undefined && (
                <span>{formatNumber(item.comments)} comments</span>
              )}
            </div>
          </div>
          {item.engagement !== undefined && item.engagement > 0 && (
            <div className="text-right shrink-0">
              <p className="text-sm font-bold">{formatNumber(item.engagement)}</p>
              <p className="text-[9px] text-slate-500">engagement</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
