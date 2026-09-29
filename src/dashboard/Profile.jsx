import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, orderBy, onSnapshot, serverTimestamp, addDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatHours } from '../utils/helpers';
import { User, Mail, GraduationCap, Calendar, Award, BookOpen, LogOut, CheckCircle, ShieldCheck, Edit3, BookOpenCheck, Sparkles, Trophy, Flame, Crown, ChevronRight, Clock, ArrowRight, X } from 'lucide-react';
import { Gift, Lock as LockIcon, MessageCircle, ExternalLink } from 'lucide-react';
import usePremiumAccess from '../hooks/usePremiumAccess';
import ProBadge from '../components/ProBadge';
import { useLevelGifts } from '../hooks/useLevelGifts';
import { getStreamId, getStreamDetails, STREAM_OPTIONS, STREAM_LABELS } from '../utils/levelSystem';

export default function Profile() {
  const { userProfile, currentUser, logout, levelInfo } = useAuth();
  const { 
    isPro, 
    isTrialActive, 
    isTrialExpired, 
    daysRemaining, 
    trialEndDate, 
    registrationDate,
    getWhatsAppUrl 
  } = usePremiumAccess();

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

  const rawStream = userProfile?.stream || (userProfile?.course ? getStreamId(userProfile.course, userProfile.level) : null);
  const isStreamLocked = Boolean(userProfile?.streamLocked || (userProfile?.course && userProfile?.role !== 'admin'));

  // For initial selection if unset
  const [selectedInitialStream, setSelectedInitialStream] = useState(rawStream || 'CA_Foundation');

  // Stream Change Request State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestedTargetStream, setRequestedTargetStream] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [latestRequest, setLatestRequest] = useState(null);

  // Listen for user's stream change requests in real-time
  useEffect(() => {
    if (!currentUser?.uid) return;
    const reqRef = collection(db, 'streamChangeRequests');
    const q = query(reqRef, where('uid', '==', currentUser.uid));

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return tB - tA;
      });
      setLatestRequest(list[0] || null);
    }, (err) => {
      console.error("Stream requests listener error:", err);
    });

    return () => unsub();
  }, [currentUser?.uid]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setUpdating(true);
      setSuccessMsg('');

      const userRef = doc(db, 'users', currentUser.uid);
      
      const payload = {
        name: name.trim(),
        attempt
      };

      if (!isStreamLocked) {
        const details = getStreamDetails(selectedInitialStream);
        payload.stream = selectedInitialStream;
        payload.course = details.course;
        payload.level = details.level;
        payload.streamLocked = true;
        payload.streamSelectedAt = serverTimestamp();
      }

      await updateDoc(userRef, payload);

      setSuccessMsg(isStreamLocked ? 'Academic profile settings updated successfully!' : 'Your stream has been saved and is now locked.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Profile update error:", err);
      alert("Failed to update profile: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmitStreamChangeRequest = async (e) => {
    e.preventDefault();
    if (!requestedTargetStream) return;

    if (requestedTargetStream === rawStream) {
      alert("Please choose a stream different from your current stream.");
      return;
    }

    try {
      setSubmittingRequest(true);
      const reqRef = collection(db, 'streamChangeRequests');
      await addDoc(reqRef, {
        uid: currentUser.uid,
        studentName: userProfile?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student',
        studentEmail: currentUser?.email || '',
        rollNumber: userProfile?.rollNumber || 'N/A',
        currentStream: rawStream || 'CA_Foundation',
        requestedStream: requestedTargetStream,
        reason: changeReason.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setShowRequestModal(false);
      setChangeReason('');
      setRequestedTargetStream('');
      alert("Stream change request submitted successfully to Admin.");
    } catch (err) {
      console.error("Error submitting stream request:", err);
      alert("Failed to submit request: " + err.message);
    } finally {
      setSubmittingRequest(false);
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
                {isPro && <ProBadge size="lg" />}
                
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

      {/* --- MEMBERSHIP & TRIAL STATUS CARD --- */}
      <div className={`p-6 rounded-3xl glass-card border relative overflow-hidden shadow-xl space-y-4 ${
        isPro 
          ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-navy-900/90 to-navy-950' 
          : isTrialExpired
            ? 'border-rose-500/30 bg-gradient-to-r from-rose-950/20 via-navy-900/90 to-navy-950'
            : 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-navy-900/90 to-navy-950'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isPro 
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.25)]' 
                : isTrialExpired
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}>
              {isPro ? <Crown className="w-6 h-6 text-amber-400" /> : isTrialExpired ? <LockIcon className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  {isPro ? 'Pro Membership Active' : isTrialExpired ? 'Free Trial Expired' : '12-Day Free Trial'}
                </h3>
                {isPro && <ProBadge size="sm" />}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isPro 
                  ? 'You have unrestricted full access to all sections, practice tools, notes, and study tracking.'
                  : isTrialExpired
                    ? 'Your 12-day free trial has expired. Normal sections are locked until Pro access is granted.'
                    : `Enjoy full platform access! You have ${daysRemaining} days remaining in your free trial.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isTrialExpired && !isPro && (
              <a
                href={getWhatsAppUrl('Hello, I want to purchase Premium access.')}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-glow-emerald flex items-center gap-2 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Contact Batch Manager on WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            )}
            <div className="text-right text-[11px] font-mono text-slate-400 bg-navy-950/60 px-3 py-2 rounded-xl border border-white/5">
              <div>Start: {registrationDate.toLocaleDateString()}</div>
              <div>End: {trialEndDate.toLocaleDateString()}</div>
            </div>
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

              {/* Stream Field */}
              {isStreamLocked ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Stream
                  </label>
                  
                  <div className="p-4 rounded-2xl bg-navy-950 border border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white">
                        {STREAM_LABELS[rawStream] || `${course} ${level}`}
                      </span>
                      <span className="text-amber-400 text-sm" title="Stream Locked">🔒</span>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-white/10 text-[10px] font-bold text-slate-400">
                      Locked
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Stream can only be changed with admin approval.
                  </p>

                  {/* Stream Change Request Status or Request Button */}
                  {latestRequest && latestRequest.status === 'pending' ? (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Stream Change Request: Pending</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(latestRequest.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Requested change to <strong className="text-white">{STREAM_LABELS[latestRequest.requestedStream] || latestRequest.requestedStream}</strong> is currently awaiting Administrator approval.
                      </p>
                    </div>
                  ) : (
                    <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
                      {latestRequest && latestRequest.status === 'rejected' && (
                        <span className="text-[11px] text-rose-400 font-medium">
                          Previous request rejected{latestRequest.rejectionReason ? `: ${latestRequest.rejectionReason}` : ''}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const other = STREAM_OPTIONS.find(s => s.id !== rawStream);
                          setRequestedTargetStream(other?.id || 'CA_Intermediate');
                          setShowRequestModal(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 ml-auto"
                      >
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>Request Stream Change</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Select Your Stream (First Time Unset Flow) */
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider">
                    Select Your Stream
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {STREAM_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedInitialStream(opt.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          selectedInitialStream === opt.id
                            ? 'bg-amber-500/20 border-amber-500 text-white shadow-glow-amber'
                            : 'bg-navy-950/80 border-white/10 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div className="font-bold text-sm text-white">{opt.label}</div>
                        <div className="text-[11px] text-slate-400">{opt.course} • {opt.level} Level</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-amber-300 font-medium">
                    ⚠️ Please select carefully. After selection, your stream will be permanently locked.
                  </p>
                </div>
              )}

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
                  <option value="Jan 27">Jan 27</option>
                  <option value="May 27">May 27</option>
                  <option value="Sep 27">Sep 27</option>
                  <option value="Dec 26">Dec 26</option>
                  <option value="June 27">June 27</option>
                  <option value="Dec 27">Dec 27</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-royal-600 to-royal-500 hover:from-royal-500 hover:to-royal-600 text-white font-bold text-sm shadow-glow-blue transition-all disabled:opacity-50"
                >
                  {updating ? 'Updating...' : isStreamLocked ? 'Save Academic Profile Settings' : 'Confirm & Lock Stream'}
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

      {/* Request Stream Change Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-amber-400" />
                <span>Request Stream Change</span>
              </h3>
              <button 
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitStreamChangeRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Current Stream
                </label>
                <div className="px-3.5 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-slate-300 text-xs font-bold">
                  {STREAM_LABELS[rawStream] || `${course} ${level}`} 🔒
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Select Requested New Stream *
                </label>
                <select
                  value={requestedTargetStream}
                  onChange={(e) => setRequestedTargetStream(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                >
                  {STREAM_OPTIONS.filter(s => s.id !== rawStream).map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Reason for Change (Optional)
                </label>
                <textarea
                  rows="3"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="e.g. Cleared CA Foundation exams and starting CA Intermediate preparation..."
                  className="w-full p-3 rounded-xl bg-navy-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your request will be submitted to the platform Administrator. Your dashboard and stream-specific resources will be updated once approved.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-navy-950 text-xs font-black shadow-glow-gold disabled:opacity-50"
                >
                  {submittingRequest ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
