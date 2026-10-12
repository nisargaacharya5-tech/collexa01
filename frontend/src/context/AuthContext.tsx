'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { College, UserProfile, UserRole } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthContextType {
  user: UserProfile | null;
  tenant: College | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserProfile, college: College) => void;
  logout: () => Promise<void>;
  setTenantOnly: (college: College) => void;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<College | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Rehydrate session from localStorage
    try {
      const storedToken = localStorage.getItem('colexa_access_token');
      const storedUser = localStorage.getItem('colexa_user');
      const storedTenant = localStorage.getItem('colexa_college');

      if (storedToken) setToken(storedToken);
      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedTenant) setTenant(JSON.parse(storedTenant));
    } catch (e) {
      console.error('Failed to parse cached auth state:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (jwtToken: string, userProfile: UserProfile, college: College) => {
    setToken(jwtToken);
    setUser(userProfile);
    setTenant(college);

    localStorage.setItem('colexa_access_token', jwtToken);
    localStorage.setItem('colexa_user', JSON.stringify(userProfile));
    localStorage.setItem('colexa_college', JSON.stringify(college));
    localStorage.setItem('colexa_college_id', college.id);
  };

  const setTenantOnly = (college: College) => {
    setTenant(college);
    localStorage.setItem('colexa_college', JSON.stringify(college));
    localStorage.setItem('colexa_college_id', college.id);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('colexa_access_token');
      localStorage.removeItem('colexa_user');
      router.push('/login');
    }
  };

  const hasRole = (role: UserRole) => user?.role === role;

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        token,
        isLoading,
        login,
        logout,
        setTenantOnly,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
