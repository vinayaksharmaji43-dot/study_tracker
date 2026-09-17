import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { SYLLABUS_DATA } from '../../data/syllabusData';
import EmptyState from '../../components/EmptyState';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Save, 
  BookOpen, 
  FileText, 
  Award,
  AlertCircle
} from 'lucide-react';

export default function AdminSyllabusManager() {
  const [course, setCourse] = useState('CA');
  const [level, setLevel] = useState('Foundation');
  const [syllabusDoc, setSyllabusDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Local state for editing the syllabus before saving
  const [localSubjects, setLocalSubjects] = useState([]);
  const [saving, setSaving] = useState(false);

  // New item inputs
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  
  // Modal for adding chapter
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [newChapTitle, setNewChapTitle] = useState('');
  const [newChapPoints, setNewChapPoints] = useState('10');

  const streamId = `${course}_${level}`;

  useEffect(() => {
    setLoading(true);
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
      setLoading(false);
    });

    return () => unsub();
  }, [streamId]);

  // Handle initializing from local static data
  const handleInitializeDefault = async () => {
    try {
      setSaving(true);
      const defaultSubjects = SYLLABUS_DATA[course]?.[level] || [];
      
      // Inject unique IDs and default 10 points if they don't exist
      const mappedSubjects = defaultSubjects.map((sub, sIdx) => ({
        id: `sub_${Date.now()}_${sIdx}`,
        subject: sub.subject,
        chapters: sub.chapters.map((ch, cIdx) => ({
          id: ch.id || `ch_${Date.now()}_${sIdx}_${cIdx}`,
          title: ch.title,
          points: 10
        }))
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

  // Add a new empty subject
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
    if (window.confirm('Are you sure you want to delete this entire subject and all its chapters?')) {
      setLocalSubjects(localSubjects.filter(s => s.id !== subId));
    }
  };

  // Open chapter modal
  const openChapterModal = (subId) => {
    setActiveSubjectId(subId);
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
          chapters: [...sub.chapters, {
            id: `ch_${Date.now()}`,
            title: newChapTitle.trim(),
            points: pointsNum
          }]
        };
      }
      return sub;
    }));

    setActiveSubjectId(null);
  };

  // Delete a chapter
  const handleDeleteChapter = (subId, chapId) => {
    if (window.confirm('Are you sure you want to remove this chapter?')) {
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

  // Edit chapter points
  const handleUpdateChapterPoints = (subId, chapId, newPoints) => {
    const pointsNum = parseInt(newPoints, 10) || 0;
    setLocalSubjects(prev => prev.map(sub => {
      if (sub.id === subId) {
        return {
          ...sub,
          chapters: sub.chapters.map(ch => {
            if (ch.id === chapId) {
              return { ...ch, points: pointsNum };
            }
            return ch;
          })
        };
      }
      return sub;
    }));
  };

  // Save changes to Firestore
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      const docRef = doc(db, 'syllabi', streamId);
      
      if (!syllabusDoc) {
        // If document doesn't exist at all yet
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
      alert('Syllabus updated successfully! Changes are live for students.');
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
            Add/Remove chapters and customize the specific points awarded for completing each topic.
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
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
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
          
          {/* Add New Subject */}
          <div className="flex items-center gap-2 p-4 glass-card rounded-2xl border border-white/10">
            <input 
              type="text" 
              placeholder="New Subject Title..."
              value={newSubjectTitle}
              onChange={(e) => setNewSubjectTitle(e.target.value)}
              className="flex-grow px-4 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-royal-500"
            />
            <button 
              onClick={handleAddSubject}
              className="px-4 py-2 rounded-xl bg-royal-600/30 text-royal-400 border border-royal-500/50 hover:bg-royal-600/50 hover:text-white font-bold flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          </div>

          {/* Subjects & Chapters List */}
          {localSubjects.length === 0 ? (
            <EmptyState icon={BookOpen} title="No Subjects Added" description="Start building the curriculum by adding a subject." />
          ) : (
            <div className="space-y-4">
              {localSubjects.map(sub => (
                <div key={sub.id} className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                  
                  {/* Subject Header */}
                  <div className="p-4 bg-navy-900/90 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-royal-500/20 text-royal-400 flex items-center justify-center font-bold text-xs">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-white">{sub.subject}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openChapterModal(sub.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-navy-950 text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Chapter
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(sub.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Subject
                      </button>
                    </div>
                  </div>

                  {/* Chapters List */}
                  <div className="divide-y divide-white/5">
                    {(!sub.chapters || sub.chapters.length === 0) ? (
                      <div className="p-4 text-xs text-slate-400 text-center">No chapters added to this subject.</div>
                    ) : (
                      sub.chapters.map(ch => (
                        <div key={ch.id} className="p-3 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-200">{ch.title}</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 font-bold uppercase">Points:</span>
                              <input 
                                type="number" 
                                value={ch.points}
                                onChange={(e) => handleUpdateChapterPoints(sub.id, ch.id, e.target.value)}
                                className="w-20 px-2 py-1 rounded-lg bg-navy-950 border border-white/10 text-gold-400 text-sm font-mono font-bold text-center focus:outline-none focus:border-gold-500"
                              />
                            </div>
                            <button
                              onClick={() => handleDeleteChapter(sub.id, ch.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                              title="Delete Chapter"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-md w-full shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span>Add New Chapter</span>
              </h3>
              <button onClick={() => setActiveSubjectId(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddChapter} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Chapter / Topic Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 1: Basic Concepts"
                  value={newChapTitle}
                  onChange={(e) => setNewChapTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-gold-400" /> Reward Points
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
                  Add Chapter
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
