'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services/student.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/context/AuthContext';
import { SpotlightCard } from '@/components/visual/SpotlightCard';
import { BlurText } from '@/components/visual/BlurText';
import { AnimatedList } from '@/components/visual/AnimatedList';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatTimeSlot, formatDate, getAttendanceColorClass } from '@/lib/utils';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Bell,
  ArrowRight,
  TrendingUp,
  Award,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const { user } = useAuth();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: queryKeys.student.dashboard,
    queryFn: () => studentService.getDashboard(),
  });

  const percentage = dashboard?.overall_attendance_percentage ?? 0;
  const colorStyle = getAttendanceColorClass(percentage);

  return (
    <div className="space-y-8">
      {/* Student Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <BlurText text={`Welcome back, ${user?.full_name || 'Student'}`} />
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            USN: {user?.student_profile?.enrollment_no} • {user?.student_profile?.department} (Batch {user?.student_profile?.batch_year} - Sec {user?.student_profile?.section})
          </p>
        </div>
        <Link href="/student/attendance">
          <Button variant="primary" size="sm" className="gap-1.5">
            <BookOpen className="w-4 h-4" /> Course Attendance Breakdown
          </Button>
        </Link>
      </div>

      {/* KPI Cards: Attendance Percentage Gauge + Schedule Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Overall Attendance Spotlight Card */}
        <SpotlightCard
          spotlightColor={
            percentage >= 75
              ? 'rgba(16, 185, 129, 0.15)'
              : percentage >= 60
              ? 'rgba(245, 158, 11, 0.15)'
              : 'rgba(244, 63, 94, 0.15)'
          }
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Overall Attendance
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorStyle.badgeBg}`}>
              {colorStyle.statusText}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {isLoading ? '—' : `${percentage.toFixed(1)}%`}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {dashboard?.total_classes_attended ?? 0} of {dashboard?.total_classes_conducted ?? 0} periods attended
              </p>
            </div>

            {/* Circular Ring Graphic */}
            <div className="relative flex h-20 w-20 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100 dark:text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={
                    percentage >= 75
                      ? 'text-emerald-500'
                      : percentage >= 60
                      ? 'text-amber-500'
                      : 'text-rose-500'
                  }
                  strokeDasharray={`${percentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-bold font-mono text-slate-700 dark:text-slate-200">
                {Math.round(percentage)}%
              </span>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Minimum Requirement: 75.0%</span>
            <Link href="/student/attendance" className="text-indigo-600 font-semibold hover:underline">
              View Log Details →
            </Link>
          </div>
        </SpotlightCard>

        {/* Classes Scheduled Today */}
        <SpotlightCard spotlightColor="rgba(99, 102, 241, 0.15)">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Today’s Timetable Slots
              </p>
              <h3 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                {isLoading ? '—' : dashboard?.today_classes?.length ?? 0}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-[11px] text-slate-500">
            Lecture & laboratory periods scheduled for today
          </p>
        </SpotlightCard>

        {/* Student Circulars */}
        <SpotlightCard spotlightColor="rgba(14, 165, 233, 0.15)">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Student Circulars
              </p>
              <h3 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                {isLoading ? '—' : dashboard?.recent_notices?.length ?? 0}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
              <Bell className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-[11px] text-slate-500">
            Official announcements, exams, and event notices
          </p>
        </SpotlightCard>
      </div>

      {/* Main Grid: Today's Classes & Urgent Notices */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Today’s Lecture Schedule</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assigned class periods, timings, and faculty mentors
                </p>
              </div>
              <Link href="/student/timetable">
                <Button variant="ghost" size="sm" className="text-xs text-indigo-600 gap-1">
                  Full Week <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((n) => (
                  <div key={n} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : dashboard?.today_classes?.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No classes scheduled for today. Enjoy your day!
              </div>
            ) : (
              <div className="space-y-3">
                {dashboard?.today_classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-4 gap-4 hover:border-indigo-200 transition-all dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="flex h-12 w-28 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 font-mono text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5 mb-0.5" />
                        <span>{formatTimeSlot(cls.start_time, cls.end_time)}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {cls.subject_name}
                          </h4>
                          <Badge variant="secondary" size="sm" className="font-mono">
                            {cls.subject_code}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {cls.faculty_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            Room {cls.room_number}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Notices Column */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Campus Circulars</CardTitle>
              <Link href="/student/notices">
                <Button variant="ghost" size="sm" className="text-xs text-indigo-600 gap-1">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((n) => (
                  <div key={n} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : dashboard?.recent_notices?.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active announcements for students.
              </div>
            ) : (
              <AnimatedList>
                {dashboard?.recent_notices.slice(0, 4).map((notice) => (
                  <div
                    key={notice.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-1 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <Badge variant="info" size="sm">
                        Notice
                      </Badge>
                      <span>{formatDate(notice.published_at || notice.created_at)}</span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      {notice.title}
                    </h5>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{notice.content}</p>
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
