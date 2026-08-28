import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Search, Bell, ChevronDown } from 'lucide-react';
import type { PageId } from '@/types';

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  'new-survey': 'New Survey Project',
  'ai-processing': 'AI Processing',
  'cadastral-map': 'Cadastral Map / WebGIS',
  conflicts: 'Conflict Analysis',
  'field-verification': 'Field Verification',
  topology: 'Topology Validation',
  reports: 'Reports',
  settings: 'Settings',
};

export default function TopBar() {
  const { currentUser, activeProject, notifications, unreadCount, searchQuery, setSearchQuery, searchResults, setCurrentPage, setSelectedParcelId, markNotificationRead, currentPage, logout } = useApp();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchResult = (id: string) => {
    setSelectedParcelId(id);
    setCurrentPage('cadastral-map');
    setShowSearch(false);
    setSearchQuery('');
  };

  const statusColors: Record<string, string> = {
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
    success: 'bg-green-500',
    error: 'bg-red-500',
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5 sticky top-0 z-30">
      {/* Left: page title + project status */}
      <div className="flex items-center gap-4">
        <h1 className="font-bold text-slate-800 text-sm">{PAGE_TITLES[currentPage] || 'CadastraAI'}</h1>
        {activeProject && (
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="text-slate-400">|</span>
            <span className="text-slate-600 font-medium truncate max-w-[260px]">{activeProject.name}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              {activeProject.status.replace(/_/g, ' ')}
            </span>
          </div>
        )}
      </div>

      {/* Right: search, notifications, profile */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              placeholder="Search parcel, survey no, ward..."
              className="w-56 pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-lg shadow-xl border border-slate-200 max-h-80 overflow-y-auto z-50">
              <div className="px-3 py-2 text-xs font-bold text-slate-500 border-b border-slate-100">{searchResults.length} results</div>
              {searchResults.slice(0, 8).map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSearchResult(p.id)}
                  className="w-full px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0 text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{p.id}</div>
                    <div className="text-xs text-slate-500">{p.surveyNumber} · {p.ward}</div>
                  </div>
                  <span className="text-xs text-slate-400">{p.status.replace(/_/g, ' ')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
              <div className="px-4 py-3 border-b border-slate-100 font-bold text-sm text-slate-800">Notifications</div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`px-4 py-3 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 ${!n.read ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusColors[n.type]}`} />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-800">{n.title}</div>
                        <div className="text-xs text-slate-600 mt-0.5">{n.message}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{n.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {currentUser?.avatar || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-semibold text-slate-800 leading-tight">{currentUser?.name || 'Surveyor'}</div>
              <div className="text-[10px] text-slate-500 leading-tight">{currentUser?.role || ''}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
          {showProfile && (
            <div className="absolute top-full mt-2 right-0 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="text-sm font-bold text-slate-800">{currentUser?.name}</div>
                <div className="text-xs text-slate-500">{currentUser?.email}</div>
                <div className="text-xs text-blue-600 font-semibold mt-1">{currentUser?.role}</div>
              </div>
              <button onClick={() => { setShowProfile(false); setCurrentPage('settings'); }} className="w-full px-4 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50">Settings</button>
              <button onClick={() => logout()} className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">Sign Out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
