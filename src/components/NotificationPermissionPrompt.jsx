import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Check, AlertCircle, Sparkles, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  isPushNotificationSupported, 
  getNotificationPermission, 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications,
  isCurrentDeviceSubscribed 
} from '../services/pushNotificationService';

export default function NotificationPermissionPrompt({ mode = 'banner' }) {
  const { currentUser, userProfile } = useAuth();
  const { isEyeCare } = useTheme();

  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('push_prompt_dismissed') === 'true';
  });

  useEffect(() => {
    const isSupp = isPushNotificationSupported();
    setSupported(isSupp);
    if (!isSupp) return;

    setPermission(getNotificationPermission());
    isCurrentDeviceSubscribed().then(sub => setIsSubscribed(sub));
  }, []);

  if (!supported || !currentUser) return null;

  const handleSubscribe = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await subscribeToPushNotifications(currentUser, userProfile);
      setPermission('granted');
      setIsSubscribed(true);
      setSuccessMsg('🔔 Live Push Notifications enabled! You will receive important stream announcements, mentor sessions, and study reminders.');
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      if (err.message === 'PERMISSION_DENIED') {
        setPermission('denied');
        setErrorMsg('Notifications are blocked in your browser settings. Please allow notifications in your site settings.');
      } else if (err.message === 'PERMISSION_DISMISSED') {
        setErrorMsg('Notification permission prompt was closed.');
      } else {
        setErrorMsg(err.message || 'Could not subscribe to notifications.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await unsubscribeFromPushNotifications(currentUser);
      setIsSubscribed(false);
      setSuccessMsg('Push notifications have been disabled on this device.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.message || 'Could not unsubscribe.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('push_prompt_dismissed', 'true');
  };

  // Compact inline button mode (for Header, Profile, or Settings)
  if (mode === 'button') {
    return (
      <div className="flex items-center gap-2">
        {isSubscribed ? (
          <button
            onClick={handleUnsubscribe}
            disabled={loading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isEyeCare
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
            }`}
            title="Click to turn off push notifications"
          >
            <BellRing className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Push: Active</span>
          </button>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isEyeCare
                ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 hover:bg-amber-400/30'
                : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
            }`}
            title="Enable live web push notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{loading ? 'Enabling...' : 'Enable Push'}</span>
          </button>
        )}
      </div>
    );
  }

  // If already subscribed or user dismissed prompt, don't show the full banner
  if (isSubscribed || dismissed || permission === 'denied') {
    if (successMsg) {
      return (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }
    return null;
  }

  // Full Banner Mode (Shown once on dashboard to inform the student)
  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xl relative overflow-hidden ${
      isEyeCare
        ? 'bg-gradient-to-r from-violet-950/60 via-purple-900/40 to-navy-950 border-violet-500/30 text-white'
        : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-white border-blue-200 text-slate-900'
    }`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            isEyeCare ? 'bg-amber-400/20 border border-amber-400/40 text-amber-300' : 'bg-blue-600 text-white'
          }`}>
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black tracking-wide">Never Miss an Exam Alert or Live Session</h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-500 border border-amber-400/30">
                Recommended
              </span>
            </div>
            <p className="text-xs opacity-90 leading-relaxed max-w-xl">
              Enable instant Web Push notifications on your device for <strong>{userProfile?.course || 'CA Foundation'}</strong> announcements, test releases, and live mentor sessions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all shadow-md cursor-pointer ${
              isEyeCare
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:brightness-110'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Activating...' : 'Enable Notifications'}</span>
          </button>

          <button
            onClick={handleDismiss}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isEyeCare ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
            }`}
            title="Dismiss for now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>

      {errorMsg && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
