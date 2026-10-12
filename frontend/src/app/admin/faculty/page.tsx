'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/query-keys';
import { FacultyCreateInput } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import {
  Users,
  UserPlus,
  Search,
  Briefcase,
  Mail,
  Building,
} from 'lucide-react';

export default function AdminFacultyPage() {
  const queryClient = useQueryClient();
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password@123');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [designation, setDesignation] = useState('Associate Professor');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: facultyList = [], isLoading } = useQuery({
    queryKey: queryKeys.admin.facultyList(),
    queryFn: () => adminService.getFacultyList(),
  });

  const provisionMutation = useMutation({
    mutationFn: (payload: FacultyCreateInput) => adminService.createFaculty(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.facultyList() });
      setIsProvisionOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to provision faculty');
    },
  });

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('Password@123');
    setEmployeeId('');
    setErrorMsg(null);
  };

  const handleProvision = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    provisionMutation.mutate({
      full_name: fullName,
      email,
      password,
      employee_id: employeeId,
      department,
      designation,
    });
  };

  const filteredFaculty = facultyList.filter((f) => {
    const term = searchTerm.toLowerCase();
    return (
      f.user.full_name.toLowerCase().includes(term) ||
      f.employee_id.toLowerCase().includes(term) ||
      f.department.toLowerCase().includes(term) ||
      f.user.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Faculty Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage institutional teaching staff, departmental roles, and authentication credentials
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
          <UserPlus className="w-4 h-4" /> Provision Faculty
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by faculty name, employee ID, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        />
      </div>

      {/* Directory Table */}
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      ) : filteredFaculty.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Faculty Members Found"
          description="Provision teaching staff profiles into your college database."
          actionLabel="Provision Faculty"
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
                <th className="px-5 py-3.5 font-semibold">Employee ID</th>
                <th className="px-5 py-3.5 font-semibold">Faculty Name</th>
                <th className="px-5 py-3.5 font-semibold">Department</th>
                <th className="px-5 py-3.5 font-semibold">Designation</th>
                <th className="px-5 py-3.5 font-semibold">Account Status</th>
                <th className="px-5 py-3.5 font-semibold">Registered On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFaculty.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3.5 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                    {f.employee_id}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900 dark:text-white">{f.user.full_name}</div>
                    <div className="text-[11px] text-slate-400">{f.user.email}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{f.department}</td>
                  <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{f.designation}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={f.user.is_active ? 'success' : 'secondary'} size="sm">
                      {f.user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">{formatDate(f.user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Provision Faculty Modal */}
      <Modal
        isOpen={isProvisionOpen}
        onClose={() => setIsProvisionOpen(false)}
        title="Provision Faculty Account"
        description="Creates a base user account and institutional teaching profile"
      >
        <form onSubmit={handleProvision} className="space-y-4">
          {errorMsg && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              {errorMsg}
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="e.g. Dr. Meera Rao"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. fac.rao@apex.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Employee ID"
              placeholder="e.g. FAC-CSE-007"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Department"
              placeholder="Computer Science"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            />
            <Input
              label="Designation"
              placeholder="Professor"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
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
              Create Faculty Profile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
