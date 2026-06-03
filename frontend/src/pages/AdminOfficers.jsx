import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Users, Plus, ShieldCheck, Edit, Key, Ban, UserCheck, X, BarChart2 } from 'lucide-react';

const AdminOfficers = () => {
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Create Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [deptId, setDeptId] = useState('');

  // Edit Form state
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editDeptId, setEditDeptId] = useState('');

  // Password Reset state
  const [resettingOfficer, setResettingOfficer] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // View Stats state
  const [statsOfficer, setStatsOfficer] = useState(null);
  const [officerStats, setOfficerStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState('');

  // Status Toggle Confirmation state
  const [officerToToggle, setOfficerToToggle] = useState(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleViewStatsClick = async (officer) => {
    setStatsOfficer(officer);
    setOfficerStats(null);
    setLoadingStats(true);
    setStatsError('');
    try {
      const res = await api.get(`/officers/${officer._id}/stats`);
      if (res.data.success) {
        setOfficerStats(res.data.data);
      } else {
        setStatsError('Failed to load stats data.');
      }
    } catch (err) {
      console.error(err);
      setStatsError(err.response?.data?.message || 'Failed to fetch officer stats.');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const offRes = await api.get('/officers');
      if (offRes.data.success) {
        setOfficers(offRes.data.data);
      }
      const deptRes = await api.get('/departments');
      if (deptRes.data.success) {
        setDepartments(deptRes.data.data);
        if (deptRes.data.data.length > 0) {
          setDeptId(deptRes.data.data[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    if (!fullName || !email || !mobile || !password || !deptId) {
      setError('All fields are required.');
      setCreating(false);
      return;
    }

    try {
      const res = await api.post('/admin/officers', {
        fullName,
        email,
        mobile,
        password,
        departmentId: deptId,
      });

      if (res.data.success) {
        setFullName('');
        setEmail('');
        setMobile('');
        setPassword('');
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create officer.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleSuspend = async (officer) => {
    setError('');
    try {
      const res = await api.patch(`/admin/officers/${officer._id}/suspend`);
      if (res.data.success) {
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle suspension status.');
    }
  };

  const handleEditClick = (officer) => {
    setEditingOfficer(officer);
    setEditFullName(officer.fullName);
    setEditEmail(officer.email);
    setEditMobile(officer.mobile || '');
    setEditDeptId(officer.department?._id || '');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.put(`/admin/officers/${editingOfficer._id}`, {
        fullName: editFullName,
        email: editEmail,
        mobile: editMobile,
        departmentId: editDeptId,
      });
      if (res.data.success) {
        setEditingOfficer(null);
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update officer.');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPassword.trim()) return;
    try {
      const res = await api.patch(`/admin/officers/${resettingOfficer._id}/reset-password`, {
        password: newPassword,
      });
      if (res.data.success) {
        setResettingOfficer(null);
        setNewPassword('');
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Municipal Officers Directory</h2>
        <p className="text-xs text-slate-400">Register department officers, assign credentials, and map their departmental responsibilities.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Form */}
        <form onSubmit={handleCreate} className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-2">
            Register Municipal Officer
          </span>

          <Input
            label="Full Name"
            placeholder="e.g. Officer John Smith..."
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            label="Officer ID (Email)"
            placeholder="officer@civic.gov"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Mobile Number"
            placeholder="+1 (555) 000-0000"
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
          />

          <Input
            label="Initial Password"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Department Assignment</label>
            <select
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-brand-500"
            >
              {departments.map((d) => (
                <option key={d._id} value={d._id} className="bg-slate-900 text-slate-200">
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" loading={creating} className="w-full flex items-center justify-center gap-1.5">
            <Plus className="h-4 w-4" /> Create Officer Account
          </Button>
        </form>

        {/* Right Directory */}
        <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-2">
            Active Officers Queue
          </span>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="py-3 font-semibold uppercase tracking-wider">Officer</th>
                    <th className="py-3 font-semibold uppercase tracking-wider">Officer ID</th>
                    <th className="py-3 font-semibold uppercase tracking-wider">Department</th>
                    <th className="py-3 font-semibold uppercase tracking-wider text-center">Status</th>
                    <th className="py-3 font-semibold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {officers.map((o) => (
                    <tr key={o._id} className="hover:bg-slate-900/30 text-slate-350">
                      <td className="py-3 font-semibold text-slate-200">{o.fullName}</td>
                      <td className="py-3 font-mono">{o.email}</td>
                      <td className="py-3 text-brand-400 font-medium">{o.department?.name || 'Unassigned'}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                          o.status === 'Suspended' 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleViewStatsClick(o)}
                            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-250 transition-colors"
                            title="View Stats"
                          >
                            <BarChart2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleEditClick(o)}
                            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-250 transition-colors"
                            title="Edit / Transfer Department"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setResettingOfficer(o)}
                            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-255 transition-colors"
                            title="Reset Credentials"
                          >
                            <Key className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setOfficerToToggle(o)}
                            className={`p-1 rounded border transition-colors ${
                              o.status === 'Suspended'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-455 hover:bg-rose-500/20'
                            }`}
                            title={o.status === 'Suspended' ? 'Activate Officer' : 'Suspend Officer'}
                          >
                            {o.status === 'Suspended' ? <UserCheck className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Officer Modal Overlay */}
      {editingOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Edit Municipal Officer</h3>
              <button onClick={() => setEditingOfficer(null)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <Input
                label="Full Name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                required
              />
              <Input
                label="Officer ID (Email)"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
              <Input
                label="Mobile Number"
                type="tel"
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value)}
                required
              />
              <div className="flex flex-col gap-1 w-full bg-slate-950/40 p-3 rounded-lg border border-slate-850 text-xs">
                <span className="text-[10px] text-slate-550 uppercase font-bold tracking-wider">Current Department</span>
                <span className="text-slate-200 font-medium">
                  {editingOfficer?.department?.name || 'Unassigned'}
                </span>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">New Department Assignment</label>
                <select
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-brand-500"
                >
                  <option value="" className="text-slate-550">-- Choose New Department --</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id} className="bg-slate-900 text-slate-250">
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOfficer(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-900 border border-slate-800"
                >
                  Cancel
                </button>
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal Overlay */}
      {resettingOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Reset Officer Credentials</h3>
              <button onClick={() => setResettingOfficer(null)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <p className="text-xs text-slate-400">
                Are you sure you want to reset credentials for <span className="text-slate-200 font-bold">{resettingOfficer.fullName}</span>?
              </p>
              <Input
                label="New Password"
                placeholder="Enter new password (min 6 characters)"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResettingOfficer(null);
                    setNewPassword('');
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-900 border border-slate-800"
                >
                  Cancel
                </button>
                <Button type="submit" disabled={!newPassword.trim()}>
                  Reset Credentials
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Stats Modal Overlay */}
      {statsOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Officer Workload & Stats</h3>
                <span className="text-[11px] text-slate-400 font-medium">Performance metrics for {statsOfficer.fullName}</span>
              </div>
              <button onClick={() => setStatsOfficer(null)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingStats ? (
              <div className="py-12 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              </div>
            ) : statsError ? (
              <p className="text-xs text-rose-500 py-4 text-center">{statsError}</p>
            ) : officerStats ? (
              <div className="space-y-6 pt-2">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Total Assigned</span>
                    <span className="text-2xl font-extrabold text-slate-150">{officerStats.totalAssigned}</span>
                  </div>
                  <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 text-center">
                    <span className="text-[10px] text-amber-500 uppercase font-bold tracking-wider block mb-1">In Progress</span>
                    <span className="text-2xl font-extrabold text-amber-400">{officerStats.inProgress}</span>
                  </div>
                  <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 text-center">
                    <span className="text-[10px] text-emerald-500 uppercase font-bold tracking-wider block mb-1">Resolved</span>
                    <span className="text-2xl font-extrabold text-emerald-400">{officerStats.resolved}</span>
                  </div>
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-750 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Closed</span>
                    <span className="text-2xl font-extrabold text-slate-250">{officerStats.closed || 0}</span>
                  </div>
                </div>

                {/* Additional metrics info/progress bar */}
                <div className="space-y-2 bg-slate-950/20 p-4 rounded-xl border border-slate-850">
                  <div className="flex justify-between text-[11px] font-bold text-slate-450 uppercase tracking-wide">
                    <span>Resolution Rate</span>
                    <span className="text-emerald-400">
                      {officerStats.totalAssigned > 0
                        ? `${Math.round(((officerStats.resolved + (officerStats.closed || 0)) / officerStats.totalAssigned) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-brand-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: officerStats.totalAssigned > 0
                          ? `${((officerStats.resolved + (officerStats.closed || 0)) / officerStats.totalAssigned) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                  {officerStats.escalated > 0 && (
                    <div className="flex justify-between text-[10px] text-rose-450 mt-1 font-semibold">
                      <span>Escalated Issues</span>
                      <span>{officerStats.escalated} Ticket(s)</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setStatsOfficer(null)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-lg transition-all"
                  >
                    Close Overview
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No stats data found for this officer.</p>
            )}
          </div>
        </div>
      )}

      {/* Officer Status Toggle Confirmation Modal */}
      {officerToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                {officerToToggle.status === 'Suspended' ? 'Enable Officer' : 'Disable Officer'}
              </h3>
              <button onClick={() => setOfficerToToggle(null)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <p>
                {officerToToggle.status === 'Suspended' ? (
                  <>Are you sure you want to enable this officer?</>
                ) : (
                  <>
                    Are you sure you want to disable this officer?
                    This officer will no longer receive complaint assignments.
                  </>
                )}
              </p>
              <div className="bg-slate-950/30 p-3 rounded-lg border border-slate-850 text-slate-350">
                <span className="block font-semibold">Officer Name: {officerToToggle.fullName}</span>
                <span className="block text-[11px] text-slate-500">Department: {officerToToggle.department?.name || 'Unassigned'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOfficerToToggle(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-900 border border-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetOfficer = officerToToggle;
                  setOfficerToToggle(null);
                  await handleToggleSuspend(targetOfficer);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  officerToToggle.status === 'Suspended'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                    : 'bg-rose-500 hover:bg-rose-600 text-white'
                }`}
              >
                {officerToToggle.status === 'Suspended' ? 'Enable Officer' : 'Disable Officer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOfficers;
