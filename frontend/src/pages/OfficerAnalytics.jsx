import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ThemeContext } from '../context/ThemeContext';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { ClipboardList, CheckCircle, Clock, Percent } from 'lucide-react';
import StatsCard from '../components/common/StatsCard';

const COLORS = ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#64748b'];

const OfficerAnalytics = () => {
  const { user } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    statusData: [],
    categoryData: [],
    priorityData: [],
    trendData: [],
    performanceMetrics: {
      totalAssigned: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      avgResolutionTimeHours: 0,
      successRate: 0
    }
  });

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/officers/analytics');
      if (res.data.success) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching officer analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">Department Performance Analytics</h2>
        <p className="text-xs text-slate-400">Live charts detailing ticket intakes, category breakdowns, and monthly resolution success metrics.</p>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard
              title="Workload Assignments"
              value={analytics.performanceMetrics.totalAssigned}
              icon={ClipboardList}
              description="Total issues assigned"
              colorClass="text-brand-400 bg-brand-500/10 border-brand-500/20"
            />
            <StatsCard
              title="Closed / Resolved"
              value={analytics.performanceMetrics.resolved}
              icon={CheckCircle}
              description="Successfully completed tasks"
              colorClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            />
            <StatsCard
              title="Avg Completion Speed"
              value={`${analytics.performanceMetrics.avgResolutionTimeHours} Hrs`}
              icon={Clock}
              description="Average resolution duration"
              colorClass="text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
            />
            <StatsCard
              title="Resolution Success Rate"
              value={`${analytics.performanceMetrics.successRate}%`}
              icon={Percent}
              description="Total completed vs assigned"
              colorClass="text-brand-450 bg-brand-500/10 border-brand-500/20"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Status Breakdown BarChart */}
            <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between min-h-[350px]">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-4">Tickets by Workflow Status</span>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category breakdown PieChart */}
            <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between min-h-[350px]">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-4">Issues by Category</span>
              <div className="w-full h-64 flex justify-center items-center">
                {analytics.categoryData.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No category data logged.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analytics.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Monthly Trend Chart */}
            <div className="lg:col-span-12 glass-panel rounded-2xl border border-slate-800 p-6 min-h-[350px]">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-4">Intake vs Resolution Speed Trends (Last 6 Months)</span>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="reported" stroke="#3b82f6" strokeWidth={2} name="Assigned Tasks" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved Tasks" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default OfficerAnalytics;
