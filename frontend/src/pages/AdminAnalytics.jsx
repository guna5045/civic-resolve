import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../services/api';
import { ThemeContext } from '../context/ThemeContext';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell, PieChart, Pie, LineChart, Line 
} from 'recharts';
import { 
  BarChart2, TrendingUp, Users, FolderOpen, Clock, Search, Filter,
  FileText, ShieldCheck, AlertCircle, HelpCircle, CheckCircle, XCircle 
} from 'lucide-react';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#ec4899', '#06b6d4'];

const AdminAnalytics = () => {
  const { theme } = useContext(ThemeContext);
  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search/Filter states for Officer Leaderboard
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [complaintsRes, officersRes, deptsRes] = await Promise.all([
          api.get('/complaints'),
          api.get('/officers'),
          api.get('/departments')
        ]);

        if (complaintsRes.data.success) {
          setComplaints(complaintsRes.data.data);
        }
        if (officersRes.data.success) {
          setOfficers(officersRes.data.data);
        }
        if (deptsRes.data.success) {
          setDepartments(deptsRes.data.data);
        }
      } catch (err) {
        console.error('Error loading analytics dataset:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // Theme-aware tooltip styling
  const tooltipStyle = theme === 'dark' 
    ? {
        contentStyle: { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f1f5f9' },
        labelStyle: { color: '#94a3b8' },
        itemStyle: { color: '#f1f5f9' }
      }
    : {
        contentStyle: { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
        labelStyle: { color: '#475569' },
        itemStyle: { color: '#0f172a' }
      };

  // Perform aggregations from real database data
  const computedData = useMemo(() => {
    if (complaints.length === 0) {
      return {
        statusCards: [],
        statusChart: [],
        deptPerformance: [],
        categoryDistribution: [],
        officerPerformance: [],
        intakeTrends: []
      };
    }

    // 1. Status Distribution
    const statusGroups = {
      'Submitted': 0,
      'Clarification Required': 0,
      'Assigned': 0,
      'Verified': 0,
      'Work Started': 0,
      'Resolved': 0,
      'Closed': 0,
      'Rejected': 0
    };

    complaints.forEach(c => {
      let status = c.status;
      if (['Assigned', 'Reassigned'].includes(status)) {
        statusGroups['Assigned']++;
      } else if (['Verified', 'Verified By Officer', 'Verified'].includes(status)) {
        statusGroups['Verified']++;
      } else if (['Rejected', 'Rejected By Officer', 'Rejected'].includes(status)) {
        statusGroups['Rejected']++;
      } else if (statusGroups[status] !== undefined) {
        statusGroups[status]++;
      } else {
        statusGroups['Submitted']++;
      }
    });

    const statusCards = Object.keys(statusGroups).map(status => ({
      name: status,
      count: statusGroups[status]
    }));

    // 2. Department Performance
    const deptMap = {};
    departments.forEach(d => {
      deptMap[d._id] = {
        name: d.name,
        assigned: 0,
        resolved: 0,
        totalHours: 0,
        resolvedWithTime: 0
      };
    });

    complaints.forEach(c => {
      const deptId = c.department?._id || c.department;
      if (deptId) {
        if (!deptMap[deptId]) {
          deptMap[deptId] = {
            name: c.department?.name || 'Unknown',
            assigned: 0,
            resolved: 0,
            totalHours: 0,
            resolvedWithTime: 0
          };
        }
        
        deptMap[deptId].assigned++;
        
        if (['Resolved', 'Closed'].includes(c.status)) {
          deptMap[deptId].resolved++;
          
          const resolvedEvent = c.timeline && c.timeline.find(t => t.status === 'Resolved');
          if (resolvedEvent) {
            const start = c.assignmentTimestamp || c.createdAt;
            const diff = new Date(resolvedEvent.timestamp) - new Date(start);
            if (diff > 0) {
              deptMap[deptId].totalHours += diff / (1000 * 60 * 60);
              deptMap[deptId].resolvedWithTime++;
            }
          }
        }
      }
    });

    const deptPerformance = Object.keys(deptMap).map(id => {
      const d = deptMap[id];
      const avgSpeed = d.resolvedWithTime > 0 ? Math.round(d.totalHours / d.resolvedWithTime) : 0;
      return {
        id,
        name: d.name,
        assigned: d.assigned,
        resolved: d.resolved,
        avgSpeed
      };
    });

    // 3. Category Distribution
    const catMap = {};
    complaints.forEach(c => {
      catMap[c.category] = (catMap[c.category] || 0) + 1;
    });
    const categoryDistribution = Object.keys(catMap).map(cat => ({
      name: cat,
      value: catMap[cat],
      percentage: complaints.length > 0 ? Math.round((catMap[cat] / complaints.length) * 100) : 0
    }));

    // 4. Officer Performance
    const officerPerformance = officers.map(o => {
      const officerComplaints = complaints.filter(c => String(c.assignedOfficer?._id || c.assignedOfficer) === String(o._id));
      const activeTickets = officerComplaints.filter(c => ['Assigned', 'Reassigned', 'Verified', 'Verified By Officer', 'Work Started'].includes(c.status)).length;
      const completedTickets = officerComplaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length;
      
      let totalHours = 0;
      let resolvedCount = 0;
      officerComplaints.forEach(c => {
        if (['Resolved', 'Closed'].includes(c.status)) {
          const resolvedEvent = c.timeline && c.timeline.find(t => t.status === 'Resolved');
          if (resolvedEvent) {
            const start = c.assignmentTimestamp || c.createdAt;
            const diff = new Date(resolvedEvent.timestamp) - new Date(start);
            if (diff > 0) {
              totalHours += diff / (1000 * 60 * 60);
              resolvedCount++;
            }
          }
        }
      });

      const avgResolutionTime = resolvedCount > 0 ? Math.round(totalHours / resolvedCount) : 0;

      return {
        id: o._id,
        name: o.fullName,
        department: o.department?.name || 'Unassigned',
        activeTickets,
        completedTickets,
        avgResolutionTime
      };
    });

    // 5. Intake Trends (Last 6 Months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendMap = {};
    
    // Seed last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      trendMap[key] = {
        name: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        reported: 0,
        resolved: 0
      };
    }

    complaints.forEach(c => {
      if (c.createdAt) {
        const createdDate = new Date(c.createdAt);
        const createdKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
        if (trendMap[createdKey]) {
          trendMap[createdKey].reported++;
        }
      }
      
      if (['Resolved', 'Closed'].includes(c.status)) {
        const resolvedEvent = c.timeline && c.timeline.find(t => t.status === 'Resolved');
        if (resolvedEvent && resolvedEvent.timestamp) {
          const resolvedDate = new Date(resolvedEvent.timestamp);
          const resolvedKey = `${resolvedDate.getFullYear()}-${String(resolvedDate.getMonth() + 1).padStart(2, '0')}`;
          if (trendMap[resolvedKey]) {
            trendMap[resolvedKey].resolved++;
          }
        }
      }
    });

    const intakeTrends = Object.keys(trendMap).sort().map(key => trendMap[key]);

    return {
      statusCards,
      statusChart: statusCards,
      deptPerformance,
      categoryDistribution,
      officerPerformance,
      intakeTrends
    };
  }, [complaints, officers, departments]);

  // Search and Filtered Officers
  const filteredOfficers = useMemo(() => {
    return computedData.officerPerformance.filter(o => {
      const matchSearch = o.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept = deptFilter === 'all' || o.department === deptFilter;
      return matchSearch && matchDept;
    });
  }, [computedData.officerPerformance, searchQuery, deptFilter]);

  const getStatusIcon = (statusName) => {
    switch(statusName) {
      case 'Submitted': return FileText;
      case 'Clarification Required': return HelpCircle;
      case 'Assigned': return Users;
      case 'Verified': return ShieldCheck;
      case 'Work Started': return Clock;
      case 'Resolved': return CheckCircle;
      case 'Closed': return ShieldCheck;
      case 'Rejected': return XCircle;
      default: return AlertCircle;
    }
  };

  const getStatusColor = (statusName) => {
    switch(statusName) {
      case 'Submitted': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Clarification Required': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Assigned': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'Verified': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'Work Started': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'Resolved': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Closed': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      case 'Rejected': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Governance Analytics Dashboard</h2>
        <p className="text-xs text-slate-400">Real-time analytical visualizations measuring municipal workloads, department speeds, and officer metrics.</p>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-500">No database complaints logged to evaluate metrics.</div>
      ) : (
        <div className="space-y-10">
          
          {/* SECTION 1: Status Distribution Cards */}
          <div className="space-y-4">
            <span className="text-xs font-semibold text-slate-450 uppercase tracking-widest block">Complaint Status Distribution</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {computedData.statusCards.map((card) => {
                const IconComp = getStatusIcon(card.name);
                const colorClass = getStatusColor(card.name);
                return (
                  <div key={card.name} className="glass-panel rounded-xl p-4 border border-slate-800 flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg border ${colorClass}`}>
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.name}</p>
                      <h4 className="text-lg font-extrabold text-slate-200">{card.count}</h4>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts Row 1: Intake Trends & Status Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* 1. Monthly Intake Trends */}
            <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 p-6 min-h-[350px]">
              <div className="flex justify-between items-center mb-4 border-b border-slate-805 pb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Intake vs Resolution Speed Trends</span>
                <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest bg-brand-500/10 px-2.5 py-0.5 rounded-full">Last 6 Months</span>
              </div>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={computedData.intakeTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="reported" stroke="#3b82f6" strokeWidth={2.5} name="Total Reported" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2.5} name="Total Resolved" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Data Table */}
              <div className="mt-6 overflow-x-auto rounded-lg border border-slate-800/60 text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-4 font-semibold uppercase tracking-wider">Month</th>
                      <th className="py-2.5 px-4 font-semibold uppercase tracking-wider">Complaints Reported</th>
                      <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-right">Complaints Resolved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-350">
                    {computedData.intakeTrends.map((t) => (
                      <tr key={t.name} className="hover:bg-slate-900/10">
                        <td className="py-2 px-4 font-semibold text-slate-200">{t.name}</td>
                        <td className="py-2 px-4">{t.reported}</td>
                        <td className="py-2 px-4 text-right font-semibold text-emerald-450">{t.resolved}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Status Bar Chart */}
            <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 p-6 min-h-[350px]">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-4 border-b border-slate-805 pb-3">Complaint Distributions by Status</span>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={computedData.statusChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} interval={0} angle={-15} dx={-5} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                      {computedData.statusChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Charts Row 2: Department Performance & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* 1. Department Performance (Horizontal Bar & Table) */}
            <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 p-6 min-h-[350px] space-y-6">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-3">Department Performance Metrics</span>
              
              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={computedData.deptPerformance} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={90} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="assigned" fill="#3b82f6" name="Assigned Tickets" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="resolved" fill="#10b981" name="Resolved Tickets" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Comparison Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-800/60 text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-4 font-semibold uppercase tracking-wider">Department</th>
                      <th className="py-2.5 px-4 font-semibold uppercase tracking-wider">Tickets Assigned</th>
                      <th className="py-2.5 px-4 font-semibold uppercase tracking-wider">Tickets Resolved</th>
                      <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-right">Avg Resolution Speed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-350">
                    {computedData.deptPerformance.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-900/10">
                        <td className="py-2 px-4 font-semibold text-slate-200">{dept.name}</td>
                        <td className="py-2 px-4">{dept.assigned}</td>
                        <td className="py-2 px-4 font-semibold text-emerald-450">{dept.resolved}</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-brand-400">
                          {dept.avgSpeed > 0 ? `${dept.avgSpeed} Hours` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Category Distribution (Donut & Table) */}
            <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 p-6 min-h-[350px] space-y-6">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-3">Category Workload Distribution</span>
              
              <div className="w-full h-56 flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={computedData.categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {computedData.categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Density Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-800/60 text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-4 font-semibold uppercase tracking-wider">Category</th>
                      <th className="py-2.5 px-4 font-semibold uppercase tracking-wider">Total Reports</th>
                      <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-right">Density Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-350">
                    {computedData.categoryDistribution.map((cat, index) => (
                      <tr key={cat.name} className="hover:bg-slate-900/10">
                        <td className="py-2 px-4 font-semibold text-slate-200 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          {cat.name}
                        </td>
                        <td className="py-2 px-4">{cat.value}</td>
                        <td className="py-2 px-4 text-right font-bold text-indigo-400">{cat.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* SECTION 4: Officer Performance Leaderboard Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-805 pb-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Officer Workload & Speed Leaderboard</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Audits individual performance indexes, active backlogs, and historical resolutions.</p>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search officer name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 text-xs outline-none focus:border-brand-500 w-52"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400">
                  <Filter className="h-3 w-3" />
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="bg-transparent border-none text-slate-200 outline-none text-xs"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Leaderboard Grid/Table */}
            {filteredOfficers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 italic">No officers match the filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Officer Name</th>
                      <th className="py-3 px-4">Assigned Department</th>
                      <th className="py-3 px-4">Active Tickets Backlog</th>
                      <th className="py-3 px-4">Completed Resolutions</th>
                      <th className="py-3 px-4 text-right">Avg Resolution Speed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-350">
                    {filteredOfficers.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-900/20">
                        <td className="py-3 px-4 font-bold text-slate-100">{o.name}</td>
                        <td className="py-3 px-4 font-semibold text-slate-400">{o.department}</td>
                        <td className="py-3 px-4 font-semibold text-brand-400">{o.activeTickets}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-450">{o.completedTickets}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                          {o.avgResolutionTime > 0 ? `${o.avgResolutionTime} Hours` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;
