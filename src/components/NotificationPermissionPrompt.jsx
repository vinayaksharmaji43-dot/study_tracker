import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Check, AlertCircle, Sparkles, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
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

  const checkStatus = () => {
    const isSupp = isPushNotificationSupported();
    setSupported(isSupp);
    if (!isSupp) return;

    setPermission(getNotificationPermission());
    isCurrentDeviceSubscribed().then(sub => setIsSubscribed(sub));
  };

  useEffect(() => {
    checkStatus();

    const handleSubChange = (e) => {
      if (e?.detail?.isSubscribed !== undefined) {
        setIsSubscribed(e.detail.isSubscribed);
      } else {
        checkStatus();
      }
    };

    window.addEventListener('push-subscription-changed', handleSubChange);
    return () => {
      window.removeEventListener('push-subscription-changed', handleSubChange);
    };
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
      setSuccessMsg('🔔 Live Push Notifications enabled! You will now receive stream announcements and exam alerts.');
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      if (err.message === 'PERMISSION_DENIED') {
        setPermission('denied');
        setErrorMsg('Notifications are blocked in your browser settings. Please allow notifications in site settings.');
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
      setSuccessMsg('Push notifications disabled on this device.');
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

  // 1. TOP NAVBAR DESKTOP BUTTON MODE
  // Requirement: If enabled, hide from top bar. If NOT enabled, show clear button.
  if (mode === 'nav-button') {
    if (isSubscribed) return null; // Auto-hide from top once enabled!

    return (
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all duration-200 cursor-pointer shadow-sm animate-pulse ${
          isEyeCare
            ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-amber-400/60 text-amber-300 hover:bg-amber-400/30 hover:border-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.3)]'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25'
        }`}
        title="Click to turn on Live Push Notifications on this device"
      >
        <BellRing className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <span className="tracking-wide">
          {loading ? 'Enabling...' : 'Enable Notifications'}
        </span>
      </button>
    );
  }

  // 2. TOP NAVBAR MOBILE COMPACT BUTTON MODE
  if (mode === 'nav-mobile') {
    if (isSubscribed) return null; // Auto-hide on mobile top once enabled!

    return (
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-black transition-all duration-200 cursor-pointer shadow-sm animate-pulse ${
          isEyeCare
            ? 'bg-amber-400/20 border-amber-400/60 text-amber-300 hover:bg-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
            : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700 shadow-sm'
        }`}
        title="Turn on push notifications"
        aria-label="Enable notifications"
      >
        <BellRing className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-wider">
          {loading ? '...' : 'Alerts'}
        </span>
      </button>
    );
  }

  // 3. PROFILE PAGE DEDICATED CARD MODE
  // Requirement: Once enabled, show in Profile. Shows clear status, toggle, and alerts.
  if (mode === 'profile') {
    return (
      <div className="p-5 rounded-2xl bg-navy-900/60 border border-white/10 space-y-4 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isSubscribed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isSubscribed ? <BellRing className="w-5 h-5 animate-pulse" /> : <BellOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs text-slate-400">Push Notifications</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{isSubscribed ? 'Active on This Device' : 'Not Enabled on This Device'}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isSubscribed 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}>
                  {isSubscribed ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {isSubscribed ? (
            <>
              ✅ This device is registered to receive instant alerts for <strong>{userProfile?.course || 'your stream'}</strong> exams, timetable changes, test papers, and mentor sessions.
            </>
          ) : (
            <>
              ⚠️ Push notifications are currently <strong>disabled</strong> on this browser. You won't receive immediate alerts when new announcements or test papers are released.
            </>
          )}
        </p>

        {permission === 'denied' && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Notifications Blocked:</strong> Your browser has blocked notifications for this site. Click the lock/settings icon in the address bar to allow notifications, then try again.
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="pt-2 flex items-center justify-between gap-3">
          {isSubscribed ? (
            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
            >
              <BellOff className="w-3.5 h-3.5" />
              <span>{loading ? 'Disabling...' : 'Disable on This Device'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span>{loading ? 'Activating...' : 'Enable Push Notifications'}</span>
            </button>
          )}

          <span className="text-[11px] text-slate-400 italic">
            {isSubscribed ? 'Device synced with Cloud Firestore' : 'Fast 1-click activation'}
          </span>
        </div>
      </div>
    );
  }

  // 4. FULL DASHBOARD BANNER MODE (For students who have NOT enabled notifications)
  // Requirement: If user has NOT enabled notifications, show a clear message.
  if (isSubscribed) {
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

  // If user dismissed this session/cache, hide the banner, but top button and profile still remain available
  if (dismissed && mode === 'banner') {
    return null;
  }

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
                Action Required
              </span>
            </div>
            <p className="text-xs opacity-90 leading-relaxed max-w-xl">
              Push notifications are <strong>not enabled</strong> on this device. Enable now to receive instant alerts for <strong>{userProfile?.course || 'CA Foundation'}</strong> announcements, test releases, and mentor sessions.
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
