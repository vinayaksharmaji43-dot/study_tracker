import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  MessageCircle, 
  ExternalLink, 
  ShoppingBag, 
  User, 
  Headphones, 
  Lock, 
  X,
  ShieldCheck 
} from 'lucide-react';
import { usePremiumAccess } from '../hooks/usePremiumAccess';

export default function TrialExpiredModal({ setActiveTab }) {
  const { whatsappNumber, getWhatsAppUrl, canShowTrialExpiredUI } = usePremiumAccess();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only open if mandatory Name+Phone profile form has been completed AND trial is expired
    if (canShowTrialExpiredUI) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [canShowTrialExpiredUI]);

  if (!isOpen || !canShowTrialExpiredUI) return null;

  const handleWhatsAppClick = () => {
    const url = getWhatsAppUrl('Hello, I want to purchase Premium access.');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleNavigate = (tabId) => {
    if (setActiveTab) {
      setActiveTab(tabId);
    }
    setIsOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-lg bg-gradient-to-b from-[#180f28] via-navy-900 to-navy-950 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6 animate-in zoom-in-95 duration-200 text-center sm:text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Amber Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Icon Badge */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-amber-400/20 to-yellow-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>12-Day Trial Notice</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
              Your Free Trial Has Ended
            </h2>
          </div>
        </div>

        {/* Message Body */}
        <div className="space-y-3 bg-navy-950/60 p-4 rounded-2xl border border-white/5">
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
            Your 12-day free access has now expired.
          </p>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            If you want to continue using the website and access premium features, please contact the batch manager.
          </p>
        </div>

        {/* Action Button: WhatsApp */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleWhatsAppClick}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm sm:text-base shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
          >
            <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Contact Batch manager on WhatsApp</span>
            <ExternalLink className="w-4 h-4 text-emerald-200 opacity-80" />
          </button>
        </div>

        {/* Unlocked sections shortcuts */}
        <div className="pt-3 border-t border-white/10 space-y-2.5">
          <div className="text-xs text-slate-400 font-semibold text-center">
            You can still access:
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleNavigate('product')}
              className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Products Store</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('profile')}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>My Profile</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('support')}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Help & Support</span>
            </button>
          </div>
        </div>

        {/* Assurance footnote */}
        <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>All your study hours, tests, and milestones are safe.</span>
        </div>

      </div>
    </div>
  );
}
