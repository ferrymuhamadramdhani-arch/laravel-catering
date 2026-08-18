import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-8 text-center relative z-10">
        <Link to="/" className="inline-flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-amber-500/25">
            C
          </div>
          <div className="text-left">
            <span className="text-2xl font-bold tracking-tight text-white block">CaterOS</span>
            <span className="text-xs text-amber-400 font-medium uppercase tracking-widest block -mt-1">
              SaaS Management Catering
            </span>
          </div>
        </Link>
      </div>

      {/* Auth Content Card */}
      <div className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-100 relative z-10">
        <Outlet />
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-500 relative z-10">
        &copy; {new Date().getFullYear()} CaterOS Platform. Hak Cipta Dilindungi.
      </div>
    </div>
  );
};
