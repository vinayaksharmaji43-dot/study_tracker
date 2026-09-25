import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { SYLLABUS_DATA, getDefaultUnitsForChapter } from '../../data/syllabusData';
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
  Edit3,
  Check,
  X,
  Sparkles,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Tag,
  Hash,
  ShieldCheck,
  Zap,
  Info
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

  // Live Syllabus & Revision Documents
  const [syllabusDoc, setSyllabusDoc] = useState(null);
  const [revisionDoc, setRevisionDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [expandedChapters, setExpandedChapters] = useState({});

  // Add / Edit Manual Unit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add_manual'); // 'add_manual' | 'edit_manual' | 'edit_override'
  const [activeSubject, setActiveSubject] = useState(null);
  const [activeChapter, setActiveChapter] = useState(null);
  const [targetUnit, setTargetUnit] = useState(null);

  // Form Fields
  const [formUnitNo, setFormUnitNo] = useState('');
  const [formUnitTitle, setFormUnitTitle] = useState('');
  const [formUnitDesc, setFormUnitDesc] = useState('');
  const [formUnitPts, setFormUnitPts] = useState('10');
  const [formUnitActive, setFormUnitActive] = useState(true);

  // 1. Real-time listener for Syllabus Blueprint
  useEffect(() => {
    const syllabusRef = doc(db, 'syllabi', selectedStreamId);
    const unsubSyllabus = onSnapshot(syllabusRef, (snap) => {
      if (snap.exists()) {
        setSyllabusDoc(snap.data());
      } else {
        setSyllabusDoc(null);
      }
    }, (err) => {
      console.error("Error listening to syllabus:", err);
      setSyllabusDoc(null);
    });

    return () => unsubSyllabus();
  }, [selectedStreamId]);

  // 2. Real-time listener for Revision Controls (disabled units, manual units, unit overrides)
  useEffect(() => {
    setLoading(true);
    const revRef = doc(db, 'revisions', selectedStreamId);
    const unsubRev = onSnapshot(revRef, (snap) => {
      if (snap.exists()) {
        setRevisionDoc(snap.data());
      } else {
        setRevisionDoc(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error listening to revision doc:", err);
      setRevisionDoc(null);
      setLoading(false);
    });

    return () => unsubRev();
  }, [selectedStreamId]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isModalOpen]);

  // Extract base subjects from Syllabus or fallback data
  const baseSubjects = useMemo(() => {
    if (syllabusDoc?.subjects && syllabusDoc.subjects.length > 0) {
      return syllabusDoc.subjects;
    }
    const fallbackCourse = SYLLABUS_DATA[currentStream.course]?.[currentStream.level] || [];
    return fallbackCourse.map((sub, sIdx) => ({
      id: `fallback_sub_${sIdx}`,
      subject: sub.subject,
      chapters: (sub.chapters || []).map((ch, cIdx) => ({
        id: ch.id,
        chapterNo: String(cIdx + 1),
        title: ch.title,
        points: 10,
        units: getDefaultUnitsForChapter(ch.id, ch.title)
      }))
    }));
  }, [syllabusDoc, currentStream]);

  // Read revision controls
  const disabledUnitIds = useMemo(() => revisionDoc?.disabledUnitIds || [], [revisionDoc]);
  const manualUnits = useMemo(() => revisionDoc?.manualUnits || [], [revisionDoc]);
  const unitOverrides = useMemo(() => revisionDoc?.unitOverrides || {}, [revisionDoc]);

  // Build combined Subject -> Chapter -> Units hierarchy
  const combinedSubjects = useMemo(() => {
    return baseSubjects.map(sub => {
      const chapters = (sub.chapters || []).map(ch => {
        // 1. Base syllabus units
        const chSyllabusUnits = (ch.units && ch.units.length > 0)
          ? ch.units
          : getDefaultUnitsForChapter(ch.id, ch.title);

        const mappedSyllabusUnits = chSyllabusUnits.map((u, uIdx) => {
          const override = unitOverrides[u.id] || {};
          const isDisabled = disabledUnitIds.includes(u.id) || u.isActive === false;

          return {
            id: u.id,
            chapterId: ch.id,
            subjectId: sub.id,
            unitNo: u.unitNo || `Unit ${uIdx + 1}`,
            title: override.title || u.title,
            originalTitle: u.title,
            description: u.description || '',
            points: override.points !== undefined ? Number(override.points) : (Number(u.points) || 10),
            isManual: false,
            isSyllabus: true,
            isDisabledInRevision: isDisabled,
            hasOverride: Boolean(override.title || override.points !== undefined)
          };
        });

        // 2. Manual units added directly for this chapter in Revision
        const chManualUnits = manualUnits
          .filter(mu => mu.chapterId === ch.id)
          .map(mu => ({
            id: mu.id,
            chapterId: ch.id,
            subjectId: sub.id,
            unitNo: mu.unitNo || 'Manual Unit',
            title: mu.title,
            description: mu.description || '',
            points: Number(mu.points) || 10,
            isManual: true,
            isSyllabus: false,
            isDisabledInRevision: mu.isActive === false,
            isActive: mu.isActive !== false
          }));

        const allUnits = [...mappedSyllabusUnits, ...chManualUnits];
        const activeUnitsCount = allUnits.filter(u => !u.isDisabledInRevision).length;

        return {
          ...ch,
          units: allUnits,
          totalUnitsCount: allUnits.length,
          activeUnitsCount
        };
      });

      return {
        ...sub,
        chapters
      };
    });
  }, [baseSubjects, disabledUnitIds, manualUnits, unitOverrides]);

  // Calculate statistics
  const stats = useMemo(() => {
    let totalChaps = 0;
    let totalUnits = 0;
    let totalSyllabusUnits = 0;
    let totalManualUnits = manualUnits.length;
    let totalDisabledUnits = 0;

    combinedSubjects.forEach(s => {
      s.chapters.forEach(ch => {
        totalChaps++;
        ch.units.forEach(u => {
          totalUnits++;
          if (u.isSyllabus) totalSyllabusUnits++;
          if (u.isDisabledInRevision) totalDisabledUnits++;
        });
      });
    });

    return {
      totalSubjects: combinedSubjects.length,
      totalChapters: totalChaps,
      totalUnits,
      totalSyllabusUnits,
      totalManualUnits,
      totalDisabledUnits,
      totalActiveRevisionUnits: totalUnits - totalDisabledUnits
    };
  }, [combinedSubjects, manualUnits]);

  // Toggle unit enabled/disabled for Revision
  const handleToggleUnitEnabled = async (unit) => {
    try {
      setSaving(true);
      const revRef = doc(db, 'revisions', selectedStreamId);

      if (unit.isManual) {
        // For manual units, toggle isActive flag in manualUnits array
        const updatedManualUnits = manualUnits.map(mu => {
          if (mu.id === unit.id) {
            return { ...mu, isActive: unit.isDisabledInRevision };
          }
          return mu;
        });

        await setDoc(revRef, {
          streamId: selectedStreamId,
          course: currentStream.course,
          level: currentStream.level,
          manualUnits: updatedManualUnits,
          updatedAt: serverTimestamp()
        }, { merge: true });

      } else {
        // For syllabus units, toggle presence in disabledUnitIds
        let updatedDisabled = [...disabledUnitIds];
        if (unit.isDisabledInRevision) {
          updatedDisabled = updatedDisabled.filter(id => id !== unit.id);
        } else {
          if (!updatedDisabled.includes(unit.id)) {
            updatedDisabled.push(unit.id);
          }
        }

        await setDoc(revRef, {
          streamId: selectedStreamId,
          course: currentStream.course,
          level: currentStream.level,
          disabledUnitIds: updatedDisabled,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (err) {
      console.error("Error toggling unit:", err);
      alert("Failed to toggle unit in revision.");
    } finally {
      setSaving(false);
    }
  };

  // Open modal to add a manual revision unit to a chapter
  const handleOpenAddManualUnit = (chapter, subject) => {
    setActiveSubject(subject);
    setActiveChapter(chapter);
    setTargetUnit(null);
    setModalMode('add_manual');
    setFormUnitNo(`Unit ${(chapter.units?.length || 0) + 1}`);
    setFormUnitTitle('');
    setFormUnitDesc('');
    setFormUnitPts('10');
    setFormUnitActive(true);
    setIsModalOpen(true);
  };

  // Open modal to edit unit (manual or syllabus override)
  const handleOpenEditUnit = (unit, chapter, subject) => {
    setActiveSubject(subject);
    setActiveChapter(chapter);
    setTargetUnit(unit);
    if (unit.isManual) {
      setModalMode('edit_manual');
      setFormUnitNo(unit.unitNo || '');
      setFormUnitTitle(unit.title || '');
      setFormUnitDesc(unit.description || '');
      setFormUnitPts(String(unit.points || 10));
      setFormUnitActive(!unit.isDisabledInRevision);
    } else {
      setModalMode('edit_override');
      setFormUnitNo(unit.unitNo || '');
      setFormUnitTitle(unit.title || '');
      setFormUnitDesc(unit.description || '');
      setFormUnitPts(String(unit.points || 10));
      setFormUnitActive(!unit.isDisabledInRevision);
    }
    setIsModalOpen(true);
  };

  // Delete manual unit
  const handleDeleteManualUnit = async (unitId) => {
    if (!window.confirm("Are you sure you want to delete this manual revision unit?")) return;
    try {
      setSaving(true);
      const revRef = doc(db, 'revisions', selectedStreamId);
      const updatedManualUnits = manualUnits.filter(mu => mu.id !== unitId);

      await setDoc(revRef, {
        streamId: selectedStreamId,
        course: currentStream.course,
        level: currentStream.level,
        manualUnits: updatedManualUnits,
        updatedAt: serverTimestamp()
      }, { merge: true });

    } catch (err) {
      console.error("Error deleting manual unit:", err);
      alert("Failed to delete manual revision unit.");
    } finally {
      setSaving(false);
    }
  };

  // Save Modal Form (Add / Edit Manual Unit or Override)
  const handleSaveModalForm = async (e) => {
    e.preventDefault();
    if (!formUnitTitle.trim()) {
      return alert("Please enter unit title.");
    }

    try {
      setSaving(true);
      const revRef = doc(db, 'revisions', selectedStreamId);
      const ptsNum = parseInt(formUnitPts, 10) || 10;

      if (modalMode === 'add_manual') {
        const newManualUnit = {
          id: `rev_manual_u_${Date.now()}`,
          chapterId: activeChapter.id,
          subjectId: activeSubject.id,
          unitNo: formUnitNo.trim() || `Unit ${(activeChapter.units?.length || 0) + 1}`,
          title: formUnitTitle.trim(),
          description: formUnitDesc.trim(),
          points: ptsNum,
          isActive: formUnitActive,
          createdAt: new Date().toISOString()
        };

        const updatedManualUnits = [...manualUnits, newManualUnit];
        await setDoc(revRef, {
          streamId: selectedStreamId,
          course: currentStream.course,
          level: currentStream.level,
          manualUnits: updatedManualUnits,
          updatedAt: serverTimestamp()
        }, { merge: true });

      } else if (modalMode === 'edit_manual') {
        const updatedManualUnits = manualUnits.map(mu => {
          if (mu.id === targetUnit.id) {
            return {
              ...mu,
              unitNo: formUnitNo.trim(),
              title: formUnitTitle.trim(),
              description: formUnitDesc.trim(),
              points: ptsNum,
              isActive: formUnitActive
            };
          }
          return mu;
        });

        await setDoc(revRef, {
          streamId: selectedStreamId,
          course: currentStream.course,
          level: currentStream.level,
          manualUnits: updatedManualUnits,
          updatedAt: serverTimestamp()
        }, { merge: true });

      } else if (modalMode === 'edit_override') {
        // Save override for syllabus unit specifically in revision
        const updatedOverrides = {
          ...unitOverrides,
          [targetUnit.id]: {
            title: formUnitTitle.trim(),
            points: ptsNum
          }
        };

        await setDoc(revRef, {
          streamId: selectedStreamId,
          course: currentStream.course,
          level: currentStream.level,
          unitOverrides: updatedOverrides,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving unit modal:", err);
      alert("Failed to save unit.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleExpandChapter = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  // Filter combined subjects based on search & subject filter
  const displayedSubjects = useMemo(() => {
    return combinedSubjects.filter(sub => {
      if (selectedSubjectFilter !== 'all' && sub.id !== selectedSubjectFilter) {
        return false;
      }
      return true;
    });
  }, [combinedSubjects, selectedSubjectFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-royal-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-royal-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-royal-500/20 text-royal-300 text-xs font-bold border border-royal-500/30">
              <RotateCcw className="w-4 h-4 text-royal-400" />
              <span>Unified Revision Architecture</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Revision Management & Units Sync
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Revision automatically derives and syncs from Syllabus <strong>Subject → Chapter → Units</strong> in real-time.
              You can enable/disable syllabus units for revision, or add custom manual revision units.
            </p>
          </div>

          {/* Stream Selector */}
          <div className="flex flex-col gap-2 shrink-0">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Course & Stream</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STREAMS.map(stream => (
                <button
                  key={stream.id}
                  onClick={() => setSelectedStreamId(stream.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedStreamId === stream.id
                      ? 'bg-gradient-to-r from-royal-600 to-indigo-600 text-white shadow-glow-blue border border-royal-400/40'
                      : 'bg-navy-900/80 border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {stream.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-royal-400" />
            <span>Subjects</span>
          </div>
          <div className="text-xl font-black text-white">{stats.totalSubjects}</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Chapters</span>
          </div>
          <div className="text-xl font-black text-white">{stats.totalChapters}</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Active Revision Units</span>
          </div>
          <div className="text-xl font-black text-emerald-400">{stats.totalActiveRevisionUnits}</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Manual Units</span>
          </div>
          <div className="text-xl font-black text-purple-400">{stats.totalManualUnits}</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-white/10 bg-navy-900/60 space-y-1 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5 text-rose-400" />
            <span>Disabled in Rev</span>
          </div>
          <div className="text-xl font-black text-rose-400">{stats.totalDisabledUnits}</div>
        </div>
      </div>

      {/* Search & Subject Tabs Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chapters or revision units..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-navy-900/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-royal-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedSubjectFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedSubjectFilter === 'all'
                ? 'bg-royal-600 text-white border border-royal-400/40 shadow-sm'
                : 'bg-navy-900 border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            All Subjects ({combinedSubjects.length})
          </button>
          {combinedSubjects.map(sub => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectFilter(sub.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 max-w-[200px] truncate ${
                selectedSubjectFilter === sub.id
                  ? 'bg-royal-600 text-white border border-royal-400/40 shadow-sm'
                  : 'bg-navy-900 border border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {sub.subject}
            </button>
          ))}
        </div>
      </div>

      {/* Automatic Sync Notice Strip */}
      <div className="p-3.5 rounded-2xl bg-royal-500/10 border border-royal-500/20 flex items-center justify-between text-xs text-royal-200">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-royal-400 shrink-0" />
          <span>
            <strong>Automatic Sync Active:</strong> Syllabus units for <strong>{currentStream.label}</strong> flow directly into Revision without duplicate records. Changes made in Chapters & Units reflect instantly.
          </span>
        </div>
      </div>

      {/* Subject & Chapter Cards */}
      <div className="space-y-6">
        {displayedSubjects.map(subObj => {
          const rawChapters = subObj.chapters || [];
          const filteredChapters = searchQuery.trim()
            ? rawChapters.filter(ch => 
                ch.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ch.units?.some(u => u.title?.toLowerCase().includes(searchQuery.toLowerCase()))
              )
            : rawChapters;

          if (searchQuery.trim() && filteredChapters.length === 0) {
            return null;
          }

          return (
            <div key={subObj.id} className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
              
              {/* Subject Header */}
              <div className="p-5 bg-navy-900/90 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-royal-500/20 border border-royal-500/30 text-royal-400 flex items-center justify-center font-bold text-xs shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-white truncate">{subObj.subject}</h3>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {rawChapters.length} Chapters • {rawChapters.reduce((acc, c) => acc + c.units.length, 0)} Units in Revision
                    </div>
                  </div>
                </div>
              </div>

              {/* Chapters & Units List */}
              <div className="divide-y divide-white/5">
                {filteredChapters.map(ch => {
                  const isExpanded = expandedChapters[ch.id] !== false; // default expanded
                  const units = ch.units || [];

                  return (
                    <div key={ch.id} className="border-b border-white/5 last:border-b-0">
                      
                      {/* Chapter Accordion Bar */}
                      <div className="p-4 sm:px-6 bg-navy-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
                        
                        <div 
                          onClick={() => handleToggleExpandChapter(ch.id)}
                          className="flex items-center space-x-3 cursor-pointer min-w-0"
                        >
                          <button
                            type="button"
                            className="p-1 rounded-lg bg-navy-900 border border-white/10 text-slate-400 hover:text-white shrink-0"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-royal-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </button>

                          <div className="min-w-0">
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-navy-900 border border-white/10 text-royal-300 mr-2">
                              {ch.chapterNo ? `Ch ${ch.chapterNo}` : 'Ch'}
                            </span>
                            <span className="text-sm font-bold text-white">
                              {ch.title}
                            </span>
                          </div>
                        </div>

                        {/* Chapter Action & Unit Counts */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <span className="text-xs px-2.5 py-1 rounded-xl bg-navy-900 border border-white/10 text-slate-300 font-mono">
                            <strong className="text-emerald-400">{ch.activeUnitsCount}</strong>/{units.length} Units Active
                          </span>

                          <button
                            type="button"
                            onClick={() => handleOpenAddManualUnit(ch, subObj)}
                            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5 text-purple-400" />
                            <span>Add Manual Unit</span>
                          </button>
                        </div>
                      </div>

                      {/* Units List */}
                      {isExpanded && (
                        <div className="bg-navy-950/60 divide-y divide-white/5 pl-4 sm:pl-12 pr-4 sm:pr-6 py-2">
                          {units.length === 0 ? (
                            <div className="p-4 text-xs text-slate-500 text-center">
                              No revision units found in this chapter. Click "+ Add Manual Unit" to add one.
                            </div>
                          ) : (
                            units.map((unit) => {
                              const isDisabled = unit.isDisabledInRevision;

                              return (
                                <div
                                  key={unit.id}
                                  className={`p-3 sm:px-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                                    isDisabled ? 'bg-navy-900/20 opacity-60' : 'hover:bg-white/5'
                                  }`}
                                >
                                  {/* Left: Unit Identity */}
                                  <div className="flex items-start sm:items-center space-x-3 min-w-0">
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-navy-900 border border-white/10 text-slate-400 shrink-0">
                                      {unit.unitNo}
                                    </span>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs sm:text-sm font-semibold ${isDisabled ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                                          {unit.title}
                                        </span>

                                        {/* Source Badge: Syllabus vs Manual */}
                                        {unit.isManual ? (
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1">
                                            <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                                            Manual Unit
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1">
                                            <Layers className="w-2.5 h-2.5 text-cyan-400" />
                                            Syllabus Unit
                                          </span>
                                        )}

                                        {unit.hasOverride && (
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            Title Overridden
                                          </span>
                                        )}

                                        {isDisabled && (
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                            Disabled in Revision
                                          </span>
                                        )}
                                      </div>

                                      {unit.description && (
                                        <div className="text-[11px] text-slate-500 truncate max-w-lg mt-0.5">
                                          {unit.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Points & Actions */}
                                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-navy-900 border border-white/5 text-gold-400">
                                      {unit.points} PTS
                                    </span>

                                    {/* Enable / Disable Button */}
                                    <button
                                      type="button"
                                      disabled={saving}
                                      onClick={() => handleToggleUnitEnabled(unit)}
                                      className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${
                                        isDisabled
                                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500 hover:text-white'
                                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500 hover:text-navy-950'
                                      }`}
                                      title={isDisabled ? "Enable this unit in Student Revision" : "Disable this unit from Student Revision"}
                                    >
                                      {isDisabled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                      <span className="hidden sm:inline">{isDisabled ? 'Enable' : 'Active'}</span>
                                    </button>

                                    {/* Edit Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditUnit(unit, ch, subObj)}
                                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                                      title="Edit Revision Unit"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Delete Button (Only for Manual Units) */}
                                    {unit.isManual && (
                                      <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() => handleDeleteManualUnit(unit.id)}
                                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                                        title="Delete Manual Unit"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>

                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

      {/* Add / Edit Unit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl space-y-6 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {modalMode === 'add_manual' && 'Add Manual Revision Unit'}
                    {modalMode === 'edit_manual' && 'Edit Manual Revision Unit'}
                    {modalMode === 'edit_override' && 'Edit Syllabus Unit (Revision Override)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeChapter?.title} • {activeSubject?.subject}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalForm} className="space-y-4">
              
              {/* Unit Number */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Unit Label / Number
                </label>
                <input
                  type="text"
                  required
                  value={formUnitNo}
                  onChange={(e) => setFormUnitNo(e.target.value)}
                  placeholder="e.g. Unit 5 or Practice Unit"
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Unit Title */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Unit Title
                </label>
                <input
                  type="text"
                  required
                  value={formUnitTitle}
                  onChange={(e) => setFormUnitTitle(e.target.value)}
                  placeholder="e.g. Past Year Paper Revision Problems"
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Unit Description */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Description / Study Focus (Optional)
                </label>
                <textarea
                  rows="2"
                  value={formUnitDesc}
                  onChange={(e) => setFormUnitDesc(e.target.value)}
                  placeholder="e.g. Focus on ICAI RTP & case-based questions"
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Points */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Revision Points (PTS)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={formUnitPts}
                  onChange={(e) => setFormUnitPts(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-navy-900 border border-white/5">
                <div>
                  <div className="text-xs font-bold text-white">Active in Student Revision</div>
                  <div className="text-[11px] text-slate-400">If unchecked, students will not see this unit</div>
                </div>
                <input
                  type="checkbox"
                  checked={formUnitActive}
                  onChange={(e) => setFormUnitActive(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold transition-all text-xs shadow-glow-purple flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Unit'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
