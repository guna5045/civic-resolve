import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart, Pie } from 'recharts';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

const AdminAnalytics = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState({ statusData: [], categoryData: [], historyData: [] });

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/complaints');
        if (res.data.success) {
          const data = res.data.data;
          setComplaints(data);

          // Status ratios
          const statusMap = {};
          data.forEach((c) => {
            statusMap[c.status] = (statusMap[c.status] || 0) + 1;
          });
          const statusData = Object.keys(statusMap).map((k) => ({ name: k, count: statusMap[k] }));

          // Category ratios
          const catMap = {};
          data.forEach((c) => {
            catMap[c.category] = (catMap[c.category] || 0) + 1;
          });
          const categoryData = Object.keys(catMap).map((k) => ({ name: k, value: catMap[k] }));

          // Intake history (mock monthly)
          const historyData = [
            { month: 'Jan', reported: 24, resolved: 18 },
            { month: 'Feb', reported: 32, resolved: 22 },
            { month: 'Mar', reported: 45, resolved: 30 },
            { month: 'Apr', reported: 39, resolved: 35 },
            { month: 'May', reported: 55, resolved: 42 },
          ];

          setChartData({
            statusData: statusData.length > 0 ? statusData : [{ name: 'Resolved', count: 12 }],
            categoryData: categoryData.length > 0 ? categoryData : [{ name: 'Roads', value: 20 }],
            historyData,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalyticsData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Governance Analytics Dashboard</h2>
        <p className="text-xs text-slate-400">Interact with analytical visualizations measuring intake metrics and department resolution rates.</p>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Intake History AreaChart */}
          <div className="lg:col-span-12 glass-panel rounded-2xl border border-slate-800 p-6 min-h-[350px]">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-4">Monthly Intake vs Resolution Trends</span>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReported" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Area type="monotone" dataKey="reported" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorReported)" />
                  <Area type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorResolved)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status BarChart */}
          <div className="lg:col-span-6 glass-panel rounded-2xl border border-slate-800 p-6 min-h-[350px]">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-4">Complaint Distributions by Status</span>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category PieChart */}
          <div className="lg:col-span-6 glass-panel rounded-2xl border border-slate-800 p-6 min-h-[350px]">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-4">Complaint Divisions by Category</span>
            <div className="w-full h-64 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;
