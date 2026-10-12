'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services/student.service';
import { queryKeys } from '@/lib/query-keys';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import { Bell } from 'lucide-react';

export default function StudentNoticesPage() {
  const { data: notices = [], isLoading } = useQuery({
    queryKey: queryKeys.student.notices,
    queryFn: () => studentService.getNotices(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Student Notices & Campus Bulletins
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Official institutional circulars, academic notices, and student bulletins
        </p>
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
          title="No Student Notices Found"
          description="Institutional announcements will be listed here once published."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {notices.map((notice) => (
            <Card key={notice.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge variant={notice.target_role === 'ALL' ? 'primary' : 'info'} size="sm">
                    {notice.target_role === 'ALL' ? 'Campus Wide' : 'Student Circular'}
                  </Badge>
                  <span className="text-[11px] text-slate-400">
                    {formatDate(notice.published_at || notice.created_at)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {notice.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {notice.content}
                </p>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
                <span>By: {notice.creator?.full_name || 'Academic Council'}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
