'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/query-keys';
import { FacultyAttendanceAuditRecord, StudentAttendanceAuditRecord } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate, cn } from '@/lib/utils';
import {
  ClipboardCheck,
  Calendar,
  Users,
  GraduationCap,
  Clock,
  Edit,
  Search,
} from 'lucide-react';

export default function AdminAttendancePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'FACULTY' | 'STUDENT'>('FACULTY');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Override Faculty State
  const [editingFacultyLog, setEditingFacultyLog] = useState<FacultyAttendanceAuditRecord | null>(null);
  const [facultyStatus, setFacultyStatus] = useState<string>('PRESENT');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');

  // Override Student State
  const [editingStudentLog, setEditingStudentLog] = useState<StudentAttendanceAuditRecord | null>(null);
  const [studentStatus, setStudentStatus] = useState<string>('PRESENT');
  const [studentRemarks, setStudentRemarks] = useState('');

  // Fetch Faculty logs
  const { data: facultyLogs = [], isLoading: isLoadingFaculty } = useQuery({
    queryKey: queryKeys.admin.facultyAttendance({ date: selectedDate }),
    queryFn: () => adminService.getFacultyAttendanceAudit({ date: selectedDate }),
    enabled: activeTab === 'FACULTY',
  });

  // Fetch Student logs
  const { data: studentLogs = [], isLoading: isLoadingStudent } = useQuery({
    queryKey: queryKeys.admin.studentAttendance({ date: selectedDate }),
    queryFn: () => adminService.getStudentAttendanceAudit({ date: selectedDate }),
    enabled: activeTab === 'STUDENT',
  });

  const overrideFacultyMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      adminService.overrideFacultyAttendance(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'attendance', 'faculty'] });
      setEditingFacultyLog(null);
    },
  });

  const overrideStudentMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      adminService.overrideStudentAttendance(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'attendance', 'students'] });
      setEditingStudentLog(null);
    },
  });

  const openFacultyOverride = (log: FacultyAttendanceAuditRecord) => {
    setEditingFacultyLog(log);
    setFacultyStatus(log.status);
    setCheckInTime(log.check_in_time || '09:00');
    setCheckOutTime(log.check_out_time || '17:00');
  };

  const openStudentOverride = (log: StudentAttendanceAuditRecord) => {
    setEditingStudentLog(log);
    setStudentStatus(log.status);
    setStudentRemarks(log.remarks || '');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Attendance Audit & Overrides
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Audit institutional check-ins and scheduled class attendance marks
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('FACULTY')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer',
            activeTab === 'FACULTY'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400'
          )}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Faculty Check-Ins ({facultyLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('STUDENT')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer',
            activeTab === 'STUDENT'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400'
          )}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Student Class Logs ({studentLogs.length})</span>
        </button>
      </div>

      {/* Faculty Logs View */}
      {activeTab === 'FACULTY' && (
        <>
          {isLoadingFaculty ? (
            <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ) : facultyLogs.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title={`No Faculty Check-Ins for ${selectedDate}`}
              description="Faculty members record self-attendance upon arriving on campus."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/75 uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Faculty Member</th>
                    <th className="px-5 py-3.5 font-semibold">Employee ID</th>
                    <th className="px-5 py-3.5 font-semibold">Department</th>
                    <th className="px-5 py-3.5 font-semibold">Check-In</th>
                    <th className="px-5 py-3.5 font-semibold">Check-Out</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {facultyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                        {log.faculty_name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                        {log.employee_id}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{log.department}</td>
                      <td className="px-5 py-3.5 font-mono text-emerald-600">
                        {log.check_in_time ? String(log.check_in_time).slice(0, 5) : '—'}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-500">
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
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openFacultyOverride(log)}
                          className="gap-1 text-xs"
                        >
                          <Edit className="w-3.5 h-3.5" /> Override
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Student Logs View */}
      {activeTab === 'STUDENT' && (
        <>
          {isLoadingStudent ? (
            <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ) : studentLogs.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title={`No Student Class Records for ${selectedDate}`}
              description="Student class attendance is submitted by assigned faculty per timetable slot."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/75 uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Student Name / USN</th>
                    <th className="px-5 py-3.5 font-semibold">Course Subject</th>
                    <th className="px-5 py-3.5 font-semibold">Evaluated By Faculty</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold">Remarks</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {studentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">{log.student_name}</div>
                        <div className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                          {log.enrollment_no}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{log.subject_name}</div>
                        <div className="font-mono text-[11px] text-slate-400">{log.subject_code}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{log.faculty_name}</td>
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
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStudentOverride(log)}
                          className="gap-1 text-xs"
                        >
                          <Edit className="w-3.5 h-3.5" /> Override
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Override Faculty Modal */}
      {editingFacultyLog && (
        <Modal
          isOpen={!!editingFacultyLog}
          onClose={() => setEditingFacultyLog(null)}
          title={`Override Attendance: ${editingFacultyLog.faculty_name}`}
          description={`Date: ${editingFacultyLog.date} • Employee ID: ${editingFacultyLog.employee_id}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              overrideFacultyMutation.mutate({
                id: editingFacultyLog.id,
                payload: {
                  status: facultyStatus,
                  check_in_time: checkInTime.length === 5 ? `${checkInTime}:00` : checkInTime,
                  check_out_time: checkOutTime.length === 5 ? `${checkOutTime}:00` : checkOutTime,
                },
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Attendance Status
              </label>
              <select
                value={facultyStatus}
                onChange={(e) => setFacultyStatus(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="PRESENT">PRESENT</option>
                <option value="ABSENT">ABSENT</option>
                <option value="ON_LEAVE">ON_LEAVE</option>
                <option value="HALF_DAY">HALF_DAY</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Check In Time"
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
              />
              <Input
                label="Check Out Time"
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingFacultyLog(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={overrideFacultyMutation.isPending}>
                Save Override
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Override Student Modal */}
      {editingStudentLog && (
        <Modal
          isOpen={!!editingStudentLog}
          onClose={() => setEditingStudentLog(null)}
          title={`Override Student Record: ${editingStudentLog.student_name}`}
          description={`Course: ${editingStudentLog.subject_name} • USN: ${editingStudentLog.enrollment_no}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              overrideStudentMutation.mutate({
                id: editingStudentLog.id,
                payload: {
                  status: studentStatus,
                  remarks: studentRemarks,
                },
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Attendance Status
              </label>
              <select
                value={studentStatus}
                onChange={(e) => setStudentStatus(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="PRESENT">PRESENT</option>
                <option value="ABSENT">ABSENT</option>
                <option value="LATE">LATE</option>
                <option value="EXCUSED">EXCUSED</option>
              </select>
            </div>

            <Input
              label="Administrative Remarks / Justification"
              placeholder="e.g. Medical excuse verified by principal"
              value={studentRemarks}
              onChange={(e) => setStudentRemarks(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingStudentLog(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={overrideStudentMutation.isPending}>
                Save Student Override
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
