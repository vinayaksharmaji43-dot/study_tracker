import React, { useState } from 'react';
import { Mail, Send, Copy, Check, Headphones, ExternalLink, ArrowLeft, Clock } from 'lucide-react';

export default function Support({ setActiveTab }) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedTelegram, setCopiedTelegram] = useState(false);

  const email = 'casuccessblueprint@gmail.com';
  const telegram = '@ca_success_blueprint_support';
  const telegramUrl = 'https://t.me/ca_success_blueprint_support';

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedTelegram(true);
      setTimeout(() => setCopiedTelegram(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-navy-900/50 border border-white/10 p-4 rounded-3xl mb-6">
        <button 
          onClick={() => setActiveTab('overview')} 
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <div className="font-bold text-white tracking-wide">
          Help & Support
        </div>
        <div className="w-24"></div> {/* Spacer for centering */}
      </div>

      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/30 w-full shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Student Support</h2>
              <p className="text-xs sm:text-sm text-slate-400">Get help with your preparation & account</p>
            </div>
          </div>
        </div>

        {/* Support Hours Banner */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-emerald-400 relative z-10 text-center shadow-sm">
          <Clock className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>Support available from 8:00 AM to 9:00 PM</span>
        </div>

        {/* Content Options */}
        <div className="space-y-4 relative z-10">

          {/* Telegram Option */}
          <div className="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Telegram Support</div>
                  <div className="text-base sm:text-lg font-bold text-white">{telegram}</div>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(telegram, 'telegram')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Copy Telegram ID"
              >
                {copiedTelegram ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-navy-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-glow-blue"
            >
              <span>Chat on Telegram</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Email Option */}
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Email Support</div>
                  <div className="text-sm sm:text-base font-bold text-white truncate break-all">{email}</div>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(email, 'email')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                title="Copy Email"
              >
                {copiedEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <a
              href={`mailto:${email}`}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-glow-emerald"
            >
              <span>Send Email</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

        </div>

        {/* Footer Note */}
        <div className="text-center text-xs font-semibold text-slate-400 pt-4 border-t border-white/5">
          Support available from 8:00 AM to 9:00 PM
        </div>

      </div>
    </div>
  );
}
