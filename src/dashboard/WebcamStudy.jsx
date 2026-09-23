import React, { useState } from 'react';
import { 
  Video, 
  Clock, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  AlertCircle, 
  Play, 
  CheckCircle2, 
  BookOpen, 
  Flame, 
  Radio
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebcamStudySettings } from '../hooks/useWebcamStudySettings';
import { useRealStudyTimer } from '../hooks/useRealStudyTimer';
import WebcamStudyModal from '../components/WebcamStudyModal';

function formatTimerSeconds(totalSecs) {
  if (!totalSecs || totalSecs <= 0) return '0h 00m';
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = Math.floor(totalSecs % 60);
  if (hrs > 0) return `${hrs}h ${mins < 10 ? '0' : ''}${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

export default function WebcamStudy({ setActiveTab }) {
  const { currentUser, userProfile } = useAuth();
  const { settings, isWebcamStudyActive, loading } = useWebcamStudySettings();
  const { 
    isTimerRunning, 
    currentSubject, 
    elapsedSeconds, 
    startExistingStudyTimer 
  } = useRealStudyTimer(currentUser, userProfile);

  const [modalOpen, setModalOpen] = useState(false);

  const handleJoinClick = () => {
    if (!isTimerRunning) {
      setModalOpen(true);
      return;
    }

    if (settings.meetLink?.trim()) {
      window.open(settings.meetLink.trim(), '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-emerald-950/40 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Live Study Hall</span>
            </div>

            {isWebcamStudyActive ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>🟢 Study Room Active</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black border border-rose-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>🔴 Study Room Offline</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
            🎥 <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-gold-400">Live Webcam Study</span>
          </h1>

          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            {settings.roomDescription || "Join the live study room and study together with other students. Keep your camera focused on your desk and build accountability."}
          </p>
        </div>
      </div>

      {/* Main Study Room Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Meeting Connect & Actions */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          <div className="p-6 sm:p-7 rounded-3xl glass-card border border-white/10 space-y-6 bg-navy-900/60 relative overflow-hidden shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Session Details</span>
                <h3 className="text-xl font-black text-white">
                  {settings.roomTitle || "CA/CMA Focus Study Room"}
                </h3>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <Video className="w-6 h-6" />
              </div>
            </div>

            {/* Meet Link Status Display */}
            {isWebcamStudyActive ? (
              <div className="p-4 rounded-2xl bg-navy-950/80 border border-white/5 space-y-2">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Connection Platform</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified Active</span>
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-300 truncate">
                  Google Meet: <strong className="text-white">{settings.meetLink}</strong>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>Webcam Study is currently unavailable</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  The mentor has not set an active Google Meet room yet. Individual study timers are still fully operational.
                </p>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="space-y-2">
              <button
                onClick={handleJoinClick}
                disabled={!isWebcamStudyActive}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-navy-950 font-black text-base transition-all shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:scale-[1.01] flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Video className="w-5 h-5" />
                <span>🎥 Join Google Meet</span>
                <ExternalLink className="w-4 h-4 opacity-80" />
              </button>

              <p className="text-[11px] text-center text-slate-400">
                Opens Google Meet securely in a new browser tab. Make sure your timer remains active.
              </p>
            </div>
          </div>

          {/* Guidelines Card */}
          <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-3.5 bg-navy-900/40">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Webcam Study Hall Rules</span>
            </h4>
            
            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed list-disc list-inside">
              <li>Keep your <strong>microphone muted</strong> at all times to maintain quiet focus.</li>
              <li>Position your webcam facing your <strong>study table / notebooks</strong> for accountability.</li>
              <li>Your <strong>Study Timer must remain running</strong> while studying to earn points and rank.</li>
              <li>Respect fellow students and avoid disturbing gestures or screen sharing.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Live Study Timer Status */}
        <div className="col-span-1 lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-5 bg-navy-900/60 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Timer Integration</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isTimerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className={`text-xs font-bold ${isTimerRunning ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {isTimerRunning ? '⏱ Study Timer: Running' : 'Timer: Inactive'}
                </span>
              </div>
            </div>

            {/* Timer Big Display */}
            <div className="p-6 rounded-2xl bg-navy-950/80 border border-white/5 text-center space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Current Session Time
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">
                {formatTimerSeconds(elapsedSeconds)}
              </div>
              <div className="text-xs font-medium text-slate-300">
                Subject: <strong className="text-white">{currentSubject || 'General Study'}</strong>
              </div>
            </div>

            {/* Quick Action Button for Timer */}
            {!isTimerRunning ? (
              <button
                onClick={() => setModalOpen(true)}
                className="w-full py-3 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-amber-300" />
                <span>Start Study Timer to Join</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab?.('timer')}
                className="w-full py-2.5 px-4 rounded-xl bg-navy-950 border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-royal-400" />
                <span>Manage Study Timer</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Modal Popup for Timer Check */}
      <WebcamStudyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onNavigateToTimer={() => setActiveTab?.('timer')}
      />

    </div>
  );
}
