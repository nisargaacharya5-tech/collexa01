'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services/student.service';
import { queryKeys } from '@/lib/query-keys';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/shared/EmptyState';
import { getAttendanceColorClass } from '@/lib/utils';
import {
  BookOpen,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';

export default function StudentAttendanceSummaryPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: queryKeys.student.attendanceSummary,
    queryFn: () => studentService.getAttendanceSummary(),
  });

  const overallPercentage = summary?.overall_percentage ?? 0;
  const overallStyle = getAttendanceColorClass(overallPercentage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Course Attendance & Analytics
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Track subject-by-subject attendance percentages, conducted hours, and statutory thresholds
        </p>
      </div>

      {/* Top Banner: Overall Scorecard */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Aggregated Semester Attendance
            </span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${overallStyle.badgeBg}`}>
              {overallStyle.statusText}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {overallPercentage.toFixed(1)}%
            </h2>
            <span className="text-xs text-slate-500">
              ({summary?.total_attended ?? 0} attended / {summary?.total_conducted ?? 0} total sessions)
            </span>
          </div>
        </div>

        {/* Breakdown Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60">
            Attended: {summary?.total_attended ?? 0}
          </div>
          <div className="rounded-xl bg-rose-50 px-3 py-2 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/60">
            Absent: {summary?.total_absent ?? 0}
          </div>
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/60">
            Late: {summary?.total_late ?? 0}
          </div>
          <div className="rounded-xl bg-sky-50 px-3 py-2 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400 border border-sky-200/60">
            Excused: {summary?.total_excused ?? 0}
          </div>
        </div>
      </div>

      {/* Subject-Wise Breakdown List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : !summary?.subject_breakdown || summary.subject_breakdown.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Course Attendance Recorded Yet"
          description="Your course attendance breakdown will appear here once faculty records lecture attendance."
        />
      ) : (
        <div className="space-y-4">
          {summary.subject_breakdown.map((subj) => {
            const style = getAttendanceColorClass(subj.attendance_percentage);
            const isLow = subj.attendance_percentage < 75;

            return (
              <Card
                key={subj.subject_code}
                className={`p-5 transition-all hover:shadow-md border ${
                  isLow ? 'border-amber-200 dark:border-amber-900/60' : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {subj.subject_name}
                      </h3>
                      <Badge variant="secondary" size="sm" className="font-mono">
                        {subj.subject_code}
                      </Badge>
                      {isLow && (
                        <Badge variant="warning" size="sm" className="gap-1">
                          <AlertTriangle className="w-3 h-3" /> Shortage Alert (&lt;75%)
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Attended {subj.attended_count} of {subj.total_conducted} classes conducted
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                        {subj.attendance_percentage.toFixed(1)}%
                      </div>
                      <span className={`text-[11px] font-semibold ${style.badgeText}`}>
                        {style.statusText}
                      </span>
                    </div>

                    <Link href={`/student/attendance/${encodeURIComponent(subj.subject_code)}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <span>View Logs</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${style.progressBar}`}
                    style={{ width: `${Math.min(subj.attendance_percentage, 100)}%` }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
