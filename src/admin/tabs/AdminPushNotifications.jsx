import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDate } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { 
  Bell, 
  Send, 
  Users, 
  Radio, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Smartphone, 
  ExternalLink, 
  Layers,
  Sparkles,
  Search,
  Check,
  RefreshCw
} from 'lucide-react';

export default function AdminPushNotifications() {
  const { currentUser, userProfile } = useAuth();
  const { isEyeCare } = useTheme();

  // State
  const [subscriptions, setSubscriptions] = useState([]);
  const [students, setStudents] = useState([]);
  const [notificationsHistory, setNotificationsHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [targetType, setTargetType] = useState('all'); // 'all' | 'stream' | 'student'
  const [selectedStream, setSelectedStream] = useState('CA Foundation');
  const [selectedStudentUid, setSelectedStudentUid] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [actionUrl, setActionUrl] = useState('/dashboard?tab=announcements');
  const [customUrl, setCustomUrl] = useState('');
  const [priority, setPriority] = useState('high');

  const [sending, setSending] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [errorToast, setErrorToast] = useState('');

  // 1. Real-time subscriptions & users listener
  useEffect(() => {
    // Listen to pushSubscriptions
    const unsubSubs = onSnapshot(collection(db, 'pushSubscriptions'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubscriptions(docs.filter(s => s.active !== false));
      setLoading(false);
    }, (err) => console.warn('pushSubscriptions error:', err));

    // Listen to students
    const unsubStudents = onSnapshot(collection(db, 'users'), (snapshot) => {
      setStudents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role !== 'admin'));
    }, (err) => console.warn('users query error:', err));

    // Listen to sent notification history
    const unsubHistory = onSnapshot(collection(db, 'pushNotificationHistory'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dbDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dbDate - da;
      });
      setNotificationsHistory(docs);
    }, (err) => console.warn('pushNotificationHistory error:', err));

    return () => {
      unsubSubs();
      unsubStudents();
      unsubHistory();
    };
  }, []);

  // Filter matching subscriptions based on target
  const getMatchingSubscriptions = () => {
    if (targetType === 'all') {
      return subscriptions;
    }
    if (targetType === 'stream') {
      const normStream = selectedStream.toLowerCase().trim();
      return subscriptions.filter(s => {
        const sCourse = String(s.course || '').toLowerCase().trim();
        const sStream = String(s.stream || '').toLowerCase().trim();
        return sCourse.includes(normStream) || normStream.includes(sCourse) || sStream.includes(normStream);
      });
    }
    if (targetType === 'student') {
      return subscriptions.filter(s => s.uid === selectedStudentUid);
    }
    return [];
  };

  const matchingSubs = getMatchingSubscriptions();

  // Stream counts
  const streamCounts = {
    'CA Foundation': subscriptions.filter(s => String(s.course || '').toLowerCase().includes('foundation') && !String(s.course || '').toLowerCase().includes('cma')).length,
    'CA Intermediate': subscriptions.filter(s => String(s.course || '').toLowerCase().includes('inter') && !String(s.course || '').toLowerCase().includes('cma')).length,
    'CMA Foundation': subscriptions.filter(s => String(s.course || '').toLowerCase().includes('cma') && String(s.course || '').toLowerCase().includes('foundation')).length,
    'CMA Intermediate': subscriptions.filter(s => String(s.course || '').toLowerCase().includes('cma') && String(s.course || '').toLowerCase().includes('inter')).length,
  };

  // Handle Send Notification
  const handleSendNotification = async (e) => {
    e.preventDefault();
    setErrorToast('');
    setSuccessToast('');

    if (!title.trim()) {
      return setErrorToast('Please enter a notification title.');
    }
    if (!body.trim()) {
      return setErrorToast('Please enter a notification message.');
    }
    if (targetType === 'student' && !selectedStudentUid) {
      return setErrorToast('Please select a student recipient.');
    }

    const finalUrl = actionUrl === 'custom' ? (customUrl || '/dashboard') : actionUrl;

    try {
      setSending(true);

      const targetLabel = targetType === 'all' 
        ? 'All Students' 
        : targetType === 'stream' 
          ? `Stream: ${selectedStream}` 
          : `Student: ${students.find(s => s.uid === selectedStudentUid)?.name || 'Direct'}`;

      const historyPayload = {
        title: title.trim(),
        body: body.trim(),
        url: finalUrl,
        targetType,
        targetStream: targetType === 'stream' ? selectedStream : null,
        targetStudentUid: targetType === 'student' ? selectedStudentUid : null,
        targetLabel,
        recipientCount: matchingSubs.length,
        priority,
        senderEmail: currentUser?.email || 'admin',
        senderName: userProfile?.name || 'Administrator',
        status: matchingSubs.length > 0 ? 'Queued for Dispatch' : 'No Subscribed Devices Found',
        createdAt: serverTimestamp()
      };

      // 1. Add to pushNotificationHistory collection
      const historyRef = await addDoc(collection(db, 'pushNotificationHistory'), historyPayload);

      // 2. Add to backend dispatch queue (pushNotificationQueue)
      // The backend worker/function will pick this up and call the Web Push API / FCM
      await addDoc(collection(db, 'pushNotificationQueue'), {
        historyId: historyRef.id,
        title: title.trim(),
        body: body.trim(),
        url: finalUrl,
        targetType,
        targetStream: targetType === 'stream' ? selectedStream : null,
        targetStudentUid: targetType === 'student' ? selectedStudentUid : null,
        subscriptions: matchingSubs.map(s => ({
          endpoint: s.subscription?.endpoint || s.endpoint,
          keys: s.subscription?.keys || {}
        })),
        priority,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setSuccessToast(`Notification successfully broadcasted to ${matchingSubs.length} registered device(s)!`);
      setTitle('');
      setBody('');
      setCustomUrl('');
      setTimeout(() => setSuccessToast(''), 6000);
    } catch (err) {
      console.error('Error sending push notification:', err);
      setErrorToast(err.message || 'Failed to dispatch notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-royal-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-royal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-royal-500/20 text-royal-400 text-xs font-bold border border-royal-500/30">
            <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" />
            <span>Web Push Notifications Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Broadcast & Target <span className="gold-gradient-text">Web Push Alerts</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Send instant desktop and mobile browser push notifications directly to enrolled students. Target the entire platform, specific academic streams, or individual students.
          </p>
        </div>
      </div>

      {/* Live Device / Subscription Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        
        <div className="p-4 sm:p-5 rounded-2xl glass-card border border-emerald-500/30 space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <span>Total Active Devices</span>
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white">{subscriptions.length}</div>
          <div className="text-[11px] text-slate-400">Enrolled for Push Alerts</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl glass-card border border-sky-500/30 space-y-1">
          <div className="flex items-center justify-between text-sky-400 text-xs font-bold">
            <span>CA Foundation</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white">{streamCounts['CA Foundation']}</div>
          <div className="text-[11px] text-slate-400">Subscribed Devices</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl glass-card border border-indigo-500/30 space-y-1">
          <div className="flex items-center justify-between text-indigo-400 text-xs font-bold">
            <span>CA Intermediate</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white">{streamCounts['CA Intermediate']}</div>
          <div className="text-[11px] text-slate-400">Subscribed Devices</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl glass-card border border-purple-500/30 space-y-1">
          <div className="flex items-center justify-between text-purple-400 text-xs font-bold">
            <span>CMA Foundation</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white">{streamCounts['CMA Foundation']}</div>
          <div className="text-[11px] text-slate-400">Subscribed Devices</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl glass-card border border-amber-500/30 space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
            <span>CMA Intermediate</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white">{streamCounts['CMA Intermediate']}</div>
          <div className="text-[11px] text-slate-400">Subscribed Devices</div>
        </div>

      </div>

      {/* Main Composition Panel */}
      <div className="glass-card rounded-3xl border border-white/10 p-6 sm:p-8 space-y-6">
        
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-royal-500/20 text-royal-400 border border-royal-500/30">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Compose Push Notification</h3>
              <p className="text-xs text-slate-400">Create and dispatch instant alert to target audience</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
            <span>Targeting:</span>
            <strong className="text-emerald-400">{matchingSubs.length} device(s)</strong>
          </div>
        </div>

        <form onSubmit={handleSendNotification} className="space-y-6">
          
          {/* Target Audience Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">1. Target Audience</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              <button
                type="button"
                onClick={() => setTargetType('all')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  targetType === 'all'
                    ? 'bg-royal-500/20 border-royal-400 text-white shadow-lg'
                    : 'bg-navy-900 border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">All Students</span>
                  {targetType === 'all' && <Check className="w-4 h-4 text-royal-400" />}
                </div>
                <div className="text-xs opacity-75 mt-1">Platform-wide broadcast</div>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('stream')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  targetType === 'stream'
                    ? 'bg-royal-500/20 border-royal-400 text-white shadow-lg'
                    : 'bg-navy-900 border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Specific Stream</span>
                  {targetType === 'stream' && <Check className="w-4 h-4 text-royal-400" />}
                </div>
                <div className="text-xs opacity-75 mt-1">Target CA or CMA course</div>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('student')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  targetType === 'student'
                    ? 'bg-royal-500/20 border-royal-400 text-white shadow-lg'
                    : 'bg-navy-900 border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Individual Student</span>
                  {targetType === 'student' && <Check className="w-4 h-4 text-royal-400" />}
                </div>
                <div className="text-xs opacity-75 mt-1">Direct alert to single student</div>
              </button>

            </div>
          </div>

          {/* Conditional Sub-selectors */}
          {targetType === 'stream' && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-slate-300">Select Academic Stream</label>
              <select
                value={selectedStream}
                onChange={(e) => setSelectedStream(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm font-semibold focus:outline-none focus:border-royal-400"
              >
                <option value="CA Foundation">CA Foundation ({streamCounts['CA Foundation']} devices)</option>
                <option value="CA Intermediate">CA Intermediate ({streamCounts['CA Intermediate']} devices)</option>
                <option value="CMA Foundation">CMA Foundation ({streamCounts['CMA Foundation']} devices)</option>
                <option value="CMA Intermediate">CMA Intermediate ({streamCounts['CMA Intermediate']} devices)</option>
              </select>
            </div>
          )}

          {targetType === 'student' && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-slate-300">Search & Select Student</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter student list by name or roll number..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white text-xs focus:outline-none focus:border-royal-400"
                />
              </div>

              <select
                value={selectedStudentUid}
                onChange={(e) => setSelectedStudentUid(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm font-semibold focus:outline-none focus:border-royal-400"
              >
                <option value="">-- Choose Student --</option>
                {students
                  .filter(s => {
                    const q = studentSearch.toLowerCase();
                    return (s.name || '').toLowerCase().includes(q) || (s.rollNumber || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
                  })
                  .map(s => {
                    const hasDevice = subscriptions.some(sub => sub.uid === s.uid);
                    return (
                      <option key={s.uid} value={s.uid}>
                        {s.name} ({s.rollNumber || 'No Roll'}) — {s.course || 'CA Foundation'} {hasDevice ? '📱 [Subscribed]' : '⚠️ [No push device]'}
                      </option>
                    );
                  })}
              </select>
            </div>
          )}

          {/* Title & Body */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                2. Notification Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 🔴 Live Mentor Session Starts in 15 Minutes!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
                className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm font-semibold focus:outline-none focus:border-royal-400 placeholder:text-slate-500"
              />
              <div className="text-[10px] text-slate-400 text-right">{title.length}/100 characters</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                3. Action Deep-Link URL
              </label>
              <select
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm font-semibold focus:outline-none focus:border-royal-400"
              >
                <option value="/dashboard?tab=announcements">📢 Announcements Tab</option>
                <option value="/dashboard?tab=overview">🏠 Dashboard Home</option>
                <option value="/dashboard?tab=timer">⏱️ Study Timer</option>
                <option value="/dashboard?tab=syllabus">📚 Syllabus & Progress</option>
                <option value="/dashboard?tab=revision">🔄 Revision Section</option>
                <option value="/dashboard?tab=leaderboard">🏆 Live Leaderboard</option>
                <option value="/dashboard?tab=mentors">🎓 Mentor Sessions</option>
                <option value="/dashboard?tab=doubts">💬 Doubts & Community</option>
                <option value="custom">🔗 Custom Deep Link URL</option>
              </select>
            </div>

          </div>

          {actionUrl === 'custom' && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-slate-300">Enter Custom Path / URL</label>
              <input
                type="text"
                placeholder="e.g. /dashboard?tab=quiz or https://..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-royal-400 font-mono"
              />
            </div>
          )}

          {/* Message Body */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              4. Notification Message (Body) <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Enter the notification message that will appear on students' mobile screens and desktop notifications..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={250}
              required
              className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm leading-relaxed focus:outline-none focus:border-royal-400 placeholder:text-slate-500 resize-none"
            />
            <div className="text-[10px] text-slate-400 text-right">{body.length}/250 characters</div>
          </div>

          {/* Notification Preview */}
          <div className="p-4 rounded-2xl bg-navy-900/60 border border-white/10 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Device Preview:</div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 max-w-md flex items-start gap-3 shadow-2xl">
              <img src="/logo.png" alt="Icon" className="w-10 h-10 rounded-xl object-contain bg-navy-950 p-1 border border-white/10 shrink-0" />
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-bold text-slate-300">CA/CMA Blueprint</span>
                  <span>just now</span>
                </div>
                <div className="text-xs font-bold text-white truncate">{title || 'Notification Title Preview'}</div>
                <div className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">{body || 'Notification message text will appear here on students\' lockscreens and notification bars.'}</div>
              </div>
            </div>
          </div>

          {/* Toasts */}
          {successToast && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {errorToast && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorToast}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={sending}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-royal-600 via-royal-500 to-indigo-600 hover:from-royal-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-royal-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {sending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Broadcasting to Devices...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Push Notification Now ({matchingSubs.length} Devices)</span>
              </>
            )}
          </button>

        </form>

      </div>

      {/* Broadcast History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Broadcast History</h3>
          <span className="text-xs text-slate-400">{notificationsHistory.length} sent notifications</span>
        </div>

        {notificationsHistory.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No push notifications sent yet"
            description="All notifications you broadcast through this panel will appear here with delivery stats."
          />
        ) : (
          <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-navy-900/80 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Title & Message</th>
                    <th className="px-6 py-4">Target Audience</th>
                    <th className="px-6 py-4 text-center">Recipients</th>
                    <th className="px-6 py-4">Deep Link</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {notificationsHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      
                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-bold text-white truncate">{item.title}</div>
                        <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{item.body}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-royal-500/10 text-royal-300 border border-royal-500/20">
                          {item.targetLabel || 'All'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center font-bold text-white font-mono">
                        {item.recipientCount || 0}
                      </td>

                      <td className="px-6 py-4 text-xs font-mono text-slate-400 truncate max-w-[140px]">
                        {item.url || '/dashboard'}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-300">
                        {formatDate(item.createdAt)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {item.status || 'Delivered'}
                        </span>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
