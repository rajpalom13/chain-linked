import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { formatDate, formatCompact } from '../lib/utils';

interface ChartDataPoint {
  date: string;
  value: number;
}

interface TrendChartProps {
  data: ChartDataPoint[];
  title?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showArea?: boolean;
}

export function TrendChart({
  data,
  title,
  color = '#334155',
  height = 100,
  showGrid = false,
  showArea = true,
}: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-[10px]" style={{ height }}>
        No trend data available
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    formattedDate: formatDate(d.date),
  }));

  const Chart = showArea ? AreaChart : LineChart;

  return (
    <div className="w-full overflow-hidden">
      {title && (
        <h4 className="text-[10px] font-medium text-slate-500 mb-1">{title}</h4>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={formattedData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompact}
            width={30}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white border border-slate-200 rounded shadow-lg p-1.5">
                    <p className="text-[9px] text-slate-500">{label}</p>
                    <p className="text-[11px] font-semibold text-slate-900">
                      {(payload[0].value as number).toLocaleString()}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          {showArea ? (
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.1}
              strokeWidth={1.5}
            />
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: color }}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

interface MultiTrendChartProps {
  impressions?: ChartDataPoint[];
  followers?: ChartDataPoint[];
  engagements?: ChartDataPoint[];
  height?: number;
}

export function MultiTrendChart({
  impressions = [],
  followers = [],
  engagements = [],
  height = 140,
}: MultiTrendChartProps) {
  // Merge data by date
  const dateMap = new Map<string, { date: string; impressions?: number; followers?: number; engagements?: number }>();

  impressions.forEach((d) => {
    if (!dateMap.has(d.date)) {
      dateMap.set(d.date, { date: d.date });
    }
    dateMap.get(d.date)!.impressions = d.value;
  });

  followers.forEach((d) => {
    if (!dateMap.has(d.date)) {
      dateMap.set(d.date, { date: d.date });
    }
    dateMap.get(d.date)!.followers = d.value;
  });

  engagements.forEach((d) => {
    if (!dateMap.has(d.date)) {
      dateMap.set(d.date, { date: d.date });
    }
    dateMap.get(d.date)!.engagements = d.value;
  });

  const data = Array.from(dateMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      ...d,
      formattedDate: formatDate(d.date),
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-[10px]" style={{ height }}>
        No trend data available
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompact}
            width={30}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white border border-slate-200 rounded shadow-lg p-1.5">
                    <p className="text-[9px] text-slate-500 mb-0.5">{label}</p>
                    {payload.map((entry, index) => (
                      <p
                        key={index}
                        className="text-[9px]"
                        style={{ color: entry.color }}
                      >
                        {entry.name}: {(entry.value as number)?.toLocaleString() || '-'}
                      </p>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          {impressions.length > 0 && (
            <Line
              type="monotone"
              dataKey="impressions"
              name="Impressions"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 2.5 }}
            />
          )}
          {followers.length > 0 && (
            <Line
              type="monotone"
              dataKey="followers"
              name="Followers"
              stroke="#10b981"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 2.5 }}
            />
          )}
          {engagements.length > 0 && (
            <Line
              type="monotone"
              dataKey="engagements"
              name="Engagements"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 2.5 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-1">
        {impressions.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[9px] text-slate-500">Impressions</span>
          </div>
        )}
        {followers.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[9px] text-slate-500">Followers</span>
          </div>
        )}
        {engagements.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[9px] text-slate-500">Engagements</span>
          </div>
        )}
      </div>
    </div>
  );
}
