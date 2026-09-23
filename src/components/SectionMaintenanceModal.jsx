import React from 'react';
import { Wrench, Lock, X, ShieldAlert, ArrowLeft } from 'lucide-react';
import { DEFAULT_MAINTENANCE_MESSAGE } from '../config/dashboardSections';

export default function SectionMaintenanceModal({ 
  isOpen, 
  onClose, 
  sectionTitle, 
  customMessage 
}) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-3xl glass-card border border-amber-500/30 bg-navy-900/95 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header & Icon */}
        <div className="relative p-6 pt-8 pb-4 text-center bg-gradient-to-b from-amber-500/10 to-transparent border-b border-white/5">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Glowing Tool / Maintenance Icon */}
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.25)] text-amber-400">
              <Wrench className="w-8 h-8 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-navy-950 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <h2 className="text-xl font-black text-white tracking-tight">
            This Section Is Currently Under Maintenance
          </h2>

          {sectionTitle && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-300">
              <Lock className="w-3 h-3" />
              <span>{sectionTitle}</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-center">
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            {customMessage?.trim() || DEFAULT_MAINTENANCE_MESSAGE}
          </p>

          <div className="p-3.5 rounded-2xl bg-navy-950/80 border border-white/5 text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Expected Resolution</div>
            <div>We are upgrading performance and feature quality. Access will be restored shortly.</div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-gold-500 to-amber-500 hover:from-amber-400 hover:to-gold-400 text-navy-950 text-sm font-black transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.01] cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * In-Page Placeholder rendered when a user tries direct deep-linking or URL manipulation to a locked section.
 */
export function SectionMaintenancePlaceholder({ sectionTitle, customMessage, onReturn }) {
  return (
    <div className="min-h-[500px] flex items-center justify-center p-6">
      <div className="w-full max-w-lg p-8 rounded-3xl glass-card border border-amber-500/30 text-center space-y-5 shadow-2xl">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
          <Wrench className="w-10 h-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-300">
            <Lock className="w-3 h-3" />
            <span>{sectionTitle || 'Section Locked'}</span>
          </div>

          <h2 className="text-2xl font-black text-white">
            This Section Is Currently Under Maintenance
          </h2>

          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            {customMessage?.trim() || DEFAULT_MAINTENANCE_MESSAGE}
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <button
            onClick={onReturn}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-gold-500 hover:from-amber-400 hover:to-gold-400 text-navy-950 text-sm font-black transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Overview</span>
          </button>
        </div>
      </div>
    </div>
  );
}
