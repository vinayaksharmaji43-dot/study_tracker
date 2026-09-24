import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { 
  Bell, 
  CalendarDays, 
  Megaphone, 
  Image as ImageIcon, 
  Search, 
  CheckCheck, 
  Sparkles, 
  X, 
  ZoomIn, 
  Clock, 
  Layers,
  ChevronDown
} from 'lucide-react';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import EmptyState from '../components/EmptyState';
import { formatDate } from '../utils/helpers';

function parseStream(userProfile) {
  if (!userProfile) return { course: 'CA', level: 'Foundation', attempt: '' };
  const rawCourse = String(userProfile.course || 'CA Foundation').toUpperCase();
  let course = 'CA';
  let level = 'Foundation';
  
  if (rawCourse.includes('CMA')) course = 'CMA';
  
  const rawLevel = String(userProfile.level || '').toUpperCase();
  if (rawCourse.includes('INTER') || rawLevel.includes('INTER')) level = 'Intermediate';
  else if (rawLevel.includes('FOUND') || rawCourse.includes('FOUND')) level = 'Foundation';
  else if (userProfile.level) level = userProfile.level; 
  
  const attempt = userProfile?.attempt || '';
  return { course, level, attempt };
}

function normalizeAttempt(attempt) {
  return (attempt || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace('2027', '27').replace('december', 'dec');
}

function announcementTime(announcement) {
  if (announcement.createdAt?.toMillis) return announcement.createdAt.toMillis();
  if (announcement.createdAt?.seconds) return announcement.createdAt.seconds * 1000;
  return new Date(announcement.createdAt || 0).getTime();
}

function isRecent(announcement) {
  // Within 7 days
  return Date.now() - announcementTime(announcement) <= 7 * 24 * 60 * 60 * 1000;
}

export default function Announcements() {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread' | 'images'
  const [activeImageModal, setActiveImageModal] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  // Prevent background scroll when image preview modal is open
  useEffect(() => {
    if (activeImageModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [activeImageModal]);

  useEffect(() => {
    if (!currentUser?.uid || !userProfile) return undefined;
    const stream = parseStream(userProfile);

    const unsubscribeAnnouncements = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const visible = snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .filter(item => {
          if (item.published === false) return false;
          if (isAdmin) return true; // admins see all
          if (item.audienceType !== 'specific') return true;
          return (
            String(item.course).toUpperCase() === String(stream.course).toUpperCase() &&
            String(item.level).toUpperCase() === String(stream.level).toUpperCase() &&
            normalizeAttempt(item.attempt) === normalizeAttempt(stream.attempt)
          );
        })
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
  }, [currentUser, isAdmin, userProfile?.course, userProfile?.level, userProfile?.attempt]);

  const markAsRead = async (announcementId) => {
    if (!currentUser?.uid || readIds.has(announcementId)) return;
    try {
      await setDoc(doc(db, 'announcementReads', `${currentUser.uid}_${announcementId}`), {
        studentId: currentUser.uid,
        announcementId,
        readAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser?.uid || markingAll) return;
    const unreadList = announcements.filter(a => !readIds.has(a.id));
    if (unreadList.length === 0) return;

    try {
      setMarkingAll(true);
      const batch = writeBatch(db);
      unreadList.forEach(a => {
        const ref = doc(db, 'announcementReads', `${currentUser.uid}_${a.id}`);
        batch.set(ref, {
          studentId: currentUser.uid,
          announcementId: a.id,
          readAt: serverTimestamp()
        });
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = announcements.filter(a => !readIds.has(a.id)).length;

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(a => {
      const title = (a.title || '').toLowerCase();
      const message = (a.message || a.description || '').toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      
      const matchesSearch = !query || title.includes(query) || message.includes(query);
      if (!matchesSearch) return false;

      if (filterType === 'unread') return !readIds.has(a.id);
      if (filterType === 'images') return !!a.imageUrl;
      return true;
    });
  }, [announcements, searchQuery, filterType, readIds]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <header className="p-6 sm:p-8 rounded-3xl glass-card border border-rose-500/25 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Official Announcements & Alerts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Platform <span className="gold-gradient-text">Announcements</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Stay up to date with exam schedules, syllabus updates, live session reminders, and platform notices.
            </p>
          </div>

          {unreadCount > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 hover:bg-rose-500/20 text-xs font-bold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.15)] disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4 text-rose-400" />
                <span>Mark All as Read ({unreadCount})</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="relative z-10 mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900/80 border border-white/10 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-rose-500/60 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-rose-500 text-white shadow-glow-rose'
                  : 'bg-navy-900/80 text-slate-400 border border-white/5 hover:text-white hover:bg-white/5'
              }`}
            >
              All ({announcements.length})
            </button>
            <button
              onClick={() => setFilterType('unread')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterType === 'unread'
                  ? 'bg-rose-500 text-white shadow-glow-rose'
                  : 'bg-navy-900/80 text-slate-400 border border-white/5 hover:text-white hover:bg-white/5'
              }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              onClick={() => setFilterType('images')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterType === 'images'
                  ? 'bg-rose-500 text-white shadow-glow-rose'
                  : 'bg-navy-900/80 text-slate-400 border border-white/5 hover:text-white hover:bg-white/5'
              }`}
            >
              With Attachments
            </button>
          </div>

        </div>
      </header>

      {/* Announcements Stream */}
      {filteredAnnouncements.length === 0 ? (
        <EmptyState 
          icon={Megaphone} 
          title={searchQuery ? "No matching announcements" : "No announcements published yet"} 
          description={searchQuery ? "Try searching with a different keyword or clearing filters." : "New platform notices, exam alerts, and guidance will appear here chronologically."} 
        />
      ) : (
        <div className="space-y-5">
          {filteredAnnouncements.map((announcement, index) => {
            const isUnread = !readIds.has(announcement.id);
            const isLatest = index === 0;
            const recent = isRecent(announcement);
            const message = announcement.message || announcement.description || '';

            return (
              <article
                key={announcement.id}
                onClick={() => markAsRead(announcement.id)}
                className={`rounded-3xl glass-card border overflow-hidden transition-all duration-300 relative group cursor-pointer ${
                  isUnread 
                    ? 'border-rose-500/40 bg-gradient-to-b from-rose-500/10 to-navy-950/90 shadow-[0_0_30px_rgba(244,63,94,0.12)]' 
                    : 'border-white/10 hover:border-white/20 bg-navy-950/70 hover:bg-navy-900/80'
                }`}
              >
                {/* Glow highlight for latest/unread */}
                {(isLatest || isUnread) && (
                  <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-rose-500/15 transition-all" />
                )}

                {/* Announcement Image Attachment */}
                {announcement.imageUrl && (
                  <div className="relative overflow-hidden bg-navy-900/80 border-b border-white/10 max-h-96 group/img">
                    <img 
                      src={announcement.imageUrl} 
                      alt={announcement.title || 'Announcement attachment'} 
                      className="w-full max-h-96 object-contain md:object-cover transition-transform duration-500 group-hover/img:scale-[1.01]" 
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageModal({ url: announcement.imageUrl, title: announcement.title });
                      }}
                      className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-navy-950/80 border border-white/20 text-white text-xs font-bold backdrop-blur-md opacity-90 hover:opacity-100 hover:bg-rose-600 transition-all flex items-center gap-1.5 shadow-lg"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>View Full Image</span>
                    </button>
                  </div>
                )}

                <div className="p-6 sm:p-7 relative z-10 space-y-4">
                  
                  {/* Badges & Meta Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {isLatest && (
                        <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Latest</span>
                        </span>
                      )}

                      {!isLatest && recent && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                          New
                        </span>
                      )}

                      <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-200 border border-white/10 text-[10px] font-bold uppercase tracking-wider">
                        {announcement.audienceType === 'specific' 
                          ? `${announcement.course} ${announcement.level} • ${announcement.attempt}` 
                          : 'All Students'}
                      </span>

                      {isUnread && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wider border border-rose-500/30">
                          Unread
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-rose-400" />
                        {formatDate(announcement.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug group-hover:text-rose-100 transition-colors">
                    {announcement.title}
                  </h2>

                  {/* Description / Content */}
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-normal selection:bg-rose-500 selection:text-white">
                    {message}
                  </div>

                  {/* Footer Info */}
                  <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                      <span>Published by <span className="font-semibold text-slate-300">{announcement.author || 'Platform Admin'}</span></span>
                    </div>

                    {announcement.imageUrl && (
                      <span className="inline-flex items-center gap-1.5 text-rose-300/80">
                        <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
                        <span>Attached Photo</span>
                      </span>
                    )}
                  </div>

                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Image Lightbox Modal */}
      {activeImageModal && (
        <div 
          onClick={() => setActiveImageModal(null)}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-navy-950/90 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full bg-navy-900 border border-white/20 rounded-3xl overflow-hidden shadow-2xl relative space-y-3 p-4 sm:p-6"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white truncate max-w-lg">
                {activeImageModal.title || 'Announcement Attachment'}
              </h3>
              <button
                onClick={() => setActiveImageModal(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close image preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-center max-h-[75vh] overflow-hidden rounded-2xl bg-black/40">
              <img 
                src={activeImageModal.url} 
                alt="Full announcement preview" 
                className="max-h-[75vh] w-auto object-contain rounded-2xl"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}