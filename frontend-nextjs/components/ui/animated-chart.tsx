'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from '../../lib/utils';

interface AnimatedChartProps {
  title: string;
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
  className?: string;
}

export function AnimatedChart({ 
  title, 
  data, 
  labels, 
  color = '#3b82f6',
  height = 200,
  className 
}: AnimatedChartProps) {
  const [animatedData, setAnimatedData] = useState<number[]>(new Array(data.length).fill(0));
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      setAnimatedData(data);
    }, 300);

    return () => clearTimeout(timer);
  }, [data]);

  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue;

  const getBarHeight = (value: number) => {
    if (range === 0) return 50;
    return ((value - minValue) / range) * 80 + 10;
  };

  const getGradientId = (index: number) => `gradient-${index}`;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height }}>
          <svg width="100%" height="100%" className="overflow-visible">
            <defs>
              {animatedData.map((_, index) => (
                <linearGradient
                  key={index}
                  id={getGradientId(index)}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.2" />
                </linearGradient>
              ))}
            </defs>
            
            {/* Animated Bars */}
            {animatedData.map((value, index) => {
              const barWidth = 100 / animatedData.length;
              const x = (index * barWidth) + (barWidth * 0.1);
              const barHeight = getBarHeight(value);
              const y = 100 - barHeight;
              
              return (
                <g key={index}>
                  {/* Bar */}
                  <rect
                    x={`${x}%`}
                    y={`${y}%`}
                    width={`${barWidth * 0.8}%`}
                    height={`${barHeight}%`}
                    fill={`url(#${getGradientId(index)})`}
                    rx="4"
                    className="transition-all duration-1000 ease-out hover:opacity-80"
                    style={{
                      transformOrigin: 'bottom',
                      animation: isVisible ? `slideUp 1s ease-out ${index * 0.1}s both` : 'none'
                    }}
                  />
                  
                  {/* Glow Effect */}
                  <rect
                    x={`${x}%`}
                    y={`${y}%`}
                    width={`${barWidth * 0.8}%`}
                    height={`${barHeight}%`}
                    fill={color}
                    rx="4"
                    className="opacity-0 hover:opacity-20 transition-opacity duration-300"
                    filter="blur(8px)"
                  />
                  
                  {/* Value Label */}
                  <text
                    x={`${x + (barWidth * 0.4)}%`}
                    y={`${y - 2}%`}
                    textAnchor="middle"
                    className="text-xs fill-current text-muted-foreground font-medium"
                    style={{
                      animation: isVisible ? `fadeIn 0.5s ease-out ${index * 0.1 + 0.5}s both` : 'none'
                    }}
                  >
                    {value}
                  </text>
                </g>
              );
            })}
            
            {/* Animated Line */}
            <path
              d={`M ${animatedData.map((value, index) => {
                const x = (index * (100 / animatedData.length)) + ((100 / animatedData.length) * 0.5);
                const y = 100 - getBarHeight(value);
                return `${x} ${y}`;
              }).join(' L ')}`}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-60"
              style={{
                strokeDasharray: '1000',
                strokeDashoffset: isVisible ? '0' : '1000',
                transition: 'stroke-dashoffset 2s ease-out'
              }}
            />
            
            {/* Data Points */}
            {animatedData.map((value, index) => {
              const x = (index * (100 / animatedData.length)) + ((100 / animatedData.length) * 0.5);
              const y = 100 - getBarHeight(value);
              
              return (
                <circle
                  key={index}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="4"
                  fill={color}
                  className="hover:r-6 transition-all duration-300 cursor-pointer"
                  style={{
                    animation: isVisible ? `popIn 0.5s ease-out ${index * 0.1 + 1}s both` : 'none'
                  }}
                />
              );
            })}
          </svg>
          
          {/* X-axis Labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 pt-2">
            {labels.map((label, index) => (
              <span 
                key={index}
                className="text-xs text-muted-foreground font-medium"
                style={{
                  animation: isVisible ? `fadeIn 0.5s ease-out ${index * 0.1 + 1.5}s both` : 'none'
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
      
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: scaleY(0);
            opacity: 0;
          }
          to {
            transform: scaleY(1);
            opacity: 1;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes popIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </Card>
  );
}
