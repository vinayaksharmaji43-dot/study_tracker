import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getStudentSyllabus } from '../../data/syllabusData';
import EmptyState from '../../components/EmptyState';
import { 
  BookOpenCheck, 
  Search, 
  Users, 
  CheckCircle2, 
  Circle, 
  BarChart3, 
  Layers, 
  Calendar, 
  Award, 
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function AdminSyllabus() {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [courseFilter, setCourseFilter] = useState('all');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => s.role !== 'admin' && s.email?.toLowerCase() !== 'vaultstore27@gmail.com' && s.email?.toLowerCase() !== 'thunderworld766@gmail.com');
      
      setStudents(docs);
      if (docs.length > 0 && !selectedStudent) {
        setSelectedStudent(docs[0]);
      }
    });

    return () => unsub();
  }, []);

  const filteredStudents = students.filter(s => {
    const matchesSearch = 
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    const courseKey = s.course === 'CMA' || s.course?.includes('CMA') ? 'CMA' : 'CA';
    const levelKey = s.level === 'Intermediate' || s.course?.includes('Intermediate') ? 'Intermediate' : 'Foundation';
    const fullCat = `${courseKey} ${levelKey}`;

    const matchesCourse = courseFilter === 'all' || fullCat === courseFilter;

    return matchesSearch && matchesCourse;
  });

  // Calculate syllabus stats for currently selected student
  const studentCourse = selectedStudent?.course || 'CA';
  const studentLevel = selectedStudent?.level || 'Foundation';
  const studentAttempt = selectedStudent?.attempt || 'Jan 27';

  const syllabusInfo = getStudentSyllabus(studentCourse, studentLevel);
  const { courseKey, levelKey, subjects, totalChaptersCount } = syllabusInfo;

  const completedMap = selectedStudent?.syllabusCompleted || {};
  const completedChaptersCount = Object.keys(completedMap).filter(id => Boolean(completedMap[id])).length;
  const remainingChaptersCount = Math.max(0, totalChaptersCount - completedChaptersCount);
  const completionPercentage = totalChaptersCount > 0 
    ? Math.min(100, Math.round((completedChaptersCount / totalChaptersCount) * 100))
    : 0;

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            <BookOpenCheck className="w-3.5 h-3.5" />
            <span>Student Academic Progress Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Syllabus Completion <span className="gold-gradient-text">Analytics</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Select any registered student to view their completed chapter checklist, remaining topics, subject progress percentages, and earned syllabus points.
          </p>
        </div>
      </div>

      {/* Main Layout: Student Selector Sidebar + Detailed Syllabus View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Student Roster Search & List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-4 shadow-xl">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Student</div>

            {/* Search & Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white font-semibold text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Courses & Levels</option>
                <option value="CA Foundation">CA Foundation</option>
                <option value="CA Intermediate">CA Intermediate</option>
                <option value="CMA Foundation">CMA Foundation</option>
                <option value="CMA Intermediate">CMA Intermediate</option>
              </select>
            </div>

            {/* Student List */}
            {filteredStudents.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">No students found</div>
            ) : (
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1 divide-y divide-white/5">
                {filteredStudents.map((st) => {
                  const isSelected = (st.id || st.uid) === (selectedStudent?.id || selectedStudent?.uid);
                  const stCourseKey = st.course === 'CMA' || st.course?.includes('CMA') ? 'CMA' : 'CA';
                  const stLevelKey = st.level === 'Intermediate' || st.course?.includes('Intermediate') ? 'Intermediate' : 'Foundation';
                  const stSyllabus = getStudentSyllabus(st.course, st.level);
                  const stCompletedCount = st.syllabusCompletedCount || (st.syllabusCompleted ? Object.keys(st.syllabusCompleted).length : 0);
                  const stPct = stSyllabus.totalChaptersCount > 0 ? Math.round((stCompletedCount / stSyllabus.totalChaptersCount) * 100) : 0;

                  return (
                    <button
                      key={st.id || st.uid}
                      onClick={() => setSelectedStudent(st)}
                      className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-emerald-600/20 border border-emerald-500/40 text-white shadow-glow-emerald'
                          : 'hover:bg-white/5 border border-transparent text-slate-300'
                      }`}
                    >
                      <div className="space-y-1 truncate">
                        <div className="font-bold text-sm text-white truncate">{st.name}</div>
                        <div className="text-xs text-slate-400 truncate">{st.email}</div>
                        <div className="text-[11px] text-emerald-400 font-semibold">
                          {stCourseKey} {stLevelKey} • {stPct}% ({stCompletedCount} chs)
                        </div>
                      </div>
                      {isSelected && <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Student Syllabus Analytics View */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedStudent ? (
            <EmptyState
              icon={Users}
              title="Select a student to view syllabus analytics"
              description="Choose any registered student from the left panel to inspect their detailed chapter progress."
            />
          ) : (
            <div className="space-y-6">
              
              {/* Selected Student Summary Card */}
              <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-gold-500 p-0.5 shrink-0">
                      <div className="w-full h-full bg-navy-950 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg">
                        {selectedStudent.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedStudent.name}</h2>
                      <p className="text-xs text-slate-400">{selectedStudent.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                      {courseKey} {levelKey}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-xs font-bold border border-gold-500/30">
                      {studentAttempt} Attempt
                    </span>
                  </div>
                </div>

                {/* 5 Key Metric Boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                    <div className="text-[11px] text-slate-400">Total Chapters</div>
                    <div className="text-lg font-black text-white">{totalChaptersCount}</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                    <div className="text-[11px] text-slate-400">Completed</div>
                    <div className="text-lg font-black text-emerald-400">{completedChaptersCount}</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                    <div className="text-[11px] text-slate-400">Remaining</div>
                    <div className="text-lg font-black text-amber-400">{remainingChaptersCount}</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                    <div className="text-[11px] text-slate-400">Completion %</div>
                    <div className="text-lg font-black text-emerald-400 font-mono">{completionPercentage}%</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-white/5 space-y-1">
                    <div className="text-[11px] text-slate-400">Total Points</div>
                    <div className="text-lg font-black text-gold-400 font-mono">{selectedStudent.points || 0} PTS</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">Syllabus Completion Bar</span>
                    <span className="text-emerald-400">{completedChaptersCount} of {totalChaptersCount} Chapters Done</span>
                  </div>
                  <div className="w-full bg-navy-950 rounded-full h-3 overflow-hidden border border-white/5">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-gold-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Subject-Wise Progress Breakdown */}
              <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-4 shadow-xl">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Subject-Wise Progress Breakdown</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjects.map((subObj) => {
                    const subjectChapters = subObj.chapters || [];
                    const subTotal = subjectChapters.length;
                    const subCompleted = subjectChapters.filter(ch => Boolean(completedMap[ch.id])).length;
                    const subPct = subTotal > 0 ? Math.round((subCompleted / subTotal) * 100) : 0;

                    return (
                      <div key={subObj.subject} className="p-4 rounded-2xl bg-navy-900/60 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white truncate">{subObj.subject}</span>
                          <span className="font-mono font-bold text-emerald-400">{subCompleted}/{subTotal} ({subPct}%)</span>
                        </div>
                        <div className="w-full bg-navy-950 rounded-full h-2 overflow-hidden border border-white/5">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-gold-400 h-full rounded-full transition-all duration-300"
                            style={{ width: `${subPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Completed vs Remaining Chapter Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Completed Chapters List */}
                <div className="p-6 rounded-3xl glass-card border border-emerald-500/30 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Completed Chapters ({completedChaptersCount})</span>
                    </h3>
                  </div>

                  {completedChaptersCount === 0 ? (
                    <div className="text-xs text-slate-400 p-4 text-center">No completed chapters yet</div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {subjects.map(subObj => 
                        subObj.chapters
                          .filter(ch => Boolean(completedMap[ch.id]))
                          .map(ch => (
                            <div key={ch.id} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 flex items-center justify-between">
                              <span className="font-medium">{ch.title}</span>
                              <span className="font-bold text-emerald-400 shrink-0 ml-2">+10 PTS ✓</span>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>

                {/* Remaining Chapters List */}
                <div className="p-6 rounded-3xl glass-card border border-amber-500/30 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Circle className="w-4 h-4 text-amber-400" />
                      <span>Remaining Chapters ({remainingChaptersCount})</span>
                    </h3>
                  </div>

                  {remainingChaptersCount === 0 ? (
                    <div className="text-xs text-emerald-400 p-4 text-center font-bold">🎉 100% Syllabus Completed!</div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {subjects.map(subObj => 
                        subObj.chapters
                          .filter(ch => !Boolean(completedMap[ch.id]))
                          .map(ch => (
                            <div key={ch.id} className="p-3 rounded-xl bg-navy-900/60 border border-white/5 text-xs text-slate-300 flex items-center justify-between">
                              <span className="font-medium">{ch.title}</span>
                              <span className="text-slate-500 shrink-0 ml-2">Pending</span>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
