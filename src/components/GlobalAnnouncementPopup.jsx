import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Megaphone, CheckCircle, Clock, ExternalLink, X, Bell } from 'lucide-react';
import { formatDate } from '../utils/helpers';

function normalizeAttempt(att) {
  return (att || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace('2027', '27').replace('december', 'dec');
}

function parseStream(userProfile) {
  if (!userProfile) return { course: 'CA', level: 'Foundation', attempt: '' };
  const rawCourse = String(userProfile.course || 'CA Foundation').toUpperCase();
  let course = 'CA';
  let level = 'Foundation';
  
  if (rawCourse.includes('CMA')) course = 'CMA';
  
  const rawLevel = String(userProfile.level || '').toUpperCase();
  if (rawCourse.includes('INTER') || rawLevel.includes('INTER')) level = 'Intermediate';
  else if (rawLevel.includes('FOUND')) level = 'Foundation';
  else if (userProfile.level) level = userProfile.level; 
  
  const attempt = userProfile?.attempt || '';
  return { course, level, attempt };
}

// Gentle pleasant notification chime
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Primary chime note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain1.gain.setValueAtTime(0.18, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.35);

    // Harmonic echo
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.15); // C6
    gain2.gain.setValueAtTime(0.001, ctx.currentTime);
    gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Autoplay restrictions may block audio prior to user gesture; fail gracefully
  }
}

export default function GlobalAnnouncementPopup() {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const location = useLocation();

  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  const [markingRead, setMarkingRead] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(false);

  const prevAnnouncementIdRef = useRef(null);

  // Do not show on auth pages so login/registration isn't obstructed
  const isAuthPage = location.pathname === '/login' || 
                     location.pathname === '/register' || 
                     location.pathname === '/forgot-password';

  // Lock body scroll when modal is active
  useEffect(() => {
    if (activeAnnouncement && !isAuthPage) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [activeAnnouncement, isAuthPage]);

  // Listen to announcements and reads
  useEffect(() => {
    if (!currentUser?.uid) {
      setActiveAnnouncement(null);
      return;
    }

    let allAnnouncements = [];
    let readIds = new Set();

    const evaluateUnread = () => {
      const { course: myCourse, level: myLevel, attempt: myAttemptRaw } = parseStream(userProfile);
      const myAttempt = normalizeAttempt(myAttemptRaw);

      // Filter relevant announcements
      const relevant = allAnnouncements.filter(a => {
        if (a.published === false) return false;
        // Admins can see all announcements so they can verify broadcast popups
        if (isAdmin) return true;
        if (!a.audienceType || a.audienceType !== 'specific') return true;

        const courseMatch = !a.course || String(a.course).toUpperCase() === String(myCourse).toUpperCase();
        const levelMatch = !a.level || String(a.level).toUpperCase() === String(myLevel).toUpperCase();
        
        const aAttempt = normalizeAttempt(a.attempt);
        const attemptMatch = !aAttempt || aAttempt === 'all' || !myAttempt || aAttempt === myAttempt;

        return courseMatch && levelMatch && attemptMatch;
      });

      // Filter unread & not locally dismissed
      const unreadList = relevant.filter(a => !readIds.has(a.id) && !dismissedIds.has(a.id));

      if (unreadList.length > 0) {
        // Sort descending by creation date (newest first)
        unreadList.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime());
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime());
          return timeB - timeA;
        });

        const newest = unreadList[0];
        setActiveAnnouncement(newest);

        // If this is a newly arrived announcement, play chime
        if (newest.id !== prevAnnouncementIdRef.current) {
          prevAnnouncementIdRef.current = newest.id;
          playNotificationChime();
        }
      } else {
        setActiveAnnouncement(null);
      }
    };

    // 1. Live subscription to announcements
    const unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snap) => {
      allAnnouncements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      evaluateUnread();
    }, (err) => {
      console.warn("GlobalAnnouncementPopup announcements error:", err);
    });

    // 2. Live subscription to user's read receipts
    const qRead = query(collection(db, 'announcementReads'), where('studentId', '==', currentUser.uid));
    const unsubReads = onSnapshot(qRead, (snap) => {
      readIds = new Set(snap.docs.map(d => d.data().announcementId));
      evaluateUnread();
    }, (err) => {
      console.warn("GlobalAnnouncementPopup reads error:", err);
    });

    return () => {
      unsubAnnouncements();
      unsubReads();
    };
  }, [currentUser?.uid, userProfile?.course, userProfile?.level, userProfile?.attempt, isAdmin, dismissedIds]);

  const handleDismiss = async (withLink = false) => {
    if (!activeAnnouncement || !currentUser) return;
    
    const targetAnnouncement = activeAnnouncement;
    const targetId = targetAnnouncement.id;

    // Immediately hide locally so user has zero lag
    setDismissedIds(prev => new Set(prev).add(targetId));
    setActiveAnnouncement(null);

    if (withLink && targetAnnouncement.link) {
      window.open(targetAnnouncement.link, '_blank', 'noopener,noreferrer');
    }

    try {
      setMarkingRead(true);
      const readRef = doc(db, 'announcementReads', `${currentUser.uid}_${targetId}`);
      await setDoc(readRef, {
        studentId: currentUser.uid,
        announcementId: targetId,
        readAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("Error saving announcement read receipt:", err);
    } finally {
      setMarkingRead(false);
    }
  };

  // Don't render if no active announcement or on auth screens
  if (!activeAnnouncement || isAuthPage) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Main Announcement Popup Card */}
      <div 
        className="w-full max-w-lg bg-gradient-to-b from-[#1f1024] via-navy-900 to-navy-950 border border-rose-500/40 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(244,63,94,0.25)] animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-rose-500/20 via-rose-500/10 to-transparent border-b border-rose-500/25 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close 'X' Button */}
          <button
            type="button"
            onClick={() => handleDismiss(false)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Dismiss Announcement"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-10 flex items-start gap-3.5 pr-8">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/30">
              <Megaphone className="w-6 h-6 animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                <span>Important Platform Alert</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight break-words">
                {activeAnnouncement.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
          
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>
                {activeAnnouncement.createdAt?.toDate 
                  ? formatDate(activeAnnouncement.createdAt.toDate().toISOString()) 
                  : 'Published Just Now'}
              </span>
            </div>

            {activeAnnouncement.author && (
              <span className="text-[11px] text-slate-400">
                From: <span className="text-white font-bold">{activeAnnouncement.author}</span>
              </span>
            )}
          </div>

          {/* Optional Attachment Image */}
          {activeAnnouncement.imageUrl && (
            <div className="relative rounded-2xl overflow-hidden border border-white/10 group cursor-pointer" onClick={() => setEnlargedImage(true)}>
              <img 
                src={activeAnnouncement.imageUrl} 
                alt="Announcement Attachment" 
                className="w-full max-h-56 object-cover hover:scale-102 transition-transform duration-300"
              />
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-navy-950/80 text-[10px] font-bold text-white backdrop-blur-sm">
                Click to Enlarge
              </div>
            </div>
          )}

          {/* Message Text */}
          <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap bg-navy-950/40 p-4 rounded-2xl border border-white/5 font-normal">
            {activeAnnouncement.message || activeAnnouncement.description}
          </div>

          {/* Audience Badge */}
          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span>Target: </span>
            <span className="font-bold text-slate-300">
              {activeAnnouncement.audienceType === 'specific' 
                ? `${activeAnnouncement.course || 'All'} ${activeAnnouncement.level || ''} ${activeAnnouncement.attempt ? `• ${activeAnnouncement.attempt}` : ''}`
                : 'All Students & Batches'}
            </span>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-navy-900/90 flex flex-col sm:flex-row items-center gap-3 shrink-0">
          {activeAnnouncement.link && (
            <button
              type="button"
              onClick={() => handleDismiss(true)}
              className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-white/30"
            >
              <span>Open Link / Details</span>
              <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
            </button>
          )}

          <button
            type="button"
            onClick={() => handleDismiss(false)}
            disabled={markingRead}
            className={`w-full ${activeAnnouncement.link ? 'sm:flex-1' : 'flex-1'} py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2 transition-all hover:scale-102 cursor-pointer`}
          >
            <span>Got It</span>
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Enlarged Image Modal View */}
      {enlargedImage && activeAnnouncement.imageUrl && (
        <div 
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in fade-in"
          onClick={() => setEnlargedImage(false)}
        >
          <div className="max-w-4xl max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setEnlargedImage(false)}
              className="absolute -top-10 right-0 text-white font-bold text-sm bg-white/10 px-3 py-1 rounded-xl"
            >
              ✕ Close
            </button>
            <img 
              src={activeAnnouncement.imageUrl} 
              alt="Enlarged Attachment" 
              className="max-h-[85vh] w-auto rounded-2xl shadow-2xl object-contain"
            />
          </div>
        </div>
      )}

    </div>
  );
}
