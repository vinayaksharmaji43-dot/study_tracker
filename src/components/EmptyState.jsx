import React from 'react';
import { Inbox } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function EmptyState({ 
  icon: Icon = Inbox, 
  title = "No data available", 
  description = "Start taking action to build your stats.",
  actionText,
  onAction
}) {
  const { isEyeCare } = useTheme();

  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 rounded-2xl border my-4 ${
      isEyeCare ? 'glass-card border-white/5' : 'bg-white border-blue-200 shadow-sm'
    }`}>
      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 ${
        isEyeCare ? 'bg-royal-500/10 border-royal-500/20 text-royal-400 shadow-glow-blue' : 'bg-blue-50 border-blue-200 text-blue-700'
      }`}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className={`text-lg font-black mb-1 ${
        isEyeCare ? 'text-slate-100' : 'text-slate-950 font-black'
      }`}>{title}</h3>
      <p className={`text-sm max-w-sm mb-6 font-semibold ${
        isEyeCare ? 'text-slate-400' : 'text-slate-600'
      }`}>{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all duration-200 shadow-md"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
