import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Users, Plus, ShieldCheck, Edit, Key, Ban, UserCheck, X } from 'lucide-react';

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

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

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
                            onClick={() => handleToggleSuspend(o)}
                            className={`p-1 rounded border transition-colors ${
                              o.status === 'Suspended'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-450 hover:bg-rose-500/20'
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
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Department Assignment</label>
                <select
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-brand-500"
                >
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
    </div>
  );
};

export default AdminOfficers;
