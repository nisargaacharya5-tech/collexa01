'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facultyService } from '@/services/faculty.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/context/AuthContext';
import { SpotlightCard } from '@/components/visual/SpotlightCard';
import { BlurText } from '@/components/visual/BlurText';
import { AnimatedList } from '@/components/visual/AnimatedList';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatTimeSlot, formatDate } from '@/lib/utils';
import {
  Clock,
  CheckCircle2,
  Calendar,
  LogOut,
  LogIn,
  MapPin,
  Users,
  Bell,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';

export default function FacultyDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: queryKeys.faculty.dashboard,
    queryFn: () => facultyService.getDashboard(),
  });

  const checkInMutation = useMutation({
    mutationFn: () => facultyService.checkIn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faculty.dashboard });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => facultyService.checkOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faculty.dashboard });
    },
  });

  const todayAttendance = dashboard?.today_attendance;
  const isCheckedIn = !!todayAttendance;
  const isCheckedOut = !!todayAttendance?.check_out_time;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <BlurText text={`Welcome back, ${user?.full_name || 'Professor'}`} />
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {user?.faculty_profile?.designation} • Department of {user?.faculty_profile?.department}
          </p>
        </div>
        <Link href="/faculty/timetable">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" /> Weekly Timetable
          </Button>
        </Link>
      </div>

      {/* Primary Row: 1-Click Check-In Widget + Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Attendance Widget */}
        <SpotlightCard
          spotlightColor={
            isCheckedIn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)'
          }
          className="flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Daily Campus Check-In
              </span>
              <Badge variant={isCheckedIn ? 'success' : 'secondary'} size="sm">
                {isCheckedIn ? 'PRESENT' : 'NOT CHECKED IN'}
              </Badge>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  isCheckedIn
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                    : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                }`}
              >
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isCheckedIn ? 'Verified On Campus' : 'Record Today’s Arrival'}
                </h3>
                <p className="text-xs text-slate-500">
                  {todayAttendance?.check_in_time
                    ? `Checked in at ${String(todayAttendance.check_in_time).slice(0, 5)}`
                    : 'Timestamp automatically recorded'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
            {!isCheckedIn ? (
              <Button
                variant="success"
                size="md"
                onClick={() => checkInMutation.mutate()}
                isLoading={checkInMutation.isPending}
                className="w-full gap-2"
              >
                <LogIn className="w-4 h-4" /> Check In Now
              </Button>
            ) : !isCheckedOut ? (
              <Button
                variant="outline"
                size="md"
                onClick={() => checkOutMutation.mutate()}
                isLoading={checkOutMutation.isPending}
                className="w-full gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" /> Check Out for Departure
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600 py-2">
                <CheckCircle2 className="w-4 h-4" /> Shift Completed (Departed: {String(todayAttendance.check_out_time).slice(0, 5)})
              </div>
            )}
          </div>
        </SpotlightCard>

        {/* Classes Scheduled Today Counter */}
        <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.15)">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Today’s Teaching Classes
              </p>
              <h3 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                {isLoading ? '—' : dashboard?.today_classes?.length ?? 0}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-[11px] text-slate-500">
            Classes scheduled according to active institutional timetable
          </p>
        </SpotlightCard>

        {/* Department Circulars Count */}
        <SpotlightCard spotlightColor="rgba(14, 165, 233, 0.15)">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Faculty Circulars
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
            Active announcements from administrative council
          </p>
        </SpotlightCard>
      </div>

      {/* Main Grid: Today's Classes & Faculty Notices */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's Teaching Schedule List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Today’s Class Schedule</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Directly take and evaluate student attendance per period
                </p>
              </div>
            </CardHeader>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((n) => (
                  <div key={n} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : dashboard?.today_classes?.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No classes assigned to you today. Enjoy your day or review course notes.
              </div>
            ) : (
              <div className="space-y-3">
                {dashboard?.today_classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-4 gap-4 hover:border-emerald-200 transition-all dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="flex h-12 w-28 shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-mono text-xs font-semibold">
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
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            Room {cls.room_number}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {cls.enrolled_students_count} Students
                          </span>
                          <span>
                            Sem {cls.semester} - Sec {cls.section}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <Link href={`/faculty/classes/${cls.id}/attendance`}>
                        <Button variant="primary" size="sm" className="gap-1.5 w-full sm:w-auto">
                          <ClipboardList className="w-4 h-4" />
                          <span>Take Attendance</span>
                        </Button>
                      </Link>
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
              <CardTitle>Faculty Notices</CardTitle>
              <Link href="/faculty/notices">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-indigo-600">
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
                No active announcements for faculty.
              </div>
            ) : (
              <AnimatedList>
                {dashboard?.recent_notices.slice(0, 4).map((notice) => (
                  <div
                    key={notice.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-1 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <Badge variant="primary" size="sm">
                        Circular
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
