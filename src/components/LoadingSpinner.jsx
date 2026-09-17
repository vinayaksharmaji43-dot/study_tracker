import React from 'react';
import { BookOpen } from 'lucide-react';

export default function LoadingSpinner({ fullScreen = false, text = "Loading CA/CMA Blueprint..." }) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-navy-800 border-t-royal-500 border-r-gold-500 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-royal-500 animate-pulse" />
        </div>
      </div>
      <p className="text-slate-300 text-sm font-medium tracking-wide animate-pulse">{text}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
