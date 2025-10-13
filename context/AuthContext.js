'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check session on app load
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // List of pages that don't require auth
        const authLessPages = ['/login', '/password', '/error', '/coordinator',  '/check-email', '/passrst'];
        const isAuthLessPage = authLessPages.some(page => pathname?.includes(page));

        if (session?.user) {
          setUser(session.user);
          // If user is logged in but on login page, redirect to dashboard
          if (pathname === '/login' || pathname?.includes('/password')) {
            router.push('/student');
          }
        } else {
          setUser(null);
          // If not logged in and not on an auth-less page, redirect to login
          if (!isAuthLessPage) {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        // Only redirect to login if user manually logged out
        if (event === 'SIGNED_OUT') {
          router.push('/login');
        }
      }
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, [pathname, router]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}