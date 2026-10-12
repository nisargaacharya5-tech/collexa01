'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Building2, LogOut, User as UserIcon } from 'lucide-react';

export function Navbar() {
  const { user, tenant, logout } = useAuth();

  const roleColors = {
    ADMIN: 'primary',
    FACULTY: 'success',
    STUDENT: 'info',
  } as const;

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center gap-4">
        {/* Tenant College Badge */}
        {tenant ? (
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700">
            <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold">{tenant.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">({tenant.code})</span>
          </div>
        ) : (
          <span className="text-xs font-semibold text-slate-400">Colexa Portal</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <>
            <div className="flex items-center gap-2 text-right hidden sm:flex">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user.full_name}</p>
                <p className="text-[11px] text-slate-500 font-mono">{user.email}</p>
              </div>
            </div>

            <Badge variant={roleColors[user.role] || 'secondary'} size="sm">
              {user.role}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
