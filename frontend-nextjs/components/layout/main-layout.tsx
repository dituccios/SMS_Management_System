'use client';

import React from 'react';
import { Navigation } from './navigation';
import { Header } from './header';
import { AnimatedBackground } from '../ui/animated-background';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <div className="lg:pl-72 relative z-10">
        {/* Header */}
        <Header title={title} subtitle={subtitle} />

        {/* Page Content */}
        <main className="flex-1">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
