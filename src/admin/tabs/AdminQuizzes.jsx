import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { BrainCircuit, Plus, Pencil, Trash2, Clock, Check, X, AlertTriangle, BookOpen, Layers, Crown, Sparkles } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [accessType, setAccessType] = useState('free'); // 'free' | 'paid'
  const [questions, setQuestions] = useState([]);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setQuizzes(data);
      setLoading(false);
    }, (err) => {
      console.error("Quizzes listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddQuestion = () => {
    setQuestions([...questions, {
      id: Date.now().toString(),
      text: '',
      options: ['', '', '', ''],
      correctOption: 0
    }]);
  };

  const handleRemoveQuestion = (idx) => {
    const updated = [...questions];
    updated.splice(idx, 1);
    setQuestions(updated);
  };

  const handleQuestionChange = (idx, field, value) => {
    const updated = [...questions];
    updated[idx][field] = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIdx, optIdx, value) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx] = value;
    setQuestions(updated);
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentId(null);
    setTitle('');
    setSubject('');
    setChapter('');
    setTimeLimit(30);
    setAccessType('free');
    setQuestions([]);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (q) => {
    setIsEditing(true);
    setCurrentId(q.id);
    setTitle(q.title || '');
    setSubject(q.subject || '');
    setChapter(q.chapter || '');
    setTimeLimit(q.timeLimit || 30);
    setAccessType(q.isPaid || q.accessType === 'paid' ? 'paid' : 'free');
    setQuestions(q.questions || []);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await deleteDoc(doc(db, 'quizzes', id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete quiz.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title || !subject || questions.length === 0) {
      setError('Title, subject, and at least one question are required.');
      return;
    }
    
    // Validate questions
    for (let i=0; i<questions.length; i++) {
      if (!questions[i].text) return setError(`Question ${i+1} is missing text.`);
      for (let j=0; j<4; j++) {
         if (!questions[i].options[j]) return setError(`Question ${i+1}, Option ${j+1} is empty.`);
      }
    }

    try {
      setSaving(true);
      setError('');
      
      const payload = {
        title,
        subject,
        chapter,
        timeLimit: Number(timeLimit),
        accessType,
        isPaid: accessType === 'paid',
        questions,
        updatedAt: serverTimestamp()
      };

      if (isEditing) {
        await updateDoc(doc(db, 'quizzes', currentId), payload);
      } else {
        payload.createdAt = serverTimestamp();
        payload.active = true;
        await addDoc(collection(db, 'quizzes'), payload);
      }
      
      resetForm();
    } catch (err) {
      console.error(err);
      setError('Failed to save quiz.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-emerald-400" />
            Quiz Management
          </h2>
          <p className="text-sm text-slate-400 mt-1">Create and manage timed quizzes.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-navy-950 font-bold rounded-xl flex items-center gap-2 transition-colors shadow-glow-emerald"
          >
            <Plus className="w-4 h-4" />
            Create Quiz
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {showForm ? (
        <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-6 relative">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-xl font-bold text-white">{isEditing ? 'Edit Quiz' : 'Create New Quiz'}</h3>
            <button onClick={resetForm} className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Quiz Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  placeholder="e.g. Weekly Mock Test 1"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Time Limit (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                  placeholder="e.g. Accounting"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Chapter (Optional)</label>
                <input
                  type="text"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                  placeholder="e.g. Chapter 1"
                />
              </div>

              {/* Quiz Access Type (Free vs Paid) */}
              <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Quiz Category / Access Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccessType('free')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      accessType === 'free'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-glow-emerald'
                        : 'bg-navy-900/50 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white">Free Quiz</div>
                        <div className="text-[11px] text-slate-400">Available to all students directly</div>
                      </div>
                    </div>
                    {accessType === 'free' && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccessType('paid')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      accessType === 'paid'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-glow-amber'
                        : 'bg-navy-900/50 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Crown className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white">Paid Quiz</div>
                        <div className="text-[11px] text-slate-400">Locked for unauthorized students</div>
                      </div>
                    </div>
                    {accessType === 'paid' && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  Questions ({questions.length})
                </h4>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/30 transition-colors"
                >
                  + Add Question
                </button>
              </div>

              {questions.length === 0 ? (
                <div className="text-center p-8 bg-navy-900/30 border border-white/5 rounded-2xl text-slate-500 text-sm">
                  No questions added yet. Click "+ Add Question" to start.
                </div>
              ) : (
                <div className="space-y-6">
                  {questions.map((q, qIdx) => (
                    <div key={q.id} className="p-5 bg-navy-900/60 border border-white/10 rounded-2xl relative group">
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                        title="Remove Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      <div className="space-y-4 pr-12">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">{qIdx + 1}</span>
                            Question Text
                          </label>
                          <textarea
                            value={q.text}
                            onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                            className="w-full bg-navy-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 min-h-[80px] resize-y"
                            placeholder="Type the question here..."
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[0, 1, 2, 3].map((optIdx) => (
                            <div key={optIdx} className={`p-3 rounded-xl border flex gap-3 transition-colors ${q.correctOption === optIdx ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-navy-950/50 border-white/10 focus-within:border-white/30'}`}>
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                checked={q.correctOption === optIdx}
                                onChange={() => handleQuestionChange(qIdx, 'correctOption', optIdx)}
                                className="mt-1 shrink-0 w-4 h-4 accent-emerald-500"
                              />
                              <div className="flex-grow space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Option {String.fromCharCode(65 + optIdx)}</span>
                                <input
                                  type="text"
                                  value={q.options[optIdx]}
                                  onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                                  className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-slate-600"
                                  placeholder="Option text..."
                                  required
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || questions.length === 0}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-glow-emerald"
              >
                {saving ? 'Saving...' : 'Save Quiz'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((q) => (
            <div key={q.id} className="glass-card p-6 rounded-3xl border border-white/10 flex flex-col h-full group hover:border-emerald-500/30 transition-all duration-300">
              <div className="flex-grow space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {q.isPaid || q.accessType === 'paid' ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5 text-amber-400" />
                          Paid
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                          Free
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white line-clamp-2">{q.title}</h3>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => handleEdit(q)} className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(q.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span className="truncate">{q.subject} {q.chapter && `- ${q.chapter}`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>{q.timeLimit} Minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Layers className="w-4 h-4 text-royal-400" />
                    <span>{q.questions?.length || 0} Questions</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {quizzes.length === 0 && (
            <div className="col-span-full py-12 text-center border border-white/5 border-dashed rounded-3xl bg-white/5 flex flex-col items-center">
               <BrainCircuit className="w-12 h-12 text-slate-500 mb-3" />
               <p className="text-slate-400 font-medium">No quizzes created yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
