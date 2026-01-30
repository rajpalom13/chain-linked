/**
 * System Health Card Component
 * @description Displays system health status, service uptime, and API metrics
 * @module components/admin/system-health-card
 */

"use client"

import {
  IconActivity,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconClock,
  IconServer,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { SystemHealth, ServiceHealth } from "@/types/admin"

/**
 * Props for the SystemHealthCard component
 */
interface SystemHealthCardProps {
  /** System health data */
  health: SystemHealth
}

/**
 * Returns the status icon and styling based on service status
 * @param status - Service status
 * @returns Object with icon, color class, and badge variant
 */
function getStatusConfig(status: ServiceHealth["status"]): {
  Icon: typeof IconCheck
  colorClass: string
  badgeVariant: "default" | "secondary" | "destructive"
  label: string
} {
  switch (status) {
    case "operational":
      return {
        Icon: IconCheck,
        colorClass: "text-chart-4",
        badgeVariant: "default",
        label: "Operational",
      }
    case "degraded":
      return {
        Icon: IconAlertTriangle,
        colorClass: "text-warning",
        badgeVariant: "secondary",
        label: "Degraded",
      }
    case "outage":
      return {
        Icon: IconX,
        colorClass: "text-destructive",
        badgeVariant: "destructive",
        label: "Outage",
      }
  }
}

/**
 * Formats milliseconds to a readable string
 * @param ms - Milliseconds
 * @returns Formatted string (e.g., "45ms")
 */
function formatResponseTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * Individual service status row
 */
function ServiceRow({ service }: { service: ServiceHealth }) {
  const { Icon, colorClass, badgeVariant, label } = getStatusConfig(
    service.status
  )

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-8 items-center justify-center rounded-full bg-muted ${colorClass}`}
        >
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{service.name}</p>
          <p className="text-xs text-muted-foreground">
            {service.uptime.toFixed(1)}% uptime
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatResponseTime(service.responseTime)}
        </span>
        <Badge variant={badgeVariant} className="text-xs">
          {label}
        </Badge>
      </div>
    </div>
  )
}

/**
 * SystemHealthCard Component
 *
 * Displays a comprehensive view of system health including:
 * - Overall system status
 * - Individual service health with uptime and response times
 * - API error rate
 * - Average response time
 * - Total requests
 *
 * @param props - Component props
 * @returns Card displaying system health information
 *
 * @example
 * ```tsx
 * <SystemHealthCard
 *   health={{
 *     overallStatus: "operational",
 *     services: [...],
 *     errorRate: 0.3,
 *     avgResponseTime: 152,
 *     totalRequests: 24567
 *   }}
 * />
 * ```
 */
export function SystemHealthCard({ health }: SystemHealthCardProps) {
  const { Icon: OverallIcon, colorClass: overallColor, label: overallLabel } =
    getStatusConfig(health.overallStatus)

  // Calculate error rate color
  const errorRateColor =
    health.errorRate > 5
      ? "text-destructive"
      : health.errorRate > 2
        ? "text-warning"
        : "text-chart-4"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconActivity className="size-5" />
              System Health
            </CardTitle>
            <CardDescription>
              Service status and API performance metrics
            </CardDescription>
          </div>
          <Badge
            variant={
              health.overallStatus === "operational"
                ? "default"
                : health.overallStatus === "degraded"
                  ? "secondary"
                  : "destructive"
            }
            className="gap-1"
          >
            <OverallIcon className={`size-3 ${overallColor}`} />
            {overallLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Services List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <IconServer className="size-4 text-muted-foreground" />
            Services
          </h4>
          <div className="space-y-2">
            {health.services.map((service) => (
              <ServiceRow key={service.name} service={service} />
            ))}
          </div>
        </div>

        {/* API Metrics */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <IconClock className="size-4 text-muted-foreground" />
            API Metrics
          </h4>

          {/* Error Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Error Rate</span>
              <span className={`font-medium tabular-nums ${errorRateColor}`}>
                {health.errorRate.toFixed(2)}%
              </span>
            </div>
            <Progress
              value={Math.min(health.errorRate * 10, 100)}
              className="h-2"
            />
          </div>

          {/* Response Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Avg Response Time</span>
              <span className="font-medium tabular-nums">
                {formatResponseTime(health.avgResponseTime)}
              </span>
            </div>
            <Progress
              value={Math.min(health.avgResponseTime / 5, 100)}
              className="h-2"
            />
          </div>

          {/* Total Requests */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <span className="text-sm text-muted-foreground">
              Total Requests (24h)
            </span>
            <span className="text-lg font-bold tabular-nums">
              {health.totalRequests.toLocaleString("en-US")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
