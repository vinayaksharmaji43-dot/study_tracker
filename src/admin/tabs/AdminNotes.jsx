import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { supabase, isSupabaseConfigured } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { 
  FileText, 
  Plus, 
  Trash2, 
  CheckCircle, 
  EyeOff, 
  ExternalLink, 
  Upload, 
  AlertCircle,
  BookOpen,
  Calendar,
  Layers,
  Search,
  Eye,
  Check
} from 'lucide-react';

const BUCKET_NAME = 'study-material';

const CA_FOUNDATION_SUBJECTS = [
  'Paper 1: Accounting',
  'Paper 2: Business Laws',
  'Paper 3: Quantitative Aptitude',
  'Paper 4: Business Economics'
];

const CA_INTERMEDIATE_SUBJECTS = [
  'Paper 1 — Advanced Accounting',
  'Paper 2 — Corporate and Other Laws',
  'Paper 3 — Taxation',
  'Paper 4 — Cost and Management Accounting',
  'Paper 5 — Auditing and Ethics',
  'Paper 6 — Financial Management and Strategic Management'
];

const CMA_FOUNDATION_SUBJECTS = [
  'Financial Accounting',
  'Cost Accounting',
  'Laws & Ethics',
  'Business Mathematics & Statistics',
  'Economics & Management'
];

const CMA_INTERMEDIATE_SUBJECTS = [
  'Financial Accounting',
  'Laws & Ethics',
  'Direct Taxation',
  'Cost Accounting',
  'Operations Management & Strategic Management',
  'Corporate Accounting & Auditing',
  'Financial Management & Business Data Analytics',
  'Management Accounting'
];

const GENERAL_SUBJECTS = [
  'General / Common Notes',
  'Formula Sheet',
  'Exam Strategy & Revision',
  'Important Question Bank'
];

function getSubjectsForStream(stream) {
  switch (stream) {
    case 'CA Foundation':
      return CA_FOUNDATION_SUBJECTS;
    case 'CA Intermediate':
      return CA_INTERMEDIATE_SUBJECTS;
    case 'CMA Foundation':
      return CMA_FOUNDATION_SUBJECTS;
    case 'CMA Intermediate':
      return CMA_INTERMEDIATE_SUBJECTS;
    case 'CMA':
      return [...CMA_FOUNDATION_SUBJECTS, 'Direct & Indirect Taxation'];
    case 'All Streams':
      return [...GENERAL_SUBJECTS, ...CA_FOUNDATION_SUBJECTS, ...CMA_FOUNDATION_SUBJECTS];
    default:
      return CA_FOUNDATION_SUBJECTS;
  }
}

function getAttemptsForStream(stream) {
  if (stream?.startsWith('CA')) {
    return ['January 2027', 'September 2027', 'May 2027', 'All Attempts'];
  }
  if (stream?.startsWith('CMA')) {
    return ['June 2027', 'December 2027', 'All Attempts'];
  }
  return ['All Attempts', '2026 - 2027'];
}

export default function AdminNotes() {
  const { userProfile, currentUser } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('CA Foundation');
  const [attempt, setAttempt] = useState('January 2027');
  const [subject, setSubject] = useState(CA_FOUNDATION_SUBJECTS[0]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [driveUrl, setDriveUrl] = useState('');
  const [uploadMode, setUploadMode] = useState('pdf'); // 'pdf' | 'drive'
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Delete Confirmation State
  const [deletingMaterial, setDeletingMaterial] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMaterials(docs);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching materials:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Update available subjects and default attempt when course changes
  const handleCourseChange = (newCourse) => {
    setCourse(newCourse);
    const subs = getSubjectsForStream(newCourse);
    const atts = getAttemptsForStream(newCourse);
    setSubject(subs[0] || 'General / Common Notes');
    setAttempt(atts[0] || 'All Attempts');
  };

  const handleOpenUploadModal = () => {
    setTitle('');
    setCourse('CA Foundation');
    setAttempt('January 2027');
    setSubject(CA_FOUNDATION_SUBJECTS[0]);
    setSelectedFile(null);
    setDriveUrl('');
    setUploadMode('pdf');
    setUploadProgress('');
    setShowUploadModal(true);
  };

  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      return alert("Please enter a title for the study material.");
    }

    if (uploadMode === 'pdf' && !selectedFile) {
      return alert("Please select a PDF file to upload.");
    }

    if (uploadMode === 'drive' && !driveUrl.trim()) {
      return alert("Please enter the Google Drive share link.");
    }

    try {
      setUploading(true);
      let filePath = null;
      let fileName = null;
      let finalFileUrl = driveUrl.trim();

      if (uploadMode === 'pdf') {
        if (!isSupabaseConfigured()) {
          throw new Error("Supabase Storage credentials are not configured in .env");
        }

        setUploadProgress("Uploading PDF to Supabase Storage...");
        const cleanCourse = course.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const cleanAttempt = attempt.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const sanitizedFileName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        filePath = `${cleanCourse}/${cleanAttempt}/${sanitizedFileName}`;
        fileName = selectedFile.name;

        // 1. Upload file to Supabase Storage bucket 'study-material'
        const { data, error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, selectedFile, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        // 2. Get Public URL from Supabase Storage
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);

        finalFileUrl = urlData?.publicUrl || '';
      }

      setUploadProgress("Saving material metadata to Firestore...");

      // 3. Save metadata in Firestore
      await addDoc(collection(db, 'notes'), {
        title: title.trim(),
        subject,
        course,
        attempt,
        filePath: filePath || null,
        fileName: fileName || title.trim(),
        fileUrl: finalFileUrl,
        driveUrl: finalFileUrl,
        createdAt: serverTimestamp(),
        createdBy: userProfile?.name || currentUser?.email || 'Platform Administrator',
        published: true
      });

      setShowUploadModal(false);
      alert("Study material uploaded and published successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Failed to upload material: ${err.message || err.code || 'Check permissions'}`);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleTogglePublish = async (material) => {
    try {
      const newStatus = material.published === false ? true : false;
      await updateDoc(doc(db, 'notes', material.id), {
        published: newStatus
      });
    } catch (err) {
      console.error("Error toggling publish status:", err);
      alert(`Failed to update status: ${err.message || err.code}`);
    }
  };

  const confirmDeleteMaterial = async () => {
    if (!deletingMaterial) return;

    try {
      setDeleting(true);

      // 1. Delete file from Supabase Storage if filePath exists
      if (deletingMaterial.filePath) {
        const { error: storageErr } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([deletingMaterial.filePath]);

        if (storageErr) {
          console.warn("Notice deleting from Supabase:", storageErr.message);
        }
      }

      // 2. Delete Firestore metadata document
      await deleteDoc(doc(db, 'notes', deletingMaterial.id));

      setDeletingMaterial(null);
    } catch (err) {
      console.error("Error deleting material:", err);
      alert(`Failed to delete material: ${err.message || err.code}`);
    } finally {
      setDeleting(false);
    }
  };

  // Filter materials based on search and selected filters
  const filteredMaterials = materials.filter(item => {
    const matchesSearch = 
      (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.fileName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.subject || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCourse = courseFilter === 'all' || item.course === courseFilter;
    const matchesSubject = subjectFilter === 'all' || item.subject === subjectFilter;

    return matchesSearch && matchesCourse && matchesSubject;
  });

  const availableSubjects = getSubjectsForStream(course);
  const attemptsList = getAttemptsForStream(course);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-purple-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
              <FileText className="w-3.5 h-3.5" />
              <span>Supabase Storage Integration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Study Material & <span className="gold-gradient-text">PDF Manager</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Upload PDF materials directly into Supabase Storage under structured course and attempt paths, automatically saved and synced with student portals.
            </p>
          </div>

          <button
            onClick={handleOpenUploadModal}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-sm shadow-glow-purple flex items-center gap-2 transition-all hover:scale-105 shrink-0"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Study Material</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search material by title, file, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Courses / Streams</option>
            <option value="CA Foundation">CA Foundation</option>
            <option value="CA Intermediate">CA Intermediate</option>
            <option value="CMA Foundation">CMA Foundation</option>
            <option value="CMA Intermediate">CMA Intermediate</option>
            <option value="CMA">CMA (All)</option>
            <option value="All Streams">All Streams</option>
          </select>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Subjects</option>
            {Array.from(new Set([
              ...CA_FOUNDATION_SUBJECTS,
              ...CA_INTERMEDIATE_SUBJECTS,
              ...CMA_FOUNDATION_SUBJECTS,
              ...CMA_INTERMEDIATE_SUBJECTS,
              ...GENERAL_SUBJECTS
            ])).map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Roster */}
      {filteredMaterials.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No study materials found"
          description="Upload your first PDF material to Supabase Storage or add a Google Drive resource link."
          actionText="Upload Study Material"
          onAction={handleOpenUploadModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMaterials.map((item) => {
            const isPublished = item.published !== false;
            const fileLink = item.fileUrl || item.driveUrl;

            return (
              <div 
                key={item.id} 
                className={`p-6 rounded-3xl glass-card border transition-all flex flex-col justify-between space-y-4 ${
                  isPublished ? 'border-white/10 hover:border-purple-500/30' : 'border-amber-500/30 bg-amber-500/5 opacity-75'
                }`}
              >
                <div className="space-y-3">
                  {/* Tags */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                        {item.subject}
                      </span>
                      {item.course && (
                        <span className="px-2.5 py-0.5 rounded-md bg-navy-900 text-gold-400 text-[11px] font-bold border border-white/10">
                          {item.course} {item.attempt ? `• ${item.attempt}` : ''}
                        </span>
                      )}
                    </div>

                    {isPublished ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Published
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1">
                        <EyeOff className="w-3.5 h-3.5" /> Unpublished
                      </span>
                    )}
                  </div>

                  {/* Title & File Info */}
                  <div>
                    <h3 className="text-lg font-bold text-white leading-snug">{item.title}</h3>
                    {item.fileName && (
                      <div className="text-xs text-purple-300/80 font-mono mt-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-purple-400" />
                        <span className="truncate">{item.fileName}</span>
                      </div>
                    )}
                  </div>

                  {item.filePath && (
                    <div className="text-[11px] text-slate-400 font-mono bg-navy-900/60 p-2 rounded-xl border border-white/5 truncate">
                      <span className="text-slate-500">Storage Path: </span>
                      {BUCKET_NAME}/{item.filePath}
                    </div>
                  )}
                </div>

                {/* Bottom Bar with Actions */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gold-400" />
                    <span>{formatDate(item.createdAt)}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* View Button */}
                    {fileLink && (
                      <a
                        href={fileLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all"
                        title="View / Open File"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                    )}

                    {/* Publish / Unpublish Toggle */}
                    <button
                      onClick={() => handleTogglePublish(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isPublished 
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30' 
                          : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                      }`}
                    >
                      {isPublished ? 'Unpublish' : 'Publish'}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => setDeletingMaterial(item)}
                      className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                      title="Delete Material"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Upload Study Material Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-400" />
                <span>Upload Study Material</span>
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadMaterial} className="space-y-4">
              {/* Material Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Material Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 1 Accounting Principles & Formulas"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Course & Attempt Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Course *
                  </label>
                  <select
                    value={course}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                  >
                    <option value="CA Foundation">CA Foundation</option>
                    <option value="CA Intermediate">CA Intermediate</option>
                    <option value="CMA Foundation">CMA Foundation</option>
                    <option value="CMA Intermediate">CMA Intermediate</option>
                    <option value="CMA">CMA (All)</option>
                    <option value="All Streams">All Streams (Everyone)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Exam Attempt *
                  </label>
                  <select
                    value={attempt}
                    onChange={(e) => setAttempt(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                  >
                    {attemptsList.map(att => (
                      <option key={att} value={att}>{att}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject Category */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Subject Category *
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                >
                  {availableSubjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* Upload Mode Selector */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setUploadMode('pdf')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      uploadMode === 'pdf' 
                        ? 'bg-purple-600 text-white shadow-glow-purple' 
                        : 'bg-navy-900 text-slate-400 hover:text-white border border-white/10'
                    }`}
                  >
                    Supabase PDF Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('drive')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      uploadMode === 'drive' 
                        ? 'bg-purple-600 text-white shadow-glow-purple' 
                        : 'bg-navy-900 text-slate-400 hover:text-white border border-white/10'
                    }`}
                  >
                    Google Drive Link
                  </button>
                </div>

                {uploadMode === 'pdf' ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Select PDF File (Storage: {BUCKET_NAME})
                    </label>
                    <div className="p-4 rounded-2xl border-2 border-dashed border-purple-500/30 bg-purple-500/5 hover:border-purple-500/60 transition-colors text-center cursor-pointer">
                      <input
                        type="file"
                        id="pdfInput"
                        accept=".pdf,application/pdf"
                        onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                        className="hidden"
                      />
                      <label htmlFor="pdfInput" className="cursor-pointer block space-y-2">
                        <Upload className="w-8 h-8 text-purple-400 mx-auto" />
                        <div className="text-sm font-bold text-white">
                          {selectedFile ? selectedFile.name : 'Click to select PDF document'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to upload` : 'PDF files up to 50MB supported'}
                        </div>
                      </label>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      Target Path: <span className="text-purple-300">{BUCKET_NAME}/{course.toLowerCase().replace(/[^a-z0-9]/g, '_')}/{attempt.toLowerCase().replace(/[^a-z0-9]/g, '_')}/[filename]</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Google Drive Share Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/file/d/..."
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>

              {uploadProgress && (
                <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-2 animate-pulse">
                  <Upload className="w-4 h-4 animate-bounce" />
                  <span>{uploadProgress}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-bold shadow-glow-purple disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Upload className="w-4 h-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Upload & Publish</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl border border-red-500/30 max-w-sm w-full space-y-4 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Delete Study Material?</h3>
            <p className="text-xs text-slate-400">
              This will permanently delete the file from Supabase Storage and remove its metadata from Firestore.
            </p>

            <div className="p-3 rounded-xl bg-navy-900 border border-white/5 text-xs text-left">
              <div className="font-bold text-white truncate">{deletingMaterial.title}</div>
              <div className="text-slate-400 text-[11px] truncate">{deletingMaterial.fileName || deletingMaterial.filePath}</div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                disabled={deleting}
                onClick={() => setDeletingMaterial(null)}
                className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={confirmDeleteMaterial}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Both'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
