'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facultyService } from '@/services/faculty.service';
import { queryKeys } from '@/lib/query-keys';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatTimeSlot, cn } from '@/lib/utils';
import {
  Users,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  Save,
  Edit2,
} from 'lucide-react';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export default function FacultyMarkAttendancePage() {
  const params = useParams();
  const classId = params.id as string;
  const queryClient = useQueryClient();

  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Local state for attendance records: student_id -> status
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Fetch Class Roster
  const { data: rosterData, isLoading: isLoadingRoster } = useQuery({
    queryKey: queryKeys.faculty.roster(classId),
    queryFn: () => facultyService.getClassRoster(classId),
  });

  // Fetch existing attendance for this class & date
  const { data: existingAttendance, isLoading: isLoadingExisting } = useQuery({
    queryKey: queryKeys.faculty.classAttendance(classId, attendanceDate),
    queryFn: () => facultyService.getClassAttendanceByDate(classId, attendanceDate),
    retry: false,
  });

  const isAlreadySubmitted =
    existingAttendance &&
    existingAttendance.attendance_records &&
    existingAttendance.attendance_records.length > 0;

  // Initialize marks to PRESENT for all roster students or prefill from existing records
  useEffect(() => {
    if (isAlreadySubmitted) {
      const existingMarks: Record<string, AttendanceStatus> = {};
      const existingRemarks: Record<string, string> = {};
      existingAttendance.attendance_records.forEach((rec) => {
        existingMarks[rec.student_id] = rec.status as AttendanceStatus;
        if (rec.remarks) existingRemarks[rec.student_id] = rec.remarks;
      });
      setMarks(existingMarks);
      setRemarks(existingRemarks);
    } else if (rosterData?.roster) {
      const initialMarks: Record<string, AttendanceStatus> = {};
      rosterData.roster.forEach((s) => {
        initialMarks[s.student_id] = 'PRESENT';
      });
      setMarks(initialMarks);
      setRemarks({});
    }
  }, [rosterData, existingAttendance, isAlreadySubmitted]);

  // Bulk Submit Mutation
  const submitMutation = useMutation({
    mutationFn: () => {
      const records = Object.entries(marks).map(([studentId, status]) => ({
        student_id: studentId,
        status,
        remarks: remarks[studentId] || undefined,
      }));
      return facultyService.markClassAttendance(classId, {
        date: attendanceDate,
        records,
      });
    },
    onSuccess: (data) => {
      setSuccessToast(`Attendance submitted successfully (${data.count} students marked).`);
      setErrorToast(null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.faculty.classAttendance(classId, attendanceDate),
      });
    },
    onError: (err: any) => {
      setErrorToast(err.response?.data?.detail || 'Failed to submit attendance');
      setSuccessToast(null);
    },
  });

  // Single Record Update Mutation
  const updateSingleMutation = useMutation({
    mutationFn: ({ attendanceId, status, remark }: { attendanceId: string; status: string; remark?: string }) =>
      facultyService.updateStudentAttendance(classId, attendanceId, {
        status,
        remarks: remark,
      }),
    onSuccess: () => {
      setSuccessToast('Student record updated successfully.');
      queryClient.invalidateQueries({
        queryKey: queryKeys.faculty.classAttendance(classId, attendanceDate),
      });
    },
  });

  const setAllStatus = (status: AttendanceStatus) => {
    if (!rosterData?.roster) return;
    const updated: Record<string, AttendanceStatus> = {};
    rosterData.roster.forEach((s) => {
      updated[s.student_id] = status;
    });
    setMarks(updated);
  };

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setMarks((prev) => ({ ...prev, [studentId]: status }));
  };

  const presentCount = Object.values(marks).filter((s) => s === 'PRESENT').length;
  const absentCount = Object.values(marks).filter((s) => s === 'ABSENT').length;
  const lateCount = Object.values(marks).filter((s) => s === 'LATE').length;
  const excusedCount = Object.values(marks).filter((s) => s === 'EXCUSED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/faculty/dashboard">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {rosterData?.subject_name || 'Take Student Attendance'}
              </h1>
              <Badge variant="primary" size="sm" className="font-mono">
                {rosterData?.subject_code}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Room {rosterData?.room_number} • {rosterData ? formatTimeSlot(rosterData.start_time, rosterData.end_time) : ''}
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Status Banners */}
      {successToast && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Quick Summary Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="text-slate-500">
            Total Enrolled: <strong className="text-slate-900 dark:text-white">{rosterData?.total_enrolled ?? 0}</strong>
          </span>
          <span className="text-emerald-600">Present: {presentCount}</span>
          <span className="text-rose-600">Absent: {absentCount}</span>
          <span className="text-amber-600">Late: {lateCount}</span>
          <span className="text-sky-600">Excused: {excusedCount}</span>
        </div>

        {!isAlreadySubmitted && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAllStatus('PRESENT')}
              className="text-xs"
            >
              Mark All Present
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAllStatus('ABSENT')}
              className="text-xs text-rose-600 hover:bg-rose-50"
            >
              Mark All Absent
            </Button>
          </div>
        )}
      </div>

      {/* Roster Attendance Table */}
      {isLoadingRoster ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      ) : !rosterData?.roster || rosterData.roster.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Students Enrolled in this Class"
          description="Ask your institutional administrator to enroll students into this class slot roster."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3.5 font-semibold">USN / Enrollment</th>
                <th className="px-5 py-3.5 font-semibold">Student Name</th>
                <th className="px-5 py-3.5 font-semibold">Department / Sec</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status Selection</th>
                <th className="px-5 py-3.5 font-semibold">Faculty Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rosterData.roster.map((student) => {
                const currentStatus = marks[student.student_id] || 'PRESENT';
                return (
                  <tr key={student.student_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3.5 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                      {student.enrollment_no}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{student.full_name}</div>
                      <div className="text-[11px] text-slate-400">{student.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {student.department} • Sec {student.section}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setStudentStatus(student.student_id, 'PRESENT')}
                          className={cn(
                            'h-8 w-8 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center',
                            currentStatus === 'PRESENT'
                              ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30 ring-2 ring-emerald-600/30'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          )}
                          title="Present"
                        >
                          P
                        </button>

                        <button
                          type="button"
                          onClick={() => setStudentStatus(student.student_id, 'ABSENT')}
                          className={cn(
                            'h-8 w-8 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center',
                            currentStatus === 'ABSENT'
                              ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/30 ring-2 ring-rose-600/30'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          )}
                          title="Absent"
                        >
                          A
                        </button>

                        <button
                          type="button"
                          onClick={() => setStudentStatus(student.student_id, 'LATE')}
                          className={cn(
                            'h-8 w-8 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center',
                            currentStatus === 'LATE'
                              ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/30 ring-2 ring-amber-600/30'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          )}
                          title="Late"
                        >
                          L
                        </button>

                        <button
                          type="button"
                          onClick={() => setStudentStatus(student.student_id, 'EXCUSED')}
                          className={cn(
                            'h-8 w-8 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center',
                            currentStatus === 'EXCUSED'
                              ? 'bg-sky-600 text-white shadow-xs shadow-sky-600/30 ring-2 ring-sky-600/30'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          )}
                          title="Excused"
                        >
                          E
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <input
                        type="text"
                        placeholder="Optional remarks..."
                        value={remarks[student.student_id] || ''}
                        onChange={(e) =>
                          setRemarks((prev) => ({ ...prev, [student.student_id]: e.target.value }))
                        }
                        className="h-8 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Submit Bottom Bar */}
      {rosterData?.roster && rosterData.roster.length > 0 && (
        <div className="sticky bottom-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            {isAlreadySubmitted ? (
              <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> Attendance logged for {attendanceDate}. Re-submitting will update records.
              </span>
            ) : (
              <span>Ready to commit attendance records to database.</span>
            )}
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => submitMutation.mutate()}
            isLoading={submitMutation.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isAlreadySubmitted ? 'Update Attendance Marks' : 'Submit Class Attendance'}
          </Button>
        </div>
      )}
    </div>
  );
}
