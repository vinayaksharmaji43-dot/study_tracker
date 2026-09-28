import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/helpers';
import { STREAM_LABELS, getStreamDetails } from '../../utils/levelSystem';
import EmptyState from '../../components/EmptyState';
import { 
  GraduationCap, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowRight, 
  User, 
  Mail, 
  FileText, 
  Calendar,
  AlertCircle,
  Search,
  Filter,
  ShieldCheck
} from 'lucide-react';

export default function AdminStreamRequests() {
  const { userProfile, currentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'
  const [searchQuery, setSearchQuery] = useState('');

  // Processing state
  const [processingId, setProcessingId] = useState(null);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Confirmation for approval
  const [approvingRequest, setApprovingRequest] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'streamChangeRequests'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setRequests(list);
      setLoading(false);
    }, (err) => {
      console.error("Stream requests listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (req) => {
    try {
      setProcessingId(req.id);
      const details = getStreamDetails(req.requestedStream);

      // 1. Update the student's profile in users collection
      const userRef = doc(db, 'users', req.uid);
      await updateDoc(userRef, {
        stream: req.requestedStream,
        course: details.course,
        level: details.level,
        streamLocked: true,
        streamUpdatedAt: serverTimestamp(),
        streamUpdatedBy: 'admin_approved'
      });

      // 2. Mark request as approved
      const reqRef = doc(db, 'streamChangeRequests', req.id);
      await updateDoc(reqRef, {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: userProfile?.name || currentUser?.email || 'Administrator'
      });

      setApprovingRequest(null);
      alert(`Stream change approved! Student ${req.studentName} is now in ${details.label}.`);
    } catch (err) {
      console.error("Error approving stream change:", err);
      alert("Failed to approve stream change: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;
    try {
      setProcessingId(rejectingRequest.id);

      // Mark request as rejected (keep student's profile unchanged)
      const reqRef = doc(db, 'streamChangeRequests', rejectingRequest.id);
      await updateDoc(reqRef, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim() || 'Request declined by Administrator.',
        reviewedAt: serverTimestamp(),
        reviewedBy: userProfile?.name || currentUser?.email || 'Administrator'
      });

      setRejectingRequest(null);
      setRejectionReason('');
      alert("Stream change request marked as Rejected.");
    } catch (err) {
      console.error("Error rejecting stream change:", err);
      alert("Failed to reject request: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.studentName?.toLowerCase().includes(q);
      const matchEmail = r.studentEmail?.toLowerCase().includes(q);
      const matchRoll = r.rollNumber?.toLowerCase().includes(q);
      return matchName || matchEmail || matchRoll;
    }
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-amber-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Academic Registry Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Stream Change <span className="gold-gradient-text">Requests</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Review student requests to switch academic streams between CA Foundation, CA Intermediate, CMA Foundation, and CMA Intermediate.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Status Tabs */}
        <div className="flex items-center space-x-2 p-1.5 rounded-2xl glass-card border border-white/10 w-fit">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              filter === 'pending' ? 'bg-amber-500 text-navy-950 font-black shadow-glow-gold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Pending ({pendingCount})</span>
            {pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === 'approved' ? 'bg-emerald-600 text-white shadow-glow-emerald' : 'text-slate-400 hover:text-white'
            }`}
          >
            Approved ({requests.filter(r => r.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === 'rejected' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Rejected ({requests.filter(r => r.status === 'rejected').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === 'all' ? 'bg-royal-600 text-white shadow-glow-blue' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({requests.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, roll..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
          />
        </div>

      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={filter === 'pending' ? 'No pending stream change requests' : 'No requests found'}
          description="When students request a stream change from their Profile, their submission will appear here for your review and approval."
        />
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const currentLabel = STREAM_LABELS[req.currentStream] || req.currentStream || 'Unknown';
            const requestedLabel = STREAM_LABELS[req.requestedStream] || req.requestedStream || 'Unknown';
            const isPending = req.status === 'pending';
            const isApproved = req.status === 'approved';
            const isRejected = req.status === 'rejected';

            return (
              <div 
                key={req.id} 
                className={`p-6 rounded-3xl glass-card border transition-all space-y-4 ${
                  isPending 
                    ? 'border-amber-500/40 hover:border-amber-500' 
                    : isApproved 
                      ? 'border-emerald-500/30 bg-emerald-950/10' 
                      : 'border-white/10 opacity-75'
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 p-0.5 shadow-md flex items-center justify-center font-black text-navy-950 text-sm">
                      {req.studentName ? req.studentName.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-base">{req.studentName}</span>
                        {req.rollNumber && (
                          <span className="px-2 py-0.5 rounded-md bg-gold-500/20 text-gold-400 text-[10px] font-mono border border-gold-500/30">
                            {req.rollNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>{req.studentEmail}</span>
                        <span>•</span>
                        <span>{formatDate(req.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPending && (
                      <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pending Admin Review</span>
                      </span>
                    )}
                    {isApproved && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Approved by {req.reviewedBy || 'Admin'}</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/40 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Rejected by {req.reviewedBy || 'Admin'}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Stream Switch Visual */}
                <div className="p-4 rounded-2xl bg-navy-950/80 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Current Stream</div>
                      <div className="px-3 py-1.5 rounded-xl bg-navy-900 border border-white/10 text-white font-bold text-xs">
                        {currentLabel}
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-amber-400 shrink-0 hidden sm:block" />

                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold uppercase text-amber-300 tracking-wider">Requested Stream</div>
                      <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs shadow-glow-amber">
                        {requestedLabel}
                      </div>
                    </div>
                  </div>

                  {/* Student Reason */}
                  {req.reason && (
                    <div className="sm:max-w-md w-full bg-navy-900/60 p-3 rounded-xl border border-white/5 text-xs text-slate-300">
                      <span className="font-bold text-slate-400">Student Reason:</span> "{req.reason}"
                    </div>
                  )}
                </div>

                {/* Rejection Note if present */}
                {isRejected && req.rejectionReason && (
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300">
                    <span className="font-bold">Rejection Note:</span> {req.rejectionReason}
                  </div>
                )}

                {/* Admin Action Buttons for Pending */}
                {isPending && (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setRejectingRequest(req)}
                      disabled={processingId === req.id}
                      className="px-4 py-2 rounded-xl border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject Request</span>
                    </button>

                    <button
                      onClick={() => setApprovingRequest(req)}
                      disabled={processingId === req.id}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-black shadow-glow-emerald transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{processingId === req.id ? 'Processing...' : `Approve & Switch to ${requestedLabel}`}</span>
                    </button>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Approval */}
      {approvingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/40 max-w-md w-full shadow-2xl space-y-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Confirm Stream Change</span>
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to change <strong className="text-white">{approvingRequest.studentName}</strong>'s stream from <strong className="text-slate-300">{STREAM_LABELS[approvingRequest.currentStream]}</strong> to <strong className="text-emerald-400 font-bold">{STREAM_LABELS[approvingRequest.requestedStream]}</strong>?
            </p>

            <div className="p-3.5 rounded-xl bg-navy-900 border border-white/10 text-[11px] text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Note:
              </div>
              <div>This will immediately update their syllabus, doubts access, targets, and leaderboard to the new stream.</div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setApprovingRequest(null)}
                className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(approvingRequest)}
                disabled={processingId === approvingRequest.id}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-glow-emerald"
              >
                {processingId === approvingRequest.id ? 'Updating...' : 'Yes, Approve Stream'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-rose-500/40 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              <span>Reject Stream Change Request</span>
            </h3>
            
            <p className="text-xs text-slate-300">
              Provide an optional explanation for <strong className="text-white">{rejectingRequest.studentName}</strong> regarding why this request was declined:
            </p>

            <textarea
              rows="3"
              placeholder="e.g. Please verify that your examination registration is completed before requesting intermediate stream..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 rounded-xl bg-navy-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-rose-400 resize-none"
            />

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setRejectingRequest(null);
                  setRejectionReason('');
                }}
                className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processingId === rejectingRequest.id}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                {processingId === rejectingRequest.id ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
