'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { 
  Users, UserCheck, AlertTriangle, Clock, MapPin, 
  Search, Eye, Phone, PlusCircle, Mic, Upload, CheckCircle, 
  Trash2, Shield, Settings, Info, Download, Volume2, RefreshCw 
} from 'lucide-react';

// Dynamically import map component with no SSR to prevent window definition crashes
const MelaMap = dynamic(() => import('@/components/MelaMap'), { ssr: false });

export default function Home() {
  const { role, translate, isOnline } = useApp();
  
  // State for analytics
  const [analytics, setAnalytics] = useState<any>({
    active_missing: 48,
    found_persons: 212,
    high_priority: 15,
    elderly_cases: 28,
    children_cases: 9,
    average_resolution_hours: 4.8,
    zone_statistics: [],
    heat_map: []
  });

  // State for search and filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterAge, setFilterAge] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // State for cases list
  const [cases, setCases] = useState<any[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);

  // Sighting details for interactive map highlight
  const [activeLat, setActiveLat] = useState<number | undefined>(undefined);
  const [activeLng, setActiveLng] = useState<number | undefined>(undefined);
  const [activeZone, setActiveZone] = useState<string | undefined>(undefined);

  // Form states
  const [reportingMode, setReportingMode] = useState<'missing' | 'found' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    gender: 'Male',
    age_band: '41-60',
    state: 'Maharashtra',
    district: 'Nashik',
    language: 'Marathi',
    last_seen_location: '',
    last_seen_zone: 'Zone Area 30 (Ramkund Ghat)',
    reporter_mobile: '',
    emergency_contact: '',
    physical_description: '',
    clothing_description: '',
    landmark: '',
    health_conditions: '',
    special_needs: '',
    notes: '',
    finder_name: '',
    finder_contact: ''
  });

  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Track cases details popup
  const [trackedCase, setTrackedCase] = useState<any | null>(null);
  const [trackingId, setTrackingId] = useState('');
  const [trackingError, setTrackingError] = useState('');

  // Audit Logs (mock)
  const [auditLogs, setAuditLogs] = useState<any[]>([
    { id: '1', action: 'LOGIN_SUCCESS', target_table: 'users', target_id: 'admin-uuid', details: 'Admin logged into Nashik central node', timestamp: new Date().toISOString() },
    { id: '2', action: 'ZONE_GPS_UPDATE', target_table: 'volunteers', target_id: 'vol-32', details: 'Volunteer location synchronized near Ramkund', timestamp: new Date().toISOString() }
  ]);

  // Load analytical summaries and cases on mount
  useEffect(() => {
    fetchAnalytics();
    fetchCases();
  }, [filterGender, filterAge, filterZone, filterStatus, searchQuery]);

  // Auto-scroll to form when opened
  useEffect(() => {
    if (reportingMode) {
      setTimeout(() => {
        const formElement = document.getElementById('report-form-container');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [reportingMode]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const fetchCases = async () => {
    setLoadingCases(true);
    try {
      const url = new URL('/api/missing-persons', window.location.origin);
      if (searchQuery) url.searchParams.append('query', searchQuery);
      if (filterGender) url.searchParams.append('gender', filterGender);
      if (filterAge) url.searchParams.append('ageBand', filterAge);
      if (filterZone) url.searchParams.append('zone', filterZone);
      if (filterStatus) url.searchParams.append('status', filterStatus);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setCases(data.data);
      }
    } catch (err) {
      console.error('Error fetching cases:', err);
    } finally {
      setLoadingCases(false);
    }
  };

  // Handle Form Submission (Offline-Ready Queueing)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isMissing = reportingMode === 'missing';
    const payload = isMissing 
      ? {
          name: formData.name,
          gender: formData.gender,
          age_band: formData.age_band,
          state: formData.state,
          district: formData.district,
          language: formData.language,
          last_seen_location: formData.last_seen_location,
          last_seen_zone: formData.last_seen_zone,
          reporter_mobile: formData.reporter_mobile,
          emergency_contact: formData.emergency_contact,
          physical_description: formData.physical_description,
          clothing_description: formData.clothing_description,
          landmark: formData.landmark,
          health_conditions: formData.health_conditions,
          special_needs: formData.special_needs
        }
      : {
          name: formData.name,
          gender: formData.gender,
          age_band: formData.age_band,
          found_location: formData.last_seen_location,
          found_zone: formData.last_seen_zone,
          finder_name: formData.finder_name,
          finder_contact: formData.finder_contact,
          notes: formData.notes
        };

    const endpoint = isMissing ? '/api/missing-persons' : '/api/found-persons';

    // Check if offline
    if (!navigator.onLine) {
      // Save report in IndexedDB offline queue
      if ('indexedDB' in window) {
        const req = indexedDB.open('KumbhConnectOffline', 1);
        req.onsuccess = (event: any) => {
          const db = event.target.result;
          const tx = db.transaction('reports', 'readwrite');
          const store = tx.objectStore('reports');
          store.add({
            id: `offline-${Date.now()}`,
            endpoint,
            payload,
            timestamp: new Date().toISOString()
          });
          setSuccessMessage(isMissing 
            ? 'Running Offline. Missing Pilgrim report queued locally. It will auto-sync once network returns!'
            : 'Running Offline. Found Pilgrim sighting queued locally. It will auto-sync once network returns!'
          );
          setReportingMode(null);
          resetForm();
        };
      }
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(isMissing
          ? `Report submitted successfully! Case ID: ${data.data.case_id}`
          : 'Sighting reported! Matching checks generated in background.'
        );
        fetchCases();
        fetchAnalytics();
        setReportingMode(null);
        resetForm();
      }
    } catch (err) {
      console.error('Error submitting form:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      gender: 'Male',
      age_band: '41-60',
      state: 'Maharashtra',
      district: 'Nashik',
      language: 'Marathi',
      last_seen_location: '',
      last_seen_zone: 'Zone Area 30 (Ramkund Ghat)',
      reporter_mobile: '',
      emergency_contact: '',
      physical_description: '',
      clothing_description: '',
      landmark: '',
      health_conditions: '',
      special_needs: '',
      notes: '',
      finder_name: '',
      finder_contact: ''
    });
    setPhotoPreview(null);
  };

  // Simulate Claude AI Voice Description Processing
  const handleVoiceRecord = () => {
    setVoiceRecording(true);
    setTimeout(() => {
      setVoiceRecording(false);
      setVoiceProcessing(true);
      // Simulate Claude extracting structured information from voice
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          gender: 'Female',
          age_band: '61-70',
          physical_description: 'Elderly lady speaking Gujarati, wearing a green cotton saree with gold borders, carrying a red cloth bag.',
          clothing_description: 'Green cotton saree with gold borders',
          language: 'Gujarati'
        }));
        setVoiceProcessing(false);
      }, 2000);
    }, 3000);
  };

  // Audio mock speaker for case summary (Elderly friendly)
  const speakSummary = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  // Quick Sighting Map highlight
  const showOnMap = (lat?: number, lng?: number, zoneName?: string) => {
    setActiveLat(lat || 19.9950);
    setActiveLng(lng || 73.7799);
    setActiveZone(zoneName);
    
    // Smooth scroll to map
    const mapEl = document.getElementById('map-view');
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Track case status directly by ID
  const handleTrackCase = () => {
    setTrackingError('');
    setTrackedCase(null);
    if (!trackingId) {
      setTrackingError('Please enter a valid Case ID.');
      return;
    }
    const foundCase = cases.find(c => c.case_id.toUpperCase() === trackingId.trim().toUpperCase());
    if (foundCase) {
      setTrackedCase(foundCase);
    } else {
      setTrackingError('Case ID not found in current database.');
    }
  };

  // Export mock report
  const triggerExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Case ID,Name,Gender,Age,Zone,Status"].join(",") + "\n"
      + cases.map(c => `${c.case_id},${c.name || 'Unnamed'},${c.gender},${c.age_band},${c.last_seen_zone},${c.status}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `KumbhConnect_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#090b0f]">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* Status Alerts / Toast Message */}
        {successMessage && (
          <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 p-4 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium">{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-slate-400 hover:text-white text-xs font-bold px-2">Dismiss</button>
          </div>
        )}

        {/* Global Mela Statistics Overview */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 flex items-center gap-3">
            <div className="p-3 bg-orange-500/20 text-orange-400 rounded-xl">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Missing</p>
              <h3 className="text-2xl font-bold text-white mt-0.5">{analytics.active_missing}</h3>
            </div>
          </div>

          <div className="glass-panel p-4 flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Located / Found</p>
              <h3 className="text-2xl font-bold text-white mt-0.5">{analytics.found_persons}</h3>
            </div>
          </div>

          <div className="glass-panel p-4 flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">High Priority</p>
              <h3 className="text-2xl font-bold text-white mt-0.5">{analytics.high_priority}</h3>
            </div>
          </div>

          <div className="glass-panel p-4 flex items-center gap-3">
            <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Avg. Reunion Time</p>
              <h3 className="text-2xl font-bold text-white mt-0.5">{analytics.average_resolution_hours} hrs</h3>
            </div>
          </div>
        </section>

        {/* -------------------- ROLE VIEWS -------------------- */}

        {/* ROLE 1: PUBLIC PILGRIM */}
        {role === 'public' && !reportingMode && (
          <section className="space-y-6">
            
            {/* Quick Action Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Report Siding / Missing Panel */}
              <div className="glass-panel p-6 space-y-4 flex flex-col justify-between border-l-4 border-orange-500">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Report a Missing Family Member</h3>
                  <p className="text-sm text-slate-400">
                    File a report immediately. Information will be shared across all 32 zones, police booths, and volunteers. Operates offline without internet.
                  </p>
                </div>
                <button
                  onClick={() => { console.log("Report Missing button clicked"); setReportingMode('missing'); }}
                  className="w-full sm:w-auto mt-4 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 btn-glow"
                >
                  <PlusCircle className="w-5 h-5" />
                  {translate('report_missing')}
                </button>
              </div>

              {/* Sighting Finder registration */}
              <div className="glass-panel p-6 space-y-4 flex flex-col justify-between border-l-4 border-emerald-500">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Found a Lost Person?</h3>
                  <p className="text-sm text-slate-400">
                    If you have located someone who seems lost or confused, submit their details. Our AI matcher will scan active cases to notify their family.
                  </p>
                </div>
                <button
                  onClick={() => { console.log("Report Found button clicked"); setReportingMode('found'); }}
                  className="w-full sm:w-auto mt-4 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 btn-glow"
                >
                  <UserCheck className="w-5 h-5" />
                  {translate('report_found')}
                </button>
              </div>

            </div>

            {/* Case Tracking Form */}
            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">{translate('track_case')}</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Enter Case ID (e.g. KMP-2027-00001)"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button 
                  onClick={handleTrackCase}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  Track Status
                </button>
              </div>
              
              {trackingError && <p className="text-xs text-red-400 font-medium">{trackingError}</p>}

              {/* Tracking Status Card */}
              {trackedCase && (
                <div className="mt-4 p-4 rounded-xl border border-white/10 bg-slate-900/60 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-orange-400 font-semibold">{trackedCase.case_id}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                      trackedCase.status === 'Reunited' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      trackedCase.status === 'Pending' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}>
                      {trackedCase.status}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white">{trackedCase.name || 'Unnamed Pilgrim'}</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                    <p><strong>Last Seen:</strong> {trackedCase.last_seen_location} ({trackedCase.last_seen_zone})</p>
                    <p><strong>Reported At:</strong> {new Date(trackedCase.reported_at).toLocaleString()}</p>
                    <p><strong>State:</strong> {trackedCase.state}</p>
                    <p><strong>Remarks:</strong> {trackedCase.remarks || 'No updates yet'}</p>
                  </div>
                </div>
              )}
            </div>

          </section>
        )}

        {/* ROLE 2: VOLUNTEER DASHBOARD */}
        {role === 'volunteer' && !reportingMode && (
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">{translate('volunteer_title')}</h3>
              <button
                onClick={() => setReportingMode('found')}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg flex items-center gap-1.5 text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Register Sighting
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Assigned Zone detail */}
              <div className="glass-panel p-5 space-y-4">
                <div className="flex items-center gap-2 text-orange-400 font-bold">
                  <MapPin className="w-5 h-5" />
                  <h4>Your Patrol Zone</h4>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-lg space-y-1">
                  <p className="text-lg font-bold text-white">Zone Area 30</p>
                  <p className="text-xs text-slate-400">Centroid: 19.9950, 73.7799</p>
                  <p className="text-xs text-orange-400 font-medium">Covering: Ramkund Ghat & Godavari approaches</p>
                </div>
                <button
                  onClick={() => showOnMap(19.9950, 73.7799, "Zone Area 30")}
                  className="w-full py-2 border border-slate-700 hover:bg-slate-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  View Zone Map
                </button>
              </div>

              {/* Sighting list */}
              <div className="lg:col-span-2 glass-panel p-5 space-y-4">
                <h4 className="font-bold text-white">Active Cases in Your Area</h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {cases.filter(c => c.last_seen_zone === "Zone Area 30 (Ramkund Ghat)").map((c) => (
                    <div key={c.id} className="p-3 bg-slate-900/50 rounded-lg flex items-center justify-between border border-white/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-orange-400">{c.case_id}</span>
                          <span className="text-xs text-slate-400">{c.age_band} | {c.gender}</span>
                        </div>
                        <p className="text-sm font-semibold text-white mt-1">{c.name || 'Unnamed Pilgrim'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Last seen: {c.last_seen_location}</p>
                      </div>
                      <button
                        onClick={() => showOnMap(19.9950, 73.7799, "Zone Area 30")}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                      >
                        Locate
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>
        )}

        {/* ROLE 3: POLICE DASHBOARD */}
        {role === 'police' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-xl font-bold text-white">{translate('police_title')}</h3>
              
              {/* Export control */}
              <button
                onClick={triggerExport}
                className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold rounded-lg flex items-center justify-center gap-1.5 text-xs self-start sm:self-auto"
              >
                <Download className="w-4 h-4" />
                Export CSV Report
              </button>
            </div>

            {/* Filter controls */}
            <div className="glass-panel p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="col-span-2 md:col-span-1">
                <input
                  type="text"
                  placeholder="Search Cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-2"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>

              <select
                value={filterAge}
                onChange={(e) => setFilterAge(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-2"
              >
                <option value="">All Age Bands</option>
                <option value="0-12">0-12 (Child)</option>
                <option value="13-17">13-17</option>
                <option value="18-40">18-40</option>
                <option value="41-60">41-60</option>
                <option value="61-70">61-70 (Elderly)</option>
                <option value="71-80">71-80 (Elderly)</option>
                <option value="80+">80+ (Elderly)</option>
              </select>

              <select
                value={filterZone}
                onChange={(e) => setFilterZone(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-2"
              >
                <option value="">All Zones</option>
                <option value="Zone Area 30 (Ramkund Ghat)">Zone 30 (Ramkund)</option>
                <option value="Zone Area 31 (Panchavati Circle)">Zone 31 (Panchavati)</option>
                <option value="Zone Area 8 (Sadhugram Gate)">Zone 8 (Sadhugram)</option>
                <option value="Zone Area 21 (Takli Sangam)">Zone 21 (Takli)</option>
                <option value="Zone Area 1 (Trimbakeshwar)">Zone 1 (Trimbakeshwar)</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-2"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Reunited">Reunited</option>
              </select>
            </div>

            {/* Cases List */}
            <div className="glass-panel p-5 space-y-4">
              <h4 className="font-bold text-white">Central Missing Person Cases</h4>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {loadingCases ? (
                  <p className="text-xs text-slate-400 text-center py-4">Loading active cases...</p>
                ) : cases.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No matching cases found.</p>
                ) : (
                  cases.map((c) => (
                    <div key={c.id} className="p-3.5 bg-slate-900/50 rounded-xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-orange-400">{c.case_id}</span>
                          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-white/5">{c.status}</span>
                          {c.age_band.includes('61') || c.age_band.includes('71') || c.age_band.includes('80') ? (
                            <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Elderly</span>
                          ) : null}
                        </div>
                        <h5 className="text-sm font-bold text-white">{c.name || 'Unnamed Pilgrim'}</h5>
                        <p className="text-xs text-slate-400">
                          <strong>Seen:</strong> {c.last_seen_location} ({c.last_seen_zone}) | <strong>Language:</strong> {c.language}
                        </p>
                        <p className="text-xs text-slate-300 italic">
                          "{c.physical_description}"
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 self-end md:self-auto">
                        {/* Voice Reader */}
                        <button
                          onClick={() => speakSummary(`Case ID ${c.case_id}. Missing pilgrim ${c.name || 'Unnamed'}. age band ${c.age_band}. last seen at ${c.last_seen_location}`)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                          title="Speak Summary"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => showOnMap(19.9950, 73.7799, c.last_seen_zone)}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
                        >
                          Locate
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* ROLE 4: ADMIN / COMMAND CENTER */}
        {role === 'admin' && (
          <section className="space-y-6">
            <h3 className="text-xl font-bold text-white">{translate('admin_title')}</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Audit Logs panel */}
              <div className="lg:col-span-2 glass-panel p-5 space-y-4">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Shield className="w-5 h-5 text-orange-400" />
                  <h4>Audit Compliance Trail (Log)</h4>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-900/60 rounded-lg border border-white/5 text-xs space-y-1">
                      <div className="flex justify-between items-center text-slate-400 font-medium">
                        <span>{log.action}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-200">{log.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Command center quick controls */}
              <div className="glass-panel p-5 space-y-4">
                <h4 className="font-bold text-white">System Settings</h4>
                <div className="space-y-2">
                  <button className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs text-left px-3 flex items-center justify-between">
                    <span>Manage Active Volunteers</span>
                    <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded text-[10px]">142 active</span>
                  </button>
                  <button className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs text-left px-3 flex items-center justify-between">
                    <span>Manage Zone Command Nodes</span>
                    <span className="bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded text-[10px]">32 configured</span>
                  </button>
                  <button className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs text-left px-3 flex items-center justify-between">
                    <span>Export Analytics Database</span>
                    <Download className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

            </div>
          </section>
        )}

        {/* -------------------- FORM MODALS -------------------- */}

        {reportingMode && (
          <section id="report-form-container" className="glass-panel p-6 space-y-6 relative border-t-4 border-orange-500">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white">
                {reportingMode === 'missing' ? translate('missing_form_title') : translate('found_form_title')}
              </h3>
              <button 
                onClick={() => setReportingMode(null)} 
                className="text-slate-400 hover:text-white font-bold text-sm px-3 py-1 bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Voice Processing Helper (Accessibility / Elderly) */}
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-orange-400" />
                    <span className="text-sm font-bold text-white">Voice & Description Assistant</span>
                  </div>
                  <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30 font-semibold uppercase tracking-wider">Claude AI enabled</span>
                </div>
                <p className="text-xs text-slate-400">
                  Speak in Hindi, Marathi, or English. Claude will automatically extract matching fields (Gender, Age, Saree/Kurta details) and populate the form!
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleVoiceRecord}
                    className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                      voiceRecording 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                    }`}
                    disabled={voiceProcessing}
                  >
                    <Mic className="w-4 h-4" />
                    {voiceRecording ? 'Recording (3s)...' : 'Start Speaking'}
                  </button>
                  {voiceProcessing && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin text-orange-400" />
                      Claude is translating and structuring speech data...
                    </span>
                  )}
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">{translate('form_name')}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="Enter name (if known)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">{translate('form_gender')}</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">{translate('form_age')}</label>
                  <select
                    value={formData.age_band}
                    onChange={(e) => setFormData(prev => ({ ...prev, age_band: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="0-12">0-12 (Child)</option>
                    <option value="13-17">13-17</option>
                    <option value="18-40">18-40</option>
                    <option value="41-60">41-60</option>
                    <option value="61-70">61-70 (Elderly)</option>
                    <option value="71-80">71-80 (Elderly)</option>
                    <option value="80+">80+ (Elderly)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">{translate('form_language')}</label>
                  <input
                    type="text"
                    value={formData.language}
                    onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="e.g. Marathi, Hindi, Telugu"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">{translate('form_state')}</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Mela Centroid Zone</label>
                  <select
                    value={formData.last_seen_zone}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_seen_zone: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="Zone Area 30 (Ramkund Ghat)">Zone 30 (Ramkund)</option>
                    <option value="Zone Area 31 (Panchavati Circle)">Zone 31 (Panchavati)</option>
                    <option value="Zone Area 8 (Sadhugram Gate)">Zone 8 (Sadhugram)</option>
                    <option value="Zone Area 21 (Takli Sangam)">Zone 21 (Takli)</option>
                    <option value="Zone Area 1 (Trimbakeshwar)">Zone 1 (Trimbakeshwar)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">{translate('form_location')}</label>
                <input
                  type="text"
                  value={formData.last_seen_location}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_seen_location: e.target.value }))}
                  required
                  placeholder="Specific ghat booth, parking node, or exit crossroad"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">{translate('form_reporter_mobile')}</label>
                  <input
                    type="tel"
                    value={formData.reporter_mobile}
                    onChange={(e) => setFormData(prev => ({ ...prev, reporter_mobile: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
                {reportingMode === 'missing' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Alternative Contact</label>
                    <input
                      type="tel"
                      value={formData.emergency_contact}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                      placeholder="Emergency contact"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Your Name (Finder)</label>
                    <input
                      type="text"
                      value={formData.finder_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, finder_name: e.target.value }))}
                      required={reportingMode === 'found'}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                      placeholder="Finder full name"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">{translate('form_clothing')}</label>
                <textarea
                  value={formData.clothing_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, clothing_description: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="e.g. Saffron dhoti, white cap, grey shawl..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">{translate('form_physical')}</label>
                <textarea
                  value={formData.physical_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, physical_description: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="e.g. Walking stick, scar on forehead, spectacles..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReportingMode(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm"
                >
                  Close Form
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm btn-glow"
                >
                  {translate('form_submit')}
                </button>
              </div>

            </form>
          </section>
        )}

        {/* Live Map & Zone Boundaries View */}
        <section id="map-view" className="glass-panel p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="font-bold text-white text-base">Live Mela GIS Mapping Command</h4>
              <p className="text-xs text-slate-400">Interactive live overlays displaying administrative mela boundaries, live case clustering, and helper stations.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => showOnMap(19.9950, 73.7799, "Zone Area 30")}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-300 border border-white/5"
              >
                Ramkund Center
              </button>
              <button 
                onClick={() => showOnMap(19.9826, 73.7128, "Zone Area 1")}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-300 border border-white/5"
              >
                Trimbak Centroid
              </button>
            </div>
          </div>
          
          <div className="w-full h-[400px]">
            <MelaMap sightingLat={activeLat} sightingLng={activeLng} highlightZone={activeZone} />
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0c0f17] py-6 px-4 text-center mt-12 text-xs text-slate-500 font-medium">
        <p>&copy; 2026 Government of Maharashtra Simhastha Kumbh Mela Authority. Designed for Mumbai Claude Impact Lab.</p>
        <p className="mt-1 text-slate-600">Privacy-First Registry. Zero PII storage in public cached buckets. All entries audited under law.</p>
      </footer>
    </div>
  );
}
