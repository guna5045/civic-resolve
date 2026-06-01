import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const COLORS = ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#64748b'];

const OfficerAnalytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState({ statusData: [], categoryData: [], trendData: [] });

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/complaints?officer=${user._id}`);
        if (res.data.success) {
          const complaints = res.data.data;

          // Process status breakdown
          const statusCount = {};
          complaints.forEach(c => {
            statusCount[c.status] = (statusCount[c.status] || 0) + 1;
          });
          const statusData = Object.keys(statusCount).map(k => ({ name: k, count: statusCount[k] }));

          // Process category breakdown
          const catCount = {};
          complaints.forEach(c => {
            catCount[c.category] = (catCount[c.category] || 0) + 1;
          });
          const categoryData = Object.keys(catCount).map(k => ({ name: k, value: catCount[k] }));

          // Mock trend data (weekly progress)
          const trendData = [
            { name: 'Week 1', reported: 4, resolved: 2 },
            { name: 'Week 2', reported: 6, resolved: 4 },
            { name: 'Week 3', reported: 8, resolved: 5 },
            { name: 'Week 4', reported: 5, resolved: 6 },
          ];

          setChartData({
            statusData: statusData.length > 0 ? statusData : [{ name: 'Assigned', count: 2 }, { name: 'In Progress', count: 3 }, { name: 'Resolved', count: 5 }],
            categoryData: categoryData.length > 0 ? categoryData : [{ name: 'Roads', value: 40 }, { name: 'Sanitation', value: 30 }, { name: 'Electricity', value: 30 }],
            trendData,
          });
        }
      } catch (err) {
        console.error('Error fetching officer analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Department Performance Analytics</h2>
        <p className="text-xs text-slate-400">Charts visualizing ticket intake trends, status distributions, and resolution ratios.</p>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Status Breakdown BarChart */}
          <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between min-h-[350px]">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-4">Tickets by Status</span>
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

          {/* Category breakdown PieChart */}
          <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between min-h-[350px]">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-4">Issues by Category</span>
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

          {/* Line chart trend */}
          <div className="lg:col-span-12 glass-panel rounded-2xl border border-slate-800 p-6 min-h-[350px]">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-4">Intake vs Resolution Speed Trends</span>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Line type="monotone" dataKey="reported" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficerAnalytics;
