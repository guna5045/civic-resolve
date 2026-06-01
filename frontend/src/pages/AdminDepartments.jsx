import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Layers, Plus, ShieldCheck } from 'lucide-react';

const AdminDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState('');
  const [head, setHead] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments');
      if (res.data.success) {
        setDepartments(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    if (!name) {
      setError('Department name is required.');
      setCreating(false);
      return;
    }

    try {
      const res = await api.post('/departments', {
        name,
        departmentHead: head,
        description: desc,
      });

      if (res.data.success) {
        setName('');
        setHead('');
        setDesc('');
        fetchDepartments();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create department.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (dept) => {
    setError('');
    const newStatus = dept.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await api.put(`/departments/${dept._id}`, { status: newStatus });
      if (res.data.success) {
        fetchDepartments();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update department status.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Municipal Departments</h2>
        <p className="text-xs text-slate-400">Configure public service departments, manage department heads, and create new active categories.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Create Form */}
        <form onSubmit={handleCreate} className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-2">
            Establish Dynamic Department
          </span>

          <Input
            label="Department Name"
            placeholder="e.g. Sanitation, Roads, Electricity..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Department Head"
            placeholder="e.g. Commissioner Jane Doe..."
            value={head}
            onChange={(e) => setHead(e.target.value)}
          />

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Description</label>
            <textarea
              placeholder="Detail department jurisdictions..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-brand-500"
            />
          </div>

          <Button type="submit" loading={creating} className="w-full flex items-center justify-center gap-1.5">
            <Plus className="h-4 w-4" /> Create Department
          </Button>
        </form>

        {/* Right Side: List */}
        <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-2">
            Configured Departments
          </span>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departments.map((d) => (
                <div key={d._id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 relative space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
                          <Layers className="h-4.5 w-4.5" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-200">{d.name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                        d.status === 'Inactive' 
                          ? 'bg-rose-500/10 text-rose-450 border-rose-500/25' 
                          : 'bg-emerald-500/10 text-emerald-450 border-emerald-500/25'
                      }`}>
                        {d.status || 'Active'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Head: {d.departmentHead || 'Unassigned'}</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{d.description || 'No description provided.'}</p>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleToggleStatus(d)}
                      className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border transition-colors ${
                        d.status === 'Inactive'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-455 hover:bg-rose-500/15'
                      }`}
                    >
                      {d.status === 'Inactive' ? 'Enable' : 'Disable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDepartments;
