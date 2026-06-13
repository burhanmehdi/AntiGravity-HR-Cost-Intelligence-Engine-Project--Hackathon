import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Users,
  DollarSign,
  Calendar,
  Clock,
  ShieldAlert,
  Layers,
  TrendingUp,
  Settings,
  ArrowRight,
  Briefcase,
  Coins,
  Cpu,
  Terminal
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

export default function App() {
  const [stats, setStats] = useState({
    total_meetings: 0,
    total_cost: 0,
    pending_reviews: 0,
    active_anomalies: 0
  });
  const [projectCosts, setProjectCosts] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [resolvedQueue, setResolvedQueue] = useState([]);
  const [allMeetings, setAllMeetings] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [syncToken, setSyncToken] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [reviewForm, setReviewForm] = useState({});
  const [syncStatusMsg, setSyncStatusMsg] = useState('All events synced.');
  const [adminOpen, setAdminOpen] = useState(false);
  const [reallotActiveId, setReallotActiveId] = useState(null);
  const [reallotForm, setReallotForm] = useState({});

  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch(`${API_BASE_URL}/api/dashboard/stats`);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
        setProjectCosts(data.project_costs);
        setAnomalies(data.anomalies);
        setReviewQueue(data.review_queue);
        setResolvedQueue(data.resolved_queue || []);
        setAllMeetings(data.all_meetings || []);
        
        const initialFormState = {};
        data.review_queue.forEach(item => {
          initialFormState[item.id] = item.ai_attribution.project_id || '';
        });
        setReviewForm(prev => ({ ...initialFormState, ...prev }));
      }
    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/employees`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncStatusMsg('Syncing Google Calendar...');
    try {
      const url = syncToken 
        ? `${API_BASE_URL}/api/meetings/sync?sync_token=${syncToken}`
        : `${API_BASE_URL}/api/meetings/sync`;
        
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSyncToken(data.nextSyncToken);
        
        if (data.events.length > 0) {
          setSyncStatusMsg(`Synced ${data.events.length} new events successfully.`);
        } else {
          setSyncStatusMsg('No new calendar events found.');
        }
        
        await fetchDashboardData();
      } else {
        setSyncStatusMsg('Calendar sync failed.');
      }
    } catch (err) {
      console.error('Error syncing meetings:', err);
      setSyncStatusMsg('Network error.');
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncStatusMsg(''), 5000);
    }
  };

  const handleResolveAttribution = async (meetingId, targetProjectId, isReassign = false) => {
    if (!targetProjectId) return;

    setActionLoading(prev => ({ ...prev, [meetingId]: true }));
    try {
      const payload = {
        project_id: targetProjectId,
        reasoning: isReassign 
          ? "Manually reassigned to correct cost allocation." 
          : "AI attribution confirmed by manager."
      };
      
      const res = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        await fetchDashboardData();
        setReallotActiveId(null);
      }
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [meetingId]: false }));
    }
  };

  const handleUnreview = async (meetingId) => {
    setActionLoading(prev => ({ ...prev, [meetingId]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/unreview`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchDashboardData();
        setReallotActiveId(null);
      }
    } catch (err) {
      console.error('Error sending meeting to review queue:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [meetingId]: false }));
    }
  };

  const handleUpdateRate = async (employeeId, newRate) => {
    const rateVal = parseFloat(newRate);
    if (isNaN(rateVal) || rateVal < 0) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/employees/${employeeId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hourly_rate: rateVal })
      });
      if (res.ok) {
        setSyncStatusMsg(`Successfully updated rate! Recalculating database costs...`);
        await fetchEmployees();
        await fetchDashboardData();
        setTimeout(() => setSyncStatusMsg(''), 4000);
      }
    } catch (err) {
      console.error('Error updating hourly rate:', err);
    }
  };

  const handleResetDatabase = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/reset`, { method: 'POST' });
      if (res.ok) {
        setSyncToken('token_initial'); // Reset sync token chain
        setSyncStatusMsg('DEMO DATABASE RESET & RE-SEEDED');
        await fetchEmployees();
        await fetchDashboardData();
        setTimeout(() => setSyncStatusMsg(''), 5000);
      }
    } catch (err) {
      console.error('Error resetting database:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchProjects();
    fetchEmployees();
    
    const initSync = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/meetings/sync`);
        if (res.ok) {
          const data = await res.json();
          setSyncToken(data.nextSyncToken);
        }
      } catch (err) {
        console.error('Error during initial sync fetch:', err);
      }
    };
    initSync();
  }, []);

  const getLast7Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d);
    }
    return days;
  };

  const getMeetingsForDay = (dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    return allMeetings.filter(m => m.start_time.split('T')[0] === dateStr);
  };

  const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans">
      {/* 1. Header Bar */}
      <header className="border-b border-zinc-900 bg-black/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-zinc-900 border border-zinc-800 text-white rounded-xl flex items-center justify-center select-none">
            <Briefcase className="h-5 w-5 text-zinc-400" />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight text-white flex items-center gap-2">
              HR Cost Intelligence Engine
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/50 font-medium">Prototype</span>
            </h1>
            <p className="text-xs text-zinc-500">AI-Powered Calendar Resource & Meeting Cost Analytics</p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="hidden lg:flex items-center gap-2 bg-zinc-955 border border-zinc-900 px-3 py-1.5 rounded-xl text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Engine Active</span>
          </div>

          {syncStatusMsg && (
            <span className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-850 px-3 py-1.5 rounded-lg font-medium">
              {syncStatusMsg}
            </span>
          )}
          
          <button
            onClick={() => setAdminOpen(!adminOpen)}
            className="flex items-center gap-2 bg-transparent hover:bg-zinc-900 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-zinc-800 transition-all duration-205 active:scale-95"
          >
            <Settings className="h-3.5 w-3.5" />
            {adminOpen ? 'Close Admin Panel' : 'Payroll Config'}
          </button>

          <button
            onClick={handleSync}
            disabled={syncLoading}
            className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200 active:scale-95 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:cursor-not-allowed border border-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
            {syncLoading ? 'Syncing...' : 'Simulate Calendar Sync'}
          </button>
        </div>
      </header>

      {/* 2. Main Content Dashboard Container */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
        
        {/* Admin Rate Configuration Panel (Toggled, Protected from Shared view) */}
        {adminOpen && (
          <section className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 transition-all duration-300">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  Admin Configuration: Employee Payroll Settings
                  <span className="text-[9px] font-mono text-zinc-500 tracking-wider bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded font-normal select-none">[SECURE_ADMIN_PORT]</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Configure individual billing rates. (Protected and hidden from public meeting list views)</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleResetDatabase}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95"
                >
                  Reset Demo Data
                </button>
                <button 
                  onClick={() => setAdminOpen(false)}
                  className="text-xs font-semibold text-zinc-450 hover:text-white"
                >
                  Hide
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-1">
              {employees.map(emp => (
                <div key={emp.id} className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{emp.name}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{emp.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-400">$</span>
                    <input 
                      type="number"
                      defaultValue={emp.hourly_rate}
                      onBlur={(e) => handleUpdateRate(emp.id, e.target.value)}
                      className="bg-black border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2 py-1 w-16 text-center focus:outline-none focus:border-zinc-650"
                    />
                    <span className="text-[10px] text-zinc-500">/hr</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* KPI Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Cost */}
          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex items-center justify-between hover:border-zinc-800 transition-all duration-300">
            <div>
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Total Fin. Expenditure</p>
              <h3 className="text-2xl font-bold text-white mt-1.5">{formatUSD(stats.total_cost)}</h3>
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-zinc-400" />
                Aggregated meeting costs
              </p>
            </div>
            <div className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl text-zinc-300">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          {/* Card 2: Meetings Processed */}
          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex items-center justify-between hover:border-zinc-800 transition-all duration-300">
            <div>
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Meetings Audited</p>
              <h3 className="text-2xl font-bold text-white mt-1.5">{stats.total_meetings}</h3>
              <p className="text-xs text-zinc-500 mt-1">LLM Project-Attributed</p>
            </div>
            <div className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl text-zinc-300">
              <Calendar className="h-5 w-5" />
            </div>
          </div>

          {/* Card 3: Action Required */}
          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex items-center justify-between hover:border-zinc-800 transition-all duration-300">
            <div>
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Action Required</p>
              <h3 className="text-2xl font-bold text-white mt-1.5">{stats.pending_reviews}</h3>
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1 font-medium">
                {stats.pending_reviews > 0 ? (
                  <span className="text-zinc-300 flex items-center gap-1">
                    <Clock className="h-3 w-3 animate-pulse" />
                    Pending verification
                  </span>
                ) : (
                  'All attributions confirmed'
                )}
              </p>
            </div>
            <div className={`p-3 border rounded-xl transition-all duration-300 ${stats.pending_reviews > 0 ? 'bg-zinc-100 text-black border-zinc-100' : 'bg-zinc-900 text-zinc-400 border-zinc-855'}`}>
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          {/* Card 4: Cost Anomalies */}
          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex items-center justify-between hover:border-zinc-800 transition-all duration-300">
            <div>
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Cost Anomalies</p>
              <h3 className="text-2xl font-bold text-white mt-1.5">{stats.active_anomalies}</h3>
              <p className="text-xs text-zinc-500 mt-1 font-medium">
                {stats.active_anomalies > 0 ? (
                  <span className="text-white underline decoration-zinc-500 decoration-2">
                    Z-score spikes detected
                  </span>
                ) : (
                  'No anomalies found'
                )}
              </p>
            </div>
            <div className={`p-3 border rounded-xl transition-all duration-300 ${stats.active_anomalies > 0 ? 'bg-zinc-100 text-black border-zinc-100' : 'bg-zinc-900 text-zinc-400 border-zinc-855'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

        </section>

        {/* 3. Mid-Section Charts & Feed Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Project Cost Breakdown Chart Card (Left 2 columns) */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  Expenditure by Project
                  <span className="text-[9px] font-mono text-zinc-600 tracking-wider bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded font-normal select-none">[SYS_ANALYTICS]</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Spent Actuals vs Budget Benchmarks</p>
              </div>
              <div className="p-2 bg-zinc-900 border border-zinc-850 rounded-xl text-zinc-300">
                <Layers className="h-4 w-4" />
              </div>
            </div>

            <div className="h-80 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={projectCosts}
                  barGap={6}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#a1a1aa" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(name) => name.split(' (')[0]}
                  />
                  <YAxis 
                    stroke="#a1a1aa" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', backdropFilter: 'blur(12px)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#ffffff', fontSize: '11px' }}
                    itemStyle={{ color: '#e2e8f0', fontSize: '11px' }}
                    formatter={(value, name) => [formatUSD(value), name === 'cost' ? 'Spent' : 'Budget']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span style={{ color: '#a1a1aa', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{value === 'cost' ? 'Actual Spent' : 'Allocated Budget'}</span>}
                  />
                  {/* Budget Reference Bar (Sleek Flat Zinc Grey) */}
                  <Bar dataKey="budget" fill="#27272a" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  {/* Actual Spent Bar (Sleek Flat White) */}
                  <Bar dataKey="cost" fill="#ffffff" radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost Anomalies Side Panel (Right 1 column) */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  Cost Anomalies
                  <span className="text-[9px] font-mono text-zinc-600 tracking-wider bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded font-normal select-none">[SYS_ALERTS]</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Z-score cost spikes (|Z| &gt; 2.0)</p>
              </div>
              <div className="p-2 bg-zinc-900 border border-zinc-850 rounded-xl text-zinc-350">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[310px] pr-1 space-y-3">
              {anomalies.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-12">
                  <CheckCircle2 className="h-8 w-8 text-zinc-850 mb-2" />
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">No anomalies detected</p>
                </div>
              ) : (
                anomalies.map((item) => (
                  <div key={item.id} className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-3.5 hover:border-zinc-800 transition-all duration-300">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">{item.title}</h4>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20 font-semibold shrink-0">
                        Z = +{item.z_score.toFixed(1)}
                      </span>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="font-semibold text-white bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded">
                        Cost: {formatUSD(item.cost)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-zinc-500" />
                        {item.duration_hours} hrs
                      </span>
                    </div>

                    <div className="mt-2.5 border-t border-zinc-900 pt-2 text-[9px] text-zinc-500">
                      <p className="font-semibold text-zinc-400">Attendees ({item.attendees.length}):</p>
                      <p className="mt-0.5 text-zinc-500 line-clamp-1">{item.attendees.join(', ')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* 3.5 Calendar Schedule Overview Component */}
        <section className="bg-zinc-955 border border-zinc-900 rounded-2xl p-5 hover:border-zinc-800 transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                Calendar Audit Schedule
                <span className="text-[9px] font-mono text-zinc-650 tracking-wider bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded font-normal select-none">[SYS_SCHEDULE_VIEW]</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Real-time daily calendar tracking of project cost attributions and manager audit statuses</p>
            </div>
            <div className="p-2 bg-zinc-900 border border-zinc-850 rounded-xl text-zinc-300">
              <Calendar className="h-4 w-4" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3.5 overflow-x-auto select-none">
            {getLast7Days().map((dayDate, dayIdx) => {
              const dayMeetings = getMeetingsForDay(dayDate);
              const isToday = new Date().toDateString() === dayDate.toDateString();
              
              return (
                <div key={dayIdx} className={`min-w-[135px] flex-1 flex flex-col gap-3 p-3 rounded-xl border ${isToday ? 'bg-zinc-900/35 border-zinc-800' : 'bg-zinc-950 border-zinc-900/40'}`}>
                  {/* Day Header */}
                  <div className="border-b border-zinc-900 pb-2">
                    <p className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest">{dayDate.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                    <p className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
                      {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {isToday && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0" title="Today" />
                      )}
                    </p>
                  </div>
                  
                  {/* Meetings List */}
                  <div className="flex-1 flex flex-col gap-2 min-h-[120px]">
                    {dayMeetings.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center py-6 text-center">
                        <p className="text-[9px] text-zinc-650 font-semibold uppercase tracking-wider">No events</p>
                      </div>
                    ) : (
                      dayMeetings.map((m) => {
                        let statusColor = "border-zinc-850 bg-zinc-900/30";
                        let statusDot = "bg-zinc-600";
                        let statusLabel = "AI";
                        
                        if (m.status === "anomaly") {
                          statusColor = "border-l-2 border-red-500 bg-red-955/10 border-t border-r border-b border-zinc-900";
                          statusDot = "bg-red-500";
                          statusLabel = "SPIKE";
                        } else if (m.status === "audited") {
                          statusColor = "border-l-2 border-emerald-500 bg-emerald-955/5 border-t border-r border-b border-zinc-900";
                          statusDot = "bg-emerald-500";
                          statusLabel = "OK";
                        } else if (m.status === "pending") {
                          statusColor = "border border-dashed border-zinc-800 bg-zinc-950/40 text-zinc-400";
                          statusDot = "bg-zinc-500 animate-pulse";
                          statusLabel = "AUDIT";
                        }
                        
                        return (
                          <div 
                            key={m.id} 
                            className={`p-2.5 rounded-lg text-left transition-all duration-200 hover:border-zinc-700 flex flex-col gap-1.5 ${statusColor}`}
                            title={`${m.title}\nDescription: ${m.description || 'None'}\nAttendees: ${m.attendees.join(', ')}`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="text-[9px] font-bold text-white uppercase tracking-wide truncate leading-tight flex-1">{m.title}</span>
                              <span className="text-[8px] font-mono text-zinc-400 font-extrabold shrink-0 mt-0.5">{formatUSD(m.cost)}</span>
                            </div>
                            
                            <div className="flex items-center justify-between gap-1 text-[8px] text-zinc-500">
                              <span className="truncate max-w-[70px] font-semibold text-zinc-455 uppercase">{m.project_name.split(' (')[0]}</span>
                              <span className="flex items-center gap-1 font-mono text-[8px] tracking-wider font-extrabold uppercase shrink-0">
                                <span className={`h-1 w-1 rounded-full ${statusDot}`} />
                                {statusLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Human-In-The-Loop Action Required Queue */}
        <section className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                Human-in-the-Loop Review Queue
                <span className="text-[9px] font-mono text-zinc-600 tracking-wider bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded font-normal select-none">[SYS_VERIFICATION]</span>
                {reviewQueue.length > 0 && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white text-black font-extrabold tracking-wider animate-pulse">
                    {reviewQueue.length} Pending
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Manager verification queue for meeting project attributions with confidence below 75%</p>
            </div>
            <div className="p-2 bg-zinc-900 border border-zinc-850 rounded-xl text-zinc-355">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          {reviewQueue.length === 0 ? (
            <div className="bg-zinc-950 border border-dashed border-zinc-900 rounded-2xl py-12 flex flex-col items-center justify-center text-zinc-500">
              <CheckCircle2 className="h-10 w-10 text-zinc-805 mb-3" />
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Review Queue Empty</p>
              <p className="text-[10px] text-zinc-500 mt-1">All calendar cost allocations are active and verified.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewQueue.map((item) => (
                <div key={item.id} className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-805 transition-all duration-305">
                  
                  {/* Meeting Details */}
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wide">{item.title}</h4>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{item.description || "No meeting description."}</p>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="text-xs font-bold text-white block">{formatUSD(item.cost)}</span>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">{item.duration_hours} hrs</span>
                      </div>
                    </div>

                    <div className="mt-3.5 bg-zinc-955 border border-zinc-900 rounded-xl p-3">
                      {/* AI Proposed Attribution Row */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500 font-medium">AI Proposed Project:</span>
                        <span className="font-bold text-white bg-white/10 border border-white/20 px-2 py-0.5 rounded text-[10px]">
                          {item.ai_attribution.project_id || "Unattributed"}
                        </span>
                      </div>

                      {/* Confidence Score Bar */}
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1 font-semibold uppercase tracking-wider">
                          <span>Confidence Score</span>
                          <span className="text-white">{(item.ai_attribution.confidence_score * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-zinc-905 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-white h-full rounded-full transition-all duration-300"
                            style={{ width: `${item.ai_attribution.confidence_score * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Reasoning */}
                      <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">
                        <span className="font-bold text-zinc-350 block mb-0.5 text-[10px] uppercase tracking-wider">AI Reasoning:</span>
                        {item.ai_attribution.reasoning}
                      </p>

                      {/* Key Signals */}
                      {item.ai_attribution.key_signals.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {item.ai_attribution.key_signals.map((sig, idx) => (
                            <span key={idx} className="text-[9px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-850 uppercase font-semibold">
                              {sig}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resolution Panel */}
                  <div className="mt-4 pt-3 border-t border-zinc-900 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider shrink-0">Map to Project:</label>
                      <select
                        value={reviewForm[item.id] || ''}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="bg-zinc-950 border border-zinc-850 text-zinc-200 text-xs rounded-xl px-2 py-1.5 w-full focus:outline-none focus:border-zinc-600"
                      >
                        <option value="">Select Project...</option>
                        {projects.map((proj) => (
                          <option key={proj.id} value={proj.id}>
                            {proj.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      {/* Confirm AI's suggestion */}
                      <button
                        onClick={() => handleResolveAttribution(item.id, item.ai_attribution.project_id, false)}
                        disabled={actionLoading[item.id] || !item.ai_attribution.project_id}
                        className="flex-1 bg-transparent hover:bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold py-2 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none active:scale-95"
                      >
                        Confirm AI
                      </button>

                      {/* Reassign to selected project */}
                      <button
                        onClick={() => handleResolveAttribution(item.id, reviewForm[item.id], true)}
                        disabled={actionLoading[item.id] || !reviewForm[item.id] || reviewForm[item.id] === ''}
                        className="flex-1 bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2 rounded-xl transition-all duration-200 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:pointer-events-none active:scale-95 border border-white"
                      >
                        Reassign
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </section>

        {/* Audited Resolutions / Audit Log */}
        <section className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                Resolution History / Audit Log
                <span className="text-[9px] font-mono text-zinc-650 tracking-wider bg-zinc-955 border border-zinc-900 px-2 py-0.5 rounded font-normal select-none">[SYS_AUDIT_LOG]</span>
                {resolvedQueue.length > 0 && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800 font-semibold">
                    {resolvedQueue.length} Audited
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Timeline of confirmed and manually reassigned calendar cost attributions</p>
            </div>
            <div className="p-2 bg-zinc-900 border border-zinc-850 rounded-xl text-zinc-300">
              <Layers className="h-4 w-4" />
            </div>
          </div>

          {resolvedQueue.length === 0 ? (
            <div className="bg-zinc-950 border border-dashed border-zinc-900 rounded-2xl py-12 flex flex-col items-center justify-center text-zinc-500">
              <Clock className="h-10 w-10 text-zinc-850 mb-3" />
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">No audited events yet</p>
              <p className="text-[10px] text-zinc-600 mt-1">Resolve items in the review queue above to populate the audit log.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resolvedQueue.map((item) => (
                <div key={item.id} className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-zinc-800 transition-all duration-300">
                  
                  {/* Left Column: Meeting title, description, attendees */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wide truncate">{item.title}</h4>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 truncate">
                      {item.description || "No description provided."}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-[9px] text-zinc-450 font-medium">
                      <span className="uppercase text-zinc-500 font-bold">Attendees:</span>
                      <span className="truncate">{item.attendees.join(', ')}</span>
                    </div>
                  </div>

                  {/* Middle Column: Project mapping indicators */}
                  <div className="flex flex-col md:items-center shrink-0 md:w-64 gap-1">
                    {reallotActiveId === item.id ? (
                      <div className="flex flex-col gap-2.5 w-full bg-zinc-950/65 p-3 rounded-xl border border-zinc-850">
                        <div className="flex items-center gap-2">
                          <label className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider shrink-0">Re-allot to:</label>
                          <select
                            value={reallotForm[item.id] || ''}
                            onChange={(e) => setReallotForm(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-2 py-1.5 w-full focus:outline-none focus:border-zinc-700"
                          >
                            <option value="">Select Project...</option>
                            {projects.map((proj) => (
                              <option key={proj.id} value={proj.id}>
                                {proj.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const target = reallotForm[item.id];
                              handleResolveAttribution(item.id, target, true);
                            }}
                            disabled={actionLoading[item.id] || !reallotForm[item.id]}
                            className="flex-1 bg-white hover:bg-zinc-200 text-black text-xs font-bold py-1.5 rounded-xl transition-all duration-205 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:pointer-events-none active:scale-95 border border-white cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setReallotActiveId(null)}
                            className="flex-1 bg-transparent hover:bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold py-1.5 rounded-xl transition-all duration-205 active:scale-95 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="border-t border-zinc-900 my-1" />
                        <button
                          onClick={() => handleUnreview(item.id)}
                          disabled={actionLoading[item.id]}
                          className="w-full bg-zinc-900 hover:bg-zinc-800 hover:text-white border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-[11px] font-bold py-2 rounded-xl transition-all duration-205 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Clock className="h-3.5 w-3.5 text-zinc-400" />
                          Unsure? Send to Review Queue
                        </button>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Mapped to</span>
                          <ArrowRight className="h-3 w-3 text-zinc-650" />
                          <span className="font-bold text-white bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full text-[10px] uppercase">
                            {item.attribution.project_id || "Unattributed"}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 italic text-center truncate md:w-full mt-1">
                          "{item.attribution.reasoning}"
                        </p>
                        <button
                          onClick={() => {
                            setReallotActiveId(item.id);
                            setReallotForm(prev => ({ ...prev, [item.id]: item.attribution.project_id || '' }));
                          }}
                          className="mt-2.5 w-full bg-zinc-900 hover:bg-zinc-850 hover:text-white text-white text-[11px] font-bold py-2 px-3.5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all duration-205 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
                          Re-allot Project
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Financial cost & Audit stamp */}
                  <div className="text-right shrink-0 md:w-36">
                    <span className="text-xs font-bold text-white block font-mono">{formatUSD(item.cost)}</span>
                    <span className="text-[9px] text-zinc-500 block mt-1.5 tracking-widest font-black uppercase">
                      {item.attribution.attributed_by === 'human' ? (
                        <span className="bg-white text-black px-1.5 py-0.5 font-black text-[8px] border border-white">
                          AUDITED BY HUMAN
                        </span>
                      ) : (
                        <span className="border border-zinc-800 text-zinc-400 px-1.5 py-0.5 text-[8px]">
                          AI VERIFIED
                        </span>
                      )}
                    </span>
                  </div>

                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      
      {/* 5. Footer */}
      <footer className="mt-auto border-t border-zinc-900 bg-black py-4 px-6 text-center text-[9px] text-zinc-655 uppercase tracking-widest font-semibold">
        HR Cost Intelligence Prototype &bull; Sleek Monochrome Dark Mode
      </footer>
    </div>
  );
}
