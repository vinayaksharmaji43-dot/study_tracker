import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, Trophy, Award, ArrowRight, ShieldCheck, X } from 'lucide-react';

export default function LevelUpModal() {
  const { currentUser, userProfile, levelInfo } = useAuth();
  const [levelUpData, setLevelUpData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid || !userProfile) return;

    const userPoints = userProfile.points || 0;
    const lastNotified = userProfile.lastNotifiedLevel || 1;
    if (!levelInfo) return;

    // Trigger popup if current level is greater than last notified level
    if (levelInfo.currentLevelNumber > lastNotified) {
      setLevelUpData({
        newLevel: levelInfo.currentLevelNumber,
        levelName: levelInfo.currentLevelName,
        badge: levelInfo.badge,
        points: userPoints
      });
    }
  }, [currentUser, userProfile?.points, userProfile?.lastNotifiedLevel, levelInfo]);

  if (!levelUpData) return null;

  const handleClose = async () => {
    try {
      setSaving(true);
      const uid = currentUser.uid;
      const userRef = doc(db, 'users', uid);
      
      // Update lastNotifiedLevel in Firestore
      await updateDoc(userRef, {
        lastNotifiedLevel: levelUpData.newLevel,
        currentLevel: levelUpData.newLevel,
        levelName: levelUpData.levelName,
        badge: levelUpData.badge
      });

      setLevelUpData(null);
    } catch (err) {
      console.error("Error acknowledging level up:", err);
      setLevelUpData(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-md animate-in fade-in zoom-in duration-300">
      <div className="glass-card p-8 rounded-3xl border border-gold-500/50 max-w-md w-full text-center space-y-6 relative overflow-hidden shadow-2xl">
        {/* Glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-gold-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Badge Icon Header */}
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-500/20 text-gold-300 text-xs font-black border border-gold-500/40 uppercase tracking-wider animate-bounce">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span>LEVEL UP UNLOCKED!</span>
          </div>

          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-gold-500 via-amber-400 to-amber-600 p-1 mx-auto shadow-glow-gold my-4">
            <div className="w-full h-full bg-navy-950 rounded-[22px] flex items-center justify-center text-5xl">
              {levelUpData.badge}
            </div>
          </div>

          <div className="text-xs text-slate-400 font-extrabold uppercase tracking-widest">
            Level {levelUpData.newLevel} / 35
          </div>
          <h2 className="text-3xl font-black text-white gold-gradient-text">
            {levelUpData.levelName}
          </h2>
          <p className="text-slate-300 text-sm max-w-xs mx-auto font-medium">
            Congratulations! Your consistent study performance has elevated you to a new academic level.
          </p>
        </div>

        {/* Points Summary */}
        <div className="p-4 rounded-2xl bg-navy-900/90 border border-white/10 relative z-10 flex items-center justify-between text-xs font-bold">
          <span className="text-slate-400">Total Accumulated XP:</span>
          <span className="text-base font-black text-gold-400">{levelUpData.points} XP</span>
        </div>

        {/* Action Button */}
        <div className="relative z-10">
          <button
            onClick={handleClose}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-400 hover:from-amber-400 hover:to-gold-500 text-navy-950 font-black text-sm shadow-glow-gold flex items-center justify-center gap-2 transition-all hover:scale-105"
          >
            <span>{saving ? 'Updating Level...' : 'Claim Badge & Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
