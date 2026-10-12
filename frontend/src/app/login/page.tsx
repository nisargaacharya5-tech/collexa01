'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { collegesService } from '@/services/colleges.service';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { queryKeys } from '@/lib/query-keys';
import { College } from '@/types';
import { School, ShieldAlert, Sparkles, User, GraduationCap, Briefcase } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password@123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch active colleges from backend discovery endpoint
  const { data: colleges = [], isLoading: isLoadingColleges } = useQuery({
    queryKey: queryKeys.colleges.list,
    queryFn: () => collegesService.listActiveColleges(),
  });

  useEffect(() => {
    if (colleges.length > 0 && !selectedCollegeId) {
      setSelectedCollegeId(colleges[0].id);
    }
  }, [colleges, selectedCollegeId]);

  const activeCollege = colleges.find((c) => c.id === selectedCollegeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedCollegeId) {
      setErrorMsg('Please select a college tenant to proceed.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.login({
        email,
        password,
        college_id: selectedCollegeId,
      });

      if (activeCollege) {
        login(response.access_token, response.user, activeCollege);
      }

      // Role based routing
      if (response.user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (response.user.role === 'FACULTY') {
        router.push('/faculty/dashboard');
      } else if (response.user.role === 'STUDENT') {
        router.push('/student/dashboard');
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || 'Failed to authenticate';
      setErrorMsg(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = (role: 'ADMIN' | 'FACULTY' | 'STUDENT') => {
    setErrorMsg(null);
    if (role === 'ADMIN') {
      setEmail('admin@apex.edu');
      setPassword('Password@123');
    } else if (role === 'FACULTY') {
      setEmail('fac.sharma@apex.edu');
      setPassword('Password@123');
    } else if (role === 'STUDENT') {
      setEmail('stu.aarav.sharma@apex.edu');
      setPassword('Password@123');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Left decorative column */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent_70%)]" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <School className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Collexa</h1>
            <p className="text-xs text-indigo-300">College Management Enterprise Portal</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md border border-indigo-400/20">
            <Sparkles className="w-3.5 h-3.5" /> Multi-Tenant Row-Level Security
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            Institutional workflows with hardware-level data isolation.
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Manage course timetables, track real-time faculty and student attendance, broadcast circular notices, and audit operations across academic departments.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-6">
          <span>Colexa System v1.0</span>
          <span>FastAPI + PostgreSQL RLS + Next.js</span>
        </div>
      </div>

      {/* Right form column */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Institutional Sign In
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Select your college tenant and enter your account credentials
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* College Tenant Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Institutional College (Tenant)
              </label>
              {isLoadingColleges ? (
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
              ) : (
                <select
                  value={selectedCollegeId}
                  onChange={(e) => setSelectedCollegeId(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code.toUpperCase()})
                    </option>
                  ))}
                </select>
              )}
              {activeCollege && (
                <p className="text-[11px] text-slate-500 font-mono">
                  Tenant Isolation Context: {activeCollege.code}.colexa.edu
                </p>
              )}
            </div>

            {/* Email */}
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. admin@apex.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {/* Password */}
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full mt-2"
            >
              Sign In to Portal
            </Button>
          </form>

          {/* Quick Demo Credentials Helpers */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
              Quick Test Credentials (Apex Institute Seed DB)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoCredentials('ADMIN')}
                className="flex flex-col items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50/60 p-2 text-center text-xs font-medium text-indigo-700 hover:bg-indigo-100/70 transition-colors"
              >
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('FACULTY')}
                className="flex flex-col items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50/60 p-2 text-center text-xs font-medium text-emerald-700 hover:bg-emerald-100/70 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Faculty</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('STUDENT')}
                className="flex flex-col items-center gap-1 rounded-lg border border-sky-100 bg-sky-50/60 p-2 text-center text-xs font-medium text-sky-700 hover:bg-sky-100/70 transition-colors"
              >
                <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
                <span>Student</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Password preset: <span className="font-mono text-slate-600 dark:text-slate-300">Password@123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
