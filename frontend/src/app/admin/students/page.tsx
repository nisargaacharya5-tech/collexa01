'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/query-keys';
import { StudentCreateInput } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import {
  GraduationCap,
  UserPlus,
  Search,
  BookOpen,
} from 'lucide-react';

export default function AdminStudentsPage() {
  const queryClient = useQueryClient();
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password@123');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [batchYear, setBatchYear] = useState('2026');
  const [section, setSection] = useState('A');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: studentList = [], isLoading } = useQuery({
    queryKey: queryKeys.admin.studentList(),
    queryFn: () => adminService.getStudentList(),
  });

  const provisionMutation = useMutation({
    mutationFn: (payload: StudentCreateInput) => adminService.createStudent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.studentList() });
      setIsProvisionOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to provision student');
    },
  });

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('Password@123');
    setEnrollmentNo('');
    setErrorMsg(null);
  };

  const handleProvision = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    provisionMutation.mutate({
      full_name: fullName,
      email,
      password,
      enrollment_no: enrollmentNo,
      department,
      batch_year: batchYear,
      section,
    });
  };

  const filteredStudents = studentList.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.user.full_name.toLowerCase().includes(term) ||
      s.enrollment_no.toLowerCase().includes(term) ||
      s.department.toLowerCase().includes(term) ||
      s.user.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Student Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Audit institutional student enrollments, cohort assignments, and credentials
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            resetForm();
            setIsProvisionOpen(true);
          }}
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" /> Provision Student
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by student name, USN/enrollment, department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        />
      </div>

      {/* Directory Table */}
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No Students Found"
          description="Provision student accounts to populate cohorts and class rosters."
          actionLabel="Provision Student"
          onAction={() => {
            resetForm();
            setIsProvisionOpen(true);
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3.5 font-semibold">USN / Enrollment</th>
                <th className="px-5 py-3.5 font-semibold">Student Name</th>
                <th className="px-5 py-3.5 font-semibold">Department</th>
                <th className="px-5 py-3.5 font-semibold">Cohort Batch</th>
                <th className="px-5 py-3.5 font-semibold">Section</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3.5 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                    {s.enrollment_no}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900 dark:text-white">{s.user.full_name}</div>
                    <div className="text-[11px] text-slate-400">{s.user.email}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{s.department}</td>
                  <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{s.batch_year}</td>
                  <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-semibold">Sec {s.section}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={s.user.is_active ? 'success' : 'secondary'} size="sm">
                      {s.user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">{formatDate(s.user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Provision Student Modal */}
      <Modal
        isOpen={isProvisionOpen}
        onClose={() => setIsProvisionOpen(false)}
        title="Provision Student Account"
        description="Creates student credentials and institutional academic record"
      >
        <form onSubmit={handleProvision} className="space-y-4">
          {errorMsg && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              {errorMsg}
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="e.g. Aarav Sharma"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. stu.aarav@apex.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Enrollment / USN Number"
              placeholder="e.g. 1AP26CS042"
              value={enrollmentNo}
              onChange={(e) => setEnrollmentNo(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Department"
              placeholder="Computer Science"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            />
            <Input
              label="Batch Year"
              placeholder="2026"
              value={batchYear}
              onChange={(e) => setBatchYear(e.target.value)}
              required
            />
            <Input
              label="Section"
              placeholder="A"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              required
            />
          </div>

          <Input
            label="Initial Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsProvisionOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={provisionMutation.isPending}>
              Create Student Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
