import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      return setError('Please enter your email and password.');
    }

    const isAdminEmail = 
      cleanEmail.toLowerCase() === 'vaultstore27@gmail.com' ||
      cleanEmail.toLowerCase() === 'thunderworld766@gmail.com';

    try {
      setSubmitting(true);
      try {
        await login(cleanEmail, password, rememberMe);
      } catch (loginErr) {
        // If this is the authorized admin email and user doesn't exist yet, auto-register
        if (
          isAdminEmail && 
          loginErr.code === 'auth/user-not-found'
        ) {
          await register({
            name: 'Platform Administrator',
            email: cleanEmail,
            password: password,
            course: 'CA Foundation',
            attempt: 'January 2027'
          });
        } else {
          throw loginErr;
        }
      }

      // Direct redirect: Admin -> /admin, Student -> /dashboard
      if (isAdminEmail) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err.message?.startsWith('ACCOUNT_BANNED:')) {
        setError(`🚫 ACCOUNT SUSPENDED: ${err.message.replace('ACCOUNT_BANNED:', '').trim()}`);
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please check your credentials.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please reset your password or try again later.');
      } else {
        setError(err.message || 'Failed to log in. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-royal-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3 z-10">
        <Link to="/" className="inline-flex items-center justify-center group">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="CA & CMA Success Blueprint Logo" className="h-14 sm:h-16 w-auto object-contain rounded-2xl group-hover:scale-105 transition-transform duration-300 shadow-lg" />
        </Link>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Welcome Back</h2>
        <p className="text-sm text-slate-400">Log in to continue tracking your CA/CMA preparation.</p>
      </div>

      {/* Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 animate-in fade-in duration-300">
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
          
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Gmail / Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="student@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-navy-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-royal-500 focus:ring-1 focus:ring-royal-500 text-sm font-medium transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold text-royal-400 hover:text-royal-300 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-navy-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-royal-500 focus:ring-1 focus:ring-royal-500 text-sm font-medium transition-all"
                />
              </div>
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-navy-900 text-royal-600 focus:ring-royal-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-300">Remember Me</span>
              </label>
              <span className="text-[11px] text-slate-500">Persistent Session</span>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-royal-600 to-royal-500 hover:from-royal-500 hover:to-royal-600 text-white font-bold text-base shadow-glow-blue hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Login to Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="text-center pt-4 border-t border-white/10 text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-royal-400 hover:text-royal-300 hover:underline">
              Create Account
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
