import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MonitorSmartphone, ShieldAlert, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import { formatDate } from '../../utils/helpers';

export default function AdminDevices() {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [students, setStudents] = useState({});

  useEffect(() => {
    // Fetch students to map info
    const unsubStudents = onSnapshot(collection(db, 'users'), (snapshot) => {
      const studs = {};
      snapshot.docs.forEach(d => { studs[d.id] = d.data(); });
      setStudents(studs);
    });

    const unsubDevices = onSnapshot(collection(db, 'devices'), (snapshot) => {
      setDevices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qAlerts = query(collection(db, 'deviceAlerts'), orderBy('createdAt', 'desc'));
    const unsubAlerts = onSnapshot(qAlerts, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubStudents(); unsubDevices(); unsubAlerts(); };
  }, []);

  const handleAllowDevice = async (alertId, studentId, deviceId, type) => {
    try {
      // 1. Update slot to allow
      await updateDoc(doc(db, 'userDeviceSlots', studentId), {
        [type]: deviceId
      });
      // 2. Set device to active
      await updateDoc(doc(db, 'devices', deviceId), { status: 'active' });
      // 3. Mark alert as resolved
      await updateDoc(doc(db, 'deviceAlerts', alertId), { status: 'resolved' });
    } catch (err) {
      console.error(err);
      alert('Error allowing device.');
    }
  };

  const handleBlockDevice = async (alertId, deviceId) => {
    try {
      if (deviceId) {
        await updateDoc(doc(db, 'devices', deviceId), { status: 'blocked' });
      }
      await updateDoc(doc(db, 'deviceAlerts', alertId), { status: 'blocked' });
    } catch (err) {
      console.error(err);
      alert('Error blocking device.');
    }
  };

  const handleRevokeDevice = async (studentId, type, deviceId) => {
    if (!confirm("Are you sure you want to revoke this device? The user will be logged out on it.")) return;
    try {
      await updateDoc(doc(db, 'userDeviceSlots', studentId), { [type]: null });
      if (deviceId) {
        await updateDoc(doc(db, 'devices', deviceId), { status: 'revoked' });
      }
    } catch (err) {
      console.error(err);
      alert('Error revoking device.');
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'unread');
  const pastAlerts = alerts.filter(a => a.status !== 'unread');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <MonitorSmartphone className="w-6 h-6 text-emerald-400" />
          Device Activity
        </h2>
        <p className="text-sm text-slate-400 mt-1">Manage student device limits (1 PC, 1 Mobile). Resolve pending access requests.</p>
      </div>

      {/* Alerts Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          🚨 Action Required: New Device Detected
        </h3>
        
        {activeAlerts.length === 0 ? (
          <div className="p-6 rounded-2xl border border-white/5 bg-navy-900/50 text-center text-sm text-slate-400">
            No pending device requests.
          </div>
        ) : (
          <div className="grid gap-4">
            {activeAlerts.map(alert => {
              const student = students[alert.studentId] || {};
              return (
                <div key={alert.id} className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shadow-lg">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase rounded">New Alert</span>
                      <span className="text-xs text-rose-300 font-semibold">{formatDate(alert.createdAt)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                      <div className="text-slate-400">Student:</div>
                      <div className="font-bold text-white">{student.name} ({student.rollNumber})</div>
                      
                      <div className="text-slate-400">Email:</div>
                      <div className="text-slate-200">{student.email}</div>
                      
                      <div className="text-slate-400">Course:</div>
                      <div className="text-slate-200">{student.course} {student.level} {student.attempt}</div>
                      
                      <div className="text-slate-400">Device Type:</div>
                      <div className="text-amber-400 font-bold uppercase">{alert.type}</div>
                      
                      <div className="text-slate-400">System:</div>
                      <div className="text-slate-200">{alert.browser} on {alert.os}</div>
                      
                      <div className="text-slate-400">Reason:</div>
                      <div className="text-rose-300 font-semibold">{alert.reason}</div>
                    </div>
                  </div>
                  <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
                    <button onClick={() => handleAllowDevice(alert.id, alert.studentId, alert.deviceId, alert.type)} className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-navy-950 text-sm font-black rounded-xl">
                      Allow Device
                    </button>
                    <button onClick={() => handleBlockDevice(alert.id, alert.deviceId)} className="flex-1 px-4 py-2 bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 text-sm font-black rounded-xl">
                      Block Device
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Device History */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <h3 className="text-lg font-bold text-white">Device History & Management</h3>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-3 font-bold">Student</th>
                <th className="p-3 font-bold">Type</th>
                <th className="p-3 font-bold">System</th>
                <th className="p-3 font-bold">First Login</th>
                <th className="p-3 font-bold">Status</th>
                <th className="p-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {devices.map(dev => {
                const student = students[dev.studentId] || {};
                const isActive = dev.status === 'active';
                return (
                  <tr key={dev.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-3">
                      <div className="text-sm font-bold text-white">{student.name || 'Unknown'}</div>
                      <div className="text-[10px] text-slate-500">{student.email}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-navy-900 border border-white/10 text-amber-400">
                        {dev.type}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="text-xs text-slate-300">{dev.browser}</div>
                      <div className="text-[10px] text-slate-500">{dev.os}</div>
                    </td>
                    <td className="p-3 text-xs text-slate-400">
                      {formatDate(dev.firstLoginAt)}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {dev.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {isActive && (
                        <button onClick={() => handleRevokeDevice(dev.studentId, dev.type, dev.id)} className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-colors border border-rose-500/20">
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
