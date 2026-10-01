import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  BrainCircuit, 
  Plus, 
  Pencil, 
  Trash2, 
  Clock, 
  Check, 
  X, 
  AlertTriangle, 
  BookOpen, 
  Layers, 
  Crown, 
  Sparkles,
  Award,
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
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
  
  // Confirmation Modal State for Quiz Updates
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
    setQuestions([
      ...questions,
      {
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        text: '',
        options: ['', '', '', ''],
        correctOption: 0,
        marks: 1,
        negativeMarks: 0
      }
    ]);
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
    setShowConfirmModal(false);
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
    
    // Normalize questions with marks and negativeMarks
    const loadedQuestions = (q.questions || []).map((quest, idx) => ({
      id: quest.id || `q_${Date.now()}_${idx}`,
      text: quest.text || '',
      options: Array.isArray(quest.options) && quest.options.length === 4 
        ? [...quest.options] 
        : [quest.options?.[0] || '', quest.options?.[1] || '', quest.options?.[2] || '', quest.options?.[3] || ''],
      correctOption: typeof quest.correctOption === 'number' ? quest.correctOption : 0,
      marks: quest.marks !== undefined && quest.marks !== null ? Math.max(0.25, Number(quest.marks)) : 1,
      negativeMarks: quest.negativeMarks !== undefined && quest.negativeMarks !== null ? Math.max(0, Number(quest.negativeMarks)) : 0
    }));

    setQuestions(loadedQuestions);
    setShowForm(true);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this quiz? All associated data will be permanently removed.")) return;
    try {
      await deleteDoc(doc(db, 'quizzes', id));
      setSuccessMessage('Quiz deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error(err);
      alert("Failed to delete quiz.");
    }
  };

  // Called when the form is submitted
  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !subject.trim() || questions.length === 0) {
      setError('Title, subject, and at least one question are required.');
      return;
    }
    
    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text?.trim()) {
        setError(`Question ${i + 1} is missing text.`);
        return;
      }
      for (let j = 0; j < 4; j++) {
        if (!questions[i].options[j]?.trim()) {
          setError(`Question ${i + 1}, Option ${String.fromCharCode(65 + j)} is empty.`);
          return;
        }
      }
      if (questions[i].negativeMarks === undefined || questions[i].negativeMarks === null || questions[i].negativeMarks < 0) {
        setError(`Question ${i + 1} has an invalid negative marking value.`);
        return;
      }
    }

    // If editing a published quiz, prompt confirmation to avoid accidental overwrites
    if (isEditing) {
      setShowConfirmModal(true);
    } else {
      executeSave();
    }
  };

  // Actual Firestore write
  const executeSave = async () => {
    try {
      setSaving(true);
      setError('');
      setShowConfirmModal(false);

      const cleanedQuestions = questions.map((q, idx) => ({
        id: q.id || `q_${Date.now()}_${idx}`,
        text: q.text.trim(),
        options: q.options.map(opt => (opt || '').trim()),
        correctOption: Number(q.correctOption) || 0,
        marks: Number(q.marks) > 0 ? Number(q.marks) : 1,
        negativeMarks: q.negativeMarks !== undefined && q.negativeMarks !== null ? Math.max(0, Number(q.negativeMarks)) : 0
      }));

      const payload = {
        title: title.trim(),
        subject: subject.trim(),
        chapter: chapter.trim(),
        timeLimit: Number(timeLimit) || 30,
        accessType,
        isPaid: accessType === 'paid',
        questions: cleanedQuestions,
        updatedAt: serverTimestamp()
      };

      if (isEditing) {
        // Update the SAME document to prevent duplicate quizzes or losing attempts
        await updateDoc(doc(db, 'quizzes', currentId), payload);
        setSuccessMessage(`Quiz "${title}" updated successfully! Changes are live.`);
      } else {
        payload.createdAt = serverTimestamp();
        payload.active = true;
        await addDoc(collection(db, 'quizzes'), payload);
        setSuccessMessage(`Quiz "${title}" created and published successfully!`);
      }
      
      resetForm();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error("Save quiz error:", err);
      setError('Failed to save quiz. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Helper calculation for total quiz marks
  const totalQuizMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
  const questionsWithNegative = questions.filter(q => Number(q.negativeMarks) > 0).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-emerald-400" />
            Quiz Management
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Create, edit, and manage timed quizzes with question-wise negative marking.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-black rounded-xl flex items-center gap-2 transition-all shadow-glow-emerald cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Quiz</span>
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quiz Form (Create or Edit) */}
      {showForm ? (
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 relative shadow-2xl">
          
          {/* Form Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  isEditing 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {isEditing ? 'Editing Published Quiz' : 'New Quiz'}
                </span>
                {isEditing && (
                  <span className="text-xs text-slate-400 font-mono">
                    ID: {currentId}
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                {isEditing ? `Edit: ${title || 'Quiz'}` : 'Create New Timed Quiz'}
              </h3>
              {isEditing && (
                <p className="text-xs text-amber-300/80 mt-1">
                  Updates will overwrite this existing quiz directly and take immediate effect for students without duplication.
                </p>
              )}
            </div>

            <button 
              type="button" 
              onClick={resetForm} 
              className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors self-start sm:self-auto cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            
            {/* Basic Quiz Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quiz Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm font-semibold"
                  placeholder="e.g. Accounting Chapter 1 Mock Test"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time Limit (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm font-semibold"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm font-semibold focus:outline-none focus:border-emerald-500/50"
                  placeholder="e.g. Accounting, Business Law, Quantitative Aptitude"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chapter / Topic (Optional)</label>
                <input
                  type="text"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm font-semibold focus:outline-none focus:border-emerald-500/50"
                  placeholder="e.g. Chapter 2 - Depreciation Accounting"
                />
              </div>

              {/* Quiz Access Type (Free vs Paid) */}
              <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quiz Category / Access Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccessType('free')}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
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
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
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
                        <div className="text-[11px] text-slate-400">Restricted to authorized Pro/Paid students</div>
                      </div>
                    </div>
                    {accessType === 'paid' && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Questions Section */}
            <div className="pt-6 border-t border-white/10 space-y-6">
              
              {/* Questions Section Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-400" />
                    <span>Questions ({questions.length})</span>
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>Total Marks: <strong className="text-white">{totalQuizMarks}</strong></span>
                    <span>•</span>
                    <span>Negative Marking: <strong className={questionsWithNegative > 0 ? 'text-rose-400' : 'text-slate-400'}>{questionsWithNegative} questions</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-black rounded-xl border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Add Question</span>
                </button>
              </div>

              {/* Negative Marking Guide Box */}
              <div className="p-4 rounded-2xl bg-navy-950/60 border border-white/10 text-xs text-slate-300 flex items-start gap-3">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-white block">Question-wise Negative Marking:</span>
                  <p className="text-slate-400 leading-relaxed">
                    Set the negative marks deduction individually for each question (e.g. 0.25, 0.50, or 0 for no negative marking). 
                    Negative marks are deducted <strong>only when an incorrect answer is selected</strong>. Unanswered questions will receive 0 marks with <strong>no negative deduction</strong>.
                  </p>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="text-center p-12 bg-navy-900/30 border border-white/5 rounded-2xl text-slate-500 text-sm space-y-3">
                  <BrainCircuit className="w-10 h-10 mx-auto text-slate-600" />
                  <p>No questions added yet. Click "+ Add Question" to start building this quiz.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {questions.map((q, qIdx) => {
                    const currentNeg = Number(q.negativeMarks) || 0;
                    const currentMarks = Number(q.marks) || 1;

                    return (
                      <div 
                        key={q.id} 
                        className="p-5 sm:p-6 bg-navy-900/70 border border-white/10 rounded-2xl relative space-y-4 hover:border-white/20 transition-all"
                      >
                        {/* Top Question Row: Number, Marks, Negative Marking & Delete */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                          
                          {/* Question Number Badge */}
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black">
                              {qIdx + 1}
                            </span>
                            <span className="text-sm font-bold text-white">Question {qIdx + 1}</span>
                          </div>

                          {/* Marks & Negative Marking Settings */}
                          <div className="flex flex-wrap items-center gap-3">
                            
                            {/* Positive Marks Input */}
                            <div className="flex items-center gap-1.5 bg-navy-950/80 px-2.5 py-1.5 rounded-xl border border-white/10">
                              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Marks:</span>
                              <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                max="100"
                                value={q.marks !== undefined ? q.marks : 1}
                                onChange={(e) => handleQuestionChange(qIdx, 'marks', parseFloat(e.target.value) || 1)}
                                className="w-14 bg-navy-900 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-white font-bold text-center focus:outline-none focus:border-emerald-500"
                                title="Marks awarded for correct answer"
                              />
                            </div>

                            {/* Negative Marks Input & Presets */}
                            <div className="flex items-center gap-2 bg-navy-950/80 px-2.5 py-1.5 rounded-xl border border-rose-500/20">
                              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Negative:</span>
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="50"
                                value={q.negativeMarks !== undefined ? q.negativeMarks : 0}
                                onChange={(e) => handleQuestionChange(qIdx, 'negativeMarks', Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-16 bg-navy-900 border border-rose-500/30 rounded-lg px-2 py-0.5 text-xs text-rose-300 font-bold text-center focus:outline-none focus:border-rose-400"
                                placeholder="0"
                                title="Marks deducted for incorrect answer (Set to 0 if none)"
                              />
                              
                              {/* Quick Presets for Negative Marks */}
                              <div className="hidden sm:flex items-center gap-1">
                                {[0, 0.25, 0.33, 0.5].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => handleQuestionChange(qIdx, 'negativeMarks', preset)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                      currentNeg === preset
                                        ? 'bg-rose-500 text-white shadow-sm'
                                        : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5'
                                    }`}
                                  >
                                    {preset === 0 ? '0' : `-${preset}`}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Negative Marking Visual Badge */}
                            {currentNeg > 0 ? (
                              <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300 inline-flex items-center gap-1">
                                ⚠️ -{currentNeg} deducted on wrong
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-800 border border-white/5 text-slate-400">
                                0 (No negative)
                              </span>
                            )}

                            {/* Remove Question Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(qIdx)}
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer ml-auto"
                              title="Delete Question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                        </div>

                        {/* Question Text Area */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Question Text
                          </label>
                          <textarea
                            value={q.text}
                            onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                            className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 min-h-[85px] text-sm resize-y"
                            placeholder="Type the question content here..."
                            required
                          />
                        </div>

                        {/* 4 Options Grid */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                            Options (Select the radio button for the correct answer)
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[0, 1, 2, 3].map((optIdx) => {
                              const isChecked = q.correctOption === optIdx;
                              return (
                                <div 
                                  key={optIdx} 
                                  className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                                    isChecked 
                                      ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30' 
                                      : 'bg-navy-950/60 border-white/10 focus-within:border-white/30'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`correct-${q.id}`}
                                    checked={isChecked}
                                    onChange={() => handleQuestionChange(qIdx, 'correctOption', optIdx)}
                                    className="shrink-0 w-4 h-4 accent-emerald-500 cursor-pointer"
                                    title="Mark as correct answer"
                                  />
                                  <div className="flex-grow space-y-0.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                      Option {String.fromCharCode(65 + optIdx)}
                                      {isChecked && <span className="text-emerald-400 ml-1.5 font-black">(Correct)</span>}
                                    </span>
                                    <input
                                      type="text"
                                      value={q.options[optIdx]}
                                      onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                                      className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-slate-600 font-medium"
                                      placeholder={`Option ${String.fromCharCode(65 + optIdx)} text...`}
                                      required
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Form Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-colors cursor-pointer text-sm"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving || questions.length === 0}
                  className="px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-glow-emerald cursor-pointer text-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish Quiz'}</span>
                </button>
              </div>
            </div>

          </form>
        </div>
      ) : (
        /* Quiz List View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((q) => {
            const qCount = q.questions?.length || 0;
            const quizMarks = (q.questions || []).reduce((sum, item) => sum + (Number(item.marks) || 1), 0);
            const hasNegative = (q.questions || []).some(item => Number(item.negativeMarks) > 0);
            const isPaid = Boolean(q.isPaid || q.accessType === 'paid');

            return (
              <div 
                key={q.id} 
                className="glass-card p-6 rounded-3xl border border-white/10 flex flex-col h-full hover:border-emerald-500/40 transition-all duration-300 relative group shadow-xl"
              >
                <div className="flex-grow space-y-4">
                  
                  {/* Top Badges */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPaid ? (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1 shadow-glow-amber">
                          <Crown className="w-3 h-3 text-amber-400" />
                          Paid Quiz
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          Free Quiz
                        </span>
                      )}

                      {hasNegative ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          Negative Marking: Yes
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-400 border border-white/5">
                          No Negative
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Subject */}
                  <div>
                    <h3 className="text-lg font-bold text-white line-clamp-2">{q.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{q.subject} {q.chapter && `• ${q.chapter}`}</span>
                    </div>
                  </div>
                  
                  {/* Metadata Chips */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
                    <div className="p-2 rounded-xl bg-navy-900/60 border border-white/5">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Time</div>
                      <div className="text-xs font-black text-amber-400 mt-0.5">{q.timeLimit || 30}m</div>
                    </div>
                    <div className="p-2 rounded-xl bg-navy-900/60 border border-white/5">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Questions</div>
                      <div className="text-xs font-black text-royal-400 mt-0.5">{qCount}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-navy-900/60 border border-white/5">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Marks</div>
                      <div className="text-xs font-black text-emerald-400 mt-0.5">{quizMarks}</div>
                    </div>
                  </div>

                </div>

                {/* Explicit, Clearly Visible Action Footer */}
                <div className="flex items-center gap-2 pt-4 border-t border-white/10 mt-5">
                  <button 
                    onClick={() => handleEdit(q)} 
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                    title="Edit Quiz details, questions, answers, and negative marking"
                  >
                    <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Edit Quiz</span>
                  </button>

                  <button 
                    onClick={() => handleDelete(q.id)} 
                    className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer"
                    title="Delete Quiz"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}

          {quizzes.length === 0 && (
            <div className="col-span-full py-16 text-center border border-white/5 border-dashed rounded-3xl bg-navy-900/20 flex flex-col items-center justify-center space-y-3">
              <BrainCircuit className="w-12 h-12 text-slate-500" />
              <p className="text-slate-400 font-semibold">No quizzes created yet.</p>
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-navy-950 text-xs font-bold rounded-xl shadow-glow-emerald cursor-pointer"
              >
                Create First Quiz
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal before Saving Major Changes to Published Quiz */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-amber-500/30 max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-glow-amber">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-white">Save Changes to Published Quiz?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                You are about to save changes to the published quiz <strong className="text-amber-300 font-bold">"{title}"</strong>.
                All updates to title, time, questions, marks, and negative marking will be updated on the same quiz and will be reflected immediately for students.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-navy-950/80 border border-white/10 text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Quiz ID:</span>
                <span className="font-mono text-white">{currentId}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Questions:</span>
                <span className="font-bold text-white">{questions.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Marks:</span>
                <span className="font-bold text-emerald-400">{totalQuizMarks}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Questions with Negative Marking:</span>
                <span className="font-bold text-rose-400">{questionsWithNegative}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Access Type:</span>
                <span className="font-bold uppercase text-white">{accessType}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={saving}
                className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/5 transition-colors cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={executeSave}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-navy-950 text-sm font-black transition-all shadow-glow-amber flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Confirm & Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
