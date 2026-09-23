import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Bell, CalendarDays, Megaphone, Image as ImageIcon } from 'lucide-react';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import EmptyState from '../components/EmptyState';
import { formatDate } from '../utils/helpers';

function parseStream(userProfile) {
  const raw = (userProfile?.course || '').toUpperCase();
  return {
    course: raw.includes('CMA') ? 'CMA' : 'CA',
    level: raw.includes('FOUNDATION') ? 'Foundation' : 'Intermediate',
    attempt: userProfile?.attempt || ''
  };
}

function normalizeAttempt(attempt) {
  return (attempt || '').toLowerCase().replace(/\s+/g, '').replace('2027', '27');
}

function announcementTime(announcement) {
  if (announcement.createdAt?.toMillis) return announcement.createdAt.toMillis();
  if (announcement.createdAt?.seconds) return announcement.createdAt.seconds * 1000;
  return new Date(announcement.createdAt || 0).getTime();
}

function isRecent(announcement) {
  return Date.now() - announcementTime(announcement) <= 7 * 24 * 60 * 60 * 1000;
}

export default function Announcements() {
  const { currentUser, userProfile } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [readIds, setReadIds] = useState(new Set());

  useEffect(() => {
    if (!currentUser?.uid || !userProfile) return undefined;
    const stream = parseStream(userProfile);

    const unsubscribeAnnouncements = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const visible = snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .filter(item => item.published !== false && (
          item.audienceType !== 'specific' || (
            item.course === stream.course &&
            item.level === stream.level &&
            normalizeAttempt(item.attempt) === normalizeAttempt(stream.attempt)
          )
        ))
        .sort((a, b) => announcementTime(b) - announcementTime(a));
      setAnnouncements(visible);
    });

    const unsubscribeReads = onSnapshot(
      query(collection(db, 'announcementReads'), where('studentId', '==', currentUser.uid)),
      snapshot => setReadIds(new Set(snapshot.docs.map(item => item.data().announcementId)))
    );

    return () => {
      unsubscribeAnnouncements();
      unsubscribeReads();
    };
  }, [currentUser, userProfile?.course, userProfile?.level, userProfile?.attempt]);

  const markAsRead = async (announcementId) => {
    if (!currentUser?.uid || readIds.has(announcementId)) return;
    await setDoc(doc(db, 'announcementReads', `${currentUser.uid}_${announcementId}`), {
      studentId: currentUser.uid,
      announcementId,
      readAt: serverTimestamp()
    });
  };

  return (
    <div className="space-y-8">
      <header className="p-6 sm:p-8 rounded-3xl glass-card border border-rose-500/25 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs font-bold uppercase tracking-wider">
              <Bell className="w-3.5 h-3.5" />
              Student updates
            </div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-white">Announcements</h1>
            <p className="mt-2 text-sm text-slate-300 max-w-xl">Important updates, exam alerts, and guidance from your platform team.</p>
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-400/25 text-rose-300 items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
        </div>
      </header>

      {announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" description="New updates for your stream will appear here." />
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const unread = !readIds.has(announcement.id);
            return (
              <article
                key={announcement.id}
                onClick={() => markAsRead(announcement.id)}
                className={`rounded-3xl glass-card border overflow-hidden transition-colors cursor-pointer ${unread ? 'border-rose-500/35' : 'border-white/10'}`}
              >
                {announcement.imageUrl && (
                  <img src={announcement.imageUrl} alt="" className="w-full max-h-72 object-cover border-b border-white/10" />
                )}
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {isRecent(announcement) && <span className="px-2 py-1 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider">New</span>}
                    <span className="px-2 py-1 rounded-full bg-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                      {announcement.audienceType === 'specific' ? `${announcement.course} ${announcement.level}` : 'All students'}
                    </span>
                    {unread && <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">Unread</span>}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">{announcement.title}</h2>
                  <p className="mt-3 text-sm text-slate-300 leading-7 whitespace-pre-wrap">{announcement.message}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-rose-300" />{formatDate(announcement.createdAt)}</span>
                    {announcement.imageUrl && <span className="inline-flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-rose-300" />Attachment included</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}