import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  increment 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/helpers';
import { getStreamId, calculateStudentLevel } from '../utils/levelSystem';
import { SYLLABUS_DATA } from '../data/syllabusData';
import EmptyState from '../components/EmptyState';
import { 
  HelpCircle, 
  Plus, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  Send, 
  Upload, 
  Eye, 
  X, 
  Image as ImageIcon, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Filter, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';

const IMGBB_KEY = 'f43ca36cbb4a3e5de80d145fb53cbfff';

export const STREAM_LABELS = {
  CA_Foundation: 'CA Foundation',
  CA_Intermediate: 'CA Intermediate',
  CMA_Foundation: 'CMA Foundation',
  CMA_Intermediate: 'CMA Intermediate'
};

export function getSubjectsForStream(streamId) {
  const parts = (streamId || 'CA_Foundation').split('_');
  const course = parts[0] === 'CMA' ? 'CMA' : 'CA';
  const level = parts[1] === 'Intermediate' ? 'Intermediate' : 'Foundation';
  const list = SYLLABUS_DATA?.[course]?.[level];
  if (Array.isArray(list) && list.length > 0) {
    return list.map(item => item.subject);
  }
  return course === 'CMA' ? [
    'Financial Accounting',
    'Cost Accounting',
    'Laws & Ethics',
    'Direct & Indirect Taxation'
  ] : [
    'Accounting',
    'Business Law',
    'Quantitative Aptitude',
    'Business Economics'
  ];
}

async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append('key', IMGBB_KEY);
  formData.append('image', file);
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
  const data = await res.json();
  if (data.success) return data.data.url;
  throw new Error(data?.error?.message || 'Image upload failed');
}

/**
 * Community Discussion & Comments Thread for a Doubt
 */
function DoubtCommentsThread({ doubt, currentUser, userProfile, isAdmin, levelInfo, onOpenLightbox }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const commentFileInputRef = useRef(null);

  // Real-time listener for comments on this doubt
  useEffect(() => {
    const commentsRef = collection(db, 'doubts', doubt.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setComments(list);
      setLoading(false);
    }, (err) => {
      console.error("Comments listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [doubt.id]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('Please select a valid image file (JPG, PNG, WEBP, GIF).');
      if (commentFileInputRef.current) commentFileInputRef.current.value = '';
      return;
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('Image file size must be less than 5MB.');
      if (commentFileInputRef.current) commentFileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    if (commentFileInputRef.current) {
      commentFileInputRef.current.value = '';
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() && !selectedFile) {
      alert('Please enter a comment or attach an image.');
      return;
    }

    try {
      setSubmitting(true);
      let uploadedImageUrl = null;

      if (selectedFile) {
        setUploadProgressText('Uploading image...');
        uploadedImageUrl = await uploadToImgBB(selectedFile);
      }

      setUploadProgressText('Posting comment...');

      const authorBadge = isAdmin ? '🛡️' : (levelInfo?.currentLevelObj?.badge || '🌱');
      const authorLevelName = isAdmin ? 'Faculty / Admin' : (levelInfo?.currentLevelObj?.levelName || 'Seed');
      const studentStream = getStreamId(userProfile?.course, userProfile?.level);

      const commentsRef = collection(db, 'doubts', doubt.id, 'comments');
      await addDoc(commentsRef, {
        doubtId: doubt.id,
        uid: currentUser.uid,
        authorName: userProfile?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student',
        authorEmail: currentUser?.email || '',
        authorBadge,
        authorLevelName,
        authorRole: isAdmin ? 'admin' : 'student',
        stream: doubt.stream || studentStream,
        text: commentText.trim(),
        imageUrl: uploadedImageUrl,
        createdAt: serverTimestamp()
      });

      // Update parent doubt comment counter
      const doubtRef = doc(db, 'doubts', doubt.id);
      await updateDoc(doubtRef, {
        commentsCount: increment(1),
        lastCommentAt: serverTimestamp()
      });

      // Reset form
      setCommentText('');
      handleRemoveFile();
    } catch (err) {
      console.error("Error submitting comment:", err);
      alert("Failed to submit comment. Please check your internet connection.");
    } finally {
      setSubmitting(false);
      setUploadProgressText('');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      setDeletingCommentId(commentId);
      await deleteDoc(doc(db, 'doubts', doubt.id, 'comments', commentId));
      await updateDoc(doc(db, 'doubts', doubt.id), {
        commentsCount: increment(-1)
      });
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert("Failed to delete comment.");
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <div className="pt-4 border-t border-white/10 space-y-4">
      {/* Thread Title */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
        <span className="flex items-center gap-1.5 text-royal-300">
          <MessageSquare className="w-4 h-4 text-royal-400" />
          Community Discussion ({comments.length})
        </span>
        <span className="text-[11px] text-slate-500">
          Peer solutions & discussions
        </span>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center py-6 text-slate-400 gap-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Loading comments...</span>
        </div>
      ) : comments.length === 0 ? (
        <div className="py-5 px-4 rounded-2xl bg-navy-950/40 border border-white/5 text-center text-xs text-slate-400">
          No comments yet. Be the first classmate to share a solution or tip!
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isCommentAuthor = currentUser?.uid === comment.uid;
            const canDelete = isCommentAuthor || isAdmin;
            const isFacultyComment = comment.authorRole === 'admin';

            return (
              <div 
                key={comment.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isFacultyComment 
                    ? 'bg-amber-500/10 border-amber-500/30' 
                    : 'bg-navy-950/70 border-white/5'
                }`}
              >
                {/* Comment Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {/* User Avatar Initial */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-md ${
                      isFacultyComment 
                        ? 'bg-gradient-to-tr from-amber-500 to-amber-600 text-navy-950' 
                        : 'bg-gradient-to-tr from-royal-600 to-royal-800 text-white'
                    }`}>
                      {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'S'}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white">
                          {comment.authorName}
                        </span>

                        {/* Gamification Badge & Level */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isFacultyComment 
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                            : 'bg-royal-500/20 text-royal-300 border-royal-500/30'
                        }`}>
                          <span>{comment.authorBadge || '🌱'}</span>
                          <span>{comment.authorLevelName || 'Seed'}</span>
                        </span>

                        {isFacultyComment && (
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                            • Faculty
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={deletingCommentId === comment.id}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-colors"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Comment Text */}
                {comment.text && (
                  <p className="mt-2 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap pl-10">
                    {comment.text}
                  </p>
                )}

                {/* Comment Attached Image */}
                {comment.imageUrl && (
                  <div className="mt-3 pl-10">
                    <div className="inline-block relative group">
                      <img
                        src={comment.imageUrl}
                        alt="Comment attachment"
                        onClick={() => onOpenLightbox(comment.imageUrl)}
                        className="max-h-48 max-w-full rounded-xl border border-white/10 object-cover cursor-pointer hover:opacity-90 hover:border-amber-400/50 transition-all shadow-md"
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-navy-950/80 text-[10px] text-slate-300 pointer-events-none flex items-center gap-1 border border-white/10">
                        <Eye className="w-3 h-3 text-amber-400" /> Click to view
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Comment Input Form */}
      <form onSubmit={handlePostComment} className="pt-2 space-y-3">
        <div className="p-3.5 rounded-2xl bg-navy-900 border border-white/10 focus-within:border-royal-500 transition-colors">
          <textarea
            rows="2"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your solution step, formula explanation, or thought..."
            className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
          />

          {/* Image Preview Box Before Sending */}
          {previewUrl && (
            <div className="relative mt-2 inline-block">
              <img
                src={previewUrl}
                alt="Selected attachment preview"
                className="w-20 h-20 object-cover rounded-xl border-2 border-amber-400/60 shadow-lg"
              />
              <button
                type="button"
                onClick={handleRemoveFile}
                className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full p-1 shadow-md transition-transform hover:scale-110"
                title="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2">
            <div className="flex items-center gap-2">
              <input
                ref={commentFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => commentFileInputRef.current?.click()}
                disabled={submitting}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  selectedFile 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>{selectedFile ? 'Change Photo' : 'Attach Photo'}</span>
              </button>
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                Max 5MB (PNG/JPG/WEBP)
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting || (!commentText.trim() && !selectedFile)}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-royal-600 to-royal-500 hover:from-royal-500 hover:to-royal-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-glow-blue disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{uploadProgressText || 'Posting...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Reply</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function Doubts() {
  const { userProfile, currentUser, isAdmin, levelInfo } = useAuth();

  // Student's authenticated stream (cannot be changed by student)
  const studentStream = getStreamId(userProfile?.course, userProfile?.level);
  const streamDisplayName = STREAM_LABELS[studentStream] || 'CA Foundation';

  // Admin stream filter (only admins can filter across streams)
  const [adminStreamFilter, setAdminStreamFilter] = useState('ALL');

  // Subjects dynamically matching stream
  const subjects = getSubjectsForStream(studentStream);

  const [doubts, setDoubts] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'my_doubts', 'unanswered'
  const [showAskModal, setShowAskModal] = useState(false);
  const [expandedDoubtIds, setExpandedDoubtIds] = useState(new Set());

  // New Doubt Form
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(subjects[0] || 'Accounting');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // File uploads for doubt
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  // Full size image Lightbox Modal
  const [lightboxImage, setLightboxImage] = useState(null);

  // Reply Form Modal / Inline State (Faculty / Admin Only)
  const [replyingDoubtId, setReplyingDoubtId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  // Reset subject when subjects change
  useEffect(() => {
    if (subjects.length > 0 && !subjects.includes(subject)) {
      setSubject(subjects[0]);
    }
  }, [studentStream, subjects]);

  // Real-time listener for doubts with strict stream filtering
  useEffect(() => {
    let q;
    if (isAdmin && adminStreamFilter === 'ALL') {
      // Admin viewing all doubts
      q = query(collection(db, 'doubts'));
    } else if (isAdmin && adminStreamFilter !== 'ALL') {
      // Admin filtering a specific stream
      q = query(collection(db, 'doubts'), where('stream', '==', adminStreamFilter));
    } else {
      // Student viewing ONLY their own stream
      q = query(collection(db, 'doubts'), where('stream', '==', studentStream));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Sort client-side by newest first (avoids missing composite index requirement in Firestore)
      docs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return timeB - timeA;
      });

      setDoubts(docs);
    }, (err) => {
      console.error("Doubts listener error:", err);
    });

    return () => unsubscribe();
  }, [studentStream, isAdmin, adminStreamFilter]);

  const toggleExpandDoubt = (id) => {
    setExpandedDoubtIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(p => [...p, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrls(p => [...p, { url: reader.result, name: file.name }]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (i) => {
    setSelectedFiles(p => p.filter((_, idx) => idx !== i));
    setPreviewUrls(p => p.filter((_, idx) => idx !== i));
  };

  const resetAskModal = () => {
    setTitle('');
    setDescription('');
    setSelectedFiles([]);
    setPreviewUrls([]);
    setShowAskModal(false);
  };

  const handleAskDoubt = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      setSubmitting(true);

      // Upload attached images if any
      let imageUrls = [];
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const url = await uploadToImgBB(file);
          imageUrls.push(url);
        }
      }

      const parts = studentStream.split('_');
      const courseKey = parts[0] === 'CMA' ? 'CMA' : 'CA';
      const levelKey = parts[1] === 'Intermediate' ? 'Intermediate' : 'Foundation';

      const authorBadge = levelInfo?.currentLevelObj?.badge || '🌱';
      const authorLevelName = levelInfo?.currentLevelObj?.levelName || 'Seed';

      await addDoc(collection(db, 'doubts'), {
        uid: currentUser.uid,
        studentName: userProfile?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student',
        studentEmail: currentUser?.email || '',
        studentBadge: authorBadge,
        studentLevelName: authorLevelName,
        title: title.trim(),
        subject,
        description: description.trim(),
        uploadedImages: imageUrls,
        status: 'open',
        reply: null,
        repliedBy: null,
        repliedAt: null,
        createdAt: serverTimestamp(),
        stream: studentStream, // e.g., 'CA_Foundation'
        course: courseKey,
        level: levelKey,
        commentsCount: 0
      });

      resetAskModal();
    } catch (err) {
      console.error("Error asking doubt:", err);
      alert("Failed to submit doubt. Please check your network connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (doubtId) => {
    if (!replyText.trim()) return;

    try {
      setReplying(true);
      const doubtRef = doc(db, 'doubts', doubtId);
      await updateDoc(doubtRef, {
        reply: replyText.trim(),
        repliedBy: userProfile?.name || 'CA/CMA Faculty',
        status: 'answered',
        repliedAt: serverTimestamp()
      });

      setReplyText('');
      setReplyingDoubtId(null);
    } catch (err) {
      console.error("Error submitting reply:", err);
      alert("Failed to post reply.");
    } finally {
      setReplying(false);
    }
  };

  const filteredDoubts = doubts.filter(d => {
    if (filter === 'my_doubts') return d.uid === currentUser?.uid;
    if (filter === 'unanswered') return d.status === 'open';
    return true;
  });

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-amber-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Academic Q&A Portal</span>
              </div>

              {/* Stream Badge Indicator */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-royal-500/20 text-royal-300 text-xs font-bold border border-royal-500/30">
                <Sparkles className="w-3.5 h-3.5 text-royal-400" />
                <span>Stream: {streamDisplayName}</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Academic <span className="gold-gradient-text">Doubts & Community Discussion</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
              Ask doubts with photos, solve peer queries, and get verified step-by-step solutions from faculty for <strong className="text-amber-300">{streamDisplayName}</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowAskModal(true)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-navy-950 font-black text-sm shadow-glow-gold flex items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>Ask Academic Doubt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Stream Selector (Only visible to platform Admins) */}
      {isAdmin && (
        <div className="p-4 rounded-2xl bg-navy-900/80 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <Filter className="w-4 h-4" />
            <span>Admin Stream Filter:</span>
          </div>
          <select
            value={adminStreamFilter}
            onChange={(e) => setAdminStreamFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-navy-950 border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
          >
            <option value="ALL">All Streams (Overview)</option>
            <option value="CA_Foundation">CA Foundation</option>
            <option value="CA_Intermediate">CA Intermediate</option>
            <option value="CMA_Foundation">CMA Foundation</option>
            <option value="CMA_Intermediate">CMA Intermediate</option>
          </select>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2 p-1.5 rounded-2xl glass-card border border-white/10">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === 'all' ? 'bg-royal-600 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Doubts ({doubts.length})
          </button>
          <button
            onClick={() => setFilter('my_doubts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === 'my_doubts' ? 'bg-royal-600 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'
            }`}
          >
            My Doubts ({doubts.filter(d => d.uid === currentUser?.uid).length})
          </button>
          <button
            onClick={() => setFilter('unanswered')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === 'unanswered' ? 'bg-royal-600 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending Faculty Reply ({doubts.filter(d => d.status === 'open').length})
          </button>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Showing exclusive doubts for <span className="text-amber-400 font-bold">{isAdmin && adminStreamFilter !== 'ALL' ? STREAM_LABELS[adminStreamFilter] : streamDisplayName}</span>
        </div>
      </div>

      {/* Doubts List */}
      {filteredDoubts.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title={`No doubts found in ${streamDisplayName}`}
          description="Have a question or concept problem? Submit your academic doubt now with optional photos to discuss with peers & faculty."
          actionText="Ask a Doubt"
          onAction={() => setShowAskModal(true)}
        />
      ) : (
        <div className="space-y-6">
          {filteredDoubts.map((doubt) => {
            const isExpanded = expandedDoubtIds.has(doubt.id);

            return (
              <div 
                key={doubt.id} 
                className="p-6 rounded-3xl glass-card border border-white/10 hover:border-amber-500/30 transition-all space-y-4"
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-lg bg-royal-500/20 text-royal-300 text-xs font-bold border border-royal-500/30">
                        {doubt.subject}
                      </span>

                      {/* Author Info with Level Badge */}
                      <span className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                        <span>Asked by</span>
                        <strong className="text-white">{doubt.studentName}</strong>
                        {doubt.studentBadge && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            <span>{doubt.studentBadge}</span>
                            <span>{doubt.studentLevelName || 'Seed'}</span>
                          </span>
                        )}
                        <span>• {formatDate(doubt.createdAt)}</span>
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white pt-1">{doubt.title}</h3>
                  </div>

                  <div>
                    {doubt.status === 'answered' ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        Answered by Faculty
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Pending Faculty Reply
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Description */}
                <p className="text-sm text-slate-300 bg-navy-950/60 p-4 rounded-2xl border border-white/5 leading-relaxed whitespace-pre-wrap">
                  {doubt.description}
                </p>

                {/* Uploaded Question Photos (If Any) */}
                {doubt.uploadedImages?.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> Attached Photo Question:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {doubt.uploadedImages.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={url}
                            alt={`Doubt Attachment ${idx + 1}`}
                            onClick={() => setLightboxImage(url)}
                            className="w-24 h-24 object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-80 transition-opacity shadow-md"
                          />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-navy-950/80 text-[9px] text-slate-300 pointer-events-none border border-white/10">
                            Full Size
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verified Faculty Solution Banner (If Answered) */}
                {doubt.reply && (
                  <div className="p-5 rounded-2xl bg-royal-600/10 border border-royal-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs text-royal-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-gold-400" />
                        Official Faculty Solution by {doubt.repliedBy}
                      </span>
                      <span className="text-slate-400 font-normal">{formatDate(doubt.repliedAt)}</span>
                    </div>
                    <p className="text-sm text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">
                      {doubt.reply}
                    </p>
                  </div>
                )}

                {/* Faculty / Admin Reply Form */}
                {isAdmin && !doubt.reply && (
                  <div className="pt-1">
                    {replyingDoubtId === doubt.id ? (
                      <div className="space-y-3 p-4 rounded-2xl bg-navy-900 border border-white/15">
                        <textarea
                          rows="3"
                          placeholder="Write official faculty answer..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="w-full p-3 rounded-xl bg-navy-950 border border-white/10 text-white text-sm focus:outline-none focus:border-royal-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setReplyingDoubtId(null)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSubmitReply(doubt.id)}
                            disabled={replying}
                            className="px-5 py-2 rounded-xl bg-royal-600 hover:bg-royal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-glow-blue"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{replying ? 'Posting...' : 'Post Faculty Solution'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setReplyingDoubtId(doubt.id);
                          setReplyText('');
                        }}
                        className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 py-1"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Reply as Faculty / Admin</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Toggle Community Discussion Button */}
                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => toggleExpandDoubt(doubt.id)}
                    className="flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>
                      {isExpanded ? 'Hide Discussion' : `Community Discussion (${doubt.commentsCount || 0})`}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  <span className="text-[11px] text-slate-500">
                    Stream: <strong className="text-slate-400">{STREAM_LABELS[doubt.stream] || streamDisplayName}</strong>
                  </span>
                </div>

                {/* Expandable Community Comments & Solutions Thread */}
                {isExpanded && (
                  <DoubtCommentsThread
                    doubt={doubt}
                    currentUser={currentUser}
                    userProfile={userProfile}
                    isAdmin={isAdmin}
                    levelInfo={levelInfo}
                    onOpenLightbox={(url) => setLightboxImage(url)}
                  />
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Ask Doubt Modal */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-md w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-amber-400" />
                  <span>Submit Academic Doubt</span>
                </h3>
                <p className="text-xs text-amber-300 font-semibold">
                  Posting to: {streamDisplayName}
                </p>
              </div>
              <button onClick={resetAskModal} className="text-slate-400 hover:text-white font-bold text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleAskDoubt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Question Title / Topic *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Question on Consignment Accounting entry or Section 42"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Subject *
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Detailed Explanation of Doubt *
                </label>
                <textarea
                  rows="4"
                  required
                  placeholder="Describe your exact question, step confusion, or formula issue..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 resize-none"
                ></textarea>
              </div>

              {/* Photo Upload Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Attach Photo / Screenshot (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Attach Question Photo</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {previewUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {previewUrls.map((item, idx) => (
                      <div key={idx} className="relative group aspect-square">
                        <img
                          src={item.url}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-xl border border-white/10"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 opacity-90 hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={resetAskModal}
                  className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-amber-500 text-navy-950 text-sm font-black shadow-glow-gold hover:bg-amber-400 disabled:opacity-50"
                >
                  {submitting ? 'Uploading & Posting...' : 'Post Doubt'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Global Image Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-navy-950/95 backdrop-blur-md" 
          onClick={() => setLightboxImage(null)}
        >
          <div className="max-w-4xl w-full space-y-3 max-h-[95vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white pb-2 border-b border-white/10">
              <span className="text-sm font-bold text-amber-300">Image Full View</span>
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
                alt="Full preview" 
                className="max-w-full max-h-[80vh] rounded-2xl border border-white/15 shadow-2xl object-contain" 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
