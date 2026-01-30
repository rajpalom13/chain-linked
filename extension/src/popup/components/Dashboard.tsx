/**
 * Dashboard - Main stats and analytics overview component
 * @module popup/components/Dashboard
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { TrendChart } from './TrendChart';
import { useTrendData, useTrendSummary, useCaptureStats } from '../hooks/useAnalytics';
import { formatNumber, formatRelativeTime } from '../lib/utils';

/**
 * Dashboard component displaying key metrics and recent activity
 */
export function Dashboard() {
  const { data: trendData, loading: trendLoading } = useTrendData(30);
  const { summary, loading: summaryLoading } = useTrendSummary(7);
  const { stats: captureStats } = useCaptureStats();

  const isLoading = trendLoading || summaryLoading;

  return (
    <div className="space-y-3">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          title="Impressions"
          value={summary?.impressions.current || 0}
          change={summary?.impressions.changePercent || 0}
          loading={isLoading}
          icon="eye"
          color="blue"
        />
        <StatCard
          title="Followers"
          value={summary?.followers.current || 0}
          change={summary?.followers.changePercent || 0}
          loading={isLoading}
          icon="users"
          color="emerald"
        />
        <StatCard
          title="Engagements"
          value={summary?.engagements.current || 0}
          change={summary?.engagements.changePercent || 0}
          loading={isLoading}
          icon="heart"
          color="rose"
        />
      </div>

      {/* Trend Chart */}
      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <CardTitle className="text-[12px] font-semibold text-slate-800">30-Day Trends</CardTitle>
            </div>
            <Badge className="bg-blue-50 text-blue-600 border-0 text-[9px] px-2">
              Impressions
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {trendLoading ? (
            <div className="h-[100px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-[10px] text-slate-400">Loading trends...</span>
              </div>
            </div>
          ) : (
            <TrendChart
              data={trendData?.impressions || []}
              color="#3b82f6"
              height={100}
            />
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <CardTitle className="text-[12px] font-semibold text-slate-800">Recent Captures</CardTitle>
            </div>
            {captureStats && captureStats.totalCaptures > 0 && (
              <Badge className="bg-emerald-50 text-emerald-600 border-0 text-[9px] px-2">
                {captureStats.totalCaptures} total
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {captureStats?.captureHistory && captureStats.captureHistory.length > 0 ? (
            <div className="space-y-2">
              {captureStats.captureHistory.slice(0, 4).map((capture, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      capture.success ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      {capture.success ? (
                        <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-slate-700 truncate capitalize">
                        {capture.type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {formatRelativeTime(new Date(capture.timestamp).getTime())}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <p className="text-[11px] font-medium text-slate-600">No captures yet</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Visit LinkedIn to start capturing data</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Footer */}
      {captureStats && captureStats.totalCaptures > 0 && (
        <div className="flex items-center justify-center gap-4 py-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-slate-500">
              {captureStats.successfulCaptures} successful
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="text-[10px] text-slate-500">
              {captureStats.totalCaptures - captureStats.successfulCaptures} failed
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            ({Math.round((captureStats.successfulCaptures / captureStats.totalCaptures) * 100)}% success)
          </span>
        </div>
      )}
    </div>
  );
}

/** Props for StatCard component */
interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  loading?: boolean;
  icon: 'eye' | 'users' | 'heart';
  color: 'blue' | 'emerald' | 'rose';
}

/**
 * Compact stat card component
 */
function StatCard({ title, value, change = 0, loading, icon, color }: StatCardProps) {
  const isPositive = change > 0;
  const isNegative = change < 0;

  const colorStyles = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
      iconBg: 'bg-blue-500',
      text: 'text-blue-600',
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
      iconBg: 'bg-emerald-500',
      text: 'text-emerald-600',
    },
    rose: {
      bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50',
      iconBg: 'bg-rose-500',
      text: 'text-rose-600',
    },
  };

  const icons = {
    eye: (
      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    users: (
      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    heart: (
      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
  };

  const styles = colorStyles[color];

  return (
    <Card className={`p-2.5 border-0 shadow-sm overflow-hidden ${styles.bg}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-md ${styles.iconBg} flex items-center justify-center`}>
            {icons[icon]}
          </div>
          <p className="text-[9px] font-medium text-slate-500 uppercase tracking-wide truncate">
            {title}
          </p>
        </div>
        {loading ? (
          <div className="h-6 bg-white/50 animate-pulse rounded mt-1" />
        ) : (
          <div className="flex items-baseline gap-1.5">
            <p className={`text-lg font-bold ${styles.text} truncate`}>
              {formatNumber(value)}
            </p>
            {change !== 0 && (
              <p
                className={`text-[9px] font-semibold ${
                  isPositive
                    ? 'text-emerald-600'
                    : isNegative
                    ? 'text-red-500'
                    : 'text-slate-500'
                }`}
              >
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
