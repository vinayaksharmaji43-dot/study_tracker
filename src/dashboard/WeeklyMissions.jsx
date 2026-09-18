import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Flag, CheckCircle, UploadCloud, FileText, Target, Clock, AlertCircle } from 'lucide-react';
import EmptyState from '../components/EmptyState';

const IMGBB_KEY = 'f43ca36cbb4a3e5de80d145fb53cbfff';

function parseStream(userProfile) {
  const raw = (userProfile?.course || '').toUpperCase();
  const isCMA = raw.includes('CMA');
  const course = isCMA ? 'CMA' : 'CA';
  const level = raw.includes('FOUNDATION') ? 'Foundation' : 'Intermediate';
  const attempt = userProfile?.attempt || '';
  return { course, level, attempt };
}

function normalizeAttempt(att) {
  return (att || '').toLowerCase().replace(/\s+/g, '').replace('2027', '27');
}

async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append('key', IMGBB_KEY);
  formData.append('image', file);
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
  const data = await res.json();
  if (data.success) return data.data.url;
  throw new Error('Image upload failed');
}

export default function WeeklyMissions() {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  
  const [missions, setMissions] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Submit State
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitMissionId, setSubmitMissionId] = useState(null);

  useEffect(() => {
    if (!currentUser || !userProfile) return;

    const myStream = parseStream(userProfile);
    const today = new Date().toISOString().split('T')[0];

    // Fetch all missions
    const qM = query(collection(db, 'weeklyMissions'), orderBy('createdAt', 'desc'));
    const unsubM = onSnapshot(qM, (snap) => {
      const allM = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = allM.filter(m => {
        // Audience match
        let audienceMatch = true;
        if (m.audienceType === 'specific') {
          audienceMatch = (
            m.course === myStream.course &&
            m.level === myStream.level &&
            normalizeAttempt(m.attempt) === normalizeAttempt(myStream.attempt)
          );
        }
        return audienceMatch;
      });
      setMissions(filtered);
    });

    // Fetch my submissions
    const qS = query(collection(db, 'weeklyMissionSubmissions'), orderBy('submittedAt', 'desc'));
    const unsubS = onSnapshot(qS, (snap) => {
      const mySubs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.studentId === currentUser.uid);
      setMySubmissions(mySubs);
      setLoading(false);
    });

    return () => { unsubM(); unsubS(); };
  }, [currentUser, userProfile?.course, userProfile?.level, userProfile?.attempt]);

  const today = new Date().toISOString().split('T')[0];

  const activeMissions = missions.filter(m => m.endDate >= today && m.startDate <= today);
  const expiredMissions = missions.filter(m => m.endDate < today);

  const getSubStatus = (mId) => mySubmissions.find(s => s.missionId === mId);

  const handleSubmit = async (mission) => {
    if (mission.proofRequired && !selectedFile) {
      alert('Please select a photo/screenshot as proof.');
      return;
    }
    
    try {
      setUploading(true);
      const subId = `${currentUser.uid}_${mission.id}`;
      let proofUrl = '';

      if (mission.proofRequired && selectedFile) {
        proofUrl = await uploadToImgBB(selectedFile);
      }

      const isCompleted = !mission.proofRequired;

      await setDoc(doc(db, 'weeklyMissionSubmissions', subId), {
        missionId: mission.id,
        studentId: currentUser.uid,
        studentName: userProfile.name,
        status: isCompleted ? 'completed' : 'pending_review',
        proofUrl,
        submittedAt: serverTimestamp(),
        rewardGranted: isCompleted
      });

      // Award immediately if no proof needed
      if (isCompleted) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          points: increment(mission.rewardPoints || 0)
        });
      }

      setSubmitMissionId(null);
      setSelectedFile(null);
      alert(isCompleted ? 'Mission Completed! XP Rewarded.' : 'Proof submitted for review.');

    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-rose-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
              <Flag className="w-3.5 h-3.5" /><span>Weekly Mission</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Revise • Practice • <span className="text-rose-400">Complete</span></h1>
            <p className="text-slate-300 text-sm max-w-xl">Complete targeted weekly missions to stay on track and earn extra XP.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <button onClick={() => setActiveTab('active')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:bg-white/5'}`}>
          Active Missions
        </button>
        <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'history' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:bg-white/5'}`}>
          Mission History
        </button>
      </div>

      {activeTab === 'active' ? (
        activeMissions.length === 0 ? (
          <EmptyState icon={Target} title="No Active Missions" description="You have no pending missions for this week." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeMissions.map(m => {
              const sub = getSubStatus(m.id);
              const isCompleted = sub?.status === 'completed';
              const isPendingReview = sub?.status === 'pending_review';
              const isRejected = sub?.status === 'rejected';

              return (
                <div key={m.id} className="p-6 rounded-3xl glass-card border border-white/10 relative overflow-hidden group hover:border-rose-500/30 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{m.title}</h3>
                      <div className="text-xs text-slate-400">{m.subject} • {m.topic}</div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/30 text-xs font-bold">
                      +{m.rewardPoints} XP
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-navy-950/60 border border-white/5 text-sm text-slate-300 leading-relaxed mb-4">
                    {m.description}
                  </div>

                  <div className="flex items-center gap-2 mb-6">
                    <span className="px-2.5 py-1 rounded-full bg-navy-900 border border-white/10 text-[10px] font-bold text-slate-300 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {m.missionType}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-navy-900 border border-white/10 text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Ends: {m.endDate}
                    </span>
                  </div>

                  {isCompleted ? (
                    <div className="w-full py-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-sm flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Mission Completed
                    </div>
                  ) : isPendingReview ? (
                    <div className="w-full py-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-sm flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" /> Pending Admin Review
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {isRejected && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                          <strong>Admin Feedback:</strong> {sub?.feedback || 'Proof rejected. Please re-submit.'}
                        </div>
                      )}
                      
                      {submitMissionId === m.id ? (
                        m.proofRequired ? (
                          <div className="space-y-3">
                            <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files[0])} className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-rose-500/20 file:text-rose-300 hover:file:bg-rose-500/30" />
                            <div className="flex gap-2">
                              <button onClick={() => setSubmitMissionId(null)} className="w-1/3 py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold">Cancel</button>
                              <button onClick={() => handleSubmit(m)} disabled={uploading || !selectedFile} className="w-2/3 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold disabled:opacity-50">
                                {uploading ? 'Uploading...' : 'Submit Proof'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => setSubmitMissionId(null)} className="w-1/3 py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold">Cancel</button>
                            <button onClick={() => handleSubmit(m)} disabled={uploading} className="w-2/3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">
                              {uploading ? 'Processing...' : 'Confirm Completion'}
                            </button>
                          </div>
                        )
                      ) : (
                        <button onClick={() => setSubmitMissionId(m.id)} className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4" /> Mark as Completed
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {mySubmissions.map(s => {
            const m = missions.find(x => x.id === s.missionId);
            if (!m) return null;
            return (
              <div key={s.id} className="p-4 sm:p-6 rounded-2xl glass-card border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">{m.title}</h4>
                  <div className="text-xs text-slate-400">{m.subject} • {m.topic}</div>
                  {s.status === 'completed' && <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> +{m.rewardPoints} XP Earned</div>}
                  {s.status === 'rejected' && <div className="text-xs font-bold text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Rejected: {s.feedback}</div>}
                  {s.status === 'pending_review' && <div className="text-xs font-bold text-amber-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Pending Review</div>}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  Submitted: {s.submittedAt?.toDate ? new Date(s.submittedAt.toDate()).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            );
          })}
          {mySubmissions.length === 0 && <EmptyState icon={FileText} title="No History Found" description="You haven't submitted any missions yet." />}
        </div>
      )}
    </div>
  );
}
