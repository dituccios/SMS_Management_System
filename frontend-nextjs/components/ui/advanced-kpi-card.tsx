'use client';

import React, { useState, useRef } from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { cn } from '../../lib/utils';

interface AdvancedKPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  description?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  variant?: 'default' | 'glassmorphic' | 'neumorphic' | 'floating';
  glowColor?: string;
}

export function AdvancedKPICard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-primary',
  trend = 'neutral',
  className,
  description,
  badge,
  badgeVariant = 'secondary',
  variant = 'default',
  glowColor = 'rgba(59, 130, 246, 0.3)'
}: AdvancedKPICardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    setIsHovered(false);
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-emerald-500 dark:text-emerald-400';
      case 'down':
        return 'text-red-500 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return null;
    }
  };

  const getCardVariant = () => {
    switch (variant) {
      case 'glassmorphic':
        return 'card-glassmorphic';
      case 'neumorphic':
        return 'card-neumorphic';
      case 'floating':
        return 'card-floating';
      default:
        return '';
    }
  };

  const TrendIcon = getTrendIcon();

  return (
    <div className="perspective-1000">
      <Card 
        ref={cardRef}
        className={cn(
          "relative overflow-hidden group cursor-pointer transition-all duration-500 transform-3d",
          getCardVariant(),
          isHovered && "shadow-2xl",
          className
        )}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          boxShadow: isHovered 
            ? `0 25px 50px -12px ${glowColor}, 0 0 0 1px rgba(255,255,255,0.1)` 
            : undefined
        }}
      >
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Shimmer Effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div 
            className="absolute inset-0 animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              backgroundSize: '200% 100%'
            }}
          />
        </div>

        <CardContent className="p-6 relative z-10">
          {/* Header with Icon and Badge */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "p-3 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12",
                iconColor,
                "bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-white/20"
              )}>
                <Icon className="h-6 w-6 drop-shadow-sm" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
                {badge && (
                  <Badge 
                    variant={badgeVariant} 
                    className="text-xs animate-pulse-glow"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {badge}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Value Display */}
          <div className="space-y-3">
            <div className="flex items-baseline space-x-3">
              <span className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {value}
              </span>
              {change !== undefined && (
                <div className={cn("flex items-center space-x-1 text-sm font-medium", getTrendColor())}>
                  {TrendIcon && <TrendIcon className="h-4 w-4" />}
                  <span>
                    {change > 0 ? '+' : ''}{change}%
                  </span>
                  {changeLabel && (
                    <span className="text-muted-foreground font-normal">
                      {changeLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 group-hover:animate-shimmer"
              style={{ 
                width: `${Math.abs(change || 0) * 2}%`,
                backgroundSize: '200% 100%'
              }}
            />
          </div>
        </CardContent>

        {/* Floating Particles Effect */}
        {isHovered && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: `${3 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
