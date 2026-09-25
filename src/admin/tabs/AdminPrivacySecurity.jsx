import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Shield, ShieldAlert, MonitorOff, CameraOff, MonitorStop, Printer, Copy, MousePointerClick, Save, Droplet, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminPrivacySecurity() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const docRef = doc(db, 'settings', 'privacySecurity');

  useEffect(() => {
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setSettings(snap.data());
      } else {
        setSettings({
          masterEnabled: false,
          screenshotProtection: false,
          screenRecordingProtection: false,
          screenSharingProtection: false,
          printProtection: false,
          copyProtection: false,
          rightClickProtection: false,
          saveShortcutProtection: false,
          watermarkEnabled: false,
          temporaryDisabledUntil: null,
        });
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Failed to load settings.');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleToggle = async (key) => {
    if (!settings) return;
    try {
      setSaving(true);
      setError('');
      const newSettings = { ...settings, [key]: !settings[key], updatedAt: serverTimestamp() };
      await setDoc(docRef, newSettings, { merge: true });
      setSuccess('Settings updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTempDisable = async (hours) => {
    if (!settings) return;
    try {
      setSaving(true);
      setError('');
      const ms = hours * 60 * 60 * 1000;
      const until = Date.now() + ms;
      const newSettings = { ...settings, temporaryDisabledUntil: until, updatedAt: serverTimestamp() };
      await setDoc(docRef, newSettings, { merge: true });
      setSuccess(`Temporarily disabled for ${hours} hours.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const clearTempDisable = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      setError('');
      const newSettings = { ...settings, temporaryDisabledUntil: null, updatedAt: serverTimestamp() };
      await setDoc(docRef, newSettings, { merge: true });
      setSuccess('Protection re-enabled.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const isTempDisabled = settings?.temporaryDisabledUntil && settings.temporaryDisabledUntil > Date.now();
  const isActive = settings?.masterEnabled && !isTempDisabled;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="p-8 rounded-3xl glass-card border border-emerald-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-emerald-400" />
              Privacy & Security
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Control content protection layers. Note: Browser-based protections are best-effort and cannot guarantee 100% security against external capture methods.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Current Status Widget */}
      <div className={`p-6 rounded-2xl border flex items-start gap-4 ${
        isActive 
          ? 'bg-emerald-500/10 border-emerald-500/30' 
          : isTempDisabled 
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-rose-500/10 border-rose-500/30'
      }`}>
        {isActive ? (
          <Shield className="w-8 h-8 text-emerald-400 shrink-0" />
        ) : isTempDisabled ? (
          <Clock className="w-8 h-8 text-amber-400 shrink-0 animate-pulse" />
        ) : (
          <ShieldAlert className="w-8 h-8 text-rose-400 shrink-0" />
        )}
        
        <div>
          <h2 className={`text-lg font-black ${
            isActive ? 'text-emerald-400' : isTempDisabled ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {isActive ? 'Protection Active' : isTempDisabled ? 'Temporarily Disabled' : 'Protection Disabled'}
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            {isActive ? 'All enabled security measures are currently active.' 
              : isTempDisabled ? `Protection is paused until ${new Date(settings.temporaryDisabledUntil).toLocaleString()}`
              : 'Master switch is off. No protections are active.'}
          </p>
          {isTempDisabled && (
            <button 
              onClick={clearTempDisable}
              className="mt-3 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-colors"
            >
              Re-enable Now
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Col: Master & Controls */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-royal-400" />
                  Master Protection
                </h3>
                <p className="text-xs text-slate-400 mt-1">Enable or disable the entire security system.</p>
              </div>
              <button
                onClick={() => handleToggle('masterEnabled')}
                disabled={saving}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  settings?.masterEnabled ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  settings?.masterEnabled ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Individual Controls</h4>
              
              <ToggleRow 
                icon={CameraOff} 
                label="Screenshot Protection" 
                value={settings?.screenshotProtection} 
                onToggle={() => handleToggle('screenshotProtection')} 
                disabled={saving || !settings?.masterEnabled}
              />
              <ToggleRow 
                icon={MonitorStop} 
                label="Screen Recording Protection" 
                value={settings?.screenRecordingProtection} 
                onToggle={() => handleToggle('screenRecordingProtection')} 
                disabled={saving || !settings?.masterEnabled}
              />
              <ToggleRow 
                icon={MonitorOff} 
                label="Screen Sharing Protection" 
                value={settings?.screenSharingProtection} 
                onToggle={() => handleToggle('screenSharingProtection')} 
                disabled={saving || !settings?.masterEnabled}
              />
              <ToggleRow 
                icon={Printer} 
                label="Print Protection" 
                value={settings?.printProtection} 
                onToggle={() => handleToggle('printProtection')} 
                disabled={saving || !settings?.masterEnabled}
              />
              <ToggleRow 
                icon={Copy} 
                label="Copy Protection" 
                value={settings?.copyProtection} 
                onToggle={() => handleToggle('copyProtection')} 
                disabled={saving || !settings?.masterEnabled}
              />
              <ToggleRow 
                icon={MousePointerClick} 
                label="Right Click Protection" 
                value={settings?.rightClickProtection} 
                onToggle={() => handleToggle('rightClickProtection')} 
                disabled={saving || !settings?.masterEnabled}
              />
              <ToggleRow 
                icon={Save} 
                label="Save Shortcut Protection" 
                value={settings?.saveShortcutProtection} 
                onToggle={() => handleToggle('saveShortcutProtection')} 
                disabled={saving || !settings?.masterEnabled}
              />
              <ToggleRow 
                icon={Droplet} 
                label="Watermark" 
                value={settings?.watermarkEnabled} 
                onToggle={() => handleToggle('watermarkEnabled')} 
                disabled={saving || !settings?.masterEnabled}
              />
            </div>
          </div>
        </div>

        {/* Right Col: Temp Disable */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Temporary Disable
              </h3>
              <p className="text-xs text-slate-400 mt-1">Pause all protections for a specific duration.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[1, 6, 12, 24].map((hours) => (
                <button
                  key={hours}
                  onClick={() => handleTempDisable(hours)}
                  disabled={saving || !settings?.masterEnabled}
                  className="p-3 rounded-xl bg-navy-900 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  {hours} Hour{hours > 1 ? 's' : ''}
                </button>
              ))}
            </div>
            
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 mt-4">
              <AlertTriangle className="w-4 h-4 inline-block mr-1.5 mb-0.5" />
              Custom date/time disable functionality can be configured directly from the database if needed for exact expiry times beyond 24h.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ToggleRow({ icon: Icon, label, value, onToggle, disabled }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-2xl bg-navy-900/50 border border-white/5 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
        <span className="text-sm font-semibold text-slate-200">{label}</span>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? 'bg-emerald-500' : 'bg-slate-600'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}
