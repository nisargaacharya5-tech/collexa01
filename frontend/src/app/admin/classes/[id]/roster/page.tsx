'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/query-keys';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import {
  Users,
  UserPlus,
  Trash2,
  ArrowLeft,
  GraduationCap,
  Search,
} from 'lucide-react';

export default function AdminClassRosterPage() {
  const params = useParams();
  const classId = params.id as string;
  const queryClient = useQueryClient();

  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch roster
  const { data: roster = [], isLoading: isLoadingRoster } = useQuery({
    queryKey: queryKeys.admin.classRoster(classId),
    queryFn: () => adminService.getClassRoster(classId),
  });

  // Fetch student directory for enrollment selector
  const { data: studentList = [] } = useQuery({
    queryKey: queryKeys.admin.studentList(),
    queryFn: () => adminService.getStudentList(),
  });

  const enrollMutation = useMutation({
    mutationFn: (studentId: string) => adminService.enrollStudent(classId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.classRoster(classId) });
      setIsEnrollOpen(false);
      setSelectedStudentId('');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to enroll student');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (studentId: string) => adminService.removeStudentFromRoster(classId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.classRoster(classId) });
    },
  });

  const handleEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId && studentList.length > 0) {
      setSelectedStudentId(studentList[0].id);
    }
    enrollMutation.mutate(selectedStudentId || studentList[0]?.id);
  };

  const filteredRoster = roster.filter((item) => {
    const s = item.student;
    if (!s) return false;
    const term = searchFilter.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(term) ||
      s.enrollment_no.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()}>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Class Roster & Enrollment
              </h1>
              <Badge variant="primary" size="sm">
                {roster.length} Enrolled
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Class Period ID: {classId.slice(0, 8)}...
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setErrorMsg(null);
            if (!selectedStudentId && studentList.length > 0) {
              setSelectedStudentId(studentList[0].id);
            }
            setIsEnrollOpen(true);
          }}
          className="gap-1.5"
        >
          <UserPlus className="w-4 h-4" /> Enroll Student
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter roster by student name, USN, or email..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        />
      </div>

      {/* Roster Table */}
      {isLoadingRoster ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      ) : filteredRoster.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No Students Enrolled"
          description="Enroll students into this class period to enable attendance tracking."
          actionLabel="Enroll First Student"
          onAction={() => setIsEnrollOpen(true)}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3.5 font-semibold">USN / Enrollment</th>
                <th className="px-5 py-3.5 font-semibold">Student Name</th>
                <th className="px-5 py-3.5 font-semibold">Department</th>
                <th className="px-5 py-3.5 font-semibold">Batch / Sec</th>
                <th className="px-5 py-3.5 font-semibold">Enrolled On</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRoster.map((item) => {
                const s = item.student;
                if (!s) return null;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3.5 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                      {s.enrollment_no}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{s.full_name}</div>
                      <div className="text-[11px] text-slate-400">{s.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{s.department}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {s.batch_year} - Sec {s.section}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">{formatDate(item.enrolled_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${s.full_name} (${s.enrollment_no}) from this class roster?`)) {
                            removeMutation.mutate(s.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove Student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Enroll Student Modal */}
      <Modal
        isOpen={isEnrollOpen}
        onClose={() => setIsEnrollOpen(false)}
        title="Enroll Student in Class"
        description="Select an active student profile from your college directory"
      >
        <form onSubmit={handleEnroll} className="space-y-4">
          {errorMsg && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Student Profile
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              required
            >
              {studentList.map((stu) => (
                <option key={stu.id} value={stu.id}>
                  {stu.user.full_name} — {stu.enrollment_no} ({stu.department})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEnrollOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={enrollMutation.isPending}>
              Confirm Enrollment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
