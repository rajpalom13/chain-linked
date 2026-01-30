import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MultiTrendChart } from './TrendChart';
import {
  useTrendData,
  useTrendSummary,
  useCreatorAnalytics,
  useAudienceData,
  useExport,
} from '../hooks/useAnalytics';
import { formatNumber, formatCompact } from '../lib/utils';

export function Analytics() {
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const { data: trendData, loading: trendLoading } = useTrendData(period);
  const { summary, loading: summaryLoading } = useTrendSummary(7);
  const { analytics } = useCreatorAnalytics();
  const { audience } = useAudienceData();
  const { exportTrendsCSV, exportTrendsJSON, loading: exportLoading } = useExport();

  return (
    <div className="space-y-2">
      {/* Period Selector */}
      <div className="flex items-center gap-1">
        {[7, 30, 90].map((days) => (
          <Button
            key={days}
            variant={period === days ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(days as 7 | 30 | 90)}
            className="text-[10px] h-7 px-3"
          >
            {days}d
          </Button>
        ))}
      </div>

      {/* Multi-line Trend Chart */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-1 pt-2 px-3">
          <CardTitle className="text-[11px] font-medium text-slate-600">
            Trends ({period} days)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-2">
          {trendLoading ? (
            <div className="h-[140px] flex items-center justify-center">
              <div className="animate-pulse text-slate-400 text-xs">Loading...</div>
            </div>
          ) : (
            <MultiTrendChart
              impressions={trendData?.impressions}
              followers={trendData?.followers}
              engagements={trendData?.engagements}
            />
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-1 pt-2 px-3">
          <CardTitle className="text-[11px] font-medium text-slate-600">7-Day Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-2">
          {summaryLoading ? (
            <div className="animate-pulse space-y-1.5">
              <div className="h-6 bg-slate-100 rounded" />
              <div className="h-6 bg-slate-100 rounded" />
              <div className="h-6 bg-slate-100 rounded" />
            </div>
          ) : summary ? (
            <div className="space-y-1.5">
              <SummaryRow
                label="Impressions"
                current={summary.impressions.current}
                change={summary.impressions.changePercent}
              />
              <SummaryRow
                label="Followers"
                current={summary.followers.current}
                change={summary.followers.changePercent}
              />
              <SummaryRow
                label="Engagements"
                current={summary.engagements.current}
                change={summary.engagements.changePercent}
              />
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">No summary data</p>
          )}
        </CardContent>
      </Card>

      {/* Creator Analytics */}
      {analytics && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-1 pt-2 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[11px] font-medium text-slate-600">Creator Stats</CardTitle>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                {analytics.period}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] text-slate-500 uppercase">Impressions</p>
                <p className="text-sm font-bold text-slate-800">{formatCompact(analytics.impressions)}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase">Members</p>
                <p className="text-sm font-bold text-slate-800">{formatCompact(analytics.membersReached)}</p>
              </div>
            </div>

            {analytics.topPosts && analytics.topPosts.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <p className="text-[9px] text-slate-500 uppercase mb-1">Top Posts</p>
                <div className="space-y-1">
                  {analytics.topPosts.slice(0, 2).map((post, index) => (
                    <div key={index} className="text-[10px] flex items-center justify-between">
                      <span className="text-slate-600 truncate flex-1 mr-2">
                        {post.title || `Post ${index + 1}`}
                      </span>
                      <span className="text-slate-400 shrink-0">
                        {formatCompact(post.impressions)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audience */}
      {audience && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-1 pt-2 px-3">
            <CardTitle className="text-[11px] font-medium text-slate-600">Audience</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-slate-500 uppercase">Total Followers</p>
                <p className="text-lg font-bold text-slate-800">{formatNumber(audience.totalFollowers)}</p>
              </div>
              {audience.newFollowers !== undefined && (
                <div className="text-right">
                  <p className="text-[9px] text-slate-500 uppercase">New</p>
                  <p className="text-sm font-semibold text-emerald-600">
                    +{formatNumber(audience.newFollowers)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Buttons */}
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportTrendsCSV(period)}
          disabled={exportLoading}
          className="flex-1 text-[10px] h-7"
        >
          Export CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportTrendsJSON(period)}
          disabled={exportLoading}
          className="flex-1 text-[10px] h-7"
        >
          Export JSON
        </Button>
      </div>
    </div>
  );
}

interface SummaryRowProps {
  label: string;
  current: number;
  change: number;
}

function SummaryRow({ label, current, change }: SummaryRowProps) {
  const safeChange = change ?? 0;
  const isPositive = safeChange > 0;
  const isNegative = safeChange < 0;

  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-800">{formatNumber(current)}</span>
        <span
          className={`text-[10px] ${
            isPositive
              ? 'text-emerald-600'
              : isNegative
              ? 'text-red-500'
              : 'text-slate-500'
          }`}
        >
          {isPositive ? '+' : ''}{safeChange.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
