'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  const items = React.Children.toArray(children);

  return (
    <div className={cn('space-y-3', className)}>
      {items.map((item, index) => (
        <div
          key={index}
          className="transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-2"
          style={{
            animationDelay: `${index * 60}ms`,
            animationFillMode: 'both',
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
