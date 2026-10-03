import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import { 
  FileText, 
  ExternalLink, 
  Calendar, 
  BookOpen, 
  Layers, 
  Search, 
  Download, 
  GraduationCap, 
  Folder, 
  ChevronDown, 
  ChevronUp, 
  Tag, 
  Copy, 
  Check, 
  Link as LinkIcon, 
  Sparkles,
  Maximize2,
  Minimize2
} from 'lucide-react';
import toast from 'react-hot-toast';

export const DEFAULT_STREAMS = [
  'CA Foundation',
  'CA Intermediate',
  'CA Final',
  'CMA Foundation',
  'CMA Intermediate',
  'CMA Final'
];

export const DEFAULT_NOTES_TYPES = [
  { id: 'short-notes', name: 'Short Notes', order: 1 },
  { id: 'sticky-notes', name: 'Sticky Notes', order: 2 },
  { id: 'brief-notes', name: 'Brief Notes', order: 3 },
  { id: 'pyq', name: 'PYQ', order: 4 },
  { id: 'rtp', name: 'RTP', order: 5 },
  { id: 'mtp', name: 'MTP', order: 6 },
  { id: 'question-bank', name: 'Question Bank', order: 7 },
  { id: 'mcq', name: 'MCQ', order: 8 },
  { id: 'true-false', name: 'True / False', order: 9 },
  { id: 'other', name: 'Other', order: 10 }
];

function parseStudentStream(userProfile) {
  if (!userProfile) return { course: 'CA', level: 'Foundation', fullStream: 'CA Foundation' };
  const rawCourse = String(userProfile.course || 'CA Foundation').trim();
  const rawLevel = String(userProfile.level || '').trim();

  const isCMA = rawCourse.toUpperCase().includes('CMA');
  const course = isCMA ? 'CMA' : 'CA';

  let level = 'Foundation';
  if (rawCourse.toUpperCase().includes('FINAL') || rawLevel.toUpperCase().includes('FINAL')) {
    level = 'Final';
  } else if (rawCourse.toUpperCase().includes('INTER') || rawLevel.toUpperCase().includes('INTER')) {
    level = 'Intermediate';
  } else if (rawLevel.toUpperCase().includes('FOUND') || rawCourse.toUpperCase().includes('FOUND')) {
    level = 'Foundation';
  } else if (userProfile.level) {
    level = userProfile.level;
  }

  return {
    course,
    level,
    fullStream: `${course} ${level}`
  };
}

export default function Notes() {
  const { userProfile } = useAuth();
  const studentStream = parseStudentStream(userProfile);

  // Active Hierarchical Navigation State
  const [selectedStream, setSelectedStream] = useState(studentStream.fullStream || 'CA Foundation');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Firestore Real-Time Data
  const [streamsList, setStreamsList] = useState(DEFAULT_STREAMS);
  const [notesTypes, setNotesTypes] = useState(DEFAULT_NOTES_TYPES);
  const [topics, setTopics] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Accordion state for topics
  const [expandedTopicIds, setExpandedTopicIds] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Update selectedStream if userProfile changes
  useEffect(() => {
    if (studentStream.fullStream && !selectedStream) {
      setSelectedStream(studentStream.fullStream);
    }
  }, [studentStream.fullStream]);

  // 1. Listen to Streams (custom + default)
  useEffect(() => {
    const q = query(collection(db, 'notesStreams'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const customStreams = snap.docs.map(d => d.data().name).filter(Boolean);
      const combined = Array.from(new Set([...DEFAULT_STREAMS, ...customStreams]));
      setStreamsList(combined);
    }, (err) => {
      console.warn("Streams query error:", err);
      setStreamsList(DEFAULT_STREAMS);
    });

    return () => unsub();
  }, []);

  // 2. Listen to Notes Types
  useEffect(() => {
    const q = query(collection(db, 'notesTypes'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        setNotesTypes(list);
        setSelectedTypeId(prev => {
          if (prev && list.some(t => t.id === prev || t.name === prev)) {
            return prev;
          }
          return list[0]?.id || '';
        });
      } else {
        setNotesTypes(DEFAULT_NOTES_TYPES);
        if (!selectedTypeId) setSelectedTypeId(DEFAULT_NOTES_TYPES[0].id);
      }
    }, (err) => {
      console.error("NotesTypes listener error:", err);
      setNotesTypes(DEFAULT_NOTES_TYPES);
    });

    return () => unsub();
  }, []);

  // 3. Listen to Topics
  useEffect(() => {
    const q = query(collection(db, 'notesTopics'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setTopics(list);
    }, (err) => {
      console.error("Topics listener error:", err);
    });

    return () => unsub();
  }, []);

  // 4. Listen to Materials (Active & Published only)
  useEffect(() => {
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(n => n.isActive !== false && n.published !== false); // Strictly active only
      setMaterials(list);
      setLoading(false);
    }, (err) => {
      console.error("Materials listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Active Type Object
  const activeTypeObj = useMemo(() => {
    return notesTypes.find(t => t.id === selectedTypeId || t.name === selectedTypeId) || notesTypes[0];
  }, [notesTypes, selectedTypeId]);

  // Type matching helper
  const isTypeMatch = (itemTypeId, itemTypeName, targetType) => {
    if (!targetType) return true;
    if (itemTypeId === targetType.id || itemTypeId === targetType.name) return true;
    if (itemTypeName && targetType.name && itemTypeName.toLowerCase() === targetType.name.toLowerCase()) return true;
    return false;
  };

  // Materials under currently selected stream & notes category
  const activeStreamMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchStream = (m.course || m.stream || '').toLowerCase() === selectedStream.toLowerCase();
      const matchType = isTypeMatch(m.notesTypeId, m.notesTypeName, activeTypeObj);
      return matchStream && matchType;
    });
  }, [materials, selectedStream, activeTypeObj]);

  // Topics under currently selected stream & notes category
  const activeStreamTopics = useMemo(() => {
    return topics.filter(t => {
      const matchStream = (t.stream || '').toLowerCase() === selectedStream.toLowerCase();
      const matchType = isTypeMatch(t.notesTypeId, t.notesTypeName, activeTypeObj);
      return matchStream && matchType;
    });
  }, [topics, selectedStream, activeTypeObj]);

  // Available subjects for subject filter
  const availableSubjects = useMemo(() => {
    const subjects = new Set();
    activeStreamTopics.forEach(t => { if (t.subject) subjects.add(t.subject); });
    activeStreamMaterials.forEach(m => { if (m.subject) subjects.add(m.subject); });
    return Array.from(subjects);
  }, [activeStreamTopics, activeStreamMaterials]);

  // Count active materials per category for selected stream
  const getCountForType = (typeItem) => {
    return materials.filter(m => {
      const matchStream = (m.course || m.stream || '').toLowerCase() === selectedStream.toLowerCase();
      return matchStream && isTypeMatch(m.notesTypeId, m.notesTypeName, typeItem);
    }).length;
  };

  // Filtered topics based on subject filter and search query
  const filteredTopics = useMemo(() => {
    return activeStreamTopics.filter(t => {
      if (selectedSubject !== 'ALL' && t.subject !== selectedSubject) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const titleMatch = (t.title || '').toLowerCase().includes(q);
      const subjectMatch = (t.subject || '').toLowerCase().includes(q);
      const descMatch = (t.description || '').toLowerCase().includes(q);
      const hasMatchingMaterial = materials.some(m => 
        m.topicId === t.id && (
          (m.title || '').toLowerCase().includes(q) ||
          (m.description || '').toLowerCase().includes(q) ||
          (m.fileName || '').toLowerCase().includes(q)
        )
      );
      return titleMatch || subjectMatch || descMatch || hasMatchingMaterial;
    });
  }, [activeStreamTopics, selectedSubject, searchQuery, materials]);

  // Materials for a topic, filtered by search query
  const getTopicMaterials = (topicId) => {
    return materials.filter(m => {
      if (m.topicId !== topicId) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (m.title || '').toLowerCase().includes(q) ||
        (m.subject || '').toLowerCase().includes(q) ||
        (m.fileName || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
      );
    });
  };

  // Uncategorized / direct materials in this stream & type
  const uncategorizedMaterials = useMemo(() => {
    return activeStreamMaterials.filter(m => {
      const hasTopic = topics.some(t => t.id === m.topicId);
      if (hasTopic) return false;
      if (selectedSubject !== 'ALL' && m.subject !== selectedSubject) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (m.title || '').toLowerCase().includes(q) ||
          (m.subject || '').toLowerCase().includes(q) ||
          (m.fileName || '').toLowerCase().includes(q) ||
          (m.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeStreamMaterials, topics, selectedSubject, searchQuery]);

  // Toggle topic accordion
  const toggleTopicExpand = (topicId) => {
    setExpandedTopicIds(prev => ({
      ...prev,
      [topicId]: prev[topicId] === undefined ? false : !prev[topicId]
    }));
  };

  const handleExpandAll = () => {
    const all = {};
    filteredTopics.forEach(t => { all[t.id] = true; });
    setExpandedTopicIds(all);
  };

  const handleCollapseAll = () => {
    const all = {};
    filteredTopics.forEach(t => { all[t.id] = false; });
    setExpandedTopicIds(all);
  };

  const handleCopyLink = (url, id) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalVisibleMaterials = activeStreamMaterials.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ========================================================= */}
      {/* 1. HEADER BANNER WITH STREAM & INFO                       */}
      {/* ========================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-purple-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Official Academic Library & Notes</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Study Materials & <span className="gold-gradient-text">PDF Library</span>
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              Browse structured study material organized by Stream, Category, Subject, and Chapter. Access curated PDFs, revision summaries, and question banks.
            </p>
          </div>

          {/* Student's Current Enrolled Stream Badge */}
          <div className="shrink-0 p-4 rounded-2xl bg-navy-900/80 border border-purple-500/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <GraduationCap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Enrolled Stream</div>
              <div className="text-sm font-extrabold text-white">{studentStream.fullStream}</div>
            </div>
          </div>
        </div>

        {/* STEP 1: SELECT STREAM BAR */}
        <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-400" />
              Select Stream:
            </span>
            {streamsList.map((st) => {
              const isSelected = selectedStream === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setSelectedStream(st);
                    setSelectedSubject('ALL');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold shadow-glow-purple scale-105'
                      : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {st}
                  {st === studentStream.fullStream && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] bg-white/20 text-white font-black">
                      You
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, file, or keyword..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 2. STEP 2: SELECT NOTES TYPE (Category Tabs)              */}
      {/* ========================================================= */}
      <div className="p-4 rounded-2xl glass-card border border-white/10 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Select Material Category ({notesTypes.length})
            </span>
          </div>

          <div className="text-xs text-slate-400">
            Total Available in {selectedStream}: <span className="font-bold text-amber-400">{totalVisibleMaterials}</span>
          </div>
        </div>

        {/* Dynamic Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {notesTypes.map((typeItem) => {
            const isSelected = activeTypeObj?.id === typeItem.id || activeTypeObj?.name === typeItem.name;
            const count = getCountForType(typeItem);

            return (
              <button
                key={typeItem.id}
                type="button"
                onClick={() => {
                  setSelectedTypeId(typeItem.id);
                  setSelectedSubject('ALL');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-navy-950 font-black shadow-glow-gold scale-102'
                    : 'bg-navy-900/90 text-slate-300 hover:text-white hover:bg-navy-800 border border-white/10'
                }`}
              >
                <span>{typeItem.name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isSelected ? 'bg-navy-950 text-amber-400' : 'bg-white/10 text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* STEP 3: SUBJECT FILTER PILLS (If multiple subjects present) */}
        {availableSubjects.length > 0 && (
          <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Subject:</span>
            <button
              type="button"
              onClick={() => setSelectedSubject('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedSubject === 'ALL'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              All Subjects
            </button>
            {availableSubjects.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubject(sub)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer truncate max-w-xs ${
                  selectedSubject === sub
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={sub}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. STEP 4: TOPICS & MATERIALS DISPLAY                     */}
      {/* ========================================================= */}
      <div className="space-y-4">
        
        {/* Navigation Breadcrumbs & Expand/Collapse All */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-navy-900/50 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 flex-wrap">
            <span className="text-white font-bold">{selectedStream}</span>
            <span className="text-slate-500">&rarr;</span>
            <span className="text-amber-400 font-bold">{activeTypeObj?.name || 'Notes'}</span>
            {selectedSubject !== 'ALL' && (
              <>
                <span className="text-slate-500">&rarr;</span>
                <span className="text-purple-300 font-medium">{selectedSubject}</span>
              </>
            )}
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 text-[11px]">
              {filteredTopics.length} Chapters/Topics
            </span>
          </div>

          {filteredTopics.length > 0 && (
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Expand All</span>
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Minimize2 className="w-3 h-3" />
                <span>Collapse All</span>
              </button>
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredTopics.length === 0 && uncategorizedMaterials.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={`No study materials available`}
            description={
              searchQuery
                ? `No materials matched your search query "${searchQuery}".`
                : `Official ${activeTypeObj?.name || 'study material'} uploaded by faculty for ${selectedStream} will appear here.`
            }
          />
        ) : (
          <div className="space-y-4">
            
            {/* List Topics with Accordion */}
            {filteredTopics.map((topicItem, index) => {
              const topicMats = getTopicMaterials(topicItem.id);
              // Default first topic expanded or check state
              const isExpanded = expandedTopicIds[topicItem.id] !== undefined 
                ? expandedTopicIds[topicItem.id] 
                : true;

              return (
                <div
                  key={topicItem.id}
                  className="rounded-3xl glass-card border border-white/10 overflow-hidden shadow-lg hover:border-purple-500/30 transition-all"
                >
                  {/* Topic Title Row / Accordion Header */}
                  <div
                    onClick={() => toggleTopicExpand(topicItem.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-navy-900/90 to-navy-950/80 cursor-pointer border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5 sm:mt-0">
                        <Folder className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                            {topicItem.subject}
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-white truncate">
                            {topicItem.title}
                          </h3>
                        </div>
                        {topicItem.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                            {topicItem.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <span className="px-2.5 py-1 rounded-full bg-white/5 text-slate-300 text-xs font-bold border border-white/10">
                        {topicMats.length} {topicMats.length === 1 ? 'Resource' : 'Resources'}
                      </span>
                      <button
                        type="button"
                        aria-label="Toggle Topic"
                        className="p-1.5 text-slate-400 hover:text-white"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Topic Materials List */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 space-y-3 bg-navy-950/50">
                      {topicMats.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-navy-900/40 border border-white/5 text-center text-xs text-slate-400">
                          No materials available under this topic yet. Check back soon.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {topicMats.map((mat) => {
                            const resourceUrl = mat.fileUrl || mat.driveUrl;
                            const isPdf = mat.uploadMode === 'pdf' || (mat.fileUrl && !mat.fileUrl.includes('drive.google'));

                            return (
                              <div
                                key={mat.id}
                                className="p-5 rounded-2xl bg-navy-900/90 border border-white/10 hover:border-purple-500/40 transition-all space-y-3.5 flex flex-col justify-between group shadow-sm hover:shadow-glow-purple"
                              >
                                <div className="space-y-2.5">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                      isPdf
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    }`}>
                                      {isPdf ? (
                                        <>
                                          <FileText className="w-3 h-3" />
                                          <span>PDF Document</span>
                                        </>
                                      ) : (
                                        <>
                                          <LinkIcon className="w-3 h-3" />
                                          <span>Drive Link</span>
                                        </>
                                      )}
                                    </span>

                                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-gold-400" />
                                      {formatDate(mat.createdAt)}
                                    </span>
                                  </div>

                                  <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-purple-300 transition-colors leading-snug">
                                    {mat.title}
                                  </h4>

                                  {mat.fileName && isPdf && (
                                    <div className="text-[11px] text-slate-400 font-mono truncate flex items-center gap-1.5">
                                      <FileText className="w-3 h-3 text-purple-400 shrink-0" />
                                      <span className="truncate">{mat.fileName}</span>
                                    </div>
                                  )}

                                  {mat.description && (
                                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                                      {mat.description}
                                    </p>
                                  )}
                                </div>

                                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-[11px] text-slate-400 font-medium truncate">
                                    By {mat.author || mat.createdBy || 'Faculty'}
                                  </span>

                                  <div className="flex items-center gap-2">
                                    {resourceUrl && (
                                      <button
                                        type="button"
                                        onClick={() => handleCopyLink(resourceUrl, mat.id)}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                                        title="Copy Link"
                                      >
                                        {copiedId === mat.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                    )}

                                    {resourceUrl ? (
                                      <a
                                        href={resourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow-purple transition-all cursor-pointer hover:scale-103"
                                      >
                                        <span>Open Material</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ) : (
                                      <span className="text-xs text-slate-500 italic">No link</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}

            {/* Direct / Unassigned Materials Section */}
            {uncategorizedMaterials.length > 0 && (
              <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-4 bg-navy-950/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      General Study Materials ({uncategorizedMaterials.length})
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {uncategorizedMaterials.map((mat) => {
                    const resourceUrl = mat.fileUrl || mat.driveUrl;
                    const isPdf = mat.uploadMode === 'pdf' || (mat.fileUrl && !mat.fileUrl.includes('drive.google'));

                    return (
                      <div
                        key={mat.id}
                        className="p-5 rounded-2xl bg-navy-900 border border-white/10 hover:border-purple-500/40 transition-all space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-purple-300">
                              {mat.subject}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatDate(mat.createdAt)}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-white">{mat.title}</h4>
                          {mat.description && (
                            <p className="text-xs text-slate-300 line-clamp-2">{mat.description}</p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">By {mat.author || 'Faculty'}</span>
                          {resourceUrl ? (
                            <a
                              href={resourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white text-xs font-bold transition-all"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
