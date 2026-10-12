'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/query-keys';
import { SpotlightCard } from '@/components/visual/SpotlightCard';
import { BlurText } from '@/components/visual/BlurText';
import { AnimatedList } from '@/components/visual/AnimatedList';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import {
  Users,
  GraduationCap,
  Calendar,
  Bell,
  Clock,
  ClipboardCheck,
  PlusCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: () => adminService.getDashboardStats(),
  });

  const { data: notices = [], isLoading: isLoadingNotices } = useQuery({
    queryKey: queryKeys.admin.notices(),
    queryFn: () => adminService.getNotices(),
  });

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <BlurText text="Institutional Administration" />
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time multi-tenant analytics, academic scheduling, and operations audit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/timetables">
            <Button variant="primary" size="sm" className="gap-1.5">
              <Calendar className="w-4 h-4" /> Timetables
            </Button>
          </Link>
          <Link href="/admin/notices">
            <Button variant="outline" size="sm" className="gap-1.5">
              <PlusCircle className="w-4 h-4" /> New Circular
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metric Spotlight Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SpotlightCard spotlightColor="rgba(99, 102, 241, 0.15)">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Students
              </p>
              <h3 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                {isLoadingStats ? '—' : stats?.active_students ?? 0}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <GraduationCap className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">Active Profiles</span> in tenant
          </p>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Faculty
              </p>
              <h3 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                {isLoadingStats ? '—' : stats?.active_faculty ?? 0}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">{stats?.today_faculty_checkins ?? 0} Checked in</span> today
          </p>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.15)">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Timetables
              </p>
              <h3 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                {isLoadingStats ? '—' : stats?.total_timetables ?? 0}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-[11px] text-slate-500 flex items-center gap-1">
            Across cohorts & departments
          </p>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(14, 165, 233, 0.15)">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Published Notices
              </p>
              <h3 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                {isLoadingStats ? '—' : stats?.published_notices ?? 0}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
              <Bell className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-[11px] text-slate-500 flex items-center gap-1">
            Circulars live to campus
          </p>
        </SpotlightCard>
      </div>

      {/* Main Grid: Quick Nav & Recent Notices */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Navigation Cards */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Administrative Actions</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              <Link
                href="/admin/timetables"
                className="flex items-center justify-between rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Manage Schedules</p>
                    <p className="text-xs text-slate-400">Timetable matrix & class conflict checks</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/admin/attendance"
                className="flex items-center justify-between rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ClipboardCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Audit Attendance</p>
                    <p className="text-xs text-slate-400">Review and override faculty & student logs</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/admin/faculty"
                className="flex items-center justify-between rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Faculty Accounts</p>
                    <p className="text-xs text-slate-400">Provision department teaching staff</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/admin/students"
                className="flex items-center justify-between rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Student Directory</p>
                    <p className="text-xs text-slate-400">Manage enrollment numbers & cohorts</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </Card>
        </div>

        {/* Notices Board */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Campus Notices</CardTitle>
              <Link href="/admin/notices">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-indigo-600">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>

            {isLoadingNotices ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : notices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No institutional notices published yet.
              </div>
            ) : (
              <AnimatedList>
                {notices.slice(0, 5).map((notice) => (
                  <div
                    key={notice.id}
                    className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            notice.target_role === 'ALL'
                              ? 'primary'
                              : notice.target_role === 'FACULTY'
                              ? 'warning'
                              : 'info'
                          }
                          size="sm"
                        >
                          Target: {notice.target_role}
                        </Badge>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(notice.published_at || notice.created_at)}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {notice.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2">{notice.content}</p>
                    </div>
                    <div>
                      {notice.is_published ? (
                        <Badge variant="success" size="sm">Published</Badge>
                      ) : (
                        <Badge variant="secondary" size="sm">Draft</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </AnimatedList>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
