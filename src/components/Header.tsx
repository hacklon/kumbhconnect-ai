'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Shield, Languages, Eye, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function Header() {
  const { 
    language, 
    setLanguage, 
    highContrast, 
    setHighContrast, 
    isOnline, 
    offlineReportsCount, 
    role, 
    setRole,
    translate 
  } = useApp();

  return (
    <header className="border-b border-white/10 bg-[#0c0f17]/90 backdrop-blur-md sticky top-0 z-50 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 text-white p-2.5 rounded-xl flex items-center justify-center pulse-ring-animation">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {translate('title')}
              <span className="text-xs bg-orange-500/20 text-orange-400 font-medium px-2 py-0.5 rounded-full border border-orange-500/30">
                Mela 2027
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">{translate('tagline')}</p>
          </div>
        </div>

        {/* Toolbar Settings */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Offline Sync Counter */}
          {!isOnline ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode</span>
              {offlineReportsCount > 0 && (
                <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px] animate-pulse">
                  {offlineReportsCount} pending
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
              <Wifi className="w-3.5 h-3.5" />
              <span>Database Connected</span>
              {offlineReportsCount > 0 && (
                <span className="flex items-center gap-1 ml-1 text-orange-400 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Syncing {offlineReportsCount}...
                </span>
              )}
            </div>
          )}

          {/* Quick Role Switcher (For Evaluation & Demo ease) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden md:inline">Role:</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="public">Public Pilgrim</option>
              <option value="volunteer">Volunteer (Mela Desk)</option>
              <option value="police">Police Officer</option>
              <option value="admin">System Administrator</option>
            </select>
          </div>

          {/* High Contrast Mode Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
              highContrast 
                ? 'bg-yellow-400 text-black border-yellow-400' 
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="High Contrast Toggle"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden md:inline">
              {highContrast ? translate('normal_contrast') : translate('high_contrast')}
            </span>
          </button>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
            <Languages className="w-4 h-4 text-slate-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-white text-xs border-0 focus:ring-0 cursor-pointer focus:outline-none"
            >
              <option value="en" className="bg-slate-800 text-white">English</option>
              <option value="hi" className="bg-slate-800 text-white">हिन्दी</option>
              <option value="mr" className="bg-slate-800 text-white">मराठी</option>
            </select>
          </div>

        </div>

      </div>
    </header>
  );
}
