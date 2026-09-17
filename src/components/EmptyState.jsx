import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = Inbox, 
  title = "No data available", 
  description = "Start taking action to build your stats.",
  actionText,
  onAction
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl glass-card border border-white/5 my-4">
      <div className="w-14 h-14 rounded-2xl bg-royal-500/10 border border-royal-500/20 flex items-center justify-center text-royal-500 mb-4 shadow-glow-blue">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-slate-100 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-6">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-royal-600 to-royal-500 hover:from-royal-500 hover:to-royal-600 text-white font-medium text-sm transition-all duration-200 shadow-glow-blue"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
