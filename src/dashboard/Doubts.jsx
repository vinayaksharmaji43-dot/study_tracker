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
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/helpers';
import { getStreamId, STREAM_LABELS } from '../utils/levelSystem';
import { uploadDoubtImage, uploadDoubtAudio } from '../utils/fileUploadHelper';
import { SYLLABUS_DATA } from '../data/syllabusData';
import EmptyState from '../components/EmptyState';
import { 
  HelpCircle, 
  Plus, 
  Send, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  BookOpen, 
  Calendar, 
  Eye, 
  X, 
  Lock, 
  FileText,
  Search,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  Mic,
  Square,
  Trash2,
  Users,
  Volume2,
  RefreshCw
} from 'lucide-react';

export const STREAMS = [
  'CA Foundation',
  'CA Intermediate',
  'CMA Foundation',
  'CMA Intermediate'
];

export const HELP_TYPES = [
  {
    id: 'Concept / Study Doubt',
    label: 'Concept / Study Doubt',
    description: 'Formulas, concepts, journal entries, theoretical questions & step confusion',
    icon: HelpCircle,
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  },
  {
    id: 'Syllabus Incomplete',
    label: 'Syllabus Incomplete',
    description: 'Backlog recovery, chapter priority, sequence advice & syllabus coverage',
    icon: BookOpen,
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  {
    id: 'Study Planner / Planning',
    label: 'Study Planner / Planning',
    description: 'Daily study schedules, revision timetable, mock test planning & hours balance',
    icon: Calendar,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  },
  {
    id: 'General Guidance',
    label: 'General Guidance',
    description: 'Exam strategy, fear/stress, attempt planning, or non-academic guidance',
    icon: Sparkles,
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  }
];

export function getSubjectsForStream(stream) {
  if (stream === 'CA Foundation' || stream === 'CA_Foundation') {
    return [
      'Accounting',
      'Business Law',
      'Business Economics',
      'Quantitative Aptitude',
      'General / Other / Multiple Subjects'
    ];
  }
  if (stream === 'CA Intermediate' || stream === 'CA_Intermediate') {
    return [
      'Paper 1 — Advanced Accounting',
      'Paper 2 — Corporate and Other Laws',
      'Paper 3 — Taxation',
      'Paper 4 — Cost and Management Accounting',
      'Paper 5 — Auditing and Ethics',
      'Paper 6 — Financial Management and Strategic Management',
      'General / Other / Multiple Subjects'
    ];
  }
  if (stream === 'CMA Foundation' || stream === 'CMA_Foundation') {
    return [
      'Paper 1 — Fundamentals of Business Laws and Business Communication',
      'Paper 2 — Fundamentals of Financial and Cost Accounting',
      'Paper 3 — Fundamentals of Business Mathematics and Statistics',
      'Paper 4 — Fundamentals of Business Economics and Management',
      'General / Other / Multiple Subjects'
    ];
  }
  if (stream === 'CMA Intermediate' || stream === 'CMA_Intermediate') {
    return [
      'Paper 5 — Business Laws and Ethics',
      'Paper 6 — Financial Accounting',
      'Paper 7 — Direct and Indirect Taxation',
      'Paper 8 — Cost Accounting',
      'Paper 9 — Operations Management and Strategic Management',
      'Paper 10 — Corporate Accounting and Auditing',
      'Paper 11 — Financial Management and Business Data Analytics',
      'Paper 12 — Management Accounting',
      'General / Other / Multiple Subjects'
    ];
  }
  return [
    'Accounting',
    'Law',
    'Taxation',
    'Costing',
    'General / Other'
  ];
}

/**
 * Fast client-side image compression using HTML5 Canvas.
 * Compresses any image into a sharp ~40-80KB JPEG Data URL in <100ms.
 */
function compressImageToDataUrl(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = readerEvent.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Helper to convert Audio Blob to base64 Data URL
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Bulletproof Stream matcher supporting both underscore and space-separated formats
 */
export function isStreamMatch(s1, s2) {
  if (!s1 || !s2) return false;
  const a = s1.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = s2.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (a === b) return true;
  if (a.includes('foundation') && b.includes('foundation')) {
    if ((a.startsWith('ca') && b.startsWith('ca')) || (a.startsWith('cma') && b.startsWith('cma'))) return true;
  }
  if (a.includes('inter') && b.includes('inter')) {
    if ((a.startsWith('ca') && b.startsWith('ca')) || (a.startsWith('cma') && b.startsWith('cma'))) return true;
  }
  if (a.includes('final') && b.includes('final')) {
    if ((a.startsWith('ca') && b.startsWith('ca')) || (a.startsWith('cma') && b.startsWith('cma'))) return true;
  }
  return false;
}

/**
 * Community Discussion & Replies Thread for a specific doubt
 */
function DoubtCommunityRepliesThread({ doubt, currentUser, userProfile, isAdmin, onOpenLightbox }) {
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState(null);
  const [replyImagePreview, setReplyImagePreview] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const replyFileInputRef = useRef(null);

  useEffect(() => {
    if (!doubt?.id) return;
    const repliesRef = collection(db, 'communityDoubts', doubt.id, 'replies');
    const q = query(repliesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setReplies(list);
      setLoadingReplies(false);
    }, (err) => {
      console.error('Error fetching replies:', err);
      setLoadingReplies(false);
    });

    return () => unsubscribe();
  }, [doubt?.id]);

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToDataUrl(file);
      setReplyImage(compressed);
      setReplyImagePreview(compressed);
    } catch (err) {
      console.error('Image compression failed:', err);
    }
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && !replyImage) return;

    try {
      setSubmittingReply(true);

      const replyData = {
        authorUid: currentUser.uid,
        authorName: userProfile?.name || currentUser?.displayName || 'Student',
        authorBadge: userProfile?.badge || '🎓',
        authorCourse: userProfile?.course || '',
        text: replyText.trim(),
        imageUrl: replyImage || null,
        createdAt: serverTimestamp()
      };

      // Add to subcollection
      await addDoc(collection(db, 'communityDoubts', doubt.id, 'replies'), replyData);

      // Update parent doubt: increment reply count and set answerStatus
      const doubtRef = doc(db, 'communityDoubts', doubt.id);
      await updateDoc(doubtRef, {
        replyCount: increment(1),
        answerStatus: 'answered',
        lastActivityAt: serverTimestamp()
      });

      setReplyText('');
      setReplyImage(null);
      setReplyImagePreview('');
      if (replyFileInputRef.current) replyFileInputRef.current.value = '';
    } catch (err) {
      console.error('Failed to post reply:', err);
      alert('Could not submit reply. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm('Delete this solution?')) return;
    try {
      await deleteDoc(doc(db, 'communityDoubts', doubt.id, 'replies', replyId));
      await updateDoc(doc(db, 'communityDoubts', doubt.id), {
        replyCount: increment(-1)
      });
    } catch (err) {
      console.error('Error deleting reply:', err);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
      {/* Existing Replies List */}
      {loadingReplies ? (
        <div className="flex items-center justify-center py-4 text-xs text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Loading community solutions...</span>
        </div>
      ) : replies.length === 0 ? (
        <div className="p-4 rounded-xl bg-navy-950/40 border border-white/5 text-center text-xs text-slate-400">
          No answers posted yet. Be the first student to help solve this doubt!
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Community Solutions & Explanations ({replies.length}):</span>
          </div>

          {replies.map((rep) => {
            const isAuthor = currentUser?.uid === rep.authorUid;
            return (
              <div 
                key={rep.id}
                className="p-3.5 rounded-2xl bg-navy-950/70 border border-white/5 space-y-2 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black flex items-center justify-center">
                      {(rep.authorName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-slate-200">
                      {rep.authorName || 'Fellow Student'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      • {formatDate(rep.createdAt)}
                    </span>
                  </div>

                  {(isAuthor || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteReply(rep.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      title="Delete your reply"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {rep.text && (
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap pl-8">
                    {rep.text}
                  </p>
                )}

                {rep.imageUrl && (
                  <div className="pl-8 pt-1">
                    <img
                      src={rep.imageUrl}
                      alt="Solution attachment"
                      onClick={() => onOpenLightbox(rep.imageUrl)}
                      className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-85 transition-opacity"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Composer Form */}
      <form onSubmit={handlePostReply} className="space-y-2.5 pt-2">
        <div className="relative">
          <textarea
            rows="2"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your explanation or solution to help..."
            className="w-full px-4 py-2.5 rounded-2xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-all resize-none"
          />
        </div>

        {replyImagePreview && (
          <div className="relative inline-block">
            <img
              src={replyImagePreview}
              alt="Reply preview"
              className="w-16 h-16 object-cover rounded-xl border border-white/10"
            />
            <button
              type="button"
              onClick={() => {
                setReplyImage(null);
                setReplyImagePreview('');
                if (replyFileInputRef.current) replyFileInputRef.current.value = '';
              }}
              className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => replyFileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/5"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Attach Solution Photo</span>
          </button>
          <input
            ref={replyFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          <button
            type="submit"
            disabled={submittingReply || (!replyText.trim() && !replyImage)}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-glow-emerald cursor-pointer"
          >
            {submittingReply ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Post Solution</span>
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Main Doubts Component
 * Seamlessly provides:
 * 1. Stream-wise Community Doubt Feed (peer discussion, audio recording, image upload, replies, likes)
 * 2. 1-on-1 Guidance with Admin (private faculty doubt submission)
 */
export default function Doubts() {
  const { currentUser, userProfile, isAdmin } = useAuth();

  // Top Section Switcher: 'community' (default) or 'admin_guidance'
  const [mainTab, setMainTab] = useState('community');

  // Auto-detect student stream from registered profile (LOCKED strictly to student's stream)
  const studentStreamId = getStreamId(userProfile?.course || userProfile?.stream, userProfile?.level) || 'CA_Foundation';
  const streamDisplayName = STREAM_LABELS[studentStreamId] || userProfile?.stream || 'CA Foundation';

  // ==========================================
  // COMMUNITY DOUBTS STATE
  // ==========================================
  const [communityDoubts, setCommunityDoubts] = useState([]);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [communitySearch, setCommunitySearch] = useState('');
  const [communityStatusFilter, setCommunityStatusFilter] = useState('all'); // 'all', 'unanswered', 'answered'
  const [communitySubjectFilter, setCommunitySubjectFilter] = useState('all');
  const [expandedDoubtId, setExpandedDoubtId] = useState(null);

  // Ask Doubt Modal State
  const [showAskModal, setShowAskModal] = useState(false);
  const [askSubject, setAskSubject] = useState('');
  const [askChapter, setAskChapter] = useState('');
  const [askTitle, setAskTitle] = useState('');
  const [askDescription, setAskDescription] = useState('');
  const [askImageFile, setAskImageFile] = useState(null);
  const [askImagePreview, setAskImagePreview] = useState('');
  const [submittingDoubt, setSubmittingDoubt] = useState(false);
  const [publishProgress, setPublishProgress] = useState(''); // 'uploading_media' | 'saving_record' | ''
  const [publishSuccessBanner, setPublishSuccessBanner] = useState('');
  const isSubmittingRef = useRef(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [audioDataUrl, setAudioDataUrl] = useState('');
  const mediaRecorderRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);

  const askImageInputRef = useRef(null);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState(null);

  // Set default subject when stream is resolved
  useEffect(() => {
    const subs = getSubjectsForStream(studentStreamId);
    if (subs.length > 0 && !askSubject) {
      setAskSubject(subs[0]);
    }
  }, [studentStreamId]);

  // ==========================================
  // REAL-TIME LISTENER: COMMUNITY DOUBTS (STREAM-LOCKED & BULLETPROOF)
  // ==========================================
  useEffect(() => {
    setLoadingCommunity(true);
    // Listen to all communityDoubts in real-time, avoid compound index errors
    const q = query(collection(db, 'communityDoubts'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allList = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      // STRICT STREAM ISOLATION & STATUS FILTER:
      // A student ONLY receives published doubts belonging to their stream
      const filtered = allList.filter((d) => {
        // Stream isolation check
        const matchStream = isStreamMatch(d.stream, studentStreamId) || 
                            isStreamMatch(d.streamLabel, streamDisplayName) ||
                            isStreamMatch(d.stream, streamDisplayName);
        if (!matchStream) return false;

        // Status check: only published doubts appear in the student feed
        // (Accept 'published', 'Published', and legacy 'unanswered'/'answered'; strictly exclude 'hidden', 'deleted', 'pending')
        const st = (d.status || 'published').toLowerCase().trim();
        if (st === 'hidden' || st === 'deleted' || st === 'pending') {
          return false;
        }

        return true;
      });

      // Sort client-side by newest first
      filtered.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (new Date(a.createdAt || 0)).getTime());
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (new Date(b.createdAt || 0)).getTime());
        return timeB - timeA;
      });

      setCommunityDoubts(filtered);
      setLoadingCommunity(false);
    }, (err) => {
      console.error('Error fetching community doubts:', err);
      setLoadingCommunity(false);
    });

    return () => unsubscribe();
  }, [studentStreamId, streamDisplayName]);

  // Voice recording methods
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Voice recording is not supported in this browser. Please use text or image.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedAudioBlob(blob);
        try {
          const previewUrl = URL.createObjectURL(blob);
          setAudioDataUrl(previewUrl);
        } catch {
          const b64 = await blobToBase64(blob);
          setAudioDataUrl(b64);
        }
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 120) { // Max 2 minutes
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Could not access microphone. Please grant permission in browser settings.');
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const removeAudioRecording = () => {
    stopRecording();
    setRecordedAudioBlob(null);
    setAudioDataUrl('');
    setRecordingSeconds(0);
  };

  const handleAskImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAskImageFile(file);
    try {
      const preview = await compressImageToDataUrl(file, 800, 0.7);
      setAskImagePreview(preview);
    } catch (err) {
      console.error('Compression preview error:', err);
      try {
        setAskImagePreview(URL.createObjectURL(file));
      } catch {
        // Ignore fallback
      }
    }
  };

  const removeAskImage = () => {
    setAskImageFile(null);
    setAskImagePreview('');
    if (askImageInputRef.current) askImageInputRef.current.value = '';
  };

  const resetAskModal = () => {
    removeAudioRecording();
    removeAskImage();
    setAskChapter('');
    setAskTitle('');
    setAskDescription('');
    setShowAskModal(false);
  };

  const handlePostCommunityDoubt = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // 1. Publish Button Protection: Prevent rapid duplicate clicks
    if (isSubmittingRef.current || submittingDoubt) {
      return;
    }

    if (!currentUser?.uid) {
      alert('You must be logged in to ask a doubt.');
      return;
    }

    if (!askTitle.trim()) {
      alert('Please enter a brief topic or title for your doubt.');
      return;
    }

    if (!askDescription.trim() && !askImageFile && !recordedAudioBlob) {
      alert('Please provide a description, attach an image, or record a voice note for your doubt.');
      return;
    }

    try {
      isSubmittingRef.current = true;
      setSubmittingDoubt(true);
      setPublishProgress('uploading_media');

      // 2. Upload image and voice attachments in parallel with instant non-blocking fallback
      const [uploadedImageUrl, uploadedAudioUrl] = await Promise.all([
        askImagePreview
          ? uploadDoubtImage(askImagePreview, studentStreamId, askImagePreview)
          : Promise.resolve(null),
        (recordedAudioBlob || audioDataUrl)
          ? uploadDoubtAudio(recordedAudioBlob || audioDataUrl, studentStreamId, audioDataUrl)
          : Promise.resolve(null)
      ]);

      setPublishProgress('saving_record');

      // 3. Create the database record only after required uploads succeed
      const payload = {
        uid: currentUser.uid,
        studentId: currentUser.uid,
        studentName: userProfile?.name || currentUser?.displayName || 'Student',
        studentEmail: currentUser?.email || userProfile?.email || '',
        authorName: userProfile?.name || currentUser?.displayName || 'Student',
        authorBadge: userProfile?.badge || '🎓',
        authorCourse: userProfile?.course || '',
        stream: studentStreamId,
        streamLabel: streamDisplayName,
        subject: askSubject || getSubjectsForStream(studentStreamId)[0],
        chapterTopic: askChapter.trim() || 'General / All Chapters',
        title: askTitle.trim(),
        description: askDescription.trim(),
        imageUrl: uploadedImageUrl || null,
        audioUrl: uploadedAudioUrl || null,
        likesCount: 0,
        likedBy: [],
        replyCount: 0,
        status: 'published', // Properly marked Published
        answerStatus: 'unanswered',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp()
      };

      await addDoc(collection(db, 'communityDoubts'), payload);

      // 4. On success, clear/reset the form, show success message, update feed immediately
      resetAskModal();
      setPublishSuccessBanner('Your doubt was successfully published to the stream feed!');
      setTimeout(() => {
        setPublishSuccessBanner('');
      }, 6000);

    } catch (err) {
      console.error('Error posting community doubt:', err);
      alert('Failed to publish doubt: ' + (err.message || 'Please check connection and retry.'));
    } finally {
      isSubmittingRef.current = false;
      setSubmittingDoubt(false);
      setPublishProgress('');
    }
  };

  const handleToggleLike = async (doubt) => {
    if (!currentUser?.uid) return;
    const isLiked = Array.isArray(doubt.likedBy) && doubt.likedBy.includes(currentUser.uid);
    const doubtRef = doc(db, 'communityDoubts', doubt.id);

    try {
      if (isLiked) {
        await updateDoc(doubtRef, {
          likedBy: arrayRemove(currentUser.uid),
          likesCount: increment(-1)
        });
      } else {
        await updateDoc(doubtRef, {
          likedBy: arrayUnion(currentUser.uid),
          likesCount: increment(1)
        });
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleDeleteCommunityDoubt = async (doubtId) => {
    if (!window.confirm('Are you sure you want to delete this doubt?')) return;
    try {
      await deleteDoc(doc(db, 'communityDoubts', doubtId));
    } catch (err) {
      console.error('Error deleting doubt:', err);
    }
  };

  // Filtered community doubts
  const filteredCommunityDoubts = communityDoubts.filter((d) => {
    if (communityStatusFilter === 'unanswered' && (d.replyCount || 0) > 0) return false;
    if (communityStatusFilter === 'answered' && (d.replyCount || 0) === 0) return false;
    if (communitySubjectFilter !== 'all' && d.subject !== communitySubjectFilter) return false;

    if (communitySearch.trim()) {
      const q = communitySearch.toLowerCase();
      const matchTitle = (d.title || '').toLowerCase().includes(q);
      const matchDesc = (d.description || '').toLowerCase().includes(q);
      const matchSubject = (d.subject || '').toLowerCase().includes(q);
      const matchAuthor = (d.authorName || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchSubject && !matchAuthor) return false;
    }

    return true;
  });

  // ==========================================
  // ADMIN 1-ON-1 GUIDANCE STATE (PRESERVED)
  // ==========================================
  const [adminGuidanceSubTab, setAdminGuidanceSubTab] = useState('form');
  const [guidanceStream, setGuidanceStream] = useState(streamDisplayName);
  const [guidanceSubject, setGuidanceSubject] = useState('');
  const [guidanceChapterTopic, setGuidanceChapterTopic] = useState('');
  const [guidanceDoubtType, setGuidanceDoubtType] = useState('Concept / Study Doubt');
  const [guidanceDescription, setGuidanceDescription] = useState('');
  const [guidanceSelectedFile, setGuidanceSelectedFile] = useState(null);
  const [guidanceFilePreview, setGuidanceFilePreview] = useState(null);
  const [guidanceSubmitting, setGuidanceSubmitting] = useState(false);
  const [guidanceSuccess, setGuidanceSuccess] = useState(false);
  const [myAdminDoubts, setMyAdminDoubts] = useState([]);
  const [loadingAdminDoubts, setLoadingAdminDoubts] = useState(true);
  const guidanceFileInputRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, 'doubts'),
      where('uid', '==', currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setMyAdminDoubts(list);
      setLoadingAdminDoubts(false);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  const handleAdminDoubtSubmit = async (e) => {
    e.preventDefault();
    if (!guidanceDescription.trim()) return;

    try {
      setGuidanceSubmitting(true);
      let attachmentUrl = null;
      if (guidanceSelectedFile) {
        attachmentUrl = await compressImageToDataUrl(guidanceSelectedFile);
      }

      await addDoc(collection(db, 'doubts'), {
        uid: currentUser.uid,
        studentName: userProfile?.name || currentUser?.displayName || 'Student',
        studentEmail: currentUser?.email || '',
        stream: guidanceStream,
        subject: guidanceSubject || getSubjectsForStream(guidanceStream)[0],
        chapterTopic: guidanceChapterTopic.trim() || 'General / Not Specified',
        doubtType: guidanceDoubtType,
        description: guidanceDescription.trim(),
        attachmentUrl,
        status: 'New',
        createdAt: serverTimestamp(),
        reply: null,
        repliedAt: null,
        repliedBy: null
      });

      setGuidanceSuccess(true);
      setGuidanceDescription('');
      setGuidanceChapterTopic('');
      setGuidanceSelectedFile(null);
      setGuidanceFilePreview(null);
      setAdminGuidanceSubTab('my_doubts');
    } catch (err) {
      console.error('Error submitting guidance:', err);
      alert('Failed: ' + err.message);
    } finally {
      setGuidanceSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ========================================================= */}
      {/* HEADER BANNER WITH TOP SECTION SWITCHER                   */}
      {/* ========================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-amber-500/30 relative overflow-hidden shadow-2xl space-y-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            
            {/* Stream Detection Badge (Locked to Student Stream) */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-sm">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Stream: {streamDisplayName}</span>
              <span className="text-[10px] text-slate-400 font-mono">(Feed Auto-Filtered)</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Community <span className="gold-gradient-text">Doubt Feed</span>
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Ask questions with text, images, or voice recordings. Discuss problems and learn together with fellow <strong>{streamDisplayName}</strong> students.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowAskModal(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-navy-950 font-black text-xs sm:text-sm shadow-glow-gold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Ask a Doubt</span>
            </button>
          </div>
        </div>

        {/* Top Tab Switcher */}
        <div className="relative z-10 flex items-center gap-2 border-t border-white/10 pt-4 flex-wrap">
          <button
            type="button"
            onClick={() => setMainTab('community')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              mainTab === 'community'
                ? 'bg-amber-500 text-navy-950 font-black shadow-glow-gold'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>👥 {streamDisplayName} Feed</span>
            {communityDoubts.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                mainTab === 'community' ? 'bg-navy-950 text-amber-400' : 'bg-white/10 text-slate-300'
              }`}>
                {communityDoubts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMainTab('admin_guidance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              mainTab === 'admin_guidance'
                ? 'bg-amber-500 text-navy-950 font-black shadow-glow-gold'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>🔒 1-on-1 Guidance with Admin</span>
            {myAdminDoubts.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                mainTab === 'admin_guidance' ? 'bg-navy-950 text-amber-400' : 'bg-white/10 text-slate-300'
              }`}>
                {myAdminDoubts.length}
              </span>
            )}
          </button>
        </div>

      </div>

      {/* ========================================================= */}
      {/* TAB 1: STREAM-WISE COMMUNITY DOUBT FEED                   */}
      {/* ========================================================= */}
      {mainTab === 'community' && (
        <div className="space-y-6">
          
          {/* Publish Success Banner */}
          {publishSuccessBanner && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{publishSuccessBanner}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setPublishSuccessBanner('')} 
                className="text-emerald-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
          <div className="p-4 rounded-2xl glass-card border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={communitySearch}
                onChange={(e) => setCommunitySearch(e.target.value)}
                placeholder={`Search doubts in ${streamDisplayName}...`}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex bg-navy-900/80 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setCommunityStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    communityStatusFilter === 'all'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({communityDoubts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCommunityStatusFilter('unanswered')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    communityStatusFilter === 'unanswered'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⏳ Unanswered
                </button>
                <button
                  type="button"
                  onClick={() => setCommunityStatusFilter('answered')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    communityStatusFilter === 'answered'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✅ Answered
                </button>
              </div>

              {/* Subject Filter */}
              <select
                value={communitySubjectFilter}
                onChange={(e) => setCommunitySubjectFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-slate-300 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Subjects</option>
                {getSubjectsForStream(studentStreamId).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Doubts Feed */}
          {loadingCommunity ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-400" />
              <p className="text-sm font-semibold">Loading {streamDisplayName} doubts...</p>
            </div>
          ) : filteredCommunityDoubts.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title={`No Doubts Found in ${streamDisplayName}`}
              description={
                communitySearch || communityStatusFilter !== 'all'
                  ? 'No questions match your current search/filter criteria.'
                  : `Be the first student from ${streamDisplayName} to post a question or topic!`
              }
              actionText="Ask a Doubt"
              onAction={() => setShowAskModal(true)}
            />
          ) : (
            <div className="space-y-4">
              {filteredCommunityDoubts.map((doubt) => {
                const isAuthor = currentUser?.uid === doubt.uid;
                const isExpanded = expandedDoubtId === doubt.id;
                const isAnswered = (doubt.replyCount || 0) > 0;
                const isLiked = Array.isArray(doubt.likedBy) && doubt.likedBy.includes(currentUser?.uid);

                return (
                  <div
                    key={doubt.id}
                    className="p-5 sm:p-6 rounded-3xl glass-card border border-white/10 space-y-4 hover:border-amber-500/30 transition-all shadow-lg"
                  >
                    {/* Header: Author info & status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-sm shadow-sm">
                          {(doubt.authorName || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {doubt.authorName || 'Student'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                              {streamDisplayName}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {formatDate(doubt.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* Status & Options */}
                      <div className="flex items-center gap-2">
                        {isAnswered ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Answered</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Unanswered</span>
                          </span>
                        )}

                        {(isAuthor || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCommunityDoubt(doubt.id)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete this doubt"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Subject & Chapter Pills & Title */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-block px-2.5 py-0.5 rounded-lg bg-white/5 text-amber-400 border border-white/10 text-xs font-bold">
                          {doubt.subject || 'General'}
                        </div>
                        {doubt.chapterTopic && doubt.chapterTopic !== 'General / All Chapters' && doubt.chapterTopic !== 'General / Not Specified' && (
                          <div className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold">
                            📖 {doubt.chapterTopic}
                          </div>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {doubt.title}
                      </h3>
                    </div>

                    {/* Text Description */}
                    {doubt.description && (
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap bg-navy-950/50 p-4 rounded-2xl border border-white/5">
                        {doubt.description}
                      </p>
                    )}

                    {/* Attached Image Thumbnail */}
                    {doubt.imageUrl && (
                      <div className="pt-1">
                        <div className="relative inline-block group">
                          <img
                            src={doubt.imageUrl}
                            alt="Attached doubt screenshot"
                            onClick={() => setLightboxImage(doubt.imageUrl)}
                            className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-2xl border border-white/15 cursor-pointer group-hover:opacity-85 transition-opacity shadow-md"
                          />
                          <div 
                            onClick={() => setLightboxImage(doubt.imageUrl)}
                            className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-navy-950/80 text-[10px] text-slate-200 border border-white/10 flex items-center gap-1 cursor-pointer pointer-events-none"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Full</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Attached Voice Player */}
                    {doubt.audioUrl && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-navy-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                          <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                          <span>Voice Doubt Recording</span>
                        </div>
                        <audio
                          controls
                          src={doubt.audioUrl}
                          className="w-full sm:w-72 h-8"
                        />
                      </div>
                    )}

                    {/* Action Bar: Like / Helpful & Replies Toggle */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {/* Like / Helpful button */}
                        <button
                          type="button"
                          onClick={() => handleToggleLike(doubt)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isLiked
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                          <span>{doubt.likesCount || 0} Helpful</span>
                        </button>

                        {/* Reply Count Button */}
                        <button
                          type="button"
                          onClick={() => setExpandedDoubtId(isExpanded ? null : doubt.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isExpanded
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                          <span>{doubt.replyCount || 0} Replies</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 ml-1" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 ml-1" />
                          )}
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-500 hidden sm:block">
                        Stream: <strong className="text-slate-400">{streamDisplayName}</strong>
                      </div>
                    </div>

                    {/* Expandable Community Replies Thread */}
                    {isExpanded && (
                      <DoubtCommunityRepliesThread
                        doubt={doubt}
                        currentUser={currentUser}
                        userProfile={userProfile}
                        isAdmin={isAdmin}
                        onOpenLightbox={(url) => setLightboxImage(url)}
                      />
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: 1-ON-1 GUIDANCE WITH ADMIN (PRESERVED)             */}
      {/* ========================================================= */}
      {mainTab === 'admin_guidance' && (
        <div className="space-y-6">
          <div className="flex bg-navy-900/90 p-1.5 rounded-2xl border border-white/10 self-start inline-flex">
            <button
              type="button"
              onClick={() => setAdminGuidanceSubTab('form')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                adminGuidanceSubTab === 'form'
                  ? 'bg-amber-500 text-navy-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Submit Question to Admin</span>
            </button>
            <button
              type="button"
              onClick={() => setAdminGuidanceSubTab('my_doubts')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                adminGuidanceSubTab === 'my_doubts'
                  ? 'bg-amber-500 text-navy-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>My Submissions & Faculty Replies</span>
              {myAdminDoubts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
                  {myAdminDoubts.length}
                </span>
              )}
            </button>
          </div>

          {guidanceSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3">
              <span>Your question has been privately sent to Admin! Faculty will reply in the tab above.</span>
              <button onClick={() => setGuidanceSuccess(false)} className="text-emerald-400 hover:text-white font-bold">✕</button>
            </div>
          )}

          {adminGuidanceSubTab === 'form' ? (
            <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6 shadow-xl">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Confidential Faculty Guidance</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  100% private. Only Admin and you can view this question and reply.
                </p>
              </div>

              <form onSubmit={handleAdminDoubtSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Stream</label>
                    <select
                      value={guidanceStream}
                      onChange={(e) => setGuidanceStream(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-xs"
                    >
                      {STREAMS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Subject</label>
                    <select
                      value={guidanceSubject}
                      onChange={(e) => setGuidanceSubject(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-xs"
                    >
                      {getSubjectsForStream(guidanceStream).map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Help Category</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {HELP_TYPES.map(ht => {
                      const Icon = ht.icon;
                      const isSel = guidanceDoubtType === ht.id;
                      return (
                        <button
                          key={ht.id}
                          type="button"
                          onClick={() => setGuidanceDoubtType(ht.id)}
                          className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                            isSel ? 'bg-amber-500/20 border-amber-500 text-white' : 'bg-navy-900/60 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isSel ? 'text-amber-400' : 'text-slate-500'}`} />
                          <div>
                            <div className="text-xs font-bold">{ht.label}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{ht.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Chapter / Topic (Optional)</label>
                  <input
                    type="text"
                    value={guidanceChapterTopic}
                    onChange={(e) => setGuidanceChapterTopic(e.target.value)}
                    placeholder="e.g. Consignment Accounts or Chapter 4"
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Describe Your Doubt / Problem *</label>
                  <textarea
                    rows="4"
                    required
                    value={guidanceDescription}
                    onChange={(e) => setGuidanceDescription(e.target.value)}
                    placeholder="Describe your query in detail..."
                    className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Attach Document / Photo (Optional)</label>
                  <button
                    type="button"
                    onClick={() => guidanceFileInputRef.current?.click()}
                    className="w-full py-3 rounded-xl border border-dashed border-white/20 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/5"
                  >
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>{guidanceSelectedFile ? guidanceSelectedFile.name : 'Choose file / image'}</span>
                  </button>
                  <input
                    ref={guidanceFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setGuidanceSelectedFile(f);
                    }}
                    className="hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={guidanceSubmitting || !guidanceDescription.trim()}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 shadow-glow-emerald cursor-pointer"
                >
                  {guidanceSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Submit Question to Admin</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              {loadingAdminDoubts ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading your submissions...</div>
              ) : myAdminDoubts.length === 0 ? (
                <EmptyState icon={HelpCircle} title="No Admin Submissions" description="You have not submitted any private guidance requests." />
              ) : (
                myAdminDoubts.map(d => (
                  <div key={d.id} className="p-5 rounded-2xl glass-card border border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{d.subject}</span>
                        <span className="text-slate-400">• {d.doubtType}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        d.status === 'Resolved' || d.status === 'Replied'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {d.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 bg-navy-950/60 p-3 rounded-xl border border-white/5">{d.description}</p>
                    {d.attachmentUrl && (
                      <img
                        src={d.attachmentUrl}
                        alt="Attachment"
                        onClick={() => setLightboxImage(d.attachmentUrl)}
                        className="w-20 h-20 object-cover rounded-xl border border-white/10 cursor-pointer"
                      />
                    )}
                    {d.reply ? (
                      <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                        <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Admin / Faculty Reply:</span>
                        </div>
                        <p className="text-xs text-slate-100 whitespace-pre-wrap">{d.reply}</p>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">Faculty will review and write a personalized reply here shortly.</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* "ASK A DOUBT" MODAL WITH TEXT + IMAGE + VOICE COMPOSER    */}
      {/* ========================================================= */}
      {showAskModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-navy-950/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={resetAskModal}
        >
          <div
            className="w-full max-w-lg bg-gradient-to-b from-[#18112e] via-navy-900 to-navy-950 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-5 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                  <span>Stream: {streamDisplayName}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Ask a Community Doubt
                </h3>
              </div>
              <button
                type="button"
                onClick={resetAskModal}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostCommunityDoubt} className="space-y-4">
              {/* Subject Selection */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Select Subject *
                </label>
                <select
                  value={askSubject}
                  onChange={(e) => setAskSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  {getSubjectsForStream(studentStreamId).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Chapter / Topic */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Chapter / Topic (Optional)
                </label>
                <input
                  type="text"
                  value={askChapter}
                  onChange={(e) => setAskChapter(e.target.value)}
                  placeholder="e.g. Consignment Accounts or Chapter 3 - Partnership"
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Title / Question Topic */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Question Title / Topic *
                </label>
                <input
                  type="text"
                  required
                  value={askTitle}
                  onChange={(e) => setAskTitle(e.target.value)}
                  placeholder="e.g. Treatment of Goodwill on Retirement or Section 185 issue"
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Description / Explanation
                </label>
                <textarea
                  rows="3"
                  value={askDescription}
                  onChange={(e) => setAskDescription(e.target.value)}
                  placeholder="Explain your confusion, formula question, or query in detail..."
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Image Upload Section */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Attach Photo / Screenshot (Optional)
                </label>

                {askImagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={askImagePreview}
                      alt="Doubt Preview"
                      className="w-28 h-28 object-cover rounded-2xl border border-white/15 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={removeAskImage}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-500"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => askImageInputRef.current?.click()}
                    className="w-full py-3 rounded-2xl border border-dashed border-amber-500/40 hover:bg-amber-500/10 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Image from Device</span>
                  </button>
                )}
                <input
                  ref={askImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAskImageSelect}
                  className="hidden"
                />
              </div>

              {/* Voice / Audio Recording Section */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Record Voice Note (Optional)
                </label>

                {audioDataUrl ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                      <Mic className="w-4 h-4 text-emerald-400" />
                      <span>Recorded Voice Doubt</span>
                    </div>
                    <audio controls src={audioDataUrl} className="h-8 max-w-[200px]" />
                    <button
                      type="button"
                      onClick={removeAudioRecording}
                      className="p-1.5 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                      title="Delete recording & re-record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : isRecording ? (
                  <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between gap-3 animate-pulse">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      <span>Recording Voice... ({recordingSeconds}s)</span>
                    </div>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>Stop & Save</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="w-full py-3 rounded-2xl border border-dashed border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Mic className="w-4 h-4 text-emerald-400" />
                    <span>Record Voice Doubt</span>
                  </button>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-white/10 flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetAskModal}
                  disabled={submittingDoubt}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingDoubt || !askTitle.trim()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-navy-950 font-black text-xs shadow-glow-gold flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submittingDoubt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-navy-950" />
                      <span>
                        {publishProgress === 'uploading_media'
                          ? 'Uploading Attachments...'
                          : publishProgress === 'saving_record'
                          ? 'Publishing Doubt...'
                          : 'Processing...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Publish Doubt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* GLOBAL LIGHTBOX MODAL FOR FULL VIEW IMAGES                */}
      {/* ========================================================= */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-navy-950/95 backdrop-blur-md animate-in fade-in duration-200" 
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="max-w-4xl w-full space-y-3 max-h-[95vh] flex flex-col items-center" 
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between text-white pb-2 border-b border-white/10">
              <span className="text-xs sm:text-sm font-bold text-amber-300">
                Attached Photo Full View
              </span>
              <button 
                type="button"
                onClick={() => setLightboxImage(null)} 
                className="text-slate-400 hover:text-white font-black text-2xl transition-colors cursor-pointer"
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
