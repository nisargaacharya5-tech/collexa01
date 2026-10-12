'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export function BlurText({ text, className, delay = 50 }: BlurTextProps) {
  const [isRendered, setIsRendered] = useState(false);
  const words = text.split(' ');

  useEffect(() => {
    const timer = setTimeout(() => setIsRendered(true), 20);
    return () => clearTimeout(timer);
  }, []);

  return (
    <span className={cn('inline-flex flex-wrap gap-x-1.5', className)}>
      {words.map((word, idx) => (
        <span
          key={`${word}-${idx}`}
          className="inline-block transition-all duration-700 ease-out"
          style={{
            filter: isRendered ? 'blur(0px)' : 'blur(8px)',
            opacity: isRendered ? 1 : 0,
            transform: isRendered ? 'translateY(0)' : 'translateY(6px)',
            transitionDelay: `${idx * delay}ms`,
          }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
