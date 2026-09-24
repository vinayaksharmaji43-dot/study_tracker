import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Clock, Plus, Search, Filter, Edit, Trash2, CheckCircle, XCircle, AlertTriangle, BookOpen 
} from 'lucide-react';

export default function AdminTimerSubjects() {
  const { currentUser } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    subjectName: '',
    course: 'CA',
    level: 'Foundation',
    attempt: 'May 27',
    allAttempts: false,
    active: true,
  });

  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isModalOpen]);

  useEffect(() => {
    const q = query(collection(db, 'timerSubjects'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubjects(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getAttemptsForCourse = (course) => {
    if (course === 'CA') return ['May 27', 'Jan 27', 'Sep 27', 'May 2027', 'Jan 2027', 'Sep 2027'];
    if (course === 'CMA') return ['June 27', 'Dec 27', 'June 2027', 'December 2027'];
    return [];
  };

  const handleOpenModal = (subject = null) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        subjectName: subject.subjectName,
        course: subject.course || 'CA',
        level: subject.level || 'Foundation',
        attempt: subject.attempt || 'Jan 2027',
        allAttempts: subject.allAttempts || false,
        active: subject.active ?? true,
      });
    } else {
      setEditingSubject(null);
      setFormData({
        subjectName: '',
        course: 'CA',
        level: 'Foundation',
        attempt: 'Jan 2027',
        allAttempts: false,
        active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subjectName.trim()) return alert('Subject Name is required');
    setSaving(true);
    
    try {
      const payload = {
        ...formData,
        subjectName: formData.subjectName.trim(),
        updatedAt: serverTimestamp(),
      };

      if (!formData.allAttempts && !getAttemptsForCourse(formData.course).includes(formData.attempt)) {
         payload.attempt = getAttemptsForCourse(formData.course)[0] || '';
      }

      if (editingSubject) {
        await updateDoc(doc(db, 'timerSubjects', editingSubject.id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        payload.createdBy = currentUser.uid;
        await addDoc(collection(db, 'timerSubjects'), payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving subject:', err);
      alert('Failed to save subject. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (subject) => {
    try {
      await updateDoc(doc(db, 'timerSubjects', subject.id), {
        active: !subject.active,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this subject? It is recommended to just Disable it so old timer records still know about it. Proceed?')) {
      try {
        await deleteDoc(doc(db, 'timerSubjects', id));
      } catch (error) {
        console.error('Error deleting subject:', error);
      }
    }
  };

  const handleMigrateHardcoded = async () => {
    if (!window.confirm('This will insert the default CA and CMA subjects into the database. Are you sure?')) return;
    
    const CA_SUBJECTS = [
      'Paper 1: Accounting',
      'Paper 2: Business Laws',
      'Paper 3: Quantitative Aptitude',
      'Paper 4: Business Economics'
    ];
    
    const CMA_SUBJECTS = [
      'Financial Accounting',
      'Cost Accounting',
      'Laws & Ethics',
      'Direct & Indirect Taxation'
    ];

    setMigrating(true);
    try {
      const batch = writeBatch(db);
      
      CA_SUBJECTS.forEach((sub, i) => {
        const ref = doc(collection(db, 'timerSubjects'));
        batch.set(ref, {
          subjectName: sub,
          course: 'CA',
          level: 'Foundation',
          attempt: 'Jan 2027',
          allAttempts: true,
          active: true,
          order: i,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid
        });
      });

      CMA_SUBJECTS.forEach((sub, i) => {
        const ref = doc(collection(db, 'timerSubjects'));
        batch.set(ref, {
          subjectName: sub,
          course: 'CMA',
          level: 'Foundation',
          attempt: 'June 2027',
          allAttempts: true,
          active: true,
          order: i,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid
        });
      });

      await batch.commit();
      alert('Migration successful!');
    } catch (err) {
      console.error('Migration error', err);
      alert('Migration failed');
    } finally {
      setMigrating(false);
    }
  };

  const filteredSubjects = subjects.filter(sub => {
    if (search && !sub.subjectName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCourse !== 'All' && sub.course !== filterCourse) return false;
    if (filterLevel !== 'All' && sub.level !== filterLevel) return false;
    if (filterStatus !== 'All') {
      if (filterStatus === 'Active' && !sub.active) return false;
      if (filterStatus === 'Inactive' && sub.active) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-400" />
            Timer Subjects Management
          </h2>
          <p className="text-sm text-slate-400 mt-1">Control which subjects appear in the student Study Timer based on stream.</p>
        </div>
        <div className="flex gap-2">
           {subjects.length === 0 && (
             <button
               onClick={handleMigrateHardcoded}
               disabled={migrating}
               className="px-4 py-2 bg-navy-800 text-white rounded-xl text-sm font-bold border border-white/10 hover:bg-navy-700 transition"
             >
               {migrating ? 'Migrating...' : 'Migrate Default Subjects'}
             </button>
           )}
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            Add Subject
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-navy-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="w-full px-4 py-2 bg-navy-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="All">All Courses</option>
          <option value="CA">CA</option>
          <option value="CMA">CMA</option>
        </select>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="w-full px-4 py-2 bg-navy-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="All">All Levels</option>
          <option value="Foundation">Foundation</option>
          <option value="Intermediate">Intermediate</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full px-4 py-2 bg-navy-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading subjects...</div>
        ) : filteredSubjects.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center">
            <BookOpen className="w-10 h-10 mb-2 opacity-50" />
            <p>No subjects found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy-900/80 text-slate-300 font-semibold border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Level</th>
                  <th className="px-6 py-4">Attempt</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSubjects.map(sub => (
                  <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{sub.subjectName}</td>
                    <td className="px-6 py-4 text-slate-300">{sub.course}</td>
                    <td className="px-6 py-4 text-slate-300">{sub.level}</td>
                    <td className="px-6 py-4 text-slate-300">
                      {sub.allAttempts ? (
                        <span className="px-2 py-1 bg-royal-500/20 text-royal-400 text-xs rounded-md font-medium">All Attempts</span>
                      ) : (
                        sub.attempt
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(sub)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                          sub.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {sub.active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {sub.active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(sub)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-950/85 backdrop-blur-sm overflow-hidden">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-navy-800/50 shrink-0">
              <h3 className="text-lg font-bold text-white">
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h3>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Close"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Subject Name</label>
                  <input
                    type="text"
                    required
                    value={formData.subjectName}
                    onChange={e => setFormData({ ...formData, subjectName: e.target.value })}
                    className="w-full px-3 py-2 bg-navy-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Advanced Accounting"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Course</label>
                    <select
                      value={formData.course}
                      onChange={e => setFormData({ ...formData, course: e.target.value })}
                      className="w-full px-3 py-2 bg-navy-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="CA">CA</option>
                      <option value="CMA">CMA</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Level</label>
                    <select
                      value={formData.level}
                      onChange={e => setFormData({ ...formData, level: e.target.value })}
                      className="w-full px-3 py-2 bg-navy-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Foundation">Foundation</option>
                      <option value="Intermediate">Intermediate</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allAttempts}
                      onChange={e => setFormData({ ...formData, allAttempts: e.target.checked })}
                      className="w-4 h-4 rounded border-white/10 bg-navy-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-navy-900"
                    />
                    <span className="text-sm font-medium text-slate-300">Apply to All Attempts</span>
                  </label>
                  
                  {!formData.allAttempts && (
                    <div className="space-y-1 pl-6">
                      <label className="text-xs font-semibold text-slate-400">Specific Attempt</label>
                      <select
                        value={formData.attempt}
                        onChange={e => setFormData({ ...formData, attempt: e.target.value })}
                        className="w-full px-3 py-2 bg-navy-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                      >
                        {getAttemptsForCourse(formData.course).map(attempt => (
                          <option key={attempt} value={attempt}>{attempt}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={e => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 rounded border-white/10 bg-navy-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-navy-900"
                    />
                    <span className="text-sm font-medium text-white">Active (Visible to Students)</span>
                  </label>
                  {!formData.active && (
                    <p className="text-xs text-rose-400 mt-1 pl-6 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Disabled subjects won't appear for new timers.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-white/10 bg-navy-900/90 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingSubject ? 'Update Subject' : 'Add Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
