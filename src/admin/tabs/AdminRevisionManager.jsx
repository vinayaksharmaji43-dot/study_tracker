import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import EmptyState from '../../components/EmptyState';
import { 
  RotateCcw, 
  Layers, 
  Plus, 
  Trash2, 
  Save, 
  BookOpen, 
  FileText, 
  Award,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Edit3,
  Check,
  Download,
  Sparkles,
  Search,
  CheckCircle2
} from 'lucide-react';

const STREAMS = [
  { id: 'CA_Foundation', course: 'CA', level: 'Foundation', label: 'CA Foundation' },
  { id: 'CA_Intermediate', course: 'CA', level: 'Intermediate', label: 'CA Intermediate' },
  { id: 'CMA_Foundation', course: 'CMA', level: 'Foundation', label: 'CMA Foundation' },
  { id: 'CMA_Intermediate', course: 'CMA', level: 'Intermediate', label: 'CMA Intermediate' }
];

export default function AdminRevisionManager() {
  const [selectedStreamId, setSelectedStreamId] = useState('CA_Foundation');
  const currentStream = STREAMS.find(s => s.id === selectedStreamId) || STREAMS[0];

  const [revisionDoc, setRevisionDoc] = useState(null);
  const [localSubjects, setLocalSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // New Subject input
  const [newSubjectTitle, setNewSubjectTitle] = useState('');

  // Chapter Modal State
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [chapterModalMode, setChapterModalMode] = useState('add'); // 'add' | 'edit'
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [chapNoInput, setChapNoInput] = useState('');
  const [chapTitleInput, setChapTitleInput] = useState('');
  const [chapPointsInput, setChapPointsInput] = useState('10');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time listener for current stream revision doc
  useEffect(() => {
    setLoading(true);
    setHasUnsavedChanges(false);
    const docRef = doc(db, 'revisions', selectedStreamId);

    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRevisionDoc(data);
        setLocalSubjects(data.subjects || []);
      } else {
        setRevisionDoc(null);
        setLocalSubjects([]);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching revision doc:", err);
      setRevisionDoc(null);
      setLocalSubjects([]);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedStreamId]);

  // Prevent background scroll when modal is active
  useEffect(() => {
    if (activeSubjectId) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [activeSubjectId]);

  // Save changes to Firestore
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      const docRef = doc(db, 'revisions', selectedStreamId);
      await setDoc(docRef, {
        streamId: selectedStreamId,
        course: currentStream.course,
        level: currentStream.level,
        subjects: localSubjects,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setHasUnsavedChanges(false);
      alert(`Revision structure for ${currentStream.label} saved successfully!`);
    } catch (err) {
      console.error("Error saving revision:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Import subjects and chapters from Syllabus (stripping units)
  const handleImportFromSyllabus = async () => {
    const confirmMsg = `Do you want to import all subjects and chapters from the Syllabus of ${currentStream.label}? (This will initialize chapters-only without units. Any unsaved changes will be replaced.)`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setSaving(true);
      const syllabusRef = doc(db, 'syllabi', selectedStreamId);
      const snap = await getDoc(syllabusRef);

      if (!snap.exists() || !snap.data().subjects || snap.data().subjects.length === 0) {
        alert(`No syllabus found for ${currentStream.label}. Please initialize the syllabus first or add subjects manually.`);
        setSaving(false);
        return;
      }

      const syllabusSubjects = snap.data().subjects || [];
      const importedSubjects = syllabusSubjects.map((sub, sIdx) => ({
        id: `rev_sub_${Date.now()}_${sIdx}`,
        subject: sub.subject,
        order: sIdx + 1,
        chapters: (sub.chapters || []).map((ch, cIdx) => ({
          id: `rev_ch_${Date.now()}_${sIdx}_${cIdx}`,
          chapterNo: ch.chapterNo || String(cIdx + 1),
          title: ch.title,
          points: Number(ch.points) || 10,
          order: cIdx + 1,
          isActive: ch.isActive !== false
        }))
      }));

      setLocalSubjects(importedSubjects);
      setHasUnsavedChanges(true);

      // Save directly to Firestore
      const revRef = doc(db, 'revisions', selectedStreamId);
      await setDoc(revRef, {
        streamId: selectedStreamId,
        course: currentStream.course,
        level: currentStream.level,
        subjects: importedSubjects,
        updatedAt: serverTimestamp()
      });

      setHasUnsavedChanges(false);
      alert(`Imported ${importedSubjects.length} subjects from Syllabus successfully! All chapters are ready for Revision tracking.`);
    } catch (err) {
      console.error("Error importing from syllabus:", err);
      alert("Failed to import from syllabus.");
    } finally {
      setSaving(false);
    }
  };

  // Add a new Subject
  const handleAddSubject = () => {
    if (!newSubjectTitle.trim()) return;
    const newSub = {
      id: `rev_sub_${Date.now()}`,
      subject: newSubjectTitle.trim(),
      order: localSubjects.length + 1,
      chapters: []
    };
    setLocalSubjects([...localSubjects, newSub]);
    setNewSubjectTitle('');
    setHasUnsavedChanges(true);
  };

  // Delete a Subject
  const handleDeleteSubject = (subId) => {
    if (window.confirm("Are you sure you want to delete this Subject and all its revision chapters?")) {
      setLocalSubjects(localSubjects.filter(s => s.id !== subId));
      setHasUnsavedChanges(true);
    }
  };

  // Move Subject Up / Down
  const handleMoveSubject = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= localSubjects.length) return;
    const updated = [...localSubjects];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setLocalSubjects(updated);
    setHasUnsavedChanges(true);
  };

  // Open Chapter Modal for Adding
  const openAddChapterModal = (subId) => {
    const sub = localSubjects.find(s => s.id === subId);
    const nextNo = sub && sub.chapters ? sub.chapters.length + 1 : 1;
    setActiveSubjectId(subId);
    setChapterModalMode('add');
    setEditingChapterId(null);
    setChapNoInput(String(nextNo));
    setChapTitleInput('');
    setChapPointsInput('10');
  };

  // Open Chapter Modal for Editing
  const openEditChapterModal = (subId, chapter) => {
    setActiveSubjectId(subId);
    setChapterModalMode('edit');
    setEditingChapterId(chapter.id);
    setChapNoInput(String(chapter.chapterNo || ''));
    setChapTitleInput(chapter.title || '');
    setChapPointsInput(String(chapter.points || 10));
  };

  // Submit Chapter Modal (Add or Edit)
  const handleSaveChapter = (e) => {
    e.preventDefault();
    if (!chapTitleInput.trim() || !activeSubjectId) return;

    const pointsNum = parseInt(chapPointsInput, 10) || 10;

    if (chapterModalMode === 'add') {
      const newChapter = {
        id: `rev_ch_${Date.now()}`,
        chapterNo: chapNoInput.trim(),
        title: chapTitleInput.trim(),
        points: pointsNum,
        order: Date.now(),
        isActive: true
      };

      setLocalSubjects(prev => prev.map(sub => {
        if (sub.id === activeSubjectId) {
          return {
            ...sub,
            chapters: [...(sub.chapters || []), newChapter]
          };
        }
        return sub;
      }));
    } else {
      setLocalSubjects(prev => prev.map(sub => {
        if (sub.id === activeSubjectId) {
          return {
            ...sub,
            chapters: (sub.chapters || []).map(ch => {
              if (ch.id === editingChapterId) {
                return {
                  ...ch,
                  chapterNo: chapNoInput.trim(),
                  title: chapTitleInput.trim(),
                  points: pointsNum
                };
              }
              return ch;
            })
          };
        }
        return sub;
      }));
    }

    setHasUnsavedChanges(true);
    setActiveSubjectId(null);
  };

  // Toggle Chapter Active / Inactive
  const handleToggleChapterActive = (subId, chapId) => {
    setLocalSubjects(prev => prev.map(sub => {
      if (sub.id === subId) {
        return {
          ...sub,
          chapters: (sub.chapters || []).map(ch => {
            if (ch.id === chapId) {
              return { ...ch, isActive: ch.isActive === false ? true : false };
            }
            return ch;
          })
        };
      }
      return sub;
    }));
    setHasUnsavedChanges(true);
  };

  // Delete a Chapter
  const handleDeleteChapter = (subId, chapId) => {
    if (window.confirm("Are you sure you want to remove this revision chapter?")) {
      setLocalSubjects(prev => prev.map(sub => {
        if (sub.id === subId) {
          return {
            ...sub,
            chapters: (sub.chapters || []).filter(ch => ch.id !== chapId)
          };
        }
        return sub;
      }));
      setHasUnsavedChanges(true);
    }
  };

  // Move Chapter Up / Down
  const handleMoveChapter = (subId, chapIndex, direction) => {
    setLocalSubjects(prev => prev.map(sub => {
      if (sub.id === subId) {
        const chapters = [...(sub.chapters || [])];
        const targetIndex = chapIndex + direction;
        if (targetIndex < 0 || targetIndex >= chapters.length) return sub;
        const temp = chapters[chapIndex];
        chapters[chapIndex] = chapters[targetIndex];
        chapters[targetIndex] = temp;
        return { ...sub, chapters };
      }
      return sub;
    }));
    setHasUnsavedChanges(true);
  };

  // Statistics
  const totalChapters = localSubjects.reduce((acc, sub) => acc + (sub.chapters?.length || 0), 0);
  const activeChapters = localSubjects.reduce((acc, sub) => acc + (sub.chapters?.filter(c => c.isActive !== false).length || 0), 0);
  const totalPoints = localSubjects.reduce((acc, sub) => 
    acc + (sub.chapters || []).filter(c => c.isActive !== false).reduce((sum, c) => sum + (Number(c.points) || 0), 0)
  , 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 bg-gradient-to-r from-navy-900/90 via-royal-950/40 to-navy-950 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-royal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-royal-500/20 border border-royal-500/40 text-royal-300 text-xs font-bold uppercase tracking-wider">
              <RotateCcw className="w-3.5 h-3.5 text-royal-400" />
              <span>Curriculum Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <span>Revision Management</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Configure subject-wise Revision chapters for students. Revision tracks chapters only (no units) and is strictly distinct from the main Syllabus.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={handleImportFromSyllabus}
              disabled={saving}
              className="px-4 py-2.5 rounded-2xl bg-navy-900 hover:bg-navy-800 border border-royal-500/30 text-royal-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
              title="Import all subjects and chapters from Syllabus (units removed automatically)"
            >
              <Download className="w-4 h-4 text-royal-400" />
              <span>Import from Syllabus</span>
            </button>

            <button
              onClick={handleSaveChanges}
              disabled={saving || !hasUnsavedChanges}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-xl ${
                hasUnsavedChanges 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-navy-950 shadow-emerald-500/30 animate-pulse' 
                  : 'bg-white/5 border border-white/10 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes *' : 'All Changes Saved'}</span>
            </button>
          </div>
        </div>

        {/* Stream Selector Tabs */}
        <div className="pt-6 border-t border-white/10 mt-6 flex flex-wrap gap-2.5">
          {STREAMS.map(stream => (
            <button
              key={stream.id}
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (!window.confirm("You have unsaved changes in the current stream. Switching streams will discard them. Continue?")) return;
                }
                setSelectedStreamId(stream.id);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                selectedStreamId === stream.id
                  ? 'bg-gradient-to-r from-royal-600 to-indigo-600 text-white shadow-lg border border-royal-400/40'
                  : 'bg-navy-950/60 border border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{stream.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Unsaved changes notification banner */}
      {hasUnsavedChanges && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-4 text-xs font-bold text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>You have unsaved changes. Don't forget to click "Save Changes" to publish them to students!</span>
          </div>
          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className="px-4 py-1.5 rounded-xl bg-amber-500 text-navy-950 font-black hover:bg-amber-400 transition-colors shrink-0"
          >
            Save Now
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stream</div>
          <div className="text-base font-black text-white truncate">{currentStream.label}</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subjects</div>
          <div className="text-xl font-black text-royal-400">{localSubjects.length}</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Chapters</div>
          <div className="text-xl font-black text-emerald-400">{activeChapters} <span className="text-xs text-slate-400">/ {totalChapters}</span></div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revision PTS</div>
          <div className="text-xl font-black text-gold-400">{totalPoints.toLocaleString()} PTS</div>
        </div>
      </div>

      {/* Add New Subject Bar */}
      <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-lg">
        <input
          type="text"
          value={newSubjectTitle}
          onChange={(e) => setNewSubjectTitle(e.target.value)}
          placeholder="New Subject Title (e.g., Paper 1: Accounting or Group 1: Law)..."
          className="flex-grow px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-royal-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddSubject();
            }
          }}
        />
        <button
          onClick={handleAddSubject}
          disabled={!newSubjectTitle.trim()}
          className="px-5 py-2.5 rounded-xl bg-royal-600 hover:bg-royal-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Search Bar if subjects exist */}
      {localSubjects.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search revision subjects or chapter titles..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-navy-900/60 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-royal-500"
          />
        </div>
      )}

      {/* Subject & Chapters List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-bold">
          Loading revision blueprint for {currentStream.label}...
        </div>
      ) : localSubjects.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="No Revision Subjects Configured"
          description={`No revision subjects exist for ${currentStream.label} yet. You can import from the Syllabus in 1-click or add subjects manually above.`}
        />
      ) : (
        <div className="space-y-6">
          {localSubjects.map((sub, sIdx) => {
            const chapters = sub.chapters || [];
            const filteredChapters = searchQuery.trim()
              ? chapters.filter(c => 
                  c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  String(c.chapterNo || '').toLowerCase().includes(searchQuery.toLowerCase())
                )
              : chapters;

            if (searchQuery.trim() && filteredChapters.length === 0 && !sub.subject.toLowerCase().includes(searchQuery.toLowerCase())) {
              return null;
            }

            return (
              <div key={sub.id} className="rounded-3xl glass-card border border-white/10 overflow-hidden shadow-xl">
                {/* Subject Header */}
                <div className="p-4 sm:p-5 bg-navy-900/90 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-royal-500/20 border border-royal-500/30 text-royal-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {sIdx + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-white truncate">{sub.subject}</h3>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {chapters.length} Chapters • {chapters.filter(c => c.isActive !== false).length} Active
                      </div>
                    </div>
                  </div>

                  {/* Subject Controls */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleMoveSubject(sIdx, -1)}
                      disabled={sIdx === 0}
                      className="p-1.5 rounded-lg bg-navy-950 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                      title="Move Subject Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveSubject(sIdx, 1)}
                      disabled={sIdx === localSubjects.length - 1}
                      className="p-1.5 rounded-lg bg-navy-950 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                      title="Move Subject Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openAddChapterModal(sub.id)}
                      className="px-3 py-1.5 rounded-xl bg-royal-600/30 hover:bg-royal-600/50 border border-royal-500/40 text-royal-200 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-royal-400" />
                      <span>Add Chapter</span>
                    </button>
                    <button
                      onClick={() => handleDeleteSubject(sub.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Chapters List */}
                <div className="divide-y divide-white/5">
                  {chapters.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No chapters in this subject yet. Click "+ Add Chapter" to add one.
                    </div>
                  ) : (
                    filteredChapters.map((ch, cIdx) => {
                      const isActive = ch.isActive !== false;
                      const pts = Number(ch.points) || 10;

                      return (
                        <div
                          key={ch.id}
                          className={`p-3.5 sm:px-6 flex items-center justify-between gap-3 transition-colors ${
                            !isActive ? 'opacity-50 bg-navy-950/40' : 'hover:bg-white/5'
                          }`}
                        >
                          {/* Chapter Info */}
                          <div className="flex items-center space-x-3 min-w-0 pr-2">
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-navy-950 border border-white/10 text-royal-300 shrink-0">
                              Ch {ch.chapterNo || cIdx + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-medium text-slate-200 truncate block">
                                {ch.title}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Reward: <strong className="text-gold-400">+{pts} PTS</strong>
                              </span>
                            </div>
                          </div>

                          {/* Chapter Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Toggle Active / Inactive */}
                            <button
                              onClick={() => handleToggleChapterActive(sub.id, ch.id)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isActive 
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                                  : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
                              }`}
                              title={isActive ? "Active (visible to students) - click to hide" : "Inactive (hidden from students) - click to activate"}
                            >
                              {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>

                            {/* Move Up */}
                            <button
                              onClick={() => handleMoveChapter(sub.id, cIdx, -1)}
                              disabled={cIdx === 0}
                              className="p-1.5 rounded-lg bg-navy-950 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                              title="Move Chapter Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Move Down */}
                            <button
                              onClick={() => handleMoveChapter(sub.id, cIdx, 1)}
                              disabled={cIdx === chapters.length - 1}
                              className="p-1.5 rounded-lg bg-navy-950 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                              title="Move Chapter Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Chapter */}
                            <button
                              onClick={() => openEditChapterModal(sub.id, ch)}
                              className="p-1.5 rounded-lg bg-navy-950 border border-white/10 text-slate-400 hover:text-white transition-colors"
                              title="Edit Chapter Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Chapter */}
                            <button
                              onClick={() => handleDeleteChapter(sub.id, ch.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors"
                              title="Delete Chapter"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chapter Modal (Add / Edit) */}
      {activeSubjectId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card p-6 sm:p-7 rounded-3xl border border-white/15 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-royal-400" />
                <span>{chapterModalMode === 'add' ? 'Add Revision Chapter' : 'Edit Revision Chapter'}</span>
              </h3>
              <button
                onClick={() => setActiveSubjectId(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveChapter} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Chapter Number / Code
                </label>
                <input
                  type="text"
                  value={chapNoInput}
                  onChange={(e) => setChapNoInput(e.target.value)}
                  placeholder="e.g., 1, 2, or 1A"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs focus:outline-none focus:border-royal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Chapter Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={chapTitleInput}
                  onChange={(e) => setChapTitleInput(e.target.value)}
                  placeholder="e.g., Indian Contract Act, 1872"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs focus:outline-none focus:border-royal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Reward Points (PTS) for completing revision
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={chapPointsInput}
                  onChange={(e) => setChapPointsInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-xs focus:outline-none focus:border-royal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveSubjectId(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-royal-600 hover:bg-royal-500 text-white text-xs font-bold transition-all shadow-lg"
                >
                  {chapterModalMode === 'add' ? 'Add Chapter' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
