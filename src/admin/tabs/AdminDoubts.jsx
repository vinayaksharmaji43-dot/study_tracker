import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { 
  HelpCircle, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Send, 
  AlertCircle, 
  ShieldCheck, 
  Eye, 
  Image as ImageIcon,
  Filter,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  BookOpen,
  Calendar,
  CheckCircle2,
  User,
  Mail,
  Hash,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';

const STREAM_OPTIONS = [
  { value: 'ALL', label: 'All Streams' },
  { value: 'CA Foundation', label: 'CA Foundation' },
  { value: 'CA Intermediate', label: 'CA Intermediate' },
  { value: 'CMA Foundation', label: 'CMA Foundation' },
  { value: 'CMA Intermediate', label: 'CMA Intermediate' }
];

const DOUBT_TYPES = [
  'ALL',
  'Concept / Study Doubt',
  'Syllabus Incomplete',
  'Study Planner / Planning',
  'General Guidance'
];

const STATUS_OPTIONS = [
  { id: 'New', label: 'New', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: Clock },
  { id: 'In Review', label: 'In Review', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40', icon: Eye },
  { id: 'Replied', label: 'Replied', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: CheckCircle2 },
  { id: 'Resolved', label: 'Resolved', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40', icon: ShieldCheck }
];

function normalizeStatus(status) {
  if (!status) return 'New';
  const s = status.toLowerCase().trim();
  if (s === 'replied' || s === 'answered') return 'Replied';
  if (s === 'in review' || s === 'in_review') return 'In Review';
  if (s === 'resolved') return 'Resolved';
  return 'New';
}

function normalizeStream(stream) {
  if (!stream) return 'CA Foundation';
  if (stream === 'CA_Foundation') return 'CA Foundation';
  if (stream === 'CA_Intermediate') return 'CA Intermediate';
  if (stream === 'CMA_Foundation') return 'CMA Foundation';
  if (stream === 'CMA_Intermediate') return 'CMA Intermediate';
  return stream;
}

export default function AdminDoubts() {
  const { userProfile, currentUser, isOwner, hasPermission, adminDesignation } = useAuth();
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);

  const canReply = isOwner || hasPermission('reply_doubts');
  const canResolve = isOwner || hasPermission('resolve_doubts');
  const canDelete = isOwner || hasPermission('delete_doubts');

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'New', 'In Review', 'Replied', 'Resolved', 'Unanswered'
  const [streamFilter, setStreamFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Reply state
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Status updating state per doubt
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Delete modal state
  const [deletingId, setDeletingId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Lightbox modal for attachments
  const [lightboxImage, setLightboxImage] = useState(null);

  // Real-time listener: Fetches all submitted doubts across the platform
  useEffect(() => {
    const q = query(collection(db, 'doubts'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Sort client-side by newest first
      docs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (new Date(a.createdAt || 0)).getTime());
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (new Date(b.createdAt || 0)).getTime());
        return timeB - timeA;
      });

      setDoubts(docs);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching doubts in AdminDoubts:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (doubtId, newStatus) => {
    if (!canResolve) {
      alert("Permission Denied: You do not have permission to update or resolve doubts.");
      return;
    }
    try {
      setUpdatingStatusId(doubtId);
      const doubtRef = doc(db, 'doubts', doubtId);
      await updateDoc(doubtRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error updating doubt status:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handlePostReply = async (doubtId, currentStatus) => {
    if (!replyText.trim()) return;

    if (!canReply) {
      alert("Permission Denied: You do not have permission to reply to doubts.");
      return;
    }

    try {
      setSubmittingReply(true);
      const doubtRef = doc(db, 'doubts', doubtId);
      
      // Auto-set status to 'Replied' unless already 'Resolved'
      const nextStatus = currentStatus === 'Resolved' ? 'Resolved' : 'Replied';
      const desig = adminDesignation || (isOwner ? 'Super Admin' : 'Mentor');

      await updateDoc(doubtRef, {
        reply: replyText.trim(),
        repliedBy: desig ? `${userProfile?.name || 'Mentor'} (${desig})` : (userProfile?.name || currentUser?.displayName || 'Faculty Admin'),
        repliedByDesignation: desig,
        repliedAt: serverTimestamp(),
        status: nextStatus,
        updatedAt: serverTimestamp()
      });

      setReplyText('');
      setReplyingId(null);
    } catch (err) {
      console.error("Error posting admin reply:", err);
      alert("Failed to save and send reply.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteDoubt = async () => {
    if (!deletingId) return;

    if (!canDelete) {
      alert("Permission Denied: You do not have permission to delete doubts.");
      setDeletingId(null);
      return;
    }

    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'doubts', deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error("Error deleting doubt:", err);
      alert("Failed to delete doubt.");
    } finally {
      setDeleting(false);
    }
  };

  // Metrics Calculation
  const totalCount = doubts.length;
  const newCount = doubts.filter(d => normalizeStatus(d.status) === 'New' && !d.reply).length;
  const inReviewCount = doubts.filter(d => normalizeStatus(d.status) === 'In Review').length;
  const repliedCount = doubts.filter(d => normalizeStatus(d.status) === 'Replied' || Boolean(d.reply)).length;
  const resolvedCount = doubts.filter(d => normalizeStatus(d.status) === 'Resolved').length;

  // Filter & Search Logic
  const filteredDoubts = doubts.filter(d => {
    const curStatus = normalizeStatus(d.status);
    const curStream = normalizeStream(d.stream);

    // Status Filter
    if (statusFilter === 'Unanswered' && (d.reply || curStatus === 'Resolved')) return false;
    if (statusFilter !== 'ALL' && statusFilter !== 'Unanswered' && curStatus !== statusFilter) return false;

    // Stream Filter
    if (streamFilter !== 'ALL' && curStream !== streamFilter) return false;

    // Doubt Type Filter
    if (typeFilter !== 'ALL' && d.doubtType !== typeFilter) return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = (d.studentName || '').toLowerCase();
      const email = (d.studentEmail || '').toLowerCase();
      const roll = (d.studentRollNumber || '').toLowerCase();
      const sub = (d.subject || '').toLowerCase();
      const topic = (d.chapterTopic || '').toLowerCase();
      const desc = (d.description || d.title || '').toLowerCase();
      const rep = (d.reply || '').toLowerCase();

      return name.includes(q) || email.includes(q) || roll.includes(q) || sub.includes(q) || topic.includes(q) || desc.includes(q) || rep.includes(q);
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-amber-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Admin Control Panel</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Doubt <span className="gold-gradient-text">Management</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Review student academic doubts, syllabus queries, study planner hurdles, and guidance requests. Provide private 1-on-1 replies and manage status from New to Resolved.
          </p>
        </div>
      </div>

      {/* Metrics Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        
        {/* Total Doubts */}
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl glass-card border transition-all cursor-pointer ${
            statusFilter === 'ALL' ? 'border-white/40 ring-1 ring-white/30' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total</span>
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{totalCount}</div>
          <div className="text-[11px] text-slate-400">All submissions</div>
        </div>

        {/* New Doubts (Prominent alert) */}
        <div 
          onClick={() => setStatusFilter('New')}
          className={`p-4 rounded-2xl glass-card border transition-all cursor-pointer relative overflow-hidden ${
            statusFilter === 'New' ? 'border-amber-400 ring-2 ring-amber-400/40 bg-amber-500/10' : 'border-amber-500/30 hover:border-amber-500/50'
          }`}
        >
          {newCount > 0 && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">New</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1">{newCount}</div>
          <div className="text-[11px] text-amber-300/80 font-medium">Needs Attention</div>
        </div>

        {/* In Review */}
        <div 
          onClick={() => setStatusFilter('In Review')}
          className={`p-4 rounded-2xl glass-card border transition-all cursor-pointer ${
            statusFilter === 'In Review' ? 'border-purple-400 ring-2 ring-purple-400/40 bg-purple-500/10' : 'border-purple-500/30 hover:border-purple-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">In Review</span>
            <Eye className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300 mt-1">{inReviewCount}</div>
          <div className="text-[11px] text-purple-300/80">Being evaluated</div>
        </div>

        {/* Replied */}
        <div 
          onClick={() => setStatusFilter('Replied')}
          className={`p-4 rounded-2xl glass-card border transition-all cursor-pointer ${
            statusFilter === 'Replied' ? 'border-emerald-400 ring-2 ring-emerald-400/40 bg-emerald-500/10' : 'border-emerald-500/30 hover:border-emerald-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Replied</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1">{repliedCount}</div>
          <div className="text-[11px] text-emerald-300/80">Answer sent</div>
        </div>

        {/* Resolved */}
        <div 
          onClick={() => setStatusFilter('Resolved')}
          className={`p-4 rounded-2xl glass-card border transition-all cursor-pointer ${
            statusFilter === 'Resolved' ? 'border-sky-400 ring-2 ring-sky-400/40 bg-sky-500/10' : 'border-sky-500/30 hover:border-sky-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">Resolved</span>
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-300 mt-1">{resolvedCount}</div>
          <div className="text-[11px] text-sky-300/80">Closed</div>
        </div>

      </div>

      {/* Filter and Search Bar Toolbar */}
      <div className="p-4 sm:p-5 rounded-3xl glass-card border border-white/10 space-y-4">
        
        {/* Row 1: Search Box & Status Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, roll no, subject, topic, or query..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-950/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Status Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {['ALL', 'New', 'In Review', 'Replied', 'Resolved', 'Unanswered'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  statusFilter === s
                    ? 'bg-amber-500 text-navy-950 font-black shadow-glow-gold'
                    : 'bg-navy-900/60 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

        </div>

        {/* Row 2: Stream Filter & Doubt Type Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
          
          {/* Stream Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Stream:</span>
            <select
              value={streamFilter}
              onChange={(e) => setStreamFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {STREAM_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-navy-950 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Doubt Type Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Help Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {DOUBT_TYPES.map(t => (
                <option key={t} value={t} className="bg-navy-950 text-white">
                  {t === 'ALL' ? 'All Types' : t}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-xs text-slate-400">
            Showing <strong className="text-white">{filteredDoubts.length}</strong> of {totalCount} doubts
          </div>

        </div>

      </div>

      {/* Doubts List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          <span className="text-xs font-semibold">Loading student doubts...</span>
        </div>
      ) : filteredDoubts.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No doubts match the selected filters"
          description={
            searchQuery || statusFilter !== 'ALL' || streamFilter !== 'ALL' || typeFilter !== 'ALL'
              ? 'Try resetting your search query or filters.'
              : 'Student doubt submissions will appear here automatically.'
          }
          actionText="Reset All Filters"
          onAction={() => {
            setStatusFilter('ALL');
            setStreamFilter('ALL');
            setTypeFilter('ALL');
            setSearchQuery('');
          }}
        />
      ) : (
        <div className="space-y-6">
          {filteredDoubts.map((doubt) => {
            const currentStatus = normalizeStatus(doubt.status);
            const isReplying = replyingId === doubt.id;
            const isNew = currentStatus === 'New' && !doubt.reply;

            return (
              <div 
                key={doubt.id}
                className={`p-6 sm:p-7 rounded-3xl glass-card border transition-all space-y-4 shadow-xl relative ${
                  isNew 
                    ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/5 via-navy-900/60 to-navy-950/80 ring-1 ring-amber-400/30' 
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                
                {/* Doubt Card Header: Student Info + Status Changer */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  
                  {/* Student Details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Student Name */}
                      <div className="flex items-center gap-1.5 text-sm sm:text-base font-extrabold text-white">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-navy-950 font-black flex items-center justify-center text-xs shadow-md">
                          {doubt.studentName ? doubt.studentName.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <span>{doubt.studentName || 'Student'}</span>
                      </div>

                      {/* Roll Number (If available) */}
                      {doubt.studentRollNumber && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-navy-900 border border-white/10 text-xs font-mono font-bold text-amber-300">
                          <Hash className="w-3 h-3 text-amber-400" />
                          <span>{doubt.studentRollNumber}</span>
                        </span>
                      )}

                      {/* Email */}
                      {doubt.studentEmail && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{doubt.studentEmail}</span>
                        </span>
                      )}
                    </div>

                    {/* Metadata Tags: Stream, Subject, Chapter/Topic, Doubt Type */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {/* Stream Badge */}
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/30">
                        {normalizeStream(doubt.stream)}
                      </span>

                      {/* Subject */}
                      <span className="px-2.5 py-0.5 rounded-lg bg-royal-500/20 text-royal-300 text-xs font-bold border border-royal-500/30">
                        {doubt.subject}
                      </span>

                      {/* Doubt Type */}
                      <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                        {doubt.doubtType || 'Concept / Study Doubt'}
                      </span>

                      {/* Chapter / Topic if specified */}
                      {doubt.chapterTopic && doubt.chapterTopic !== 'General / Not Specified' && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-white/5 text-slate-300 text-xs border border-white/10">
                          {doubt.chapterTopic}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Status Controls */}
                  <div className="flex items-center gap-3 flex-wrap lg:self-start">
                    
                    {/* Status Changer Buttons */}
                    <div className="flex items-center gap-1 bg-navy-950 p-1 rounded-xl border border-white/10">
                      {STATUS_OPTIONS.map((st) => {
                        const isCurrent = currentStatus === st.id;
                        return (
                          <button
                            key={st.id}
                            onClick={() => handleUpdateStatus(doubt.id, st.id)}
                            disabled={updatingStatusId === doubt.id}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              isCurrent
                                ? `${st.color} font-black shadow-sm`
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                            title={`Set status to ${st.label}`}
                          >
                            <span>{st.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Delete Doubt Button */}
                    <button
                      onClick={() => setDeletingId(doubt.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Doubt"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                  </div>

                </div>

                {/* Submission Date and Time */}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Submitted on: <strong className="text-slate-300">{formatDate(doubt.createdAt)}</strong></span>
                  </span>
                  {doubt.updatedAt && (
                    <span className="text-slate-500 hidden sm:inline">
                      Last Updated: {formatDate(doubt.updatedAt)}
                    </span>
                  )}
                </div>

                {/* Student's Complete Message */}
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Student Query / Problem:
                  </div>
                  <p className="text-sm text-slate-200 bg-navy-950/70 p-4 rounded-2xl border border-white/5 leading-relaxed whitespace-pre-wrap font-sans">
                    {doubt.description || doubt.title}
                  </p>
                </div>

                {/* Attachment, if uploaded */}
                {(doubt.attachmentUrl || (doubt.uploadedImages && doubt.uploadedImages.length > 0)) && (
                  <div className="space-y-2 pt-1">
                    <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Attachment from Student:</span>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {doubt.attachmentUrl ? (
                        <div className="relative group">
                          <img
                            src={doubt.attachmentUrl}
                            alt="Attachment"
                            onClick={() => setLightboxImage(doubt.attachmentUrl)}
                            className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-80 transition-opacity shadow-md"
                          />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-navy-950/80 text-[10px] text-slate-300 pointer-events-none border border-white/10">
                            Full View
                          </span>
                        </div>
                      ) : (
                        doubt.uploadedImages?.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Attachment ${idx + 1}`}
                            onClick={() => setLightboxImage(url)}
                            className="w-24 h-24 object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-80 transition-opacity shadow-md"
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Official Admin Reply Display (If already replied) */}
                {doubt.reply && !isReplying && (
                  <div className="mt-4 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5 shadow-md">
                    <div className="flex items-center justify-between text-xs text-emerald-300 font-bold flex-wrap gap-2 border-b border-emerald-500/20 pb-2">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-gold-400" />
                        <span>Official Admin Solution by {doubt.repliedBy || 'Faculty'}</span>
                      </span>
                      <span className="text-slate-400 font-normal">
                        Replied on: {formatDate(doubt.repliedAt)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">
                      {doubt.reply}
                    </p>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          setReplyingId(doubt.id);
                          setReplyText(doubt.reply);
                        }}
                        className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Edit Official Reply</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Reply Trigger Button (When not yet replied and not in replying mode) */}
                {!doubt.reply && !isReplying && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setReplyingId(doubt.id);
                        setReplyText('');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 text-navy-950 font-black text-xs shadow-glow-gold hover:bg-amber-400 flex items-center gap-2 transition-all"
                    >
                      <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                      <span>Reply to Student</span>
                    </button>
                  </div>
                )}

                {/* Admin Reply Form (When expanded for creating or editing reply) */}
                {isReplying && (
                  <div className="mt-4 p-5 rounded-2xl bg-navy-900 border border-amber-500/30 space-y-3 shadow-lg animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs font-bold text-white border-b border-white/10 pb-2">
                      <span className="flex items-center gap-1.5 text-amber-300">
                        <MessageSquare className="w-4 h-4" />
                        <span>Write Official Reply / Guidance to {doubt.studentName}</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Visible privately only to this student
                      </span>
                    </div>

                    <textarea
                      rows="5"
                      required
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write your comprehensive academic explanation, step-by-step guidance, study schedule advice, or solution here..."
                      className="w-full p-4 rounded-xl bg-navy-950 border border-white/10 text-white placeholder-slate-500 text-sm leading-relaxed focus:outline-none focus:border-amber-400 transition-colors resize-y"
                    />

                    <div className="flex items-center justify-end gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingId(null);
                          setReplyText('');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        disabled={submittingReply || !replyText.trim()}
                        onClick={() => handlePostReply(doubt.id, currentStatus)}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-navy-950 text-xs font-black shadow-glow-gold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {submittingReply ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending Reply...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Save & Publish Reply to Student</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-7 rounded-3xl border border-red-500/30 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span>Delete Doubt Record?</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this doubt record? This action cannot be undone.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button 
                onClick={() => setDeletingId(null)} 
                disabled={deleting}
                className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteDoubt} 
                disabled={deleting}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-glow-rose disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Attachment Full View */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-navy-950/95 backdrop-blur-md" 
          onClick={() => setLightboxImage(null)}
        >
          <div className="max-w-4xl w-full space-y-3 max-h-[95vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white pb-2 border-b border-white/10">
              <span className="text-sm font-bold text-amber-300">Attachment Full View</span>
              <button 
                onClick={() => setLightboxImage(null)} 
                className="text-slate-400 hover:text-white font-black text-2xl transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto max-h-[85vh] w-full flex items-center justify-center">
              <img 
                src={lightboxImage} 
                alt="Full attachment preview" 
                className="max-w-full max-h-[80vh] rounded-2xl border border-white/15 shadow-2xl object-contain" 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
