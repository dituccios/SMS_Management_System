'use client';

import React from 'react';
import { cn } from '../../lib/utils';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'featured' | 'accent';
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 auto-rows-fr",
      className
    )}>
      {children}
    </div>
  );
}

export function BentoCard({ 
  children, 
  className, 
  size = 'md',
  variant = 'default'
}: BentoCardProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'col-span-1 row-span-1';
      case 'md':
        return 'col-span-1 md:col-span-1 lg:col-span-2 row-span-1';
      case 'lg':
        return 'col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-3 row-span-2';
      case 'xl':
        return 'col-span-1 md:col-span-2 lg:col-span-4 xl:col-span-6 row-span-2';
      default:
        return 'col-span-1 md:col-span-1 lg:col-span-2 row-span-1';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'featured':
        return 'bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-primary/20';
      case 'accent':
        return 'bg-gradient-to-br from-accent/10 via-accent/5 to-primary/10 border-accent/20';
      default:
        return 'bg-card/50 border-border/50';
    }
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl border backdrop-blur-xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 group",
      getSizeClasses(),
      getVariantClasses(),
      className
    )}>
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
      
      {/* Glow Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-accent/20 blur-xl" />
      </div>
    </div>
  );
}
