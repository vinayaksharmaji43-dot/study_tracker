import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, runTransaction, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { ShieldAlert, MonitorSmartphone, LogOut } from 'lucide-react';

function generateDeviceId() {
  return 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let type = 'desktop';
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    type = 'mobile';
  }
  
  let browser = 'Unknown';
  if (ua.indexOf("Firefox") > -1) browser = "Firefox";
  else if (ua.indexOf("SamsungBrowser") > -1) browser = "Samsung Internet";
  else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) browser = "Opera";
  else if (ua.indexOf("Trident") > -1) browser = "Internet Explorer";
  else if (ua.indexOf("Edge") > -1) browser = "Edge";
  else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
  else if (ua.indexOf("Safari") > -1) browser = "Safari";

  let os = 'Unknown';
  if (ua.indexOf("Win") > -1) os = "Windows";
  else if (ua.indexOf("Mac") > -1) os = "MacOS";
  else if (ua.indexOf("Linux") > -1) os = "Linux";
  else if (ua.indexOf("Android") > -1) os = "Android";
  else if (ua.indexOf("like Mac") > -1) os = "iOS";

  return { type, browser, os };
}

export default function DeviceGate({ children }) {
  const { currentUser, logout, userProfile } = useAuth();
  const [deviceStatus, setDeviceStatus] = useState('checking'); // 'checking', 'allowed', 'blocked'

  useEffect(() => {
    if (!currentUser?.uid || userProfile?.role === 'admin') {
      // Admins bypass device limits
      setDeviceStatus('allowed');
      return;
    }

    const verifyDevice = async () => {
      try {
        let storedDeviceId = localStorage.getItem('study_tracker_device_id');
        if (!storedDeviceId) {
          storedDeviceId = generateDeviceId();
          localStorage.setItem('study_tracker_device_id', storedDeviceId);
        }

        const deviceInfo = getDeviceInfo();
        const slotRef = doc(db, 'userDeviceSlots', currentUser.uid);
        const deviceRecordRef = doc(db, 'devices', storedDeviceId);

        // 1. Check local device record first
        const deviceDoc = await getDoc(deviceRecordRef);
        let currentStatus = null;
        let isNewDevice = true;

        if (deviceDoc.exists()) {
          const data = deviceDoc.data();
          if (data.studentId === currentUser.uid) {
            isNewDevice = false;
            currentStatus = data.status; // 'active', 'blocked', 'revoked'
          }
        }

        if (!isNewDevice && currentStatus === 'active') {
          // Fast path for returning active devices
          await updateDoc(deviceRecordRef, { lastLoginAt: serverTimestamp(), lastSeenAt: serverTimestamp() });
          setDeviceStatus('allowed');
          return;
        }

        if (!isNewDevice && (currentStatus === 'blocked' || currentStatus === 'revoked')) {
          setDeviceStatus('blocked');
          return;
        }

        // 2. New Device or first time checking slots: Run Transaction
        const { allowed, reason } = await runTransaction(db, async (transaction) => {
          const slotDoc = await transaction.get(slotRef);
          let desktopSlot = null;
          let mobileSlot = null;

          if (slotDoc.exists()) {
            desktopSlot = slotDoc.data().desktop;
            mobileSlot = slotDoc.data().mobile;
          }

          let isAllowed = false;
          let blockReason = '';

          if (deviceInfo.type === 'desktop') {
            if (!desktopSlot || desktopSlot === storedDeviceId) {
              transaction.set(slotRef, { desktop: storedDeviceId }, { merge: true });
              isAllowed = true;
            } else {
              blockReason = 'Desktop slot already occupied by another device.';
            }
          } else {
            if (!mobileSlot || mobileSlot === storedDeviceId) {
              transaction.set(slotRef, { mobile: storedDeviceId }, { merge: true });
              isAllowed = true;
            } else {
              blockReason = 'Mobile slot already occupied by another device.';
            }
          }

          return { allowed: isAllowed, reason: blockReason };
        });

        // 3. Save Device Record
        const newStatus = allowed ? 'active' : 'blocked';
        await setDoc(deviceRecordRef, {
          studentId: currentUser.uid,
          deviceId: storedDeviceId,
          type: deviceInfo.type,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          firstLoginAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          lastSeenAt: serverTimestamp(),
          status: newStatus
        }, { merge: true });

        // 4. Create Alert for Admin if Blocked
        if (!allowed) {
          await addDoc(collection(db, 'deviceAlerts'), {
            studentId: currentUser.uid,
            deviceId: storedDeviceId,
            type: deviceInfo.type,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            reason,
            createdAt: serverTimestamp(),
            status: 'unread'
          });
          setDeviceStatus('blocked');
        } else {
          setDeviceStatus('allowed');
        }

      } catch (err) {
        console.error("Device Gate Error:", err);
        // Fallback to allow if Firebase fails (prevent soft-lock)
        setDeviceStatus('allowed');
      }
    };

    verifyDevice();
  }, [currentUser, userProfile]);

  if (deviceStatus === 'checking') {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" color="emerald" />
        <p className="text-emerald-400 text-sm font-bold animate-pulse">Verifying Device Security...</p>
      </div>
    );
  }

  if (deviceStatus === 'blocked') {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-navy-900 border border-rose-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-2 shadow-[0_0_30px_rgba(244,63,94,0.15)]">
            <MonitorSmartphone className="w-10 h-10 text-rose-500" />
          </div>
          
          <h1 className="text-2xl font-black text-white">Device Not Allowed</h1>
          
          <p className="text-slate-300 text-sm leading-relaxed">
            You have already reached the maximum device limit for this account type (1 PC and 1 Mobile). 
            This device has been blocked to protect your account security.
          </p>

          <div className="p-4 rounded-xl bg-navy-950 border border-rose-500/20 text-rose-400 text-xs font-semibold text-left flex gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>An alert has been sent to the Administrator. If you recently changed devices, please contact support to revoke your old device.</span>
          </div>

          <button 
            onClick={logout}
            className="w-full py-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    );
  }

  return children;
}
