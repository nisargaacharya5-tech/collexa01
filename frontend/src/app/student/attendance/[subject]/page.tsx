'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services/student.service';
import { queryKeys } from '@/lib/query-keys';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate, formatTimeSlot, getAttendanceColorClass } from '@/lib/utils';
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
} from 'lucide-react';

export default function StudentSubjectAttendanceLogPage() {
  const params = useParams();
  const subjectCode = decodeURIComponent(params.subject as string);

  const { data: detail, isLoading } = useQuery({
    queryKey: queryKeys.student.subjectAttendance(subjectCode),
    queryFn: () => studentService.getSubjectAttendance(subjectCode),
  });

  const percentage = detail?.attendance_percentage ?? 0;
  const colorStyle = getAttendanceColorClass(percentage);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/student/attendance">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {detail?.subject_name || subjectCode}
              </h1>
              <Badge variant="primary" size="sm" className="font-mono">
                {subjectCode}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological log of class sessions and evaluated status marks
            </p>
          </div>
        </div>

        {/* Scorecard Pill */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Course Attendance</span>
            <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white">
              {percentage.toFixed(1)}%
            </div>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorStyle.badgeBg}`}>
            {colorStyle.statusText}
          </span>
        </div>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      ) : !detail?.logs || detail.logs.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Class Session Logs Found"
          description={`No attendance evaluations have been recorded for ${subjectCode} yet.`}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Session Date</th>
                <th className="px-5 py-3.5 font-semibold">Period Timings</th>
                <th className="px-5 py-3.5 font-semibold">Classroom</th>
                <th className="px-5 py-3.5 font-semibold">Evaluating Faculty</th>
                <th className="px-5 py-3.5 font-semibold">Your Status</th>
                <th className="px-5 py-3.5 font-semibold">Faculty Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {detail.logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                    {formatDate(log.date)}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                    {formatTimeSlot(log.start_time, log.end_time)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">Room {log.room_number}</td>
                  <td className="px-5 py-3.5 text-slate-700 dark:text-slate-200 font-medium">
                    {log.faculty_name}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge
                      variant={
                        log.status === 'PRESENT'
                          ? 'success'
                          : log.status === 'LATE'
                          ? 'warning'
                          : log.status === 'EXCUSED'
                          ? 'info'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {log.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{log.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
