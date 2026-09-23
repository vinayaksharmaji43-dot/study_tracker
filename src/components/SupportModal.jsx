import React, { useState } from 'react';
import { Mail, Send, X, Copy, Check, Headphones, ExternalLink, MessageSquare } from 'lucide-react';

export default function SupportModal({ isOpen, onClose, onOpenFeedback }) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedTelegram, setCopiedTelegram] = useState(false);

  if (!isOpen) return null;

  const email = 'casuccessblueprint@gmail.com';
  const telegram = '@study_0312';
  const telegramUrl = 'https://t.me/study_0312';

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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/30 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Student Support</h2>
              <p className="text-xs text-slate-400">Get help with your preparation & account</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Options */}
        <div className="space-y-4 relative z-10">

          {/* Telegram Option */}
          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-semibold">Telegram Support</div>
                  <div className="text-sm font-bold text-white">{telegram}</div>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(telegram, 'telegram')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Copy Telegram ID"
              >
                {copiedTelegram ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-navy-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-glow-blue"
            >
              <span>Chat on Telegram</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Email Option */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-semibold">Email Support</div>
                  <div className="text-xs sm:text-sm font-bold text-white break-all">{email}</div>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(email, 'email')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                title="Copy Email"
              >
                {copiedEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <a
              href={`mailto:${email}`}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-glow-emerald"
            >
              <span>Send Email</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Feedback Option */}
          {onOpenFeedback && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFeedback();
                }}
                className="w-full py-3 rounded-2xl bg-royal-600/20 hover:bg-royal-600/30 text-royal-300 border border-royal-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <MessageSquare className="w-4 h-4 text-royal-400" />
                <span>Share Feedback & Review Platform</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer Note */}
        <div className="text-center text-[11px] text-slate-400 pt-2 border-t border-white/5">
          Available 24/7 for CA & CMA Students Assistance
        </div>

      </div>
    </div>
  );
}
