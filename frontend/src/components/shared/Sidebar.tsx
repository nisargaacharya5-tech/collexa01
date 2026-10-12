'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Bell,
  Users,
  GraduationCap,
  ClipboardCheck,
  Clock,
  BookOpen,
  School,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const adminNav = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Timetables', href: '/admin/timetables', icon: Calendar },
    { name: 'Notices', href: '/admin/notices', icon: Bell },
    { name: 'Faculty Directory', href: '/admin/faculty', icon: Users },
    { name: 'Students Directory', href: '/admin/students', icon: GraduationCap },
    { name: 'Attendance Audits', href: '/admin/attendance', icon: ClipboardCheck },
  ];

  const facultyNav = [
    { name: 'Dashboard', href: '/faculty/dashboard', icon: LayoutDashboard },
    { name: 'Teaching Timetable', href: '/faculty/timetable', icon: Calendar },
    { name: 'My Attendance Logs', href: '/faculty/attendance', icon: Clock },
    { name: 'Circulars & Notices', href: '/faculty/notices', icon: Bell },
  ];

  const studentNav = [
    { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Weekly Timetable', href: '/student/timetable', icon: Calendar },
    { name: 'Attendance & Courses', href: '/student/attendance', icon: BookOpen },
    { name: 'Notice Board', href: '/student/notices', icon: Bell },
  ];

  const navItems =
    user.role === 'ADMIN'
      ? adminNav
      : user.role === 'FACULTY'
      ? facultyNav
      : studentNav;

  return (
    <aside className="w-64 border-r border-slate-200/80 bg-white p-5 flex flex-col justify-between dark:border-slate-800 dark:bg-slate-900 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Brand header */}
        <div className="flex items-center gap-3 px-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <School className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Collexa</span>
            <span className="block text-[10px] font-semibold tracking-wider text-indigo-600 uppercase">Enterprise</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          <p className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {user.role} Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== `/${user.role.toLowerCase()}/dashboard` && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs dark:bg-indigo-950/40 dark:text-indigo-400'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400')} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer info */}
      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
        <p className="font-semibold text-slate-700 dark:text-slate-300">Collexa Multi-Tenant</p>
        <p className="text-[11px] text-slate-400">Strict Data Isolation Active</p>
      </div>
    </aside>
  );
}
