/**
 * Admin Overview Page
 * @description Main admin dashboard with key metrics, growth charts, and recent activity
 * @module app/admin/page
 */

"use client"

import { AdminDashboard } from "@/components/admin"
import { useAdminStats } from "@/hooks/use-admin-stats"

/**
 * AdminOverviewPage Component
 *
 * The main admin dashboard showing key platform metrics,
 * growth trends, weekly activity, system health, and a recent activity feed.
 * Fetches real data from the admin stats API.
 *
 * @returns The admin overview page
 */
export default function AdminOverviewPage() {
  const { data, isLoading, error, refetch } = useAdminStats()

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground">
          Platform-wide metrics and activity at a glance.
        </p>
      </div>

      {/* Dashboard Content */}
      <AdminDashboard
        data={data}
        isLoading={isLoading}
        error={error}
        onRefresh={refetch}
      />
    </div>
  )
}
