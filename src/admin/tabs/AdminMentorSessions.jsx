import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Video, Plus, Search, Edit, Trash2, CheckCircle, XCircle, AlertTriangle, Calendar as CalendarIcon, Clock, Users 
} from 'lucide-react';

export default function AdminMentorSessions() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    mentorName: '',
    description: '',
    meetLink: '',
    date: '',
    startTime: '',
    endTime: '',
    audienceType: 'all', // 'all' or 'specific'
    course: 'CA',
    level: 'Foundation',
    attempt: 'May 27',
    published: true,
  });

  const [saving, setSaving] = useState(false);

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
    const q = query(collection(db, 'mentorSessions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by date and time descending
      data.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.startTime || '00:00'}`);
        const dateB = new Date(`${b.date}T${b.startTime || '00:00'}`);
        return dateB - dateA;
      });
      setSessions(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getAttemptsForCourse = (course) => {
    if (course === 'CA') return ['May 27', 'Jan 27', 'Sep 27', 'May 2027', 'Jan 2027', 'Sep 2027'];
    if (course === 'CMA') return ['June 27', 'Dec 27', 'June 2027', 'December 2027'];
    return [];
  };

  const handleOpenModal = (session = null) => {
    if (session) {
      setEditingSession(session);
      setFormData({
        title: session.title || '',
        mentorName: session.mentorName || '',
        description: session.description || '',
        meetLink: session.meetLink || '',
        date: session.date || '',
        startTime: session.startTime || '',
        endTime: session.endTime || '',
        audienceType: session.audienceType || 'all',
        course: session.course || 'CA',
        level: session.level || 'Foundation',
        attempt: session.attempt || 'Jan 2027',
        published: session.published ?? true,
      });
    } else {
      setEditingSession(null);
      setFormData({
        title: '',
        mentorName: '',
        description: '',
        meetLink: '',
        date: '',
        startTime: '',
        endTime: '',
        audienceType: 'all',
        course: 'CA',
        level: 'Foundation',
        attempt: 'Jan 2027',
        published: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return alert('Session Title is required');
    if (!formData.date || !formData.startTime) return alert('Date and Start Time are required');
    if (!formData.meetLink.trim()) return alert('Google Meet Link is required');
    
    setSaving(true);
    
    try {
      const payload = {
        ...formData,
        title: formData.title.trim(),
        meetLink: formData.meetLink.trim(),
        updatedAt: serverTimestamp(),
      };

      if (payload.audienceType === 'specific') {
         if (!getAttemptsForCourse(formData.course).includes(formData.attempt)) {
            payload.attempt = getAttemptsForCourse(formData.course)[0] || '';
         }
      } else {
         payload.course = null;
         payload.level = null;
         payload.attempt = null;
      }

      if (editingSession) {
        await updateDoc(doc(db, 'mentorSessions', editingSession.id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        payload.createdBy = currentUser.uid;
        await addDoc(collection(db, 'mentorSessions'), payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving session:', err);
      alert('Failed to save session. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (session) => {
    try {
      await updateDoc(doc(db, 'mentorSessions', session.id), {
        published: !session.published,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this Mentor Session?')) {
      try {
        await deleteDoc(doc(db, 'mentorSessions', id));
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }
  };

  const filteredSessions = sessions.filter(sess => {
    if (search && !sess.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCourse !== 'All' && sess.audienceType === 'specific' && sess.course !== filterCourse) return false;
    if (filterLevel !== 'All' && sess.audienceType === 'specific' && sess.level !== filterLevel) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Video className="w-6 h-6 text-emerald-400" />
            Mentor Sessions
          </h2>
          <p className="text-sm text-slate-400 mt-1">Schedule and manage live Google Meet sessions for students.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          Create Session
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search sessions..."
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
      </div>

      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading sessions...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center">
            <Video className="w-10 h-10 mb-2 opacity-50" />
            <p>No mentor sessions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy-900/80 text-slate-300 font-semibold border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Session Title</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Audience</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSessions.map(sess => (
                  <tr key={sess.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{sess.title}</div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {sess.mentorName || 'No Mentor Specified'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300 flex items-center gap-1">
                         <CalendarIcon className="w-3 h-3 text-emerald-400" />
                         {sess.date}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                         <Clock className="w-3 h-3 text-gold-400" />
                         {sess.startTime} {sess.endTime ? `- ${sess.endTime}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {sess.audienceType === 'all' ? (
                        <span className="px-2 py-1 bg-royal-500/20 text-royal-400 text-xs rounded-md font-medium">All Streams</span>
                      ) : (
                        <div>
                          <div className="text-slate-300">{sess.course} {sess.level}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{sess.attempt}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(sess)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                          sess.published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {sess.published ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {sess.published ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(sess)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sess.id)}
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
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-navy-800/50 shrink-0">
              <h3 className="text-lg font-bold text-white">
                {editingSession ? 'Edit Mentor Session' : 'Create Mentor Session'}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Session Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-navy-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. How to plan CA Foundation revision"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Mentor Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.mentorName}
                    onChange={e => setFormData({ ...formData, mentorName: e.target.value })}
                    className="w-full px-3 py-2 bg-navy-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Senior Mentor"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Google Meet Link</label>
                <input
                  type="url"
                  required
                  value={formData.meetLink}
                  onChange={e => setFormData({ ...formData, meetLink: e.target.value })}
                  className="w-full px-3 py-2 bg-navy-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-navy-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-navy-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">End Time (Optional)</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 bg-navy-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Short Description (Optional)</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-navy-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Briefly describe what this session covers..."
                ></textarea>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Audience / Stream</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="all"
                        checked={formData.audienceType === 'all'}
                        onChange={() => setFormData({ ...formData, audienceType: 'all' })}
                        className="w-4 h-4 bg-navy-950 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-white">All Streams</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="specific"
                        checked={formData.audienceType === 'specific'}
                        onChange={() => setFormData({ ...formData, audienceType: 'specific' })}
                        className="w-4 h-4 bg-navy-950 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-white">Specific Stream</span>
                    </label>
                  </div>
                </div>

                {formData.audienceType === 'specific' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-navy-950/50 p-4 rounded-xl border border-white/5">
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

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Attempt</label>
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
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/10">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={e => setFormData({ ...formData, published: e.target.checked })}
                    className="w-4 h-4 rounded border-white/10 bg-navy-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-navy-900"
                  />
                  <span className="text-sm font-medium text-white">Publish immediately</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-white/10 bg-navy-900/90 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Mentor Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
