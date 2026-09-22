import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Megaphone, CheckCircle, Clock } from 'lucide-react';
import { formatDate } from '../utils/helpers';

function normalizeAttempt(att) {
  return (att || '').toLowerCase().replace(/\s+/g, '').replace('2027', '27');
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

export default function GlobalAnnouncementPopup() {
  const { currentUser, userProfile } = useAuth();
  
  const [unreadAnnouncement, setUnreadAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [isAnnouncementPopupOpen, setIsAnnouncementPopupOpen] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid || !userProfile) {
      setLoading(false);
      return;
    }

    let announcementsList = [];
    let readIds = new Set();

    const processLatestUnread = () => {
      const { course: myCourse, level: myLevel, attempt: myAttemptRaw } = parseStream(userProfile);
      const myAttempt = normalizeAttempt(myAttemptRaw);

      // Filter for this user's stream
      const relevant = announcementsList.filter(a => {
        if (a.published === false) return false;
        if (a.audienceType !== 'specific') return true;
        return (
          String(a.course).toUpperCase() === String(myCourse).toUpperCase() &&
          String(a.level).toUpperCase() === String(myLevel).toUpperCase() &&
          normalizeAttempt(a.attempt) === myAttempt
        );
      });

      // Filter out read announcements
      const unread = relevant.filter(a => !readIds.has(a.id));

      if (unread.length > 0) {
        // Sort by createdAt descending
        unread.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });

        // Only set it if we haven't dismissed one locally in this session
        setUnreadAnnouncement(unread[0]);
      } else {
        setUnreadAnnouncement(null);
        setIsAnnouncementPopupOpen(false); // No unread announcement found
      }
      setLoading(false);
    };

    const unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      announcementsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      processLatestUnread();
    });

    const qRead = query(collection(db, 'announcementReads'), where('studentId', '==', currentUser.uid));
    const unsubRead = onSnapshot(qRead, (snap) => {
      readIds = new Set(snap.docs.map(d => d.data().announcementId));
      processLatestUnread();
    });

    return () => {
      unsubAnnouncements();
      unsubRead();
    };
  }, [currentUser, userProfile]);

  const handleMarkAsRead = async (withLink = false) => {
    if (!unreadAnnouncement || !currentUser || markingRead) return;
    
    // Close the UI immediately!
    setIsAnnouncementPopupOpen(false);
    setMarkingRead(true);

    if (withLink && unreadAnnouncement.link) {
      window.open(unreadAnnouncement.link, '_blank');
    }

    try {
      const readRef = doc(db, 'announcementReads', `${currentUser.uid}_${unreadAnnouncement.id}`);
      await setDoc(readRef, {
        studentId: currentUser.uid,
        announcementId: unreadAnnouncement.id,
        readAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error marking announcement as read:", err);
      // DB failed but UI is already closed, so user is not stuck.
    } finally {
      setMarkingRead(false);
    }
  };

  // If loading, no unread announcement, or user dismissed it locally -> render nothing
  if (loading || !unreadAnnouncement || !isAnnouncementPopupOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-md transition-opacity">
      <div 
        className="w-full max-w-lg bg-navy-900 border border-rose-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(244,63,94,0.15)] animate-in fade-in zoom-in-95 duration-300"
      >
        {/* Header styling matching premium requirements */}
        <div className="bg-rose-500/10 p-6 border-b border-rose-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500 text-white shrink-0 shadow-lg shadow-rose-500/30">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                New Announcement
              </div>
              <h2 className="text-xl font-bold text-white leading-tight">
                {unreadAnnouncement.title}
              </h2>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
             <Clock className="w-4 h-4 text-slate-500" />
             {unreadAnnouncement.createdAt?.toDate ? formatDate(unreadAnnouncement.createdAt.toDate().toISOString()) : 'Recently Published'}
          </div>

          {unreadAnnouncement.imageUrl && (
            <img src={unreadAnnouncement.imageUrl} alt="Announcement attachment" className="w-full max-h-64 object-cover rounded-2xl border border-white/10" />
          )}

          <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
            {unreadAnnouncement.message}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {unreadAnnouncement.link && (
              <button
                onClick={() => handleMarkAsRead(true)}
                disabled={markingRead}
                className="flex-1 py-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                View Announcement
              </button>
            )}
            <button
              onClick={() => handleMarkAsRead(false)}
              disabled={markingRead}
              className={`flex-1 py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                unreadAnnouncement.link 
                  ? 'bg-navy-800 hover:bg-navy-700 text-slate-300 border border-white/10' 
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/25'
              }`}
            >
              <span>Got It</span>
              {!unreadAnnouncement.link && <CheckCircle className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
