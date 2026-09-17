import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Shield, Award, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy-950 border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <Link to="/" className="flex items-center space-x-3 group">
          <img src="/logo.png" alt="CA & CMA Success Blueprint Logo" className="h-9 w-auto object-contain rounded-xl hover:scale-105 transition-transform duration-300" />
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
          <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-gold-400" /> Real-time Analytics</span>
          <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-royal-400" /> CA Foundation & CMA</span>
          <span className="flex items-center gap-1.5"><Heart className="w-4 h-4 text-red-400" /> Built for Aspirants</span>
        </div>

        <div className="text-xs text-slate-500 text-center md:text-right">
          © {new Date().getFullYear()} CA/CMA Blueprint. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
