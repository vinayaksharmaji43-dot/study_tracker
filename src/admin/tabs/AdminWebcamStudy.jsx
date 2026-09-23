import React, { useState, useEffect } from 'react';
import { 
  Video, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Save, 
  Trash2, 
  Radio, 
  Sparkles,
  Link as LinkIcon,
  HelpCircle
} from 'lucide-react';
import { useWebcamStudySettings } from '../../hooks/useWebcamStudySettings';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminWebcamStudy() {
  const { settings, loading, saveSettings } = useWebcamStudySettings();

  const [active, setActive] = useState(true);
  const [meetLink, setMeetLink] = useState('');
  const [roomTitle, setRoomTitle] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setActive(settings.active !== false);
      setMeetLink(settings.meetLink || '');
      setRoomTitle(settings.roomTitle || 'CA/CMA Focus Study Room');
      setRoomDescription(settings.roomDescription || 'Join the live study room and study together with other students.');
    }
  }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await saveSettings({
        active,
        meetLink: meetLink.trim(),
        roomTitle: roomTitle.trim() || 'CA/CMA Focus Study Room',
        roomDescription: roomDescription.trim() || 'Join the live study room and study together with other students.'
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving webcam study settings:", err);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearLink = () => {
    if (window.confirm("Are you sure you want to remove the Google Meet link? This will make Webcam Study unavailable for students.")) {
      setMeetLink('');
    }
  };

  const handleTestLink = () => {
    if (!meetLink.trim()) {
      alert("Please enter a Google Meet link first.");
      return;
    }
    window.open(meetLink.trim(), '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return <LoadingSpinner text="Loading Webcam Study Settings..." />;
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-emerald-950/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Live Study Room Control</span>
            </span>

            {active && meetLink.trim() ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/40 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>🟢 Live to Students</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black border border-rose-500/40 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>🔴 Disabled for Students</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            🎥 <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-gold-400">Webcam Study Settings</span>
          </h1>

          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Configure the Google Meet link, room status, and session details. When active, students who have an active Study Timer can join the session.
          </p>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6 bg-navy-900/60 shadow-xl">
        
        {/* Status Toggle Card */}
        <div className="p-5 rounded-2xl bg-navy-950/80 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Webcam Study Status</span>
              {active ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black border border-emerald-500/30">
                  🟢 Active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-black border border-rose-500/30">
                  🔴 Disabled
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              When disabled, students see "Webcam Study is currently unavailable" and cannot join.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActive(!active)}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
              active 
                ? 'bg-emerald-500 text-navy-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
            }`}
          >
            <span>{active ? 'Status: Active (Turn OFF)' : 'Status: Disabled (Turn ON)'}</span>
          </button>
        </div>

        {/* Google Meet Link Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Google Meet Link</span>
            </label>

            {meetLink && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestLink}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Link</span>
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={handleClearLink}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Link</span>
                </button>
              </div>
            )}
          </div>

          <input
            type="url"
            value={meetLink}
            onChange={(e) => setMeetLink(e.target.value)}
            placeholder="https://meet.google.com/xxx-yyyy-zzz"
            className="w-full px-4 py-3 rounded-xl bg-navy-950 border border-white/10 text-white placeholder:text-slate-500 text-sm font-mono focus:outline-none focus:border-emerald-500/60 transition-colors"
          />
          <p className="text-[11px] text-slate-400">
            Paste the full Google Meet meeting URL that students will join for the live webcam study hall.
          </p>
        </div>

        {/* Room Title */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Study Room Title
          </label>
          <input
            type="text"
            value={roomTitle}
            onChange={(e) => setRoomTitle(e.target.value)}
            placeholder="e.g. CA/CMA Focus Study Room"
            className="w-full px-4 py-3 rounded-xl bg-navy-950 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-emerald-500/60 transition-colors"
          />
        </div>

        {/* Room Description */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Room Description / Guidelines
          </label>
          <textarea
            rows={3}
            value={roomDescription}
            onChange={(e) => setRoomDescription(e.target.value)}
            placeholder="Instructions for students joining the webcam study room..."
            className="w-full px-4 py-3 rounded-xl bg-navy-950 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-emerald-500/60 transition-colors resize-none"
          />
        </div>

        {/* Action Button & Feedback */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10">
          <div className="text-xs text-slate-400">
            {saveSuccess ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 className="w-4 h-4" />
                <span>Webcam Study settings saved and live in database!</span>
              </span>
            ) : (
              <span>Changes update immediately for all students in real time.</span>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-navy-950 font-black text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
