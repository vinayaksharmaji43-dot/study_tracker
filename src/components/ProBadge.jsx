import React from 'react';
import { Crown, Sparkles } from 'lucide-react';

/**
 * Reusable PRO Badge component shown beside student's name
 * when granted Pro Access by Administrator.
 */
export default function ProBadge({ size = 'md', showIcon = true, className = '' }) {
  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5 gap-1',
    md: 'text-[11px] px-2 py-0.5 gap-1',
    lg: 'text-xs px-2.5 py-1 gap-1.5'
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5'
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg bg-gradient-to-r from-amber-500/25 via-yellow-500/25 to-amber-500/25 border border-amber-400/50 text-amber-300 font-black tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.3)] shrink-0 select-none ${sizeClasses[size] || sizeClasses.md} ${className}`}
      title="Verified Pro Student Access"
    >
      {showIcon && <Crown className={`${iconSizes[size] || iconSizes.md} text-amber-400 shrink-0`} />}
      <span>PRO</span>
    </span>
  );
}
