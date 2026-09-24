import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { SYLLABUS_DATA, getDefaultUnitsForChapter } from '../../data/syllabusData';
import EmptyState from '../../components/EmptyState';
import { 
  Layers, 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Eye, 
  EyeOff, 
  Search, 
  FileText, 
  Check, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  Award, 
  ListPlus,
  HelpCircle,
  Hash,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

const STREAMS = [
  { id: 'CA_Foundation', course: 'CA', level: 'Foundation', label: 'CA Foundation' },
  { id: 'CA_Intermediate', course: 'CA', level: 'Intermediate', label: 'CA Intermediate' },
  { id: 'CMA_Foundation', course: 'CMA', level: 'Foundation', label: 'CMA Foundation' },
  { id: 'CMA_Intermediate', course: 'CMA', level: 'Intermediate', label: 'CMA Intermediate' }
];

export default function AdminChaptersUnits() {
  const [selectedStreamId, setSelectedStreamId] = useState('CA_Foundation');
  const currentStream = STREAMS.find(s => s.id === selectedStreamId) || STREAMS[0];

  const [syllabusDoc, setSyllabusDoc] = useState(null);
  const [localSubjects, setLocalSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Selected subject & chapter IDs for editing units
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [chapterSearch, setChapterSearch] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);

  // Form fields for Add / Edit
  const [unitNoInput, setUnitNoInput] = useState('');
  const [unitTitleInput, setUnitTitleInput] = useState('');
  const [unitDescInput, setUnitDescInput] = useState('');
  const [unitPtsInput, setUnitPtsInput] = useState('10');
  const [unitActiveInput, setUnitActiveInput] = useState(true);

  // Bulk add modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkPts, setBulkPts] = useState('10');

  // Real-time listener for current stream's syllabus
  useEffect(() => {
    setLoading(true);
    setHasUnsavedChanges(false);
    const docRef = doc(db, 'syllabi', selectedStreamId);

    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSyllabusDoc(data);
        const subjects = data.subjects || [];
        setLocalSubjects(subjects);
        
        // Auto-select first subject & chapter if not selected or invalid
        if (subjects.length > 0) {
          const currentSub = subjects.find(s => s.id === selectedSubjectId) || subjects[0];
          setSelectedSubjectId(currentSub.id);
          const currentChap = currentSub.chapters?.find(c => c.id === selectedChapterId) || currentSub.chapters?.[0];
          if (currentChap) {
            setSelectedChapterId(currentChap.id);
          } else {
            setSelectedChapterId(null);
          }
        } else {
          setSelectedSubjectId(null);
          setSelectedChapterId(null);
        }
      } else {
        setSyllabusDoc(null);
        setLocalSubjects([]);
        setSelectedSubjectId(null);
        setSelectedChapterId(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error loading syllabus for units manager:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedStreamId]);

  // Find currently selected subject & chapter from localSubjects
  const activeSubject = useMemo(() => {
    return localSubjects.find(s => s.id === selectedSubjectId) || null;
  }, [localSubjects, selectedSubjectId]);

  const activeChapter = useMemo(() => {
    if (!activeSubject) return null;
    return activeSubject.chapters?.find(c => c.id === selectedChapterId) || null;
  }, [activeSubject, selectedChapterId]);

  // Current units for active chapter
  const currentUnits = useMemo(() => {
    if (!activeChapter || !activeChapter.units) return [];
    return activeChapter.units;
  }, [activeChapter]);

  // Filtered chapters for current subject
  const filteredChapters = useMemo(() => {
    if (!activeSubject || !activeSubject.chapters) return [];
    if (!chapterSearch.trim()) return activeSubject.chapters;
    const q = chapterSearch.toLowerCase();
    return activeSubject.chapters.filter(ch => 
      (ch.title || '').toLowerCase().includes(q) || 
      String(ch.chapterNo || '').includes(q)
    );
  }, [activeSubject, chapterSearch]);

  // Initialize syllabus with standard units if empty
  const handleInitializeFromDefault = async () => {
    if (!window.confirm(`Initialize ${currentStream.label} syllabus with default subjects, chapters & units?`)) return;
    try {
      setSaving(true);
      const defaultSubjects = SYLLABUS_DATA[currentStream.course]?.[currentStream.level] || [];
      
      const mappedSubjects = defaultSubjects.map((sub, sIdx) => ({
        id: `sub_${Date.now()}_${sIdx}`,
        subject: sub.subject,
        chapters: sub.chapters.map((ch, cIdx) => {
          const chId = ch.id || `ch_${Date.now()}_${sIdx}_${cIdx}`;
          const units = getDefaultUnitsForChapter(selectedStreamId, ch.title, cIdx + 1, chId);
          return {
            id: chId,
            chapterNo: cIdx + 1,
            title: ch.title,
            points: ch.points || 10,
            units: units
          };
        })
      }));

      const docRef = doc(db, 'syllabi', selectedStreamId);
      await setDoc(docRef, {
        course: currentStream.course,
        level: currentStream.level,
        subjects: mappedSubjects
      });
      alert(`${currentStream.label} syllabus and units initialized successfully!`);
    } catch (err) {
      console.error(err);
      alert('Failed to initialize syllabus.');
    } finally {
      setSaving(false);
    }
  };

  // Save changes to Firestore
  const handleSaveChanges = async (customSubjects = null) => {
    const subjectsToSave = customSubjects || localSubjects;
    try {
      setSaving(true);
      const docRef = doc(db, 'syllabi', selectedStreamId);
      if (!syllabusDoc) {
        await setDoc(docRef, {
          course: currentStream.course,
          level: currentStream.level,
          subjects: subjectsToSave
        });
      } else {
        await updateDoc(docRef, {
          subjects: subjectsToSave
        });
      }
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Error saving units:", err);
      alert("Failed to save units to database. Please check your internet connection.");
    } finally {
      setSaving(false);
    }
  };

  // Helper to update active chapter's units in localSubjects
  const updateActiveChapterUnits = (newUnits, autoSave = false) => {
    if (!selectedSubjectId || !selectedChapterId) return;

    const updatedSubjects = localSubjects.map(sub => {
      if (sub.id !== selectedSubjectId) return sub;
      return {
        ...sub,
        chapters: (sub.chapters || []).map(ch => {
          if (ch.id !== selectedChapterId) return ch;
          return {
            ...ch,
            units: newUnits
          };
        })
      };
    });

    setLocalSubjects(updatedSubjects);
    setHasUnsavedChanges(true);

    if (autoSave) {
      handleSaveChanges(updatedSubjects);
    }
  };

  // Open Add Unit Modal
  const openAddModal = () => {
    const nextOrder = currentUnits.length + 1;
    setUnitNoInput(`Unit ${nextOrder}`);
    setUnitTitleInput('');
    setUnitDescInput('');
    setUnitPtsInput('10');
    setUnitActiveInput(true);
    setIsAddModalOpen(true);
  };

  // Submit Add Unit
  const handleAddUnitSubmit = (e) => {
    e.preventDefault();
    if (!unitTitleInput.trim() || !selectedChapterId) return;

    const pts = parseInt(unitPtsInput, 10) || 10;
    const newUnit = {
      id: `unit_${selectedChapterId}_${Date.now()}`,
      unitNo: unitNoInput.trim() || `Unit ${currentUnits.length + 1}`,
      order: currentUnits.length + 1,
      title: unitTitleInput.trim(),
      description: unitDescInput.trim(),
      points: pts,
      isActive: unitActiveInput
    };

    const newUnitsList = [...currentUnits, newUnit];
    updateActiveChapterUnits(newUnitsList, true);
    setIsAddModalOpen(false);
  };

  // Open Edit Unit Modal
  const openEditModal = (unit) => {
    setEditingUnit(unit);
    setUnitNoInput(unit.unitNo || `Unit ${unit.order || 1}`);
    setUnitTitleInput(unit.title || '');
    setUnitDescInput(unit.description || '');
    setUnitPtsInput(String(unit.points ?? 10));
    setUnitActiveInput(unit.isActive !== false);
    setIsEditModalOpen(true);
  };

  // Submit Edit Unit
  const handleEditUnitSubmit = (e) => {
    e.preventDefault();
    if (!editingUnit || !unitTitleInput.trim()) return;

    const pts = parseInt(unitPtsInput, 10) || 10;
    const updatedUnits = currentUnits.map(u => {
      if (u.id !== editingUnit.id) return u;
      return {
        ...u,
        unitNo: unitNoInput.trim() || u.unitNo,
        title: unitTitleInput.trim(),
        description: unitDescInput.trim(),
        points: pts,
        isActive: unitActiveInput
      };
    });

    updateActiveChapterUnits(updatedUnits, true);
    setIsEditModalOpen(false);
    setEditingUnit(null);
  };

  // Delete Unit
  const handleDeleteUnit = (unitId) => {
    if (!window.confirm('Are you sure you want to delete this unit?')) return;
    const updatedUnits = currentUnits
      .filter(u => u.id !== unitId)
      .map((u, idx) => ({ ...u, order: idx + 1 }));
    updateActiveChapterUnits(updatedUnits, true);
  };

  // Toggle Active / Inactive
  const handleToggleUnitActive = (unitId) => {
    const updatedUnits = currentUnits.map(u => {
      if (u.id !== unitId) return u;
      return { ...u, isActive: u.isActive === false ? true : false };
    });
    updateActiveChapterUnits(updatedUnits, true);
  };

  // Quick Inline PTS Change
  const handleQuickPtsChange = (unitId, newPts) => {
    const pts = parseInt(newPts, 10) || 0;
    const updatedUnits = currentUnits.map(u => {
      if (u.id !== unitId) return u;
      return { ...u, points: pts };
    });
    updateActiveChapterUnits(updatedUnits, false);
  };

  // Move Unit Up
  const handleMoveUp = (index) => {
    if (index <= 0) return;
    const newUnits = [...currentUnits];
    const temp = newUnits[index];
    newUnits[index] = newUnits[index - 1];
    newUnits[index - 1] = temp;
    // Update order numbers
    newUnits.forEach((u, idx) => { u.order = idx + 1; });
    updateActiveChapterUnits(newUnits, true);
  };

  // Move Unit Down
  const handleMoveDown = (index) => {
    if (index >= currentUnits.length - 1) return;
    const newUnits = [...currentUnits];
    const temp = newUnits[index];
    newUnits[index] = newUnits[index + 1];
    newUnits[index + 1] = temp;
    // Update order numbers
    newUnits.forEach((u, idx) => { u.order = idx + 1; });
    updateActiveChapterUnits(newUnits, true);
  };

  // Bulk Add Units
  const handleBulkAddSubmit = (e) => {
    e.preventDefault();
    if (!bulkText.trim() || !selectedChapterId) return;

    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const defaultPts = parseInt(bulkPts, 10) || 10;
    const startOrder = currentUnits.length + 1;

    const newUnits = lines.map((line, idx) => {
      const order = startOrder + idx;
      // Allow syntax like "Unit 1: Basic Principles" or just "Basic Principles"
      let unitNo = `Unit ${order}`;
      let title = line;
      if (line.toLowerCase().startsWith('unit')) {
        const parts = line.split(/[:-]/);
        if (parts.length > 1) {
          unitNo = parts[0].trim();
          title = parts.slice(1).join('-').trim();
        }
      }

      return {
        id: `unit_${selectedChapterId}_${Date.now()}_${idx}`,
        unitNo,
        order,
        title,
        description: '',
        points: defaultPts,
        isActive: true
      };
    });

    const updatedUnits = [...currentUnits, ...newUnits];
    updateActiveChapterUnits(updatedUnits, true);
    setBulkText('');
    setIsBulkModalOpen(false);
  };

  // Auto-generate standard units for current chapter
  const handleAutoGenerateUnits = () => {
    if (!activeChapter) return;
    if (currentUnits.length > 0 && !window.confirm('This chapter already has units. Do you want to replace them with ICSI / ICAI standard units?')) {
      return;
    }

    const standardUnits = getDefaultUnitsForChapter(
      selectedStreamId, 
      activeChapter.title, 
      activeChapter.chapterNo || 1, 
      activeChapter.id
    );

    updateActiveChapterUnits(standardUnits, true);
  };

  // Calculate stats for current chapter
  const totalChapterPts = currentUnits
    .filter(u => u.isActive !== false)
    .reduce((sum, u) => sum + (Number(u.points) || 0), 0);
  const activeUnitsCount = currentUnits.filter(u => u.isActive !== false).length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-royal-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-royal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-royal-500/20 text-royal-400 text-xs font-bold border border-royal-500/30">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Syllabus Management • Chapters & Units</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Manage <span className="gold-gradient-text">Chapter Units & PTS</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Configure ICSI curriculum units for individual chapters. Set custom <strong>PTS (Points)</strong> per unit, reorder topics, toggle active status, or bulk-create syllabus units.
          </p>
        </div>
      </div>

      {/* Stream Tabs Selector */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-navy-900/60 border border-white/10">
        {STREAMS.map((s) => {
          const isActive = s.id === selectedStreamId;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedStreamId(s.id)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-glow-emerald border border-emerald-400/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs text-amber-200">
              You have unsaved changes in this stream's curriculum. Click <strong>Save Changes</strong> to sync to database.
            </div>
          </div>
          <button
            onClick={() => handleSaveChanges()}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all shrink-0 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium">Loading syllabus structure...</div>
      ) : localSubjects.length === 0 ? (
        <div className="p-8 rounded-3xl glass-card border border-white/10 text-center space-y-4">
          <EmptyState
            icon={BookOpen}
            title="Curriculum Not Initialized"
            description={`No subjects or chapters found for ${currentStream.label}. Initialize default curriculum to get started with units.`}
          />
          <button
            onClick={handleInitializeFromDefault}
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-glow-emerald transition-all inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span>Initialize {currentStream.label} Curriculum with Standard Units</span>
          </button>
        </div>
      ) : (
        /* Main Workspace: 2-Column Split View (Subjects & Chapters | Chapter's Units Workspace) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Subject & Chapter Navigator (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Subject Dropdown / Selector */}
            <div className="p-4 rounded-2xl glass-card border border-white/10 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Select Subject / Paper
              </label>
              <select
                value={selectedSubjectId || ''}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  const sub = localSubjects.find(s => s.id === e.target.value);
                  if (sub && sub.chapters && sub.chapters.length > 0) {
                    setSelectedChapterId(sub.chapters[0].id);
                  } else {
                    setSelectedChapterId(null);
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white font-bold text-xs focus:outline-none focus:border-royal-500"
              >
                {localSubjects.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.subject} ({sub.chapters?.length || 0} Ch)
                  </option>
                ))}
              </select>
            </div>

            {/* Chapters List */}
            <div className="p-4 rounded-3xl glass-card border border-white/10 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-royal-400" />
                  <span>Chapters in Subject</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {filteredChapters.length} Total
                </span>
              </div>

              {/* Chapter Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search chapter..."
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-navy-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-royal-500"
                />
              </div>

              {/* Chapter Items List */}
              <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                {filteredChapters.map((ch) => {
                  const isSelected = ch.id === selectedChapterId;
                  const unitCount = (ch.units || []).length;
                  const activeCount = (ch.units || []).filter(u => u.isActive !== false).length;
                  const ptsTotal = (ch.units || []).filter(u => u.isActive !== false).reduce((sum, u) => sum + (Number(u.points) || 0), 0);

                  return (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChapterId(ch.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all border ${
                        isSelected
                          ? 'bg-royal-500/20 border-royal-500/40 text-white shadow-glow-royal'
                          : 'bg-navy-900/50 border-white/5 text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold truncate">
                          {ch.chapterNo ? `Ch ${ch.chapterNo}: ` : ''}{ch.title}
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-royal-400' : 'text-slate-500'}`} />
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1.5 pt-1 border-t border-white/5 text-[10px]">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                          unitCount > 0 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {unitCount} {unitCount === 1 ? 'Unit' : 'Units'}
                        </span>
                        {unitCount > 0 && (
                          <span className="text-gold-400 font-mono font-bold">
                            {ptsTotal} PTS
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Chapter's Units Workspace (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            
            {activeChapter ? (
              <div className="space-y-4">
                
                {/* Active Chapter Details Header Banner */}
                <div className="p-5 sm:p-6 rounded-3xl glass-card border border-white/10 space-y-4 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <div className="text-[11px] font-bold text-royal-400 uppercase tracking-wider">
                        {activeSubject?.subject}
                      </div>
                      <h2 className="text-lg sm:text-xl font-extrabold text-white">
                        {activeChapter.chapterNo ? `Chapter ${activeChapter.chapterNo}: ` : ''}{activeChapter.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={openAddModal}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow-emerald transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Unit</span>
                      </button>
                      <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="px-3 py-2 rounded-xl bg-navy-900 border border-white/10 hover:border-royal-500 text-slate-200 font-bold text-xs transition-all flex items-center gap-1.5"
                      >
                        <ListPlus className="w-3.5 h-3.5 text-royal-400" />
                        <span>Bulk Add</span>
                      </button>
                      <button
                        onClick={handleAutoGenerateUnits}
                        title="Auto-generate ICSI/ICAI standard units for this chapter"
                        className="p-2 rounded-xl bg-navy-900 border border-white/10 hover:border-gold-500 text-gold-400 hover:text-gold-300 transition-all"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Summary Pill Bar */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="px-3 py-1.5 rounded-xl bg-navy-900/80 border border-white/5 flex items-center gap-2">
                      <span className="text-slate-400 font-medium">Total Units:</span>
                      <span className="font-mono font-bold text-white">{currentUnits.length}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-navy-900/80 border border-white/5 flex items-center gap-2">
                      <span className="text-slate-400 font-medium">Active Units:</span>
                      <span className="font-mono font-bold text-emerald-400">{activeUnitsCount}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-navy-900/80 border border-white/5 flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-gold-400" />
                      <span className="text-slate-400 font-medium">Cumulative PTS:</span>
                      <span className="font-mono font-bold text-gold-400">{totalChapterPts} PTS</span>
                    </div>
                  </div>
                </div>

                {/* Units List Cards / Table */}
                {currentUnits.length === 0 ? (
                  <div className="p-8 rounded-3xl glass-card border border-white/10 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-royal-500/20 border border-royal-500/30 text-royal-400 mx-auto flex items-center justify-center">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">No Units In This Chapter Yet</h4>
                      <p className="text-slate-400 text-xs max-w-md mx-auto">
                        Students currently see this as an entire chapter. Add individual units to enable granular ICSI unit-by-unit tracking & PTS!
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        onClick={openAddModal}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow-emerald transition-all inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create First Unit</span>
                      </button>
                      <button
                        onClick={handleAutoGenerateUnits}
                        className="px-4 py-2.5 rounded-xl bg-gold-500/20 border border-gold-500/40 hover:bg-gold-500/30 text-gold-300 font-bold text-xs transition-all inline-flex items-center gap-1.5"
                      >
                        <Sparkles className="w-4 h-4 text-gold-400" />
                        <span>Auto-Generate Standard Units</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {currentUnits.map((unit, index) => {
                      const isActive = unit.isActive !== false;
                      const pts = Number(unit.points) || 0;

                      return (
                        <div
                          key={unit.id}
                          className={`p-4 rounded-2xl glass-card border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            isActive
                              ? 'border-white/10 bg-navy-900/60'
                              : 'border-white/5 bg-navy-950/40 opacity-60'
                          }`}
                        >
                          {/* Unit Info & Order controls */}
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            
                            {/* Reorder Buttons */}
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                onClick={() => handleMoveUp(index)}
                                disabled={index === 0}
                                className="p-1 rounded bg-navy-950 border border-white/10 hover:border-royal-500 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move Unit Up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveDown(index)}
                                disabled={index === currentUnits.length - 1}
                                className="p-1 rounded bg-navy-950 border border-white/10 hover:border-royal-500 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move Unit Down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Unit Badge */}
                            <div className="shrink-0 px-2.5 py-1 rounded-lg bg-navy-950 border border-white/10 text-royal-400 font-mono font-bold text-xs">
                              {unit.unitNo || `Unit ${index + 1}`}
                            </div>

                            {/* Title & Description */}
                            <div className="min-w-0 space-y-0.5">
                              <div className="font-bold text-sm text-white flex items-center gap-2">
                                <span className="truncate">{unit.title}</span>
                                {!isActive && (
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-semibold">
                                    Disabled
                                  </span>
                                )}
                              </div>
                              {unit.description && (
                                <p className="text-[11px] text-slate-400 truncate max-w-md">
                                  {unit.description}
                                </p>
                              )}
                            </div>

                          </div>

                          {/* Unit Controls (PTS input, Active toggle, Edit, Delete) */}
                          <div className="flex items-center justify-end gap-2.5 shrink-0 self-end sm:self-center">
                            
                            {/* Quick PTS Input */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-navy-950 border border-white/10">
                              <Award className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                              <input
                                type="number"
                                min="0"
                                value={pts}
                                onChange={(e) => handleQuickPtsChange(unit.id, e.target.value)}
                                className="w-12 bg-transparent text-gold-400 font-mono font-bold text-xs text-center focus:outline-none"
                                title="Click to adjust PTS"
                              />
                              <span className="text-[10px] text-slate-400 font-mono font-bold">PTS</span>
                            </div>

                            {/* Active/Inactive Toggle Button */}
                            <button
                              onClick={() => handleToggleUnitActive(unit.id)}
                              className={`p-2 rounded-xl border transition-all ${
                                isActive
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                  : 'bg-slate-800 border-white/5 text-slate-500 hover:text-slate-300'
                              }`}
                              title={isActive ? 'Unit is Active (click to disable)' : 'Unit is Disabled (click to enable)'}
                            >
                              {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(unit)}
                              className="p-2 rounded-xl bg-navy-900 border border-white/10 hover:border-royal-500 text-slate-300 hover:text-white transition-all"
                              title="Edit Unit Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteUnit(unit.id)}
                              className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                              title="Delete Unit"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 glass-card rounded-3xl border border-white/10">
                Please select a chapter from the left panel to manage its units.
              </div>
            )}

          </div>

        </div>
      )}

      {/* Add Unit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>Create New Unit</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUnitSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Unit No / Tag
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Unit 1"
                    value={unitNoInput}
                    onChange={(e) => setUnitNoInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Unit Name / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Basic Concepts"
                    value={unitTitleInput}
                    onChange={(e) => setUnitTitleInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Optional Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Key sub-topics covered in this unit..."
                  value={unitDescInput}
                  onChange={(e) => setUnitDescInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-gold-400" />
                    <span>PTS (Points) *</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={unitPtsInput}
                    onChange={(e) => setUnitPtsInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-gold-400 font-mono font-bold text-xs focus:outline-none focus:border-gold-500 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setUnitActiveInput(!unitActiveInput)}
                    className={`w-full py-2.5 px-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                      unitActiveInput
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 border-white/5 text-slate-400'
                    }`}
                  >
                    {unitActiveInput ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{unitActiveInput ? 'Active' : 'Disabled'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-glow-emerald"
                >
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Unit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-royal-400" />
                <span>Edit Unit Details</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleEditUnitSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Unit No / Tag
                  </label>
                  <input
                    type="text"
                    required
                    value={unitNoInput}
                    onChange={(e) => setUnitNoInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold text-center focus:outline-none focus:border-royal-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Unit Name / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={unitTitleInput}
                    onChange={(e) => setUnitTitleInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-royal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Optional Description
                </label>
                <textarea
                  rows={2}
                  value={unitDescInput}
                  onChange={(e) => setUnitDescInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-royal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-gold-400" />
                    <span>PTS (Points) *</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={unitPtsInput}
                    onChange={(e) => setUnitPtsInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-gold-400 font-mono font-bold text-xs focus:outline-none focus:border-gold-500 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setUnitActiveInput(!unitActiveInput)}
                    className={`w-full py-2.5 px-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                      unitActiveInput
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 border-white/5 text-slate-400'
                    }`}
                  >
                    {unitActiveInput ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{unitActiveInput ? 'Active' : 'Disabled'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-royal-600 hover:bg-royal-500 text-white text-xs font-black shadow-glow-royal"
                >
                  Update Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Units Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-royal-400" />
                <span>Bulk Add Units to Chapter</span>
              </h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkAddSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Paste Unit Titles (One per line)
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder={`Unit 1: Meaning and Scope\nUnit 2: Accounting Principles\nUnit 3: Terms Used in Accounting\nUnit 4: Capital and Revenue`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-royal-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Each non-empty line becomes a new unit. You can write "Unit 1: Title" or simply "Title".
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-gold-400" />
                  <span>Default PTS for Each Unit</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={bulkPts}
                  onChange={(e) => setBulkPts(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-gold-400 font-mono font-bold text-xs focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-glow-emerald"
                >
                  Add All Units
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
