import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, Star, X, CheckCircle2, Sparkles, Send } from 'lucide-react';

export default function FeedbackModal({ isOpen, onClose }) {
  const { currentUser, userProfile } = useAuth();
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(userProfile?.name || currentUser?.displayName || '');
      setRating(5);
      setHoverRating(0);
      setMessage('');
      setSubmitted(false);
      setSubmitting(false);
    }
  }, [isOpen, userProfile, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !message.trim() || !rating) return;

    try {
      setSubmitting(true);
      await addDoc(collection(db, 'feedbacks'), {
        name: name.trim(),
        text: message.trim(),
        message: message.trim(),
        rating: Number(rating) || 5,
        studentId: currentUser?.uid || null,
        course: userProfile?.course || '',
        attempt: userProfile?.attempt || '',
        createdAt: serverTimestamp()
      });

      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      alert('Failed to submit feedback. Please try again.');
      setSubmitting(false);
    }
  };

  const ratingLabels = ['', 'Needs Improvement', 'Fair', 'Good', 'Very Good', 'Excellent!'];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-royal-500/30 max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-royal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-royal-500/20 text-royal-400 flex items-center justify-center border border-royal-500/30 shadow-md">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Student Feedback</span>
                <Sparkles className="w-4 h-4 text-gold-400" />
              </h2>
              <p className="text-xs text-slate-400">Your review helps us make the blueprint even better</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors"
            aria-label="Close feedback modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-4 relative z-10 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-glow-emerald">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Thank You for Your Feedback!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Your review has been successfully submitted and will appear on the platform reviews section.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            
            {/* Student Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Your Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-royal-500 transition-colors"
              />
            </div>

            {/* Rating Stars */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Rate Your Experience
              </label>
              <div className="p-3.5 rounded-2xl bg-navy-900/80 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          (hoverRating || rating) >= star
                            ? 'fill-gold-400 text-gold-400'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-gold-300 tracking-wide">
                  {ratingLabels[hoverRating || rating]}
                </span>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Your Review / Feedback Message
              </label>
              <textarea
                rows="4"
                required
                placeholder="Share your thoughts about your study experience, mentors, timer, or overall blueprint..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-navy-900 border border-white/10 text-white text-sm focus:outline-none focus:border-royal-500 resize-none transition-colors"
              ></textarea>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-royal-600 to-royal-500 hover:from-royal-500 hover:to-royal-600 text-white text-sm font-bold shadow-glow-blue transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Submit Feedback'}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
