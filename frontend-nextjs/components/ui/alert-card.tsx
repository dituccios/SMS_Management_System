'use client';

import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, Clock, LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { cn } from '../../lib/utils';

interface AlertCardProps {
  id: string | number;
  type: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK' | 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  title: string;
  description: string;
  timestamp: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actionable?: boolean;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const alertConfig = {
  HIGH_RISK: {
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800',
    badgeVariant: 'destructive' as const
  },
  MEDIUM_RISK: {
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    badgeVariant: 'secondary' as const
  },
  LOW_RISK: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    badgeVariant: 'secondary' as const
  },
  INFO: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    badgeVariant: 'secondary' as const
  },
  SUCCESS: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200 dark:border-green-800',
    badgeVariant: 'secondary' as const
  },
  WARNING: {
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    badgeVariant: 'secondary' as const
  },
  ERROR: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800',
    badgeVariant: 'destructive' as const
  }
};

const severityConfig = {
  LOW: { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900' },
  MEDIUM: { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900' },
  HIGH: { color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900' },
  CRITICAL: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900' }
};

export function AlertCard({
  id,
  type,
  title,
  description,
  timestamp,
  severity,
  actionable = false,
  onAction,
  onDismiss,
  className
}: AlertCardProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200 hover:shadow-md",
      config.bgColor,
      config.borderColor,
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={cn("p-2 rounded-lg", config.color, "bg-white/50 dark:bg-black/20")}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {title}
                </h3>
                {severity && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      severityConfig[severity].color,
                      severityConfig[severity].bg
                    )}
                  >
                    {severity}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          </div>
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{timestamp}</span>
          </div>
          
          {actionable && onAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAction}
              className="h-7 text-xs"
            >
              Take Action
            </Button>
          )}
        </div>
      </CardContent>
      
      {/* Accent border */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", config.color.replace('text-', 'bg-'))} />
    </Card>
  );
}
