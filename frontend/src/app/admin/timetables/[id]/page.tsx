'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/query-keys';
import { DayOfWeek, ScheduledClassCreateInput } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatTimeSlot, cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Users,
  MapPin,
  ArrowLeft,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';

const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export default function AdminTimetableDetailPage() {
  const params = useParams();
  const timetableId = params.id as string;
  const queryClient = useQueryClient();

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('MONDAY');
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);

  // Slot Form State
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [roomNumber, setRoomNumber] = useState('');
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Fetch timetable detail
  const { data: timetable, isLoading: isLoadingTimetable } = useQuery({
    queryKey: queryKeys.admin.timetableDetail(timetableId),
    queryFn: () => adminService.getTimetableById(timetableId),
  });

  // Fetch faculty list for dropdown
  const { data: facultyList = [] } = useQuery({
    queryKey: queryKeys.admin.facultyList(),
    queryFn: () => adminService.getFacultyList(),
  });

  const addSlotMutation = useMutation({
    mutationFn: (payload: ScheduledClassCreateInput) =>
      adminService.addClassSlot(timetableId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.timetableDetail(timetableId) });
      setIsAddSlotOpen(false);
      setSubjectName('');
      setSubjectCode('');
      setRoomNumber('');
      setConflictError(null);
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || 'Schedule conflict or error encountered';
      setConflictError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (classId: string) => adminService.deleteClassSlot(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.timetableDetail(timetableId) });
    },
  });

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);
    if (!facultyId && facultyList.length > 0) {
      setFacultyId(facultyList[0].id);
    }

    addSlotMutation.mutate({
      subject_name: subjectName,
      subject_code: subjectCode,
      faculty_id: facultyId || (facultyList[0]?.id ?? ''),
      day_of_week: selectedDay,
      start_time: startTime.includes(':') && startTime.length === 5 ? `${startTime}:00` : startTime,
      end_time: endTime.includes(':') && endTime.length === 5 ? `${endTime}:00` : endTime,
      room_number: roomNumber,
    });
  };

  const daySlots = timetable?.scheduled_classes?.filter(
    (slot) => slot.day_of_week.toUpperCase() === selectedDay
  ) || [];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/timetables">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {timetable?.title || 'Loading Timetable...'}
              </h1>
              <Badge variant="primary" size="sm">
                Sem {timetable?.semester} - {timetable?.section}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              {timetable?.department} • Academic Year {timetable?.academic_year}
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setConflictError(null);
            if (!facultyId && facultyList.length > 0) {
              setFacultyId(facultyList[0].id);
            }
            setIsAddSlotOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Period Slot
        </Button>
      </div>

      {/* Day Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        {DAYS.map((day) => {
          const count = timetable?.scheduled_classes?.filter((s) => s.day_of_week === day).length || 0;
          const isActive = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer',
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
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

      {/* Period Slots Grid */}
      {isLoadingTimetable ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : daySlots.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={`No Scheduled Classes for ${selectedDay}`}
          description="Add lecture periods, lab sessions, and assign faculty for this day."
          actionLabel="Add Period Slot"
          onAction={() => {
            setConflictError(null);
            setIsAddSlotOpen(true);
          }}
        />
      ) : (
        <div className="space-y-3">
          {daySlots
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
            .map((slot) => (
              <Card
                key={slot.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div className="flex h-12 w-28 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 font-mono text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5 mb-0.5" />
                    <span>{formatTimeSlot(slot.start_time, slot.end_time)}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {slot.subject_name}
                      </h4>
                      <Badge variant="secondary" size="sm" className="font-mono">
                        {slot.subject_code}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {slot.faculty?.full_name || 'Assigned Faculty'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        Room {slot.room_number}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <Link href={`/admin/classes/${slot.id}/roster`}>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      Manage Roster
                    </Button>
                  </Link>

                  <button
                    onClick={() => {
                      if (confirm(`Remove period ${slot.subject_code} (${slot.subject_name})?`)) {
                        deleteSlotMutation.mutate(slot.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Remove Class Slot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Add Slot Modal */}
      <Modal
        isOpen={isAddSlotOpen}
        onClose={() => setIsAddSlotOpen(false)}
        title={`Add Class Period Slot (${selectedDay})`}
        description="Assign subject, timing, classroom, and faculty with automatic collision checks"
      >
        <form onSubmit={handleAddSlot} className="space-y-4">
          {conflictError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Schedule Conflict Detected</p>
                <p className="mt-0.5">{conflictError}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Subject Name"
              placeholder="e.g. Compiler Design"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              required
            />
            <Input
              label="Subject Code"
              placeholder="e.g. CS601"
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Assigned Faculty Member
            </label>
            <select
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              required
            >
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.user.full_name} ({f.department} - {f.employee_id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <Input
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
            <Input
              label="Room Number"
              placeholder="e.g. Lab 302"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddSlotOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={addSlotMutation.isPending}>
              Schedule Slot
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
