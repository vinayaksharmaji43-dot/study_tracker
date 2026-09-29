import React from 'react';
import { AlertTriangle, MessageCircle, ExternalLink, Sparkles } from 'lucide-react';
import { usePremiumAccess } from '../hooks/usePremiumAccess';

export default function TrialExpiredBanner({ setActiveTab }) {
  const { whatsappNumber, getWhatsAppUrl, canShowTrialExpiredUI } = usePremiumAccess();

  if (!canShowTrialExpiredUI) return null;

  const handleWhatsAppClick = () => {
    const url = getWhatsAppUrl('Hello, I want to purchase Premium access.');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative rounded-2xl bg-gradient-to-r from-amber-950/80 via-navy-900/90 to-purple-950/80 border border-amber-500/40 p-4 sm:p-5 shadow-xl overflow-hidden animate-in fade-in duration-300">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex items-start gap-3.5 text-center md:text-left">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mx-auto md:mx-0 shadow-glow-amber">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-white">
                Your Free Trial Has Ended
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                12-Day Trial Expired
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Your 12-day free access has now expired. If you want to continue using the website and access premium features, please contact the batch manager.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={handleWhatsAppClick}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-glow-emerald transition-all flex items-center justify-center gap-2 cursor-pointer group"
          >
            <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Contact Batch manager on WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>

          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab('product')}
              className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 text-xs font-bold transition-all border border-amber-500/20 cursor-pointer hidden sm:flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Products</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
