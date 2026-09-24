import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { SYLLABUS_DATA } from '../data/syllabusData';
import { formatDate } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import { 
  FileText, Plus, CheckCircle2, Clock, BarChart3, TrendingUp, 
  Trash2, Edit3, ExternalLink, Eye, Upload, X, ShieldCheck, 
  BookOpen, HelpCircle, Award, AlertCircle, Sparkles, Filter, ChevronDown, ChevronUp
} from 'lucide-react';

const IMGBB_KEY = 'f43ca36cbb4a3e5de80d145fb53cbfff';

async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append('key', IMGBB_KEY);
  formData.append('image', file);
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
  const data = await res.json();
  if (data.success) return data.data.url;
  throw new Error('Image upload failed');
}

function parseStream(userProfile) {
  const raw = (userProfile?.course || '').toUpperCase();
  const isCMA = raw.includes('CMA');
  const course = isCMA ? 'CMA' : 'CA';
  const level = raw.includes('FOUNDATION') ? 'Foundation' : 'Intermediate';
  const attempt = userProfile?.attempt || 'Jan 2027';
  return { course, level, attempt };
}

function normalizeAttempt(att) {
  return (att || '').toLowerCase().replace(/\s+/g, '').replace('2027', '27').replace('2026', '26');
}

const SOURCES = ['Self Test', 'Coaching Test', 'Mock Test', 'PYQ', 'Revision Test', 'Other'];

export default function TestTracker() {
  const { currentUser, userProfile } = useAuth();
  const { course, level, attempt } = parseStream(userProfile);
  const streamLabel = `${course} ${level} • ${attempt}`;

  // Get stream subjects from SYLLABUS_DATA
  const streamSyllabus = SYLLABUS_DATA[course]?.[level] || [];
  const streamSubjects = streamSyllabus.map(s => s.subject);

  const [activeTab, setActiveTab] = useState('my_tests'); // 'my_tests', 'admin_tests'

  // Firestore Data
  const [myTests, setMyTests] = useState([]);
  const [adminTests, setAdminTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Test Modal State
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [testName, setTestName] = useState('');
  const [subject, setSubject] = useState(streamSubjects[0] || '');
  const [chapter, setChapter] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalMarks, setTotalMarks] = useState('100');
  const [marksObtained, setMarksObtained] = useState('');
  const [attemptNumber, setAttemptNumber] = useState('1');
  const [source, setSource] = useState('Self Test');
  const [status, setStatus] = useState('Completed');
  const [weakTopics, setWeakTopics] = useState('');
  const [remarks, setRemarks] = useState('');

  // Attachment upload
  const fileInputRef = useRef(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState('');
  const [existingAttachment, setExistingAttachment] = useState('');

  // Delete modal state
  const [deletingId, setDeletingId] = useState(null);

  // PDF / Image Viewer Modal
  const [viewPdfModal, setViewPdfModal] = useState(null);
  const [viewImageModal, setViewImageModal] = useState(null);

  // Filter state for My Tests
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  // Load My Tests
  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, 'studentTests'),
      where('studentId', '==', currentUser.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const dA = a.testDate || (a.createdAt?.toDate ? a.createdAt.toDate().toISOString() : '');
        const dB = b.testDate || (b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : '');
        return dB.localeCompare(dA);
      });
      setMyTests(docs);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching my tests:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  // Load Admin Published Tests
  useEffect(() => {
    const q = query(collection(db, 'adminTests'), where('published', '==', true));

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const active = docs.filter(t => {
        if (t.audienceType === 'all') return true;
        const matchesCourse = t.course === course;
        const matchesLevel = t.level === level;
        const matchesAttempt = !t.attempt || t.attempt === 'All Attempts' || t.attempt === 'all' || normalizeAttempt(t.attempt) === normalizeAttempt(attempt);
        return matchesCourse && matchesLevel && matchesAttempt;
      });
      active.sort((a, b) => {
        const dA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dB - dA;
      });
      setAdminTests(active);
    }, (err) => {
      console.error("Error fetching admin tests:", err);
    });

    return () => unsub();
  }, [course, level, attempt]);

  // Handle subject change -> reset chapter
  useEffect(() => {
    if (streamSubjects.length > 0 && !subject) {
      setSubject(streamSubjects[0]);
    }
  }, [streamSubjects, subject]);

  // Dynamic chapters for selected subject
  const currentSubjectObj = streamSyllabus.find(s => s.subject === subject);
  const currentChapters = currentSubjectObj?.chapters || [];

  // Reset form
  const resetForm = () => {
    setEditItem(null);
    setTestName('');
    setSubject(streamSubjects[0] || '');
    setChapter('');
    setCustomTopic('');
    setTestDate(new Date().toISOString().split('T')[0]);
    setTotalMarks('100');
    setMarksObtained('');
    setAttemptNumber('1');
    setSource('Self Test');
    setStatus('Completed');
    setWeakTopics('');
    setRemarks('');
    setAttachmentFile(null);
    setAttachmentPreview('');
    setExistingAttachment('');
    setShowModal(false);
  };

  // Open Edit Modal
  const openEdit = (item) => {
    setEditItem(item);
    setTestName(item.testName || '');
    setSubject(item.subject || streamSubjects[0] || '');
    if (currentChapters.some(c => c.title === item.chapter)) {
      setChapter(item.chapter);
      setCustomTopic('');
    } else {
      setChapter('custom');
      setCustomTopic(item.chapter || item.topic || '');
    }
    setTestDate(item.testDate || new Date().toISOString().split('T')[0]);
    setTotalMarks(String(item.totalMarks || 100));
    setMarksObtained(String(item.marksObtained ?? ''));
    setAttemptNumber(String(item.attemptNumber || 1));
    setSource(item.source || 'Self Test');
    setStatus(item.status || 'Completed');
    setWeakTopics(item.weakTopics || '');
    setRemarks(item.remarks || '');
    setExistingAttachment(item.attachmentUrl || '');
    setAttachmentFile(null);
    setAttachmentPreview('');
    setShowModal(true);
  };

  // Auto calculate percentage
  const totM = parseFloat(totalMarks) || 0;
  const obtM = parseFloat(marksObtained) || 0;
  const calculatedPercentage = totM > 0 ? Math.min(100, Math.max(0, (obtM / totM) * 100)) : 0;

  // File select for attachment
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAttachmentFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAttachmentPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // Save / Update Student Test
  const handleSubmitTest = async (e) => {
    e.preventDefault();
    if (!testName.trim()) return;
    if (obtM > totM) {
      alert("Marks Obtained cannot be greater than Total Marks!");
      return;
    }

    try {
      setSubmitting(true);

      let attachmentUrl = existingAttachment;
      if (attachmentFile) {
        attachmentUrl = await uploadToImgBB(attachmentFile);
      }

      const finalChapter = chapter === 'custom' ? customTopic.trim() : chapter;

      const payload = {
        studentId: currentUser.uid,
        course,
        level,
        attempt,
        testName: testName.trim(),
        subject,
        chapter: finalChapter,
        topic: finalChapter,
        testDate,
        totalMarks: totM,
        marksObtained: obtM,
        percentage: Number(calculatedPercentage.toFixed(1)),
        attemptNumber: attemptNumber.trim(),
        source,
        status,
        weakTopics: weakTopics.trim(),
        remarks: remarks.trim(),
        attachmentUrl: attachmentUrl || '',
        updatedAt: serverTimestamp()
      };

      if (editItem) {
        await updateDoc(doc(db, 'studentTests', editItem.id), payload);
      } else {
        await addDoc(collection(db, 'studentTests'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      resetForm();
    } catch (err) {
      console.error("Error saving test:", err);
      alert("Failed to save test record. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Test
  const confirmDeleteTest = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'studentTests', deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error("Error deleting test:", err);
      alert("Failed to delete test.");
    }
  };

  // Analytics Calculations
  const completedTests = myTests.filter(t => t.status === 'Completed');
  const pendingTestsCount = myTests.filter(t => t.status === 'Pending').length;
  
  const totalAttemptedMarks = completedTests.reduce((s, t) => s + (t.totalMarks || 0), 0);
  const totalObtainedMarks = completedTests.reduce((s, t) => s + (t.marksObtained || 0), 0);
  const overallAvgPct = totalAttemptedMarks > 0 ? (totalObtainedMarks / totalAttemptedMarks) * 100 : 0;

  const scoresList = completedTests.map(t => t.percentage).filter(p => !isNaN(p));
  const highestScore = scoresList.length > 0 ? Math.max(...scoresList) : 0;
  const lowestScore = scoresList.length > 0 ? Math.min(...scoresList) : 0;

  // Subject-wise averages
  const subjectStats = {};
  completedTests.forEach(t => {
    if (!subjectStats[t.subject]) {
      subjectStats[t.subject] = { totalObt: 0, totalTot: 0, count: 0 };
    }
    subjectStats[t.subject].totalObt += (t.marksObtained || 0);
    subjectStats[t.subject].totalTot += (t.totalMarks || 0);
    subjectStats[t.subject].count += 1;
  });

  // Score Trend Data (Chronological order)
  const chronologicalTests = [...completedTests].sort((a, b) => {
    const dA = a.testDate || '';
    const dB = b.testDate || '';
    return dA.localeCompare(dB);
  });

  // Filtered My Tests List
  const filteredMyTests = myTests.filter(t => {
    if (filterSubject !== 'all' && t.subject !== filterSubject) return false;
    if (filterSource !== 'all' && t.source !== filterSource) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-purple-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
              <FileText className="w-3.5 h-3.5" />
              <span>Self Manage Hub • Test Performance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Academic <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Test Tracker & Papers</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Track your test scores, view topic-wise analytics, and access stream-specific admin test papers for <strong>{streamLabel}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-black text-sm shadow-glow-purple flex items-center gap-2 transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>+ Add My Test</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabs: MY TESTS vs ADMIN TESTS */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex gap-2 p-1.5 rounded-2xl glass-card border border-white/10">
          <button
            onClick={() => setActiveTab('my_tests')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'my_tests'
                ? 'bg-purple-600 text-white shadow-glow-purple'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>MY TESTS ({myTests.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('admin_tests')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'admin_tests'
                ? 'bg-purple-600 text-white shadow-glow-purple'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>ADMIN TEST PAPERS ({adminTests.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MY TESTS */}
      {activeTab === 'my_tests' && (
        <div className="space-y-8">
          
          {/* Top Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl glass-card border border-purple-500/20 text-center space-y-1">
              <div className="text-2xl font-black text-purple-400">{myTests.length}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Total Tests</div>
            </div>
            
            <div className="p-4 rounded-2xl glass-card border border-emerald-500/20 text-center space-y-1">
              <div className="text-2xl font-black text-emerald-400">{completedTests.length}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Completed</div>
            </div>

            <div className="p-4 rounded-2xl glass-card border border-amber-500/20 text-center space-y-1">
              <div className="text-2xl font-black text-amber-400">{pendingTestsCount}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Pending</div>
            </div>

            <div className="p-4 rounded-2xl glass-card border border-sky-500/20 text-center space-y-1">
              <div className="text-2xl font-black text-sky-400">{overallAvgPct.toFixed(1)}%</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Average Score</div>
            </div>

            <div className="p-4 rounded-2xl glass-card border border-emerald-500/20 text-center space-y-1">
              <div className="text-2xl font-black text-emerald-400">{highestScore.toFixed(1)}%</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Highest Score</div>
            </div>

            <div className="p-4 rounded-2xl glass-card border border-rose-500/20 text-center space-y-1">
              <div className="text-2xl font-black text-rose-400">{lowestScore.toFixed(1)}%</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Lowest Score</div>
            </div>
          </div>

          {/* SECTION: SCORE TREND GRAPH */}
          {chronologicalTests.length > 0 && (
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-purple-500/20 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <span>Score Performance Trend</span>
                </h3>
                <span className="text-xs text-purple-300 font-bold">
                  {chronologicalTests.length} Test{chronologicalTests.length > 1 ? 's' : ''} Evaluated
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-12 gap-2 items-end h-40 p-4 rounded-2xl bg-navy-950/70 border border-white/10">
                {chronologicalTests.slice(-12).map((t, idx) => {
                  const pct = Math.max(8, Math.min(100, t.percentage || 0));
                  return (
                    <div key={t.id || idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                      <span className="text-[10px] font-bold text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        {t.percentage}%
                      </span>
                      <div
                        style={{ height: `${pct}%` }}
                        className={`w-full max-w-[28px] rounded-t-lg transition-all ${
                          pct >= 75
                            ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                            : pct >= 50
                            ? 'bg-gradient-to-t from-purple-600 to-purple-400'
                            : 'bg-gradient-to-t from-rose-600 to-rose-400'
                        }`}
                      />
                      <span className="text-[9px] text-slate-400 font-bold truncate max-w-full" title={t.testName}>
                        T{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION: SUBJECT-WISE ANALYTICS */}
          {Object.keys(subjectStats).length > 0 && (
            <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-400" />
                <span>Subject Average Performance</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(subjectStats).map(([subName, stat]) => {
                  const avg = stat.totalTot > 0 ? (stat.totalObt / stat.totalTot) * 100 : 0;
                  return (
                    <div key={subName} className="p-4 rounded-2xl bg-navy-900/80 border border-white/5 space-y-2">
                      <div className="text-xs font-bold text-slate-300 truncate" title={subName}>{subName}</div>
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-black text-white">{avg.toFixed(1)}%</div>
                        <span className="text-[10px] text-slate-400 font-semibold">{stat.count} Test{stat.count > 1 ? 's' : ''}</span>
                      </div>
                      <div className="w-full bg-navy-950 h-2 rounded-full overflow-hidden border border-white/5">
                        <div
                          style={{ width: `${Math.min(100, avg)}%` }}
                          className={`h-full rounded-full ${
                            avg >= 75 ? 'bg-emerald-400' : avg >= 50 ? 'bg-purple-400' : 'bg-rose-400'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION: TEST HISTORY LIST */}
          <div className="space-y-4">
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <span>Test History ({filteredMyTests.length})</span>
              </h3>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={filterSubject}
                  onChange={e => setFilterSubject(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Subjects</option>
                  {streamSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select
                  value={filterSource}
                  onChange={e => setFilterSource(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Sources</option>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Test Cards List */}
            {filteredMyTests.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No test records found"
                description="Click '+ Add My Test' to record your self-tests, coaching tests, or mock scores."
                actionText="+ Add My Test"
                onAction={() => { resetForm(); setShowModal(true); }}
              />
            ) : (
              <div className="space-y-4">
                {filteredMyTests.map((item) => (
                  <div key={item.id} className="p-6 rounded-3xl glass-card border border-white/10 hover:border-purple-500/30 transition-all space-y-4">
                    
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                            {item.subject}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-navy-950 text-slate-400 text-xs font-bold border border-white/5">
                            {item.source}
                          </span>
                          <span className="text-xs text-slate-400">
                            Attempt #{item.attemptNumber || 1} • {item.testDate}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white pt-1">{item.testName}</h3>
                        {item.chapter && (
                          <div className="text-xs text-slate-400">Topic: <strong className="text-slate-200">{item.chapter}</strong></div>
                        )}
                      </div>

                      {/* Marks Badge & Status */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-xl font-black text-white">
                            {item.marksObtained} <span className="text-xs text-slate-400 font-normal">/ {item.totalMarks}</span>
                          </div>
                          <span className={`inline-block text-xs font-black px-2.5 py-0.5 rounded-full ${
                            item.percentage >= 75
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : item.percentage >= 50
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {item.percentage}%
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                            title="Edit Test"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Test"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Weak Topics & Remarks */}
                    {(item.weakTopics || item.remarks) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs">
                        {item.weakTopics && (
                          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 space-y-1">
                            <strong className="block text-rose-400 font-bold uppercase text-[10px]">Weak Topics / Mistakes:</strong>
                            <p>{item.weakTopics}</p>
                          </div>
                        )}
                        {item.remarks && (
                          <div className="p-3 rounded-xl bg-navy-950 border border-white/5 text-slate-300 space-y-1">
                            <strong className="block text-slate-400 font-bold uppercase text-[10px]">Personal Remarks:</strong>
                            <p>{item.remarks}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attachment Link */}
                    {item.attachmentUrl && (
                      <div className="pt-2 border-t border-white/5">
                        <button
                          onClick={() => setViewImageModal(item.attachmentUrl)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 text-xs font-bold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Test Attachment / Answer Proof</span>
                        </button>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      )}

      {/* TAB 2: ADMIN TEST PAPERS */}
      {activeTab === 'admin_tests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Published Admin Tests for {streamLabel}</span>
            </h3>
          </div>

          {adminTests.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No admin tests published yet"
              description="Admin test papers for your stream will appear here when published by faculty."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminTests.map(t => (
                <div key={t.id} className="p-6 rounded-3xl glass-card border border-white/10 hover:border-emerald-500/30 transition-all space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                        {t.subject}
                      </span>
                      <span className="text-xs text-slate-400">
                        {t.course} {t.level} • {t.attempt || 'All Attempts'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white pt-1">{t.title}</h3>
                    {t.chapter && <div className="text-xs text-slate-400">Topic: {t.chapter}</div>}
                  </div>

                  {t.description && (
                    <p className="text-xs text-slate-300 bg-navy-950/60 p-3 rounded-xl border border-white/5">
                      {t.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    {t.pdfUrl && (
                      <button
                        onClick={() => setViewPdfModal(t.pdfUrl)}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-glow-purple"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Test PDF
                      </button>
                    )}
                    {t.googleDriveUrl && (
                      <a
                        href={t.googleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-navy-950 text-xs font-black flex items-center gap-1.5 shadow-glow-blue"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open Drive
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT MY TEST MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/15 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <span>{editItem ? 'Edit Test Record' : '+ Record New Test'}</span>
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmitTest} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Test Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Accounts Chapter Test 1"
                  value={testName}
                  onChange={e => setTestName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Subject *</label>
                  <select
                    value={subject}
                    onChange={e => {
                      setSubject(e.target.value);
                      setChapter('');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-purple-500"
                  >
                    {streamSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Test Source</label>
                  <select
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-purple-500"
                  >
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Chapter Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Chapter / Topic</label>
                <select
                  value={chapter}
                  onChange={e => setChapter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-purple-500 mb-2"
                >
                  <option value="">Select Chapter from Syllabus...</option>
                  {currentChapters.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                  <option value="custom">✍️ Other / Custom Topic...</option>
                </select>

                {chapter === 'custom' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom topic name..."
                    value={customTopic}
                    onChange={e => setCustomTopic(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-purple-500/50 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                )}
              </div>

              {/* Marks & Calculation */}
              <div className="p-4 rounded-2xl bg-navy-900/90 border border-purple-500/20 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Total Marks *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.5"
                      placeholder="100"
                      value={totalMarks}
                      onChange={e => setTotalMarks(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-white text-sm font-black focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Marks Obtained *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max={totalMarks}
                      step="0.5"
                      placeholder="e.g. 72"
                      value={marksObtained}
                      onChange={e => setMarksObtained(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-navy-950 border border-white/10 text-purple-300 text-sm font-black focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Auto Calculated Percentage */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-xs text-slate-400 font-bold">Auto Percentage:</span>
                  <span className={`text-base font-black ${
                    calculatedPercentage >= 75 ? 'text-emerald-400' : calculatedPercentage >= 50 ? 'text-purple-400' : 'text-rose-400'
                  }`}>
                    {calculatedPercentage.toFixed(1)}% ({obtM} / {totM})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Test Date *</label>
                  <input
                    type="date"
                    required
                    value={testDate}
                    onChange={e => setTestDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Attempt #</label>
                  <input
                    type="text"
                    placeholder="1"
                    value={attemptNumber}
                    onChange={e => setAttemptNumber(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-purple-500"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Weak Topics / Mistakes (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Calculation mistakes, adjustment entry confusion..."
                  value={weakTopics}
                  onChange={e => setWeakTopics(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Personal Remarks (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Need more practice on tricky questions..."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Optional Attachment Upload */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Attach Test Photo / Proof (Optional)</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 rounded-xl border border-dashed border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Select Test Photo / Proof
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {attachmentPreview && (
                  <div className="mt-2 relative w-20 h-20">
                    <img src={attachmentPreview} alt="Preview" className="w-full h-full object-cover rounded-xl border border-white/10" />
                    <button type="button" onClick={() => { setAttachmentFile(null); setAttachmentPreview(''); }} className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/10">
                <button type="button" onClick={resetForm} className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-xs font-black hover:bg-purple-500 disabled:opacity-50 shadow-glow-purple">
                  {submitting ? 'Saving...' : editItem ? 'Update Test' : 'Save Test Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl border border-rose-500/30 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400" /> Delete Test Record?
            </h3>
            <p className="text-xs text-slate-300">Are you sure you want to permanently delete this test record? This cannot be undone.</p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setDeletingId(null)} className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold">Cancel</button>
              <button onClick={confirmDeleteTest} className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW IMAGE ATTACHMENT MODAL */}
      {viewImageModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-950/95 backdrop-blur-md" onClick={() => setViewImageModal(null)}>
          <div className="max-w-3xl w-full space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold">Test Proof Attachment</h3>
              <button onClick={() => setViewImageModal(null)} className="text-slate-400 hover:text-white font-bold text-2xl">✕</button>
            </div>
            <img src={viewImageModal} alt="Test Attachment" className="w-full rounded-2xl border border-white/10 shadow-2xl" />
          </div>
        </div>
      )}

      {/* VIEW ADMIN TEST PDF MODAL */}
      {viewPdfModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-950/95 backdrop-blur-md" onClick={() => setViewPdfModal(null)}>
          <div className="max-w-4xl w-full space-y-3 h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold">Admin Test Paper PDF</h3>
              <button onClick={() => setViewPdfModal(null)} className="text-slate-400 hover:text-white font-bold text-2xl">✕</button>
            </div>
            <iframe src={viewPdfModal} className="w-full flex-1 rounded-2xl border border-white/10 bg-white" title="Test PDF" />
          </div>
        </div>
      )}

    </div>
  );
}
