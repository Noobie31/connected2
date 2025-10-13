'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function BackButtonHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const backPressCount = useRef(0);
  const backPressTimer = useRef(null);

  useEffect(() => {
    const handlePopState = () => {
      // If coming from dm page, go back to student/teacher
      if (pathname?.includes('/dm/')) {
        router.back();
        return;
      }

      // If on student or teacher page
      if (pathname === '/student' || pathname === '/teacher') {
        backPressCount.current += 1;

        if (backPressCount.current === 1) {
          // First press - do nothing, just show visual feedback if you want
          console.log('First back press on main page');

          // Reset counter after 2 seconds
          if (backPressTimer.current) {
            clearTimeout(backPressTimer.current);
          }
          backPressTimer.current = setTimeout(() => {
            backPressCount.current = 0;
          }, 2000);
        } else if (backPressCount.current >= 2) {
          // Second press - exit app (on mobile PWA, this minimizes the app)
          if (window.history.length <= 1) {
            // If history is empty, exit
            if (typeof window !== 'undefined' && window.navigator.app) {
              window.navigator.app.exitApp(); // Cordova/Capacitor
            } else {
              // For PWA, go to a blank page or minimize
              window.history.back();
            }
          } else {
            window.history.back();
          }
          backPressCount.current = 0;
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (backPressTimer.current) {
        clearTimeout(backPressTimer.current);
      }
    };
  }, [pathname, router]);

  return null;
}