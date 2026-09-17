import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import { FileText, ExternalLink, Calendar, BookOpen, Layers, Search, Download } from 'lucide-react';

export default function Notes() {
  const { userProfile, currentUser } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotes(docs);
      setLoading(false);
    }, (err) => {
      console.error("Notes listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Show only published materials to students
  const publishedNotes = notes.filter(n => n.published !== false);

  const filteredNotes = publishedNotes.filter(note => {
    const matchesSearch = 
      (note.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.fileName || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCourse = selectedCourse === 'all' || !note.course || note.course === selectedCourse;

    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-purple-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
            <FileText className="w-3.5 h-3.5" />
            <span>Official Academic Resources</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Study Materials & <span className="gold-gradient-text">PDF Library</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Access curated PDF materials, chapter summaries, formula sheets, and study resources uploaded by faculty.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search material by title, subject, or filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedCourse('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              selectedCourse === 'all' ? 'bg-purple-600 text-white shadow-glow-purple' : 'bg-navy-900 text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            All Courses
          </button>
          <button
            onClick={() => setSelectedCourse('CA Foundation')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              selectedCourse === 'CA Foundation' ? 'bg-purple-600 text-white shadow-glow-purple' : 'bg-navy-900 text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            CA Foundation
          </button>
          <button
            onClick={() => setSelectedCourse('CMA')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              selectedCourse === 'CMA' ? 'bg-purple-600 text-white shadow-glow-purple' : 'bg-navy-900 text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            CMA
          </button>
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No study materials available"
          description={searchQuery ? "No materials matched your search criteria." : "Official study materials and PDFs uploaded by faculty will appear here."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredNotes.map((note) => {
            const resourceUrl = note.fileUrl || note.driveUrl;

            return (
              <div key={note.id} className="p-6 rounded-3xl glass-card border border-white/10 hover:border-purple-500/30 transition-all space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                        {note.subject}
                      </span>
                      {note.course && (
                        <span className="px-2.5 py-0.5 rounded-md bg-navy-900 text-gold-400 text-[11px] font-bold border border-white/10">
                          {note.course} {note.attempt ? `• ${note.attempt}` : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gold-400" />
                      {formatDate(note.createdAt)}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white leading-snug">{note.title}</h3>

                  {note.fileName && (
                    <div className="text-xs text-purple-300 font-mono flex items-center gap-1.5 truncate">
                      <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">{note.fileName}</span>
                    </div>
                  )}

                  {note.description && (
                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">{note.description}</p>
                  )}
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">By {note.createdBy || note.author || 'Faculty'}</span>

                  {resourceUrl && resourceUrl !== '#' ? (
                    <a
                      href={resourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white text-xs font-bold transition-all shadow-glow-purple"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Open / Download PDF</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500 italic">No link attached</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
