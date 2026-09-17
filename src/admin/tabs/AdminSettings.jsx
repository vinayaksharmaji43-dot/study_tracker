import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../config/supabase';
import { ShieldCheck, User, Mail, Database, HardDrive, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminSettings() {
  const { userProfile, currentUser } = useAuth();
  const supabaseReady = isSupabaseConfigured();

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Platform Configuration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Admin System <span className="gold-gradient-text">Settings</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            View administrator account credentials, platform details, and backend storage status.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Admin Account Settings */}
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <span>Administrator Account</span>
          </h3>

          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/5 space-y-1">
              <div className="text-xs text-slate-400">Admin Name</div>
              <div className="font-bold text-white">{userProfile?.name || 'Administrator'}</div>
            </div>

            <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/5 space-y-1">
              <div className="text-xs text-slate-400">Authorized Admin Email</div>
              <div className="font-bold text-gold-400">{currentUser?.email || 'vaultstore27@gmail.com'}</div>
            </div>

            <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/5 space-y-1">
              <div className="text-xs text-slate-400">System Role</div>
              <div className="font-bold text-emerald-400">Platform Administrator</div>
            </div>
          </div>
        </div>

        {/* System & Storage Integration Status */}
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-gold-400" />
            <span>Backend & Storage Status</span>
          </h3>

          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/5 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Firebase Firestore Database</div>
                <div className="text-xs text-slate-400">Auth & Real-time Database Active</div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>

            <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/5 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Firebase Storage Status</div>
                <div className="text-xs text-slate-400">Disabled (Supabase is used for files)</div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>

            <div className="p-4 rounded-2xl bg-navy-900/80 border border-white/5 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Supabase PDF & File Storage</div>
                <div className="text-xs text-slate-400">
                  {supabaseReady ? 'Connected: bucket study-material active' : 'Ready (Env vars customizable)'}
                </div>
              </div>
              {supabaseReady ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-gold-400" />
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
