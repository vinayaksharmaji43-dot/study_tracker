import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  ShieldCheck, 
  Crown, 
  Search, 
  Phone, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Save, 
  MessageCircle, 
  ExternalLink, 
  AlertTriangle,
  Sparkles,
  Users,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { 
  usePremiumAccess, 
  DEFAULT_WHATSAPP_NUMBER, 
  TRIAL_DURATION_MS,
  extractUserRegistrationDate,
  generateWhatsAppLink 
} from '../../hooks/usePremiumAccess';
import ProBadge from '../../components/ProBadge';
import EmptyState from '../../components/EmptyState';

export default function AdminPremiumAccess() {
  const { whatsappNumber, updateWhatsappNumber, loadingSettings } = usePremiumAccess();

  // Local WhatsApp Number input state
  const [inputNumber, setInputNumber] = useState(whatsappNumber || DEFAULT_WHATSAPP_NUMBER);
  const [savingNumber, setSavingNumber] = useState(false);
  const [numberSavedSuccess, setNumberSavedSuccess] = useState(false);

  // Sync input when loaded from Firestore
  useEffect(() => {
    if (whatsappNumber) {
      setInputNumber(whatsappNumber);
    }
  }, [whatsappNumber]);

  // Students list from Firestore
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [proFilter, setProFilter] = useState('all'); // 'all', 'pro', 'free'
  const [trialFilter, setTrialFilter] = useState('all'); // 'all', 'active', 'expired'

  // Action status message
  const [actionNotice, setActionNotice] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Listen to Firestore users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        // Extract dates
        const regDate = extractUserRegistrationDate(data, null);
        const trialEndDate = new Date(regDate.getTime() + TRIAL_DURATION_MS);
        const nowMs = Date.now();
        const isTrialActive = nowMs < trialEndDate.getTime();

        let proGrantedDate = null;
        if (data.proGrantedAt) {
          if (typeof data.proGrantedAt.toDate === 'function') {
            proGrantedDate = data.proGrantedAt.toDate();
          } else if (data.proGrantedAt.seconds) {
            proGrantedDate = new Date(data.proGrantedAt.seconds * 1000);
          } else {
            proGrantedDate = new Date(data.proGrantedAt);
          }
        }

        return {
          id,
          ...data,
          registrationDate: regDate,
          trialEndDate,
          isTrialActive,
          isTrialExpired: !isTrialActive,
          isPro: Boolean(data.isPro === true || data.proAccess === true),
          proGrantedDate
        };
      });

      // Sort: Pro students or most recent first
      list.sort((a, b) => (b.registrationDate?.getTime() || 0) - (a.registrationDate?.getTime() || 0));
      setStudents(list);
      setLoadingStudents(false);
    }, (err) => {
      console.error('Error fetching students for premium management:', err);
      setLoadingStudents(false);
    });

    return () => unsub();
  }, []);

  // Save WhatsApp Number handler
  const handleSaveWhatsAppNumber = async (e) => {
    e.preventDefault();
    const clean = inputNumber.replace(/\D/g, '');
    if (!clean || clean.length < 10) {
      alert('Please enter a valid WhatsApp phone number (at least 10 digits).');
      return;
    }

    try {
      setSavingNumber(true);
      await updateWhatsappNumber(clean);
      setNumberSavedSuccess(true);
      setTimeout(() => setNumberSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save WhatsApp number:', err);
      alert('Failed to save WhatsApp number: ' + err.message);
    } finally {
      setSavingNumber(false);
    }
  };

  // Grant Pro Access
  const handleGrantPro = async (student) => {
    if (processingId) return;
    const confirmGrant = window.confirm(
      `Grant full PRO Access to ${student.name || 'this student'} (${student.rollNumber || student.email})?\n\nThis will give the student permanent full access overriding trial expiration.`
    );
    if (!confirmGrant) return;

    try {
      setProcessingId(student.id);
      await updateDoc(doc(db, 'users', student.id), {
        isPro: true,
        proAccess: true,
        proGrantedAt: serverTimestamp()
      });
      setActionNotice({
        type: 'success',
        text: `PRO Access granted to ${student.name || student.email} successfully!`
      });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.error('Error granting Pro access:', err);
      alert('Failed to grant Pro access: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Revoke Pro Access
  const handleRevokePro = async (student) => {
    if (processingId) return;
    const confirmRevoke = window.confirm(
      `Revoke PRO Access for ${student.name || 'this student'} (${student.rollNumber || student.email})?\n\nTheir access will revert to their standard 12-day trial status.`
    );
    if (!confirmRevoke) return;

    try {
      setProcessingId(student.id);
      await updateDoc(doc(db, 'users', student.id), {
        isPro: false,
        proAccess: false,
        proRevokedAt: serverTimestamp()
      });
      setActionNotice({
        type: 'warning',
        text: `PRO Access revoked for ${student.name || student.email}.`
      });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.error('Error revoking Pro access:', err);
      alert('Failed to revoke Pro access: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    // Only students, or all users
    if (s.role === 'admin') return false;

    // Search by Roll Number, Gmail/Email, or Name
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchRoll = (s.rollNumber || '').toLowerCase().includes(q);
      const matchEmail = (s.email || '').toLowerCase().includes(q);
      const matchName = (s.name || '').toLowerCase().includes(q);
      if (!matchRoll && !matchEmail && !matchName) return false;
    }

    // Pro Filter
    if (proFilter === 'pro' && !s.isPro) return false;
    if (proFilter === 'free' && s.isPro) return false;

    // Trial Filter
    if (trialFilter === 'active' && !s.isTrialActive) return false;
    if (trialFilter === 'expired' && !s.isTrialExpired) return false;

    return true;
  });

  // Analytics counts
  const totalStudents = students.filter(s => s.role !== 'admin').length;
  const proStudentsCount = students.filter(s => s.role !== 'admin' && s.isPro).length;
  const activeTrialCount = students.filter(s => s.role !== 'admin' && !s.isPro && s.isTrialActive).length;
  const expiredTrialCount = students.filter(s => s.role !== 'admin' && !s.isPro && s.isTrialExpired).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-amber-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Premium Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              12-Day Trial & Pro Access Control
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Grant and revoke full Pro access, inspect student 12-day trial statuses, and configure the universal Premium WhatsApp contact number.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="p-3 rounded-2xl bg-navy-900/80 border border-white/5 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Students</div>
              <div className="text-xl font-black text-white mt-0.5">{totalStudents}</div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
              <div className="text-[10px] font-bold text-amber-300 uppercase">Pro Access</div>
              <div className="text-xl font-black text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>{proStudentsCount}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <div className="text-[10px] font-bold text-emerald-300 uppercase">Active Trial</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">{activeTrialCount}</div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
              <div className="text-[10px] font-bold text-rose-300 uppercase">Trial Expired</div>
              <div className="text-xl font-black text-rose-400 mt-0.5">{expiredTrialCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Configuration Card */}
      <div className="p-6 rounded-3xl glass-card border border-emerald-500/30 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-glow-emerald">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Premium WhatsApp Number</h2>
              <p className="text-xs text-slate-300">
                All "Buy Premium", "Contact Batch Manager", and Product "BUY NOW" buttons automatically connect to this number.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={generateWhatsAppLink(inputNumber, 'Hello Admin! This is a test message from CA/CMA Blueprint.')}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all border border-emerald-500/20 flex items-center gap-1.5"
            >
              <span>Test WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <form onSubmit={handleSaveWhatsAppNumber} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={inputNumber}
              onChange={(e) => setInputNumber(e.target.value)}
              placeholder="e.g. 9509351975"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-navy-900/90 border border-white/10 text-white placeholder-slate-500 text-sm font-mono tracking-wider focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={savingNumber}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-glow-emerald transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{savingNumber ? 'Saving...' : 'Save WhatsApp Number'}</span>
          </button>
        </form>

        {numberSavedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>WhatsApp number updated successfully! All student WhatsApp links will now use this number.</span>
          </div>
        )}
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
          actionNotice.type === 'success' 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
            : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
        }`}>
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionNotice.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setActionNotice(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Student Search & Filters */}
      <div className="p-5 rounded-3xl glass-card border border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search by Roll Number or Gmail */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Roll Number, Gmail, or Student Name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900/90 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500 transition-all"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            {/* Pro Filter */}
            <select
              value={proFilter}
              onChange={(e) => setProFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-navy-900/90 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Access Types</option>
              <option value="pro">Pro Students Only</option>
              <option value="free">Free / Trial Only</option>
            </select>

            {/* Trial Filter */}
            <select
              value={trialFilter}
              onChange={(e) => setTrialFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-navy-900/90 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Trial Statuses</option>
              <option value="active">Active Trial (Within 12 Days)</option>
              <option value="expired">Expired Trial (&gt; 12 Days)</option>
            </select>
          </div>
        </div>

        {/* Results Counter */}
        <div className="text-xs text-slate-400 flex items-center justify-between px-1">
          <span>Showing {filteredStudents.length} of {totalStudents} students</span>
          {(searchQuery || proFilter !== 'all' || trialFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setProFilter('all');
                setTrialFilter('all');
              }}
              className="text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Student List Table / Cards */}
      {loadingStudents ? (
        <div className="p-12 text-center text-slate-400">Loading student records...</div>
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Students Found"
          description="No students matched your search criteria. Try searching by Roll Number or Gmail address."
        />
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student) => {
            const isProcessing = processingId === student.id;

            return (
              <div
                key={student.id}
                className={`p-5 rounded-2xl glass-card border transition-all duration-200 ${
                  student.isPro
                    ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-navy-900/80 to-navy-900/80 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                    : student.isTrialExpired
                      ? 'border-rose-500/25 bg-navy-900/80'
                      : 'border-white/10 bg-navy-900/80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: Student Identity */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-white text-base truncate">
                        {student.name || 'Unnamed Student'}
                      </span>
                      {student.isPro && <ProBadge size="sm" />}
                      <span className="text-[11px] px-2 py-0.5 rounded-lg bg-navy-950 text-slate-400 border border-white/5 font-mono">
                        {student.course || 'CA'} • {student.level || 'Foundation'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                      {/* Roll Number */}
                      <div className="flex items-center gap-1 font-mono text-gold-400 font-bold bg-navy-950/80 px-2 py-0.5 rounded-md border border-white/5">
                        <span className="text-slate-500 uppercase text-[10px]">Roll:</span>
                        <span>{student.rollNumber || 'No Roll #'}</span>
                      </div>

                      {/* Gmail */}
                      <div className="flex items-center gap-1 font-mono text-slate-300">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{student.email || 'No Email'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Trial & Pro Dates */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-navy-950/60 p-3 rounded-xl border border-white/5">
                    {/* Trial Start Date */}
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-500">Trial Start</div>
                      <div className="font-semibold text-slate-300 mt-0.5">
                        {student.registrationDate ? student.registrationDate.toLocaleDateString() : 'N/A'}
                      </div>
                    </div>

                    {/* Trial End Date & Status */}
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-500">Trial End</div>
                      <div className="font-semibold mt-0.5 flex items-center gap-1">
                        <span className={student.isTrialExpired ? 'text-rose-400' : 'text-emerald-400'}>
                          {student.trialEndDate ? student.trialEndDate.toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <span className={`inline-block mt-0.5 text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                        student.isTrialExpired 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {student.isTrialExpired ? 'Expired' : 'Active Trial'}
                      </span>
                    </div>

                    {/* Pro Status & Granted Date */}
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-500">Pro Status</div>
                      <div className="mt-0.5">
                        {student.isPro ? (
                          <div>
                            <span className="text-amber-400 font-extrabold flex items-center gap-1">
                              <Crown className="w-3 h-3 text-amber-400" />
                              <span>PRO ACTIVE</span>
                            </span>
                            {student.proGrantedDate && (
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {student.proGrantedDate.toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">Free Access</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {student.isPro ? (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRevokePro(student)}
                        className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>{isProcessing ? 'Revoking...' : 'Revoke Pro'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleGrantPro(student)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-navy-950 text-xs font-black transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Crown className="w-3.5 h-3.5 text-navy-950" />
                        <span>{isProcessing ? 'Granting...' : 'Grant Pro Access'}</span>
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
