import React, { useState } from 'react';
import { 
  Video, 
  Clock, 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink, 
  Sparkles,
  Play
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebcamStudySettings } from '../hooks/useWebcamStudySettings';
import { useRealStudyTimer } from '../hooks/useRealStudyTimer';

function formatTimerSeconds(totalSecs) {
  if (!totalSecs || totalSecs <= 0) return '0m';
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export default function WebcamStudyModal({ 
  isOpen, 
  onClose, 
  onNavigateToTimer, 
  onNavigateToWebcamSection 
}) {
  const { currentUser, userProfile } = useAuth();
  const { settings, isWebcamStudyActive } = useWebcamStudySettings();
  const { 
    isTimerRunning, 
    currentSubject, 
    elapsedSeconds, 
    startExistingStudyTimer 
  } = useRealStudyTimer(currentUser, userProfile);

  const [startingTimer, setStartingTimer] = useState(false);

  if (!isOpen) return null;

  // Open Google Meet in new tab
  const handleOpenGoogleMeet = () => {
    if (settings.meetLink?.trim()) {
      window.open(settings.meetLink.trim(), '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  // Automated Start Study Timer -> then Open Google Meet
  const handleStartTimerAndJoin = async () => {
    try {
      setStartingTimer(true);
      const subjectToUse = currentSubject || userProfile?.selectedSubject || 'General Study';
      await startExistingStudyTimer(subjectToUse);
      
      // Delay slightly for smooth transition
      setTimeout(() => {
        handleOpenGoogleMeet();
        if (onNavigateToWebcamSection) {
          onNavigateToWebcamSection();
        }
      }, 300);
    } catch (e) {
      console.error("Could not start timer:", e);
      alert("Failed to start study timer. Please start it manually from the Study Timer section.");
      if (onNavigateToTimer) onNavigateToTimer();
      onClose();
    } finally {
      setStartingTimer(false);
    }
  };

  const handleNotNow = () => {
    onClose();
    if (onNavigateToTimer) {
      onNavigateToTimer();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-3xl glass-card border border-white/10 bg-navy-900/95 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-20"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ================= STATE 1: WEBCAM STUDY DISABLED ================= */}
        {!isWebcamStudyActive ? (
          <div className="p-6 sm:p-7 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <Video className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                Currently Closed
              </span>
              <h2 className="text-xl font-black text-white">
                Webcam Study Unavailable
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                The webcam study room is currently closed by the mentor. Please check back later or start your individual study timer.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Got It
            </button>
          </div>
        ) : isTimerRunning ? (
          /* ================= STATE 2: STUDY TIMER IS RUNNING ================= */
          <div className="p-6 sm:p-7 space-y-5 text-center">
            {/* Header Icon */}
            <div className="relative inline-flex items-center justify-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                <Video className="w-8 h-8" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-navy-950 border border-emerald-400 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Timer Active</span>
              </div>

              <h2 className="text-xl font-black text-white">
                Start Webcam Study?
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
                Your Study Timer is already running. You can now join the live Webcam Study session.
              </p>
            </div>

            {/* Live Timer Snapshot Badge */}
            <div className="p-3.5 rounded-2xl bg-navy-950/80 border border-white/5 flex items-center justify-between text-xs">
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Subject</div>
                <div className="font-bold text-white truncate max-w-[150px]">
                  {currentSubject || 'General Study'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Time Studied</div>
                <div className="font-mono font-black text-emerald-400">
                  {formatTimerSeconds(elapsedSeconds)}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleOpenGoogleMeet}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-navy-950 font-black text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>Join Study Room</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ================= STATE 3: STUDY TIMER IS OFF ================= */
          <div className="p-6 sm:p-7 space-y-5 text-center">
            {/* Warning Icon */}
            <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Study Timer Required</span>
              </div>

              <h2 className="text-xl font-black text-white">
                Start Study Timer First
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
                Your Study Timer is currently not running. Please start your Study Timer before joining Webcam Study.
              </p>
            </div>

            {/* Quick Note Card */}
            <div className="p-3.5 rounded-2xl bg-navy-950/80 border border-white/5 text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">Automatic Timer Sync</div>
              <div>Clicking below will start your study timer and immediately open the Google Meet session.</div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleStartTimerAndJoin}
                disabled={startingTimer}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-gold-500 to-amber-500 hover:from-amber-400 hover:to-gold-400 text-navy-950 font-black text-sm transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Play className="w-4 h-4 fill-navy-950" />
                <span>{startingTimer ? 'Starting Timer...' : 'Start Study Timer'}</span>
              </button>

              <button
                onClick={handleNotNow}
                className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
