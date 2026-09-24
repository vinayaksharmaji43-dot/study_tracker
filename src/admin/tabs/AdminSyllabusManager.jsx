import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { SYLLABUS_DATA, getDefaultUnitsForChapter } from '../../data/syllabusData';
import EmptyState from '../../components/EmptyState';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Save, 
  BookOpen, 
  FileText, 
  Award,
  AlertCircle,
  GripVertical
} from 'lucide-react';

export default function AdminSyllabusManager() {
  const [course, setCourse] = useState('CA');
  const [level, setLevel] = useState('Foundation');
  const [syllabusDoc, setSyllabusDoc] = useState(null);
  
  // Local state for editing the syllabus before saving
  const [localSubjects, setLocalSubjects] = useState([]);
  const [saving, setSaving] = useState(false);

  // New item inputs
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  
  // Modal for adding chapter
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [newChapNo, setNewChapNo] = useState('');
  const [newChapTitle, setNewChapTitle] = useState('');
  const [newChapPoints, setNewChapPoints] = useState('10');

  // Drag and Drop Refs
  const dragItem = useRef();
  const dragOverItem = useRef();
  const draggingSubjectId = useRef();

  const streamId = `${course}_${level}`;
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'syllabi', streamId);
    
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSyllabusDoc(data);
        setLocalSubjects(data.subjects || []);
      } else {
        setSyllabusDoc(null);
        setLocalSubjects([]);
      }
      setInitialLoad(false);
    }, (err) => {
      console.error("Error fetching admin syllabus manager:", err);
      setSyllabusDoc(null);
      setLocalSubjects([]);
      setInitialLoad(false);
    });

    return () => unsub();
  }, [streamId]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (activeSubjectId) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [activeSubjectId]);

  // Handle initializing from local static data
  const handleInitializeDefault = async () => {
    try {
      setSaving(true);
      const defaultSubjects = SYLLABUS_DATA[course]?.[level] || [];
      
      const mappedSubjects = defaultSubjects.map((sub, sIdx) => ({
        id: `sub_${Date.now()}_${sIdx}`,
        subject: sub.subject,
        chapters: sub.chapters.map((ch, cIdx) => {
          const chId = ch.id || `ch_${Date.now()}_${sIdx}_${cIdx}`;
          return {
            id: chId,
            chapterNo: cIdx + 1,
            title: ch.title,
            points: ch.points || 10,
            units: ch.units || getDefaultUnitsForChapter(streamId, ch.title, cIdx + 1, chId)
          };
        })
      }));

      const docRef = doc(db, 'syllabi', streamId);
      await setDoc(docRef, {
        course,
        level,
        subjects: mappedSubjects
      });
      alert('Syllabus initialized successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to initialize syllabus.');
    } finally {
      setSaving(false);
    }
  };

  // Add a new empty subject (Part / Paper)
  const handleAddSubject = () => {
    if (!newSubjectTitle.trim()) return;
    const newSub = {
      id: `sub_${Date.now()}`,
      subject: newSubjectTitle.trim(),
      chapters: []
    };
    setLocalSubjects([...localSubjects, newSub]);
    setNewSubjectTitle('');
  };

  // Delete a subject
  const handleDeleteSubject = (subId) => {
    if (window.confirm('Are you sure you want to delete this entire Part/Paper and all its topics?')) {
      setLocalSubjects(localSubjects.filter(s => s.id !== subId));
    }
  };

  // Open chapter modal
  const openChapterModal = (subId) => {
    setActiveSubjectId(subId);
    
    // Auto-calculate next chapter number
    const sub = localSubjects.find(s => s.id === subId);
    const nextNo = sub && sub.chapters ? sub.chapters.length + 1 : 1;
    
    setNewChapNo(nextNo.toString());
    setNewChapTitle('');
    setNewChapPoints('10');
  };

  // Add a chapter to a specific subject
  const handleAddChapter = (e) => {
    e.preventDefault();
    if (!newChapTitle.trim() || !activeSubjectId) return;

    const pointsNum = parseInt(newChapPoints, 10) || 10;
    
    setLocalSubjects(prev => prev.map(sub => {
      if (sub.id === activeSubjectId) {
        return {
          ...sub,
          chapters: [...(sub.chapters || []), {
            id: `ch_${Date.now()}`,
            chapterNo: newChapNo.trim(),
            title: newChapTitle.trim(),
            points: pointsNum,
            units: []
          }]
        };
      }
      return sub;
    }));

    setActiveSubjectId(null);
  };

  // Delete a chapter
  const handleDeleteChapter = (subId, chapId) => {
    if (window.confirm('Are you sure you want to remove this topic?')) {
      setLocalSubjects(prev => prev.map(sub => {
        if (sub.id === subId) {
          return {
            ...sub,
            chapters: sub.chapters.filter(ch => ch.id !== chapId)
          };
        }
        return sub;
      }));
    }
  };

  // Edit chapter details inline
  const handleUpdateChapter = (subId, chapId, field, value) => {
    setLocalSubjects(prev => prev.map(sub => {
      if (sub.id === subId) {
        return {
          ...sub,
          chapters: sub.chapters.map(ch => {
            if (ch.id === chapId) {
              if (field === 'points') {
                return { ...ch, points: parseInt(value, 10) || 0 };
              }
              return { ...ch, [field]: value };
            }
            return ch;
          })
        };
      }
      return sub;
    }));
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e, index, subId) => {
    dragItem.current = index;
    draggingSubjectId.current = subId;
    e.dataTransfer.effectAllowed = "move";
    // Optional: make it look slightly transparent while dragging
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnter = (e, index, subId) => {
    e.preventDefault();
    if (draggingSubjectId.current === subId) {
      dragOverItem.current = index;
    }
  };

  const handleDragEnd = (e, subId) => {
    e.target.style.opacity = '1';
    if (draggingSubjectId.current !== subId || dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      draggingSubjectId.current = null;
      return;
    }

    const copyListItems = [...localSubjects];
    const subjectIndex = copyListItems.findIndex(s => s.id === subId);
    
    if (subjectIndex !== -1) {
      const chapters = [...copyListItems[subjectIndex].chapters];
      const dragItemContent = chapters[dragItem.current];
      
      chapters.splice(dragItem.current, 1);
      chapters.splice(dragOverItem.current, 0, dragItemContent);
      
      copyListItems[subjectIndex].chapters = chapters;
      setLocalSubjects(copyListItems);
    }

    dragItem.current = null;
    dragOverItem.current = null;
    draggingSubjectId.current = null;
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  // Save changes to Firestore
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      const docRef = doc(db, 'syllabi', streamId);
      
      if (!syllabusDoc) {
        await setDoc(docRef, {
          course,
          level,
          subjects: localSubjects
        });
      } else {
        await updateDoc(docRef, {
          subjects: localSubjects
        });
      }
      alert('Curriculum sequence & points updated successfully! Changes are live.');
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-royal-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-royal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-royal-500/20 text-royal-400 text-xs font-bold border border-royal-500/30">
            <Layers className="w-3.5 h-3.5" />
            <span>Curriculum Manager</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Manage <span className="gold-gradient-text">Stream Syllabus</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Add/Remove parts and topics. <strong>Drag & Drop</strong> topics to sequence them correctly. Customize the specific points awarded for completing each topic.
          </p>
        </div>
      </div>

      {/* Stream Selector */}
      <div className="flex flex-wrap items-center gap-3 p-4 glass-card rounded-2xl border border-white/10">
        <select
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          className="px-4 py-2 rounded-xl bg-navy-900 border border-white/10 text-white font-bold focus:outline-none focus:border-royal-500"
        >
          <option value="CA">CA Stream</option>
          <option value="CMA">CMA Stream</option>
        </select>

        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="px-4 py-2 rounded-xl bg-navy-900 border border-white/10 text-white font-bold focus:outline-none focus:border-royal-500"
        >
          <option value="Foundation">Foundation Level</option>
          <option value="Intermediate">Intermediate Level</option>
        </select>
        
        <div className="ml-auto flex items-center gap-2">
          {syllabusDoc && (
             <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold shadow-glow-emerald hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Sequence & Changes'}</span>
            </button>
          )}
        </div>
      </div>

      {initialLoad ? (
        <div className="p-8 text-center text-slate-400 font-bold">Loading Syllabus...</div>
      ) : !syllabusDoc ? (
        <div className="glass-card rounded-3xl p-10 text-center space-y-4 border border-white/10">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">No Database Syllabus Found</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            The database currently has no syllabus configured for <strong>{course} {level}</strong>. 
            You can initialize it using the default preset structures.
          </p>
          <button
            onClick={handleInitializeDefault}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-royal-600 text-white font-bold shadow-glow-blue hover:bg-royal-500 mt-4 disabled:opacity-50"
          >
            {saving ? 'Initializing...' : 'Initialize Default Syllabus'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Add New Subject (Part/Paper) */}
          <div className="flex items-center gap-2 p-4 glass-card rounded-2xl border border-white/10">
            <input 
              type="text" 
              placeholder="e.g. PART A: Business Laws..."
              value={newSubjectTitle}
              onChange={(e) => setNewSubjectTitle(e.target.value)}
              className="flex-grow px-4 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-royal-500"
            />
            <button 
              onClick={handleAddSubject}
              className="px-4 py-2 rounded-xl bg-royal-600/30 text-royal-400 border border-royal-500/50 hover:bg-royal-600/50 hover:text-white font-bold flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Part / Paper
            </button>
          </div>

          {/* Subjects & Chapters List */}
          {localSubjects.length === 0 ? (
            <EmptyState icon={BookOpen} title="No Parts/Papers Added" description="Start building the curriculum by adding a Part or Paper." />
          ) : (
            <div className="space-y-4">
              {localSubjects.map(sub => (
                <div key={sub.id} className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                  
                  {/* Subject Header */}
                  <div className="p-4 bg-navy-900/90 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 shrink-0 rounded-xl bg-royal-500/20 text-royal-400 flex items-center justify-center font-bold text-xs">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-white text-lg">{sub.subject}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openChapterModal(sub.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-navy-950 text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Topic
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(sub.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Part
                      </button>
                    </div>
                  </div>

                  {/* Chapters List (Draggable) */}
                  <div className="divide-y divide-white/5 bg-navy-950/30 p-2">
                    {(!sub.chapters || sub.chapters.length === 0) ? (
                      <div className="p-4 text-xs text-slate-400 text-center">No topics added to this part yet.</div>
                    ) : (
                      sub.chapters.map((ch, index) => (
                        <div 
                          key={ch.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, index, sub.id)}
                          onDragEnter={(e) => handleDragEnter(e, index, sub.id)}
                          onDragEnd={(e) => handleDragEnd(e, sub.id)}
                          onDragOver={handleDragOver}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-move group"
                        >
                          <div className="flex items-center gap-3 flex-grow">
                            <div className="cursor-grab active:cursor-grabbing p-1.5 text-slate-500 group-hover:text-slate-300">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            
                            <div className="flex items-center gap-2 bg-navy-900 border border-white/10 rounded-lg px-2 py-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Ch.</span>
                              <input 
                                type="text"
                                defaultValue={ch.chapterNo || ''}
                                onBlur={(e) => handleUpdateChapter(sub.id, ch.id, 'chapterNo', e.target.value)}
                                className="w-10 bg-transparent text-white text-sm font-bold text-center focus:outline-none"
                                placeholder="No."
                              />
                            </div>

                            <input 
                              type="text"
                              defaultValue={ch.title}
                              onBlur={(e) => handleUpdateChapter(sub.id, ch.id, 'title', e.target.value)}
                              className="flex-grow bg-transparent text-sm font-medium text-slate-200 border-b border-transparent focus:border-royal-500 focus:outline-none px-1 py-1"
                              placeholder="Topic Name..."
                            />
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-md border ${
                                (ch.units?.length || 0) > 0 
                                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' 
                                  : 'bg-slate-800 border-white/5 text-slate-400'
                              }`}>
                                {ch.units?.length || 0} Units
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Pts:</span>
                              <input 
                                type="number" 
                                defaultValue={ch.points}
                                onBlur={(e) => handleUpdateChapter(sub.id, ch.id, 'points', e.target.value)}
                                className="w-16 px-2 py-1 rounded-lg bg-navy-900 border border-white/10 text-gold-400 text-sm font-mono font-bold text-center focus:outline-none focus:border-gold-500"
                              />
                            </div>
                            <button
                              onClick={() => handleDeleteChapter(sub.id, ch.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                              title="Delete Topic"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Chapter Modal */}
      {activeSubjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md overflow-hidden">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-md w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span>Add New Topic</span>
              </h3>
              <button onClick={() => setActiveSubjectId(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddChapter} className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Ch. No
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="1, 2, A..."
                    value={newChapNo}
                    onChange={(e) => setNewChapNo(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-center text-sm font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Topic Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Basic Concepts"
                    value={newChapTitle}
                    onChange={(e) => setNewChapTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Award className="w-3 h-3 text-gold-400" /> Reward Points
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 10"
                  value={newChapPoints}
                  onChange={(e) => setNewChapPoints(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-gold-400 font-mono font-bold text-sm focus:outline-none focus:border-gold-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Points awarded to student upon completing this chapter.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSubjectId(null)}
                  className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-black shadow-glow-emerald hover:bg-emerald-500"
                >
                  Add Topic
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
