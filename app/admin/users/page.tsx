/**
 * Admin User Management Page
 * @description Data table for managing platform users with search, sort, and pagination
 * @module app/admin/users/page
 */

"use client"

import { useMemo, useState, useEffect } from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table"
import {
  IconArrowsSort,
  IconBrandLinkedin,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconFilter,
  IconRefresh,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconX,
} from "@tabler/icons-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useAdminUsers } from "@/hooks/use-admin-users"
import type { AdminUser } from "@/types/admin"

/**
 * Sample user data as fallback when API returns no users
 */
const SAMPLE_USERS: AdminUser[] = [
  {
    id: "u1",
    name: "Sarah Chen",
    email: "sarah.chen@company.com",
    joinedAt: "2025-11-15T10:30:00Z",
    postsCount: 47,
    lastActive: "2026-01-27T08:15:00Z",
    status: "active",
    linkedinConnected: true,
  },
  {
    id: "u2",
    name: "James Wilson",
    email: "james.wilson@startup.io",
    joinedAt: "2025-12-03T14:20:00Z",
    postsCount: 23,
    lastActive: "2026-01-26T16:45:00Z",
    status: "active",
    linkedinConnected: true,
  },
  {
    id: "u3",
    name: "Maria Garcia",
    email: "maria@freelance.com",
    joinedAt: "2025-10-20T09:00:00Z",
    postsCount: 89,
    lastActive: "2026-01-27T11:00:00Z",
    status: "active",
    linkedinConnected: true,
  },
  {
    id: "u4",
    name: "Alex Johnson",
    email: "alex.j@enterprise.co",
    joinedAt: "2026-01-05T16:30:00Z",
    postsCount: 5,
    lastActive: "2026-01-25T09:30:00Z",
    status: "active",
    linkedinConnected: false,
  },
  {
    id: "u5",
    name: "Emily Davis",
    email: "emily.d@marketing.com",
    joinedAt: "2025-09-10T08:00:00Z",
    postsCount: 112,
    lastActive: "2026-01-27T07:20:00Z",
    status: "active",
    linkedinConnected: true,
  },
]

/**
 * Formats a date string to a localized short date
 * @param dateStr - ISO date string
 * @returns Formatted date string
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Returns the variant and label for a user status badge
 * @param status - User account status
 * @returns Badge variant and display label
 */
function getStatusBadge(status: AdminUser["status"]): {
  variant: "default" | "secondary" | "destructive" | "outline"
  label: string
} {
  switch (status) {
    case "active":
      return { variant: "default", label: "Active" }
    case "inactive":
      return { variant: "secondary", label: "Inactive" }
    case "suspended":
      return { variant: "destructive", label: "Suspended" }
  }
}

/**
 * Gets user initials for avatar fallback
 * @param name - User's full name
 * @returns Two-character initials
 */
function getInitials(name: string): string {
  const parts = name.split(" ")
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

/**
 * Column definitions for the user management TanStack React Table
 */
const columns: ColumnDef<AdminUser>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="size-8">
          <AvatarImage src={row.original.avatarUrl} alt={row.original.name} />
          <AvatarFallback className="text-xs">
            {getInitials(row.original.name)}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "joinedAt",
    header: "Joined",
    cell: ({ row }) => formatDate(row.original.joinedAt),
    sortingFn: "datetime",
  },
  {
    accessorKey: "postsCount",
    header: "Posts",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.postsCount}</span>
    ),
  },
  {
    accessorKey: "lastActive",
    header: "Last Active",
    cell: ({ row }) => formatDate(row.original.lastActive),
    sortingFn: "datetime",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const { variant, label } = getStatusBadge(row.original.status)
      return <Badge variant={variant}>{label}</Badge>
    },
  },
  {
    accessorKey: "onboardingCompleted",
    header: "Onboarding",
    cell: ({ row }) =>
      row.original.onboardingCompleted ? (
        <Badge variant="default" className="gap-1">
          <IconCheck className="size-3" />
          Complete
        </Badge>
      ) : (
        <Badge variant="secondary" className="gap-1">
          Step {row.original.onboardingStep || 1}
        </Badge>
      ),
  },
  {
    accessorKey: "linkedinConnected",
    header: "LinkedIn",
    cell: ({ row }) =>
      row.original.linkedinConnected ? (
        <IconBrandLinkedin className="size-5 text-chart-1" />
      ) : (
        <span className="text-xs text-muted-foreground">Not connected</span>
      ),
  },
]

/**
 * SortableHeader Component
 * Renders a clickable column header that toggles sorting direction
 *
 * @param props - Component props
 * @param props.column - The TanStack table column instance
 * @param props.label - Display label for the header
 * @returns A clickable header with sort indicator
 */
function SortableHeader({
  column,
  label,
}: {
  column: {
    getIsSorted: () => false | "asc" | "desc"
    toggleSorting: (desc?: boolean) => void
  }
  label: string
}) {
  const sorted = column.getIsSorted()

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {label}
      {sorted === "asc" ? (
        <IconSortAscending className="ml-1 size-4" />
      ) : sorted === "desc" ? (
        <IconSortDescending className="ml-1 size-4" />
      ) : (
        <IconArrowsSort className="ml-1 size-4 text-muted-foreground" />
      )}
    </Button>
  )
}

/**
 * Sortable column definitions that wrap the base columns with sort headers
 */
const sortableColumns: ColumnDef<AdminUser>[] = columns.map((col) => {
  if ("accessorKey" in col && col.accessorKey) {
    return {
      ...col,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={
            typeof col.header === "string"
              ? col.header
              : String(col.accessorKey)
          }
        />
      ),
    } as ColumnDef<AdminUser>
  }
  return col
})

/**
 * Loading skeleton for the users table
 */
function UsersTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="rounded-lg border">
        <div className="bg-muted p-3">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 border-t p-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="size-5 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * AdminUsersPage Component
 *
 * Displays a searchable, sortable, paginated data table of all platform users.
 * Built with TanStack React Table for full-featured table interaction.
 * Fetches data from the admin users API with fallback to sample data.
 *
 * @returns The admin user management page
 */
export default function AdminUsersPage() {
  const {
    users: apiUsers,
    pagination,
    isLoading,
    error,
    search,
    setSearch,
    page,
    setPage,
    limit,
    setLimit,
    filters,
    setFilters,
    refetch,
  } = useAdminUsers()

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(debouncedSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [debouncedSearch, setSearch])

  // Use API data or fall back to sample data
  const data = useMemo(() => {
    if (apiUsers.length > 0) return apiUsers
    if (!isLoading && !error) return SAMPLE_USERS
    return []
  }, [apiUsers, isLoading, error])

  const table = useReactTable({
    data,
    columns: sortableColumns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: limit,
      },
    },
  })

  // Update table page size when limit changes
  useEffect(() => {
    table.setPageSize(limit)
  }, [limit, table])

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            View and manage all platform users.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <IconRefresh className="mr-2 size-4" />
          Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {pagination.total > 0
              ? `${pagination.total} user${pagination.total !== 1 ? "s" : ""} found`
              : isLoading
                ? "Loading users..."
                : `${data.length} user${data.length !== 1 ? "s" : ""} (sample data)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters Row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative max-w-sm flex-1">
              <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={debouncedSearch}
                onChange={(e) => setDebouncedSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <IconFilter className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filters:</span>
              </div>

              {/* Onboarding Filter */}
              <Select
                value={
                  filters.onboardingCompleted === null
                    ? "all"
                    : filters.onboardingCompleted
                      ? "completed"
                      : "incomplete"
                }
                onValueChange={(val) =>
                  setFilters({
                    ...filters,
                    onboardingCompleted:
                      val === "all" ? null : val === "completed",
                  })
                }
              >
                <SelectTrigger size="sm" className="w-32">
                  <SelectValue placeholder="Onboarding" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>

              {/* LinkedIn Filter */}
              <Select
                value={
                  filters.linkedinConnected === null
                    ? "all"
                    : filters.linkedinConnected
                      ? "connected"
                      : "not_connected"
                }
                onValueChange={(val) =>
                  setFilters({
                    ...filters,
                    linkedinConnected:
                      val === "all" ? null : val === "connected",
                  })
                }
              >
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue placeholder="LinkedIn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LinkedIn</SelectItem>
                  <SelectItem value="connected">Connected</SelectItem>
                  <SelectItem value="not_connected">Not connected</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {(filters.onboardingCompleted !== null ||
                filters.linkedinConnected !== null) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      onboardingCompleted: null,
                      linkedinConnected: null,
                    })
                  }
                >
                  <IconX className="mr-1 size-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <UsersTableSkeleton />
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={refetch}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* Data Table */}
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No users found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {pagination.total > 0 ? (
                    <>
                      Showing {(page - 1) * limit + 1}-
                      {Math.min(page * limit, pagination.total)} of{" "}
                      {pagination.total}
                    </>
                  ) : (
                    <>
                      Showing{" "}
                      {table.getState().pagination.pageIndex * limit + 1}-
                      {Math.min(
                        (table.getState().pagination.pageIndex + 1) * limit,
                        data.length
                      )}{" "}
                      of {data.length}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="rows-per-page-admin" className="text-sm">
                      Rows per page
                    </Label>
                    <Select
                      value={String(limit)}
                      onValueChange={(val) => setLimit(Number(val))}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-20"
                        id="rows-per-page-admin"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 10, 20, 50].map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() =>
                        pagination.total > 0 ? setPage(1) : table.setPageIndex(0)
                      }
                      disabled={
                        pagination.total > 0
                          ? page === 1
                          : !table.getCanPreviousPage()
                      }
                    >
                      <IconChevronsLeft className="size-4" />
                      <span className="sr-only">First page</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() =>
                        pagination.total > 0
                          ? setPage(page - 1)
                          : table.previousPage()
                      }
                      disabled={
                        pagination.total > 0
                          ? page === 1
                          : !table.getCanPreviousPage()
                      }
                    >
                      <IconChevronLeft className="size-4" />
                      <span className="sr-only">Previous page</span>
                    </Button>
                    <span className="px-2 text-sm tabular-nums">
                      {pagination.total > 0
                        ? `${page} / ${pagination.totalPages || 1}`
                        : `${table.getState().pagination.pageIndex + 1} / ${table.getPageCount()}`}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() =>
                        pagination.total > 0
                          ? setPage(page + 1)
                          : table.nextPage()
                      }
                      disabled={
                        pagination.total > 0
                          ? page >= pagination.totalPages
                          : !table.getCanNextPage()
                      }
                    >
                      <IconChevronRight className="size-4" />
                      <span className="sr-only">Next page</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() =>
                        pagination.total > 0
                          ? setPage(pagination.totalPages)
                          : table.setPageIndex(table.getPageCount() - 1)
                      }
                      disabled={
                        pagination.total > 0
                          ? page >= pagination.totalPages
                          : !table.getCanNextPage()
                      }
                    >
                      <IconChevronsRight className="size-4" />
                      <span className="sr-only">Last page</span>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
