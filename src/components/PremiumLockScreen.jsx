import React from 'react';
import { 
  Lock, 
  Sparkles, 
  MessageCircle, 
  ShoppingBag, 
  User, 
  Headphones, 
  ShieldCheck, 
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { usePremiumAccess } from '../hooks/usePremiumAccess';

export default function PremiumLockScreen({ sectionTitle = 'This Section', setActiveTab }) {
  const { whatsappNumber, getWhatsAppUrl } = usePremiumAccess();

  const handleWhatsAppClick = () => {
    const url = getWhatsAppUrl('Hello, I want to purchase Premium access.');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative min-h-[550px] flex items-center justify-center p-4 sm:p-8 rounded-3xl bg-gradient-to-b from-navy-900/90 via-[#0d0f24]/95 to-navy-950/95 border border-amber-500/30 shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in duration-300">
      
      {/* Background radial aura */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-xl w-full text-center space-y-6">
        
        {/* Lock Icon Badge */}
        <div className="inline-flex items-center justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-amber-400/10 to-yellow-500/20 border border-amber-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.25)]">
              <Lock className="w-10 h-10 text-amber-400 animate-pulse" />
            </div>
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-navy-950 border border-amber-400/50 text-amber-300">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-widest shadow-sm">
            <span>🔒 Premium Access Required</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Your Free Trial Has Ended
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto font-medium leading-relaxed">
            Your 12-day free access has now expired. If you want to continue using the website and access premium features, please contact the batch manager.
          </p>
        </div>

        {/* WhatsApp Contact Button */}
        <div className="pt-2 max-w-md mx-auto space-y-3">
          <button
            type="button"
            onClick={handleWhatsAppClick}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm sm:text-base shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer group"
          >
            <MessageCircle className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            <span>Contact Batch manager on WhatsApp</span>
            <ExternalLink className="w-4 h-4 text-emerald-200 opacity-80" />
          </button>
        </div>

        {/* Accessible Sections Notice */}
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-slate-400 font-semibold mb-3">
            You can still access these areas anytime:
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {setActiveTab && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('product')}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Premium Products</span>
                  <ArrowRight className="w-3 h-3 ml-0.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('support')}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Help & Support</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Assurance Note */}
        <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Your study data and progress are completely safe and preserved.</span>
        </div>

      </div>
    </div>
  );
}
