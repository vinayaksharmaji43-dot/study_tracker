import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function PrivacyShield() {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [settings, setSettings] = useState(null);
  const [blurScreen, setBlurScreen] = useState(false);

  useEffect(() => {
    if (isAdmin) return; // Admins bypass restrictions
    
    const docRef = doc(db, 'settings', 'privacySecurity');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setSettings(snap.data());
      }
    });
    return () => unsub();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin || !settings || !settings.masterEnabled) {
      document.body.classList.remove('privacy-no-select');
      return;
    }

    const isTempDisabled = settings.temporaryDisabledUntil && settings.temporaryDisabledUntil > Date.now();
    if (isTempDisabled) {
      document.body.classList.remove('privacy-no-select');
      return;
    }

    // Apply Protections
    
    // Copy
    if (settings.copyProtection) {
      document.body.classList.add('privacy-no-select');
    } else {
      document.body.classList.remove('privacy-no-select');
    }

    const handleCopyCut = (e) => {
      if (settings.copyProtection) {
        e.preventDefault();
      }
    };

    // Right Click
    const handleContextMenu = (e) => {
      if (settings.rightClickProtection) {
        e.preventDefault();
      }
    };

    // Shortcuts and Best Effort Screenshot/Recording
    const handleKeyDown = (e) => {
      if (settings.saveShortcutProtection) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
          e.preventDefault();
        }
      }
      if (settings.printProtection) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
          e.preventDefault();
        }
      }
      // Best-effort screenshot shortcuts (PrntScn, Win+Shift+S)
      if (settings.screenshotProtection || settings.screenRecordingProtection || settings.screenSharingProtection) {
        if (e.key === 'PrintScreen' || ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S' || e.key === '3' || e.key === '4' || e.key === '5'))) {
           // Temporarily blur screen when capture shortcut is pressed
           setBlurScreen(true);
           setTimeout(() => setBlurScreen(false), 3000);
        }
      }
    };
    
    // Visibility change logic for sharing/screenshots (when tab loses focus it blurs)
    const handleVisibilityChange = () => {
      if (settings.screenshotProtection || settings.screenRecordingProtection || settings.screenSharingProtection) {
         if (document.visibilityState === 'hidden') {
           setBlurScreen(true);
         } else {
           setBlurScreen(false);
         }
      }
    };

    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.body.classList.remove('privacy-no-select');
    };
  }, [settings, isAdmin]);

  if (isAdmin || !settings || !settings.masterEnabled) return null;
  const isTempDisabled = settings.temporaryDisabledUntil && settings.temporaryDisabledUntil > Date.now();
  if (isTempDisabled) return null;

  return (
    <>
      {settings.printProtection && (
        <style>
          {`
            @media print {
              body { display: none !important; }
            }
          `}
        </style>
      )}
      
      {settings.copyProtection && (
        <style>
          {`
            .privacy-no-select {
              -webkit-touch-callout: none;
              -webkit-user-select: none;
              -khtml-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
              user-select: none;
            }
            .privacy-no-select input, .privacy-no-select textarea {
              -webkit-user-select: text;
              user-select: text;
            }
          `}
        </style>
      )}

      {/* Blur Overlay if Screenshot/Recording is suspected */}
      {blurScreen && (
         <div className="fixed inset-0 z-[99999] bg-navy-950/95 backdrop-blur-3xl flex items-center justify-center flex-col gap-4 text-center p-6">
            <div className="p-4 rounded-full bg-rose-500/20 text-rose-400">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h2 className="text-xl font-bold text-white">Protected Content</h2>
            <p className="text-sm text-slate-300">Screen capture or sharing detected. Content temporarily hidden.</p>
         </div>
      )}

      {settings.watermarkEnabled && currentUser && (
        <div 
          className="fixed inset-0 pointer-events-none z-[9998] opacity-[0.04] flex items-center justify-center overflow-hidden"
          style={{ userSelect: 'none' }}
        >
          <div className="absolute inset-0 flex flex-wrap gap-8 items-center justify-center -rotate-12 scale-150 transform-gpu mix-blend-overlay">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="text-xl font-bold whitespace-nowrap text-white text-center">
                {userProfile?.rollNumber || userProfile?.phone || currentUser.email}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
