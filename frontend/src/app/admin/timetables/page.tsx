'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/query-keys';
import { TimetableCreateInput } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/shared/EmptyState';
import { Calendar, Plus, Trash2, ArrowRight, Layers, Clock } from 'lucide-react';

export default function AdminTimetablesPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterDept, setFilterDept] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [semester, setSemester] = useState('6');
  const [department, setDepartment] = useState('Computer Science');
  const [section, setSection] = useState('A');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: timetables = [], isLoading } = useQuery({
    queryKey: queryKeys.admin.timetables({
      department: filterDept || undefined,
      semester: filterSemester || undefined,
    }),
    queryFn: () =>
      adminService.getTimetables({
        department: filterDept || undefined,
        semester: filterSemester || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: TimetableCreateInput) => adminService.createTimetable(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'timetables'] });
      setIsCreateOpen(false);
      setTitle('');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to create timetable');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteTimetable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'timetables'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    createMutation.mutate({
      title,
      academic_year: academicYear,
      semester,
      department,
      section,
      is_active: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Academic Timetables
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define schedule headers, configure weekly periods, and manage enrolled rosters
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Timetable
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Filter by Department..."
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          />
        </div>
        <div className="w-36">
          <Input
            placeholder="Semester (e.g. 6)"
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
          />
        </div>
        {(filterDept || filterSemester) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterDept('');
              setFilterSemester('');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : timetables.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Timetables Found"
          description="Create an academic schedule header to start adding classes and period slots."
          actionLabel="Create First Timetable"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {timetables.map((tt) => (
            <Card key={tt.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Badge variant={tt.is_active ? 'success' : 'secondary'} size="sm">
                      {tt.is_active ? 'Active' : 'Archived'}
                    </Badge>
                    <CardTitle className="text-base mt-2">{tt.title}</CardTitle>
                    <CardDescription>{tt.department}</CardDescription>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete timetable "${tt.title}"? This will cascade to all period slots.`)) {
                        deleteMutation.mutate(tt.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete Timetable"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Year</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{tt.academic_year}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Sem</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Sem {tt.semester}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Section</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Sec {tt.section}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Link href={`/admin/timetables/${tt.id}`}>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span>Manage Weekly Periods</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Timetable Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Timetable Header"
        description="Specify cohort, semester, and department schedule details"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {errorMsg && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              {errorMsg}
            </div>
          )}

          <Input
            label="Timetable Title"
            placeholder="e.g. CSE 6th Semester 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Academic Year"
              placeholder="2026-2027"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              required
            />
            <Input
              label="Semester"
              placeholder="6"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
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
              label="Section"
              placeholder="A"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={createMutation.isPending}>
              Create Timetable
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
