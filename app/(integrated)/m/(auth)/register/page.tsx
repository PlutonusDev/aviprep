'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StandaloneRegisterRedirect() {
  const router = useRouter();

  useEffect(() => {
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone;

    if (isStandalone) {
      const registerUrl = window.location.origin + '/register';
      window.open(registerUrl, '_blank', 'noopener,noreferrer');

      router.replace('/m/login');
    } else {
      router.replace('/register');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Opening registration in your browser...</p>
    </div>
  );
}