'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/query-keys';
import { Notice, NoticeCreateInput } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import {
  Bell,
  Plus,
  Trash2,
  Edit2,
  Send,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export default function AdminNoticesPage() {
  const queryClient = useQueryClient();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<'ALL' | 'FACULTY' | 'STUDENT'>('ALL');
  const [isPublished, setIsPublished] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Queries
  const { data: notices = [], isLoading } = useQuery({
    queryKey: queryKeys.admin.notices(),
    queryFn: () => adminService.getNotices(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: NoticeCreateInput) => adminService.createNotice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] });
      setIsComposeOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to create notice');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      adminService.updateNotice(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] });
      setEditingNotice(null);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to update notice');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteNotice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] });
    },
  });

  const resetForm = () => {
    setTitle('');
    setContent('');
    setTargetRole('ALL');
    setIsPublished(true);
    setErrorMsg(null);
  };

  const openEdit = (n: Notice) => {
    setEditingNotice(n);
    setTitle(n.title);
    setContent(n.content);
    setTargetRole(n.target_role as any);
    setIsPublished(n.is_published);
    setErrorMsg(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingNotice) {
      updateMutation.mutate({
        id: editingNotice.id,
        payload: { title, content, target_role: targetRole, is_published: isPublished },
      });
    } else {
      createMutation.mutate({
        title,
        content,
        target_role: targetRole,
        is_published: isPublished,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Campus Circulars & Notices
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Publish institutional notifications, academic circulars, and departmental memos
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            resetForm();
            setIsComposeOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Compose Notice
        </Button>
      </div>

      {/* Notices Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Notices Published"
          description="Broadcast campus-wide notices or target faculty and student cohorts specifically."
          actionLabel="Publish First Notice"
          onAction={() => {
            resetForm();
            setIsComposeOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {notices.map((n) => (
            <Card key={n.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        n.target_role === 'ALL'
                          ? 'primary'
                          : n.target_role === 'FACULTY'
                          ? 'warning'
                          : 'info'
                      }
                      size="sm"
                    >
                      Target: {n.target_role}
                    </Badge>
                    <Badge variant={n.is_published ? 'success' : 'secondary'} size="sm">
                      {n.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(n)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Edit Notice"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete notice "${n.title}"?`)) {
                          deleteMutation.mutate(n.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete Notice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{n.title}</h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {n.content}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
                <span>By: {n.creator?.full_name || 'Administrator'}</span>
                <span>{formatDate(n.published_at || n.created_at)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Compose / Edit Modal */}
      <Modal
        isOpen={isComposeOpen || !!editingNotice}
        onClose={() => {
          setIsComposeOpen(false);
          setEditingNotice(null);
        }}
        title={editingNotice ? 'Edit Circular Notice' : 'Compose Institutional Notice'}
        description="Broadcast circular to campus agents with role targeting"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {errorMsg && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              {errorMsg}
            </div>
          )}

          <Input
            label="Notice Title"
            placeholder="e.g. End Semester Exam Schedule 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Target Audience
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as any)}
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Campus Agents (Faculty & Students)</option>
              <option value="FACULTY">Faculty Members Only</option>
              <option value="STUDENT">Students Only</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Notice Content
            </label>
            <textarea
              rows={5}
              placeholder="Write the full circular announcement..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_published"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_published" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Publish immediately to target audience
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsComposeOpen(false);
                setEditingNotice(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingNotice ? 'Update Notice' : 'Broadcast Notice'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
