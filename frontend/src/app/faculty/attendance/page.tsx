'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { facultyService } from '@/services/faculty.service';
import { queryKeys } from '@/lib/query-keys';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import { Clock, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

export default function FacultyAttendanceLogsPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: queryKeys.faculty.attendanceMe(),
    queryFn: () => facultyService.getAttendanceHistory(),
  });

  const presentDays = logs.filter((l) => l.status === 'PRESENT').length;
  const halfDays = logs.filter((l) => l.status === 'HALF_DAY').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Self-Attendance Log History
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Chronological record of your campus check-in and check-out timestamps
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Days Present</p>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white">{presentDays}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Half Days</p>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white">{halfDays}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Total Recorded Entries</p>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white">{logs.length}</h4>
          </div>
        </Card>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No Historical Check-In Logs"
          description="Check in from your dashboard to begin accumulating personal attendance records."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Date</th>
                <th className="px-5 py-3.5 font-semibold">Arrival (Check-In)</th>
                <th className="px-5 py-3.5 font-semibold">Departure (Check-Out)</th>
                <th className="px-5 py-3.5 font-semibold">Daily Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">System Recorded At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                    {formatDate(log.date)}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-emerald-600 font-semibold">
                    {log.check_in_time ? String(log.check_in_time).slice(0, 5) : '—'}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                    {log.check_out_time ? String(log.check_out_time).slice(0, 5) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge
                      variant={
                        log.status === 'PRESENT'
                          ? 'success'
                          : log.status === 'HALF_DAY'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {log.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-right">
                    {new Date(log.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
