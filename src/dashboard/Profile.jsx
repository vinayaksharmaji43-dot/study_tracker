import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatHours } from '../utils/helpers';
import { User, Mail, GraduationCap, Calendar, Award, BookOpen, LogOut, CheckCircle, ShieldCheck, Edit3, BookOpenCheck, Sparkles, Trophy, Flame, Crown, ChevronRight } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useLevelGifts } from '../hooks/useLevelGifts';
import { Gift, Lock as LockIcon } from 'lucide-react';

export default function Profile() {
  const { userProfile, currentUser, logout, levelInfo } = useAuth();

  const [name, setName] = useState('');
  const [course, setCourse] = useState('CA');
  const [level, setLevel] = useState('Foundation');
  const [attempt, setAttempt] = useState('Jan 27');
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [deviceSlots, setDeviceSlots] = useState({ desktop: null, mobile: null });

  const { availableGifts, claimedGifts, loading: giftsLoading } = useLevelGifts();

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      const rawCourse = userProfile.course || 'CA';
      setCourse(rawCourse === 'CMA' || rawCourse?.includes('CMA') ? 'CMA' : 'CA');
      setLevel(userProfile.level || (rawCourse?.includes('Intermediate') ? 'Intermediate' : 'Foundation'));
      setAttempt(userProfile.attempt || 'Jan 27');
    }
  }, [userProfile]);

  const [levelHistory, setLevelHistory] = useState([]);

  const userPoints = userProfile?.points || 0;

  useEffect(() => {
    if (!currentUser?.uid) return;
    const historyRef = collection(db, 'users', currentUser.uid, 'levelHistory');
    const q = query(historyRef, orderBy('achievedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setLevelHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error("Level history listener error:", err));
    return () => unsub();
  }, [currentUser]);

  const handleCourseChange = (newCourse) => {
    setCourse(newCourse);
    if (newCourse === 'CA') {
      if (!['Jan 27', 'May 27', 'Sep 27'].includes(attempt)) setAttempt('Jan 27');
    } else {
      if (!['Dec 26', 'June 27', 'Dec 27'].includes(attempt)) setAttempt('Dec 26');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setUpdating(true);
      setSuccessMsg('');

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        name: name.trim(),
        course,
        level,
        attempt
      });

      setSuccessMsg('Academic stream & profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error("Profile update error:", err);
      alert("Failed to update profile.");
    } finally {
      setUpdating(false);
    }
  };

  const fullStreamTitle = `${course} ${level}`;

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-royal-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-royal-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-royal-600 to-gold-500 p-1 shadow-glow-blue">
              <div className="w-full h-full bg-navy-950 rounded-[22px] flex items-center justify-center text-white font-extrabold text-2xl">
                {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'S'}
              </div>
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center gap-2.5 justify-center sm:justify-start flex-wrap">
                <h1 className="text-2xl font-extrabold text-white">{userProfile?.name || 'Student'}</h1>
                
                {/* Current Level Badge Pill */}
                <span className="px-3 py-1 rounded-xl bg-gold-500/20 text-gold-300 text-xs font-black border border-gold-500/30 flex items-center gap-1.5 shadow-glow-gold">
                  <span>{levelInfo.badge}</span>
                  <span>{levelInfo.currentLevelName}</span>
                </span>

                {userProfile?.role === 'admin' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-300">{userProfile?.email}</p>
              
              {userProfile?.rollNumber && (
                <div className="mt-3 flex items-center justify-between px-4 py-2 bg-navy-950/50 rounded-xl border border-white/10 max-w-xs mx-auto sm:mx-0">
                  <div className="text-left">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Roll Number</div>
                    <div className="text-sm font-mono font-bold text-gold-400">{userProfile.rollNumber}</div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(userProfile.rollNumber);
                      alert('Roll Number copied!');
                    }}
                    className="px-3 py-1.5 ml-4 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white transition-colors"
                  >
                    Copy
                  </button>
                </div>
              )}

              <p className="text-xs font-semibold pt-1 text-emerald-400">
                📚 {fullStreamTitle} • {attempt} Attempt
              </p>
              {userProfile?.referralSource && (
                <div className="pt-1 flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-300">
                  <span className="text-[11px] text-slate-400">Heard About Us:</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-[11px]">
                    {userProfile.referralSource}
                  </span>
                </div>
              )}
            </div>
          </div>
      </div>

      {/* --- PROFILE LEVEL PROGRESS CARD (Section 8) --- */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-gold-500/30 relative overflow-hidden shadow-2xl space-y-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gold-500 to-amber-600 p-0.5 shadow-glow-gold">
              <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center text-3xl">
                {levelInfo.badge}
              </div>
            </div>
            <div>
              <div className="text-xs text-gold-400 font-extrabold uppercase tracking-wider">
                Level {levelInfo.currentLevelNumber} / 35
              </div>
              <h2 className="text-2xl font-black text-white gold-gradient-text">
                {levelInfo.currentLevelName}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Current Points</div>
            <div className="text-2xl font-black text-gold-400 font-mono">{levelInfo.totalPoints} XP</div>
          </div>
        </div>

        {/* Level Progress Bar & Next Level Details */}
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">
              {levelInfo.isMaxLevel ? (
                <strong className="text-gold-400 font-black flex items-center gap-1.5">
                  <Crown className="w-4 h-4" /> MAX LEVEL REACHED
                </strong>
              ) : (
                <span>Next Level: <strong className="text-white">Level {levelInfo.nextLevelObj.levelNumber} — {levelInfo.nextLevelObj.levelName} {levelInfo.nextLevelObj.badge}</strong></span>
              )}
            </span>
            <span className="text-gold-400 font-mono">
              {levelInfo.isMaxLevel ? '100%' : `${levelInfo.pointsRemaining} XP Needed`}
            </span>
          </div>

          <div className="w-full h-4 bg-navy-950 rounded-full p-0.5 border border-white/10 overflow-hidden shadow-inner">
            <div
              style={{ width: `${levelInfo.progressPct}%` }}
              className="h-full rounded-full bg-gradient-to-r from-gold-500 via-amber-400 to-gold-400 shadow-glow-gold transition-all duration-500"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
            <span>Level Threshold: {levelInfo.currentLevelObj.requiredPoints} XP</span>
            <span>{levelInfo.progressPct}% Complete</span>
            <span>{levelInfo.isMaxLevel ? '30,800 XP' : `Target: ${levelInfo.nextLevelObj.requiredPoints} XP`}</span>
          </div>
        </div>

        {/* Level History Log */}
        {levelHistory.length > 0 && (
          <div className="pt-4 border-t border-white/10 space-y-3 relative z-10">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold-400" />
              <span>Level Achievement History</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {levelHistory.slice(0, 6).map(h => (
                <div key={h.id} className="p-3 rounded-xl bg-navy-900 border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{h.badge}</span>
                    <div>
                      <div className="font-bold text-white">Level {h.levelNumber}: {h.levelName}</div>
                      <div className="text-[10px] text-slate-400">{formatDate(h.achievedAt)}</div>
                    </div>
                  </div>
                  <span className="font-mono text-gold-400 font-bold">{h.pointsAtLevelUp} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Level Rewards / Gifts Section */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/30 relative overflow-hidden shadow-2xl space-y-6">
        <div className="absolute top-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-emerald-400" />
            <span>My Rewards & Level Gifts</span>
          </h3>
        </div>

        {giftsLoading ? (
          <div className="relative z-10 text-slate-400 text-sm animate-pulse">Loading rewards...</div>
        ) : availableGifts.length === 0 ? (
          <div className="relative z-10 text-slate-400 text-sm">No level gifts configured for your stream yet. Keep leveling up!</div>
        ) : (
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableGifts.map(gift => {
              const isUnlocked = levelInfo.currentLevelNumber >= gift.levelNumber;
              return (
                <div 
                  key={gift.id} 
                  className={`p-4 rounded-2xl border ${isUnlocked ? 'bg-emerald-900/20 border-emerald-500/30 shadow-glow-emerald' : 'bg-navy-900/60 border-white/5 opacity-75'} flex flex-col justify-between`}
                >
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black uppercase tracking-wider ${isUnlocked ? 'text-emerald-400' : 'text-slate-500'}`}>
                        Level {gift.levelNumber} Reward
                      </span>
                      {isUnlocked ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Unlocked
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold border border-white/10 flex items-center gap-1">
                          <LockIcon className="w-3 h-3" /> Locked
                        </span>
                      )}
                    </div>
                    <h4 className={`text-base font-bold ${isUnlocked ? 'text-white' : 'text-slate-300'}`}>
                      {gift.title}
                    </h4>
                    {gift.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {gift.description}
                      </p>
                    )}
                    {gift.extraPoints > 0 && (
                      <div className="inline-flex items-center gap-1 text-xs font-bold text-gold-400 mt-1">
                        <Award className="w-3.5 h-3.5" /> +{gift.extraPoints} XP Bonus
                      </div>
                    )}
                  </div>
                  
                  {isUnlocked ? (
                    <div className="flex items-center gap-2">
                      {(gift.type === 'pdf' || gift.type === 'both') && gift.googleDriveUrl && (
                        <a 
                          href={gift.googleDriveUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          📄 View Gift
                        </a>
                      )}
                      {(gift.type === 'points') && (
                        <div className="flex-1 py-2 rounded-xl bg-gold-500/20 text-gold-400 border border-gold-500/30 text-xs font-bold flex items-center justify-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5" /> Points Claimed
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full py-2 rounded-xl bg-navy-950 border border-white/5 text-slate-500 text-xs font-bold text-center">
                      🔒 Unlock at Level {gift.levelNumber}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Profile Form & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6 shadow-xl">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-royal-400" />
              <span>Academic Stream & Profile Settings</span>
            </h3>

            {successMsg && (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-royal-500"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Email Address (Read-only)
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    disabled
                    value={currentUser?.email || ''}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-navy-950 border border-white/5 text-slate-400 text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Course Selection (CA / CMA) */}
              <div>
                <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
                  Select Course
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleCourseChange('CA')}
                    className={`p-3.5 rounded-xl border text-sm font-bold transition-all ${
                      course === 'CA'
                        ? 'bg-royal-600/30 border-royal-500 text-white shadow-glow-blue'
                        : 'bg-navy-900 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    CA (ICAI)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCourseChange('CMA')}
                    className={`p-3.5 rounded-xl border text-sm font-bold transition-all ${
                      course === 'CMA'
                        ? 'bg-gold-500/20 border-gold-500 text-white shadow-glow-gold'
                        : 'bg-navy-900 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    CMA (ICMAI)
                  </button>
                </div>
              </div>

              {/* Level Selection (Foundation / Intermediate) */}
              <div>
                <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
                  Select Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLevel('Foundation')}
                    className={`p-3.5 rounded-xl border text-sm font-bold transition-all ${
                      level === 'Foundation'
                        ? 'bg-emerald-600/30 border-emerald-500 text-white shadow-glow-emerald'
                        : 'bg-navy-900 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    Foundation
                  </button>
                  <button
                    type="button"
                    onClick={() => setLevel('Intermediate')}
                    className={`p-3.5 rounded-xl border text-sm font-bold transition-all ${
                      level === 'Intermediate'
                        ? 'bg-emerald-600/30 border-emerald-500 text-white shadow-glow-emerald'
                        : 'bg-navy-900 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    Intermediate
                  </button>
                </div>
              </div>

              {/* Attempt Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Select Exam Attempt
                </label>
                <select
                  value={attempt}
                  onChange={(e) => setAttempt(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm font-bold focus:outline-none focus:border-royal-500"
                >
                  {course === 'CA' ? (
                    <>
                      <option value="Jan 27">Jan 27</option>
                      <option value="May 27">May 27</option>
                      <option value="Sep 27">Sep 27</option>
                    </>
                  ) : (
                    <>
                      <option value="Dec 26">Dec 26</option>
                      <option value="June 27">June 27</option>
                      <option value="Dec 27">Dec 27</option>
                    </>
                  )}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-royal-600 to-royal-500 hover:from-royal-500 hover:to-royal-600 text-white font-bold text-sm shadow-glow-blue transition-all disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Save Academic Stream Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Account Stats */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-6 shadow-xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-gold-400" />
              <span>Academic Statistics</span>
            </h3>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <BookOpenCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Active Stream</div>
                    <div className="text-sm font-bold text-emerald-400">{fullStreamTitle} ({attempt})</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-royal-500/20 text-royal-400 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Total Study Hours</div>
                    <div className="text-sm font-bold text-white">{formatHours(userProfile?.studyHours || 0)}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Total Earned Points</div>
                    <div className="text-sm font-bold text-gold-400">{userProfile?.points || 0} PTS</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Member Since</div>
                    <div className="text-sm font-bold text-white">{formatDate(userProfile?.createdAt)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* My Devices Panel */}
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-bold text-white mb-3">My Devices</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-navy-900/60 border border-white/5 flex flex-col items-center justify-center gap-1">
                  <div className="text-xs text-slate-400">PC / Desktop</div>
                  {deviceSlots.desktop ? (
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Registered</div>
                  ) : (
                    <div className="text-xs font-bold text-slate-500">Unregistered</div>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-navy-900/60 border border-white/5 flex flex-col items-center justify-center gap-1">
                  <div className="text-xs text-slate-400">Mobile / Phone</div>
                  {deviceSlots.mobile ? (
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Registered</div>
                  ) : (
                    <div className="text-xs font-bold text-slate-500">Unregistered</div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                onClick={logout}
                className="w-full py-3.5 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Account</span>
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
