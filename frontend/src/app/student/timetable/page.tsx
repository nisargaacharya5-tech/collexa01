'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services/student.service';
import { queryKeys } from '@/lib/query-keys';
import { DayOfWeek } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatTimeSlot, cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
} from 'lucide-react';

const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export default function StudentTimetablePage() {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('MONDAY');

  const { data: timetableData, isLoading } = useQuery({
    queryKey: queryKeys.student.timetable,
    queryFn: () => studentService.getTimetable(),
  });

  const classes = timetableData?.classes || [];
  const dayClasses = classes.filter((c) => c.day_of_week === selectedDay);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Class Timetable
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Weekly lecture and laboratory schedule for {timetableData?.department} (Batch {timetableData?.batch_year} - Sec {timetableData?.section})
        </p>
      </div>

      {/* Day Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        {DAYS.map((day) => {
          const count = classes.filter((c) => c.day_of_week === day).length;
          const isActive = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer',
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400'
              )}
            >
              <span>{day.slice(0, 3)}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px]',
                  isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Period Cards Grid */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : dayClasses.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={`No Classes Scheduled for ${selectedDay}`}
          description="You do not have any instructional periods scheduled for this day."
        />
      ) : (
        <div className="space-y-3">
          {dayClasses
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
            .map((cls) => (
              <Card
                key={cls.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div className="flex h-14 w-32 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 font-mono text-xs font-semibold">
                    <Clock className="w-4 h-4 mb-0.5" />
                    <span>{formatTimeSlot(cls.start_time, cls.end_time)}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {cls.subject_name}
                      </h4>
                      <Badge variant="secondary" size="sm" className="font-mono">
                        {cls.subject_code}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {cls.faculty_name} ({cls.faculty_department})
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        Room {cls.room_number}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
