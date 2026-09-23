import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatDate } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { 
  MessageSquare, 
  Trash2, 
  Star, 
  Search, 
  AlertCircle, 
  TrendingUp, 
  Award, 
  Users, 
  Calendar,
  X
} from 'lucide-react';

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFeedbacks(docs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching feedbacks:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteFeedback = async () => {
    if (!deletingItem) return;

    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'feedbacks', deletingItem.id));
      setDeletingItem(null);
    } catch (err) {
      console.error('Failed to delete feedback:', err);
      alert(`Failed to delete feedback: ${err.message || 'Permission denied'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics
  const totalCount = feedbacks.length;
  const avgRating = totalCount > 0 
    ? (feedbacks.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0) / totalCount).toFixed(1)
    : '0.0';
  const fiveStarCount = feedbacks.filter(f => (Number(f.rating) || 5) === 5).length;

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(item => {
      const name = (item.name || '').toLowerCase();
      const message = (item.text || item.message || '').toLowerCase();
      const q = searchQuery.trim().toLowerCase();

      const matchesQuery = !q || name.includes(q) || message.includes(q);
      if (!matchesQuery) return false;

      if (ratingFilter !== 'all') {
        const ratingNum = Number(ratingFilter);
        return (Number(item.rating) || 5) === ratingNum;
      }

      return true;
    });
  }, [feedbacks, searchQuery, ratingFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-royal-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-royal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-royal-500/20 text-royal-300 text-xs font-bold border border-royal-500/30">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Student Voice & Reviews</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Feedback <span className="gold-gradient-text">Management</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Monitor, review, and moderate student feedback submitted across the platform. Deleted reviews disappear in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-navy-900/80 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center font-black text-sm">
                ★
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg Rating</div>
                <div className="text-base font-black text-white">{avgRating} / 5.0</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-royal-500/20 text-royal-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Feedbacks</div>
            <div className="text-2xl font-black text-white">{totalCount}</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 fill-gold-400" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">5-Star Reviews</div>
            <div className="text-2xl font-black text-white">{fiveStarCount}</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Satisfaction Rate</div>
            <div className="text-2xl font-black text-white">
              {totalCount > 0 ? `${Math.round((fiveStarCount / totalCount) * 100)}%` : '100%'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl glass-card border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by student name or review keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-royal-500"
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

        {/* Rating Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setRatingFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              ratingFilter === 'all'
                ? 'bg-royal-600 text-white shadow-glow-blue'
                : 'bg-navy-900 text-slate-400 border border-white/5 hover:text-white hover:bg-white/5'
            }`}
          >
            All Ratings ({totalCount})
          </button>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = feedbacks.filter(f => (Number(f.rating) || 5) === stars).length;
            return (
              <button
                key={stars}
                onClick={() => setRatingFilter(String(stars))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                  ratingFilter === String(stars)
                    ? 'bg-royal-600 text-white shadow-glow-blue'
                    : 'bg-navy-900 text-slate-400 border border-white/5 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{stars}★</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Feedbacks Grid */}
      {filteredFeedbacks.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={searchQuery ? "No matching feedback found" : "No feedback submitted yet"}
          description={searchQuery ? "Try searching with a different student name or keyword." : "Student reviews submitted on the Home page or Dashboard will appear here."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFeedbacks.map((item) => {
            const rating = Number(item.rating) || 5;
            const message = item.text || item.message || '';
            const initial = (item.name || 'S').charAt(0).toUpperCase();

            return (
              <div 
                key={item.id} 
                className="p-6 rounded-3xl glass-card border border-white/10 hover:border-royal-500/30 transition-all duration-200 flex flex-col justify-between gap-4 relative group"
              >
                <div className="space-y-3">
                  
                  {/* Student Header & Rating */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-royal-600 to-indigo-500 text-white font-extrabold flex items-center justify-center text-base shadow-md shrink-0">
                        {initial}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white leading-tight">
                          {item.name || 'Anonymous Student'}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-400">
                            {formatDate(item.createdAt) || 'Recent'}
                          </span>
                          {item.course && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/5">
                              {item.course}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete Action Button */}
                    <button
                      onClick={() => setDeletingItem(item)}
                      className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shrink-0"
                      title="Remove feedback"
                      aria-label="Remove feedback"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stars Row */}
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < rating ? 'fill-gold-400 text-gold-400' : 'text-slate-600'}`} 
                      />
                    ))}
                    <span className="ml-1.5 text-xs font-bold text-gold-300">
                      {rating}.0
                    </span>
                  </div>

                  {/* Feedback Message */}
                  <div className="p-4 rounded-2xl bg-navy-950/70 border border-white/5 text-sm text-slate-200 leading-relaxed italic whitespace-pre-wrap">
                    "{message}"
                  </div>

                </div>

                {/* Footer Info */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-royal-400" />
                    <span>Submitted {formatDate(item.createdAt)}</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Verified Student
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-red-500/35 max-w-md w-full shadow-2xl space-y-5 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">
                Remove Student Feedback?
              </h3>
              <p className="text-sm font-semibold text-rose-300">
                Are you sure you want to remove this feedback?
              </p>
              <p className="text-xs text-slate-400">
                This review will be permanently deleted from the database and immediately removed from the student Home page.
              </p>
            </div>

            {/* Snippet of the feedback being deleted */}
            <div className="p-3.5 rounded-xl bg-navy-950/80 border border-white/10 text-left space-y-1">
              <div className="text-xs font-bold text-white">{deletingItem.name}</div>
              <div className="text-xs text-slate-300 italic line-clamp-2">"{deletingItem.text || deletingItem.message}"</div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingItem(null)}
                className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteFeedback}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Yes, Remove Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
