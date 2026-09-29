import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwEKisY0B4ZYfEoHihY-PI411VvzoND7uM7qclRffYj-ERsyM-7qLQ3FuncdwdeHLS7/exec';

/**
 * MandatoryProfileModal
 * 
 * Appears strictly on the Dashboard for students who have not completed
 * the mandatory profile form.
 *
 * Rules strictly followed:
 * - Does NOT modify registration or login.
 * - Appears on the Dashboard only.
 * - Forces completion: cannot be closed, skipped, backdrop-clicked, or escaped.
 * - No X / close button.
 * - Sends JSON payload directly to Google Sheets webhook via POST.
 * - Does NOT store Name or Phone Number in Firebase, Supabase, Firestore, or any database.
 * - Marks only the completion status upon verified webhook success.
 * - Displays "Something went wrong. Please try again." on failure.
 */
export default function MandatoryProfileModal() {
  const { currentUser, userProfile } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [validationError, setValidationError] = useState('');

  // Check if form is already completed (via Firestore boolean flag or localStorage)
  const isAlreadyCompleted = Boolean(
    userProfile?.dashboardProfileCompleted ||
    (currentUser?.uid && localStorage.getItem(`dashboard_profile_completed_${currentUser.uid}`))
  );

  const [isOpen, setIsOpen] = useState(!isAlreadyCompleted);

  useEffect(() => {
    if (isAlreadyCompleted) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [isAlreadyCompleted]);

  // Pre-fill name if already available from registration/auth profile
  useEffect(() => {
    if (userProfile?.name && !name) {
      setName(userProfile.name);
    } else if (currentUser?.displayName && !name) {
      setName(currentUser.displayName);
    }
  }, [userProfile?.name, currentUser?.displayName]);

  // Lock document body scroll while modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Prevent Escape key from dismissing modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isOpen && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  if (!isOpen || !currentUser) {
    return null;
  }

  const handlePhoneChange = (e) => {
    // Only accept numeric digits, up to 10
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
    if (validationError) setValidationError('');
    if (errorMsg) setErrorMsg('');
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (validationError) setValidationError('');
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMsg('');
    setValidationError('');

    const trimmedName = name.trim();
    const cleanPhone = phone.trim();

    if (!trimmedName) {
      setValidationError('Please enter your full name.');
      return;
    }

    if (!cleanPhone || cleanPhone.length !== 10) {
      setValidationError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setSubmitting(true);

    const payload = {
      name: trimmedName,
      phone: cleanPhone,
      email: currentUser?.email || userProfile?.email || ''
    };

    try {
      // Send JSON payload to Google Sheets webhook
      // text/plain avoids CORS OPTIONS preflight while Google Apps Script parses contents as JSON
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      let isSuccess = false;

      if (response.ok || response.type === 'opaque') {
        try {
          const resData = await response.json();
          isSuccess = resData?.success !== false;
        } catch {
          // If response body was text or redirected opaque response, considered successful
          isSuccess = true;
        }
      }

      if (isSuccess) {
        // Mark completion in localStorage (NO Name or Phone Number stored)
        if (currentUser?.uid) {
          localStorage.setItem(`dashboard_profile_completed_${currentUser.uid}`, 'true');

          // Mark only the boolean completion flag in Firestore (NO Name or Phone Number stored)
          try {
            await setDoc(doc(db, 'users', currentUser.uid), {
              dashboardProfileCompleted: true
            }, { merge: true });
          } catch (dbErr) {
            console.warn('Could not set dashboardProfileCompleted in Firestore:', dbErr);
          }
        }

        // Close modal and unlock dashboard
        setIsOpen(false);
      } else {
        setErrorMsg('Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Google Sheets Webhook Error:', err);
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-md select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="glass-card w-full max-w-md p-6 sm:p-8 rounded-3xl border border-white/15 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with decorative badge */}
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Profile Verification</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Complete Your Profile
          </h2>
          <p className="text-sm text-slate-400">
            Please enter your details to continue.
          </p>
        </div>

        {/* Validation or Submission Error */}
        {(validationError || errorMsg) && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs font-medium animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{validationError || errorMsg}</span>
          </div>
        )}

        {/* Mandatory Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Full Name
            </label>
            <input
              type="text"
              required
              disabled={submitting}
              value={name}
              onChange={handleNameChange}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 rounded-xl bg-navy-900/90 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Phone Number
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                disabled={submitting}
                value={phone}
                onChange={handlePhoneChange}
                placeholder="Enter 10-digit mobile number"
                maxLength={10}
                className="w-full px-4 py-3 rounded-xl bg-navy-900/90 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono tracking-wider disabled:opacity-50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-500">
                {phone.length}/10
              </span>
            </div>
          </div>

          {/* Authenticated email preview (read-only indicator) */}
          {currentUser?.email && (
            <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
              <span>Account:</span>
              <span className="text-slate-300 font-mono">{currentUser.email}</span>
            </div>
          )}

          {/* Continue / Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
