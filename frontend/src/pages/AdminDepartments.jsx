import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Layers, Plus, ShieldCheck, Edit, X, TrendingUp, Users, ArrowRightLeft, ShieldAlert, CheckCircle, BarChart2 } from 'lucide-react';

const getIconComponent = (iconName) => {
  switch (iconName) {
    case 'ShieldCheck': return ShieldCheck;
    case 'Users': return Users;
    case 'TrendingUp': return TrendingUp;
    case 'BarChart2': return BarChart2;
    default: return Layers;
  }
};

const AdminDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Creation / Edit Form states
  const [name, setName] = useState('');
  const [head, setHead] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Other');
  const [color, setColor] = useState('#3b82f6');
  const [icon, setIcon] = useState('Layers');
  const [creating, setCreating] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Deactivate/Reactivate Confirmation states
  const [deptToToggle, setDeptToToggle] = useState(null);

  // Statistics Panel Drawer states
  const [selectedDeptForPanel, setSelectedDeptForPanel] = useState(null);
  const [deptStats, setDeptStats] = useState(null);
  const [deptOfficers, setDeptOfficers] = useState([]);
  const [allOfficers, setAllOfficers] = useState([]);
  const [selectedOfficerForTransfer, setSelectedOfficerForTransfer] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments');
      if (res.data.success) {
        setDepartments(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch departments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    if (!name) {
      setError('Department name is required.');
      setCreating(false);
      return;
    }

    try {
      if (editingDept) {
        // Edit Department
        const res = await api.put(`/departments/${editingDept._id}`, {
          name,
          departmentHead: head,
          description: desc,
          category,
          color,
          icon,
        });
        if (res.data.success) {
          setEditingDept(null);
          setName('');
          setHead('');
          setDesc('');
          setCategory('Other');
          setColor('#3b82f6');
          setIcon('Layers');
          fetchDepartments();
        }
      } else {
        // Create Department
        const res = await api.post('/departments', {
          name,
          departmentHead: head,
          description: desc,
          category,
          color,
          icon,
        });
        if (res.data.success) {
          setName('');
          setHead('');
          setDesc('');
          setCategory('Other');
          setColor('#3b82f6');
          setIcon('Layers');
          fetchDepartments();
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process department details.');
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (dept) => {
    setEditingDept(dept);
    setName(dept.name);
    setHead(dept.departmentHead || '');
    setDesc(dept.description || '');
    setCategory(dept.category || 'Other');
    setColor(dept.color || '#3b82f6');
    setIcon(dept.icon || 'Layers');
    // Scroll form into view
    document.getElementById('department-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingDept(null);
    setName('');
    setHead('');
    setDesc('');
    setCategory('Other');
    setColor('#3b82f6');
    setIcon('Layers');
  };

  const handleToggleStatus = async (dept) => {
    setError('');
    const newStatus = dept.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await api.put(`/departments/${dept._id}`, { status: newStatus });
      if (res.data.success) {
        fetchDepartments();
        if (selectedDeptForPanel && selectedDeptForPanel._id === dept._id) {
          setSelectedDeptForPanel({ ...selectedDeptForPanel, status: newStatus });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update department status.');
    }
  };

  const handleOpenPanel = async (dept) => {
    setSelectedDeptForPanel(dept);
    setLoadingStats(true);
    setDeptStats(null);
    setDeptOfficers([]);
    setSelectedOfficerForTransfer('');
    
    try {
      // 1. Fetch Stats
      const statsRes = await api.get(`/departments/${dept._id}/stats`);
      if (statsRes.data.success) {
        setDeptStats(statsRes.data.data.stats);
      }
      
      // 2. Fetch Officers in Department
      const offRes = await api.get(`/officers?departmentId=${dept._id}`);
      if (offRes.data.success) {
        setDeptOfficers(offRes.data.data);
      }

      // 3. Fetch All Officers to allow transferring
      const allOffRes = await api.get('/officers');
      if (allOffRes.data.success) {
        setAllOfficers(allOffRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load department panel details:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleTransferOfficer = async (e) => {
    e.preventDefault();
    if (!selectedOfficerForTransfer) return;
    setTransferring(true);
    setError('');
    try {
      const res = await api.put(`/admin/officers/${selectedOfficerForTransfer}`, {
        departmentId: selectedDeptForPanel._id,
      });
      if (res.data.success) {
        setSelectedOfficerForTransfer('');
        // Refresh panel data
        await handleOpenPanel(selectedDeptForPanel);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to transfer officer.');
    } finally {
      setTransferring(false);
    }
  };

  // Filter officers who do not currently belong to the selected department
  const transferrableOfficers = allOfficers.filter(
    (o) => !deptOfficers.some((doff) => doff._id === o._id) && o.status === 'Active'
  );

  // Filter departments based on search term and status
  const filteredDepartments = departments.filter((d) => {
    const matchesSearch = 
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.departmentHead?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'All' || 
      (statusFilter === 'Active' && d.status !== 'Inactive') || 
      (statusFilter === 'Inactive' && d.status === 'Inactive');
      
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Municipal Departments</h2>
        <p className="text-xs text-slate-400">Configure public service departments, manage department heads, and track organizational metrics.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Create/Edit Form */}
        <form 
          id="department-form"
          onSubmit={handleCreateOrUpdate} 
          className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 p-6 space-y-4"
        >
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-2">
            {editingDept ? `Edit Department: ${editingDept.name}` : 'Establish Dynamic Department'}
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
            <label className="text-xs font-semibold text-slate-330 uppercase tracking-wider">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-brand-500"
              required
            >
              <option value="Roads" className="bg-slate-900">Roads</option>
              <option value="Water Supply" className="bg-slate-900">Water Supply</option>
              <option value="Electricity" className="bg-slate-900">Electricity</option>
              <option value="Sanitation" className="bg-slate-900">Sanitation</option>
              <option value="Public Safety" className="bg-slate-900">Public Safety</option>
              <option value="Other" className="bg-slate-900">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-slate-330 uppercase tracking-wider">Color Accent</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 rounded border border-slate-800 bg-slate-950 p-1 cursor-pointer"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-brand-500 font-mono"
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-slate-330 uppercase tracking-wider">Icon Representative</label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-brand-500"
              >
                <option value="Layers" className="bg-slate-900">Layers</option>
                <option value="ShieldCheck" className="bg-slate-900">Shield</option>
                <option value="Users" className="bg-slate-900">Users</option>
                <option value="TrendingUp" className="bg-slate-900">Trending</option>
                <option value="BarChart2" className="bg-slate-900">Chart</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-slate-330 uppercase tracking-wider">Description</label>
            <textarea
              placeholder="Detail department jurisdictions..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-brand-500 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" loading={creating} className="flex-1 flex items-center justify-center gap-1.5">
              {editingDept ? <ShieldCheck className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingDept ? 'Save Changes' : 'Create Department'}
            </Button>
            {editingDept && (
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleCancelEdit}
                className="flex items-center gap-1"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>

        {/* Right Side: List */}
        <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-805 pb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Configured Departments
            </span>

            {/* Search and Filter Inputs */}
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-brand-500 w-full sm:w-36"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-brand-500"
              >
                <option value="All" className="bg-slate-900">All</option>
                <option value="Active" className="bg-slate-900">Active</option>
                <option value="Inactive" className="bg-slate-900">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">No departments match your filters.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDepartments.map((d) => {
                const DeptIcon = getIconComponent(d.icon);
                return (
                  <div key={d._id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 relative space-y-3 flex flex-col justify-between hover:border-slate-700 transition-all">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="p-1.5 rounded-lg border text-xs"
                            style={{
                              backgroundColor: `${d.color || '#3b82f6'}15`,
                              borderColor: `${d.color || '#3b82f6'}30`,
                              color: d.color || '#3b82f6'
                            }}
                          >
                            <DeptIcon className="h-4.5 w-4.5" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-200 truncate max-w-[120px]" title={d.name}>{d.name}</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                          d.status === 'Inactive' 
                            ? 'bg-rose-500/10 text-rose-455 border-rose-500/25' 
                            : 'bg-emerald-500/10 text-emerald-455 border-emerald-500/25'
                        }`}>
                          {d.status || 'Active'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Head: {d.departmentHead || 'Unassigned'}</span>
                      {d.category && (
                        <span className="text-[8px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded font-mono">
                          Category: {d.category}
                        </span>
                      )}
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{d.description || 'No description provided.'}</p>
                    </div>
                    
                    <div className="pt-2 flex justify-between items-center border-t border-slate-800/40">
                      <button
                        onClick={() => handleOpenPanel(d)}
                        className="text-[10px] font-bold text-brand-450 hover:text-brand-350 hover:underline flex items-center gap-1"
                      >
                        <BarChart2 className="h-3.5 w-3.5" /> Manage & Stats
                      </button>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditClick(d)}
                          className="text-[9px] font-bold uppercase p-1 hover:text-slate-100 text-slate-400 transition-colors"
                          title="Edit Department"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeptToToggle(d)}
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border transition-colors ${
                            d.status === 'Inactive'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-450 hover:bg-rose-500/15'
                          }`}
                        >
                          {d.status === 'Inactive' ? 'Enable' : 'Disable'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Stats and Officer Management Drawer Panel */}
      {selectedDeptForPanel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <div className="flex-1 animate-fade-in" onClick={() => setSelectedDeptForPanel(null)} />

          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between overflow-hidden shadow-2xl animate-slide-in-right">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-850 bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">{selectedDeptForPanel.name}</h3>
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    selectedDeptForPanel.status === 'Inactive' 
                      ? 'bg-rose-500/10 text-rose-450 border-rose-500/25' 
                      : 'bg-emerald-500/10 text-emerald-450 border-emerald-500/25'
                  }`}>
                    {selectedDeptForPanel.status || 'Active'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDeptForPanel(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Description & Metadata */}
              <div className="space-y-2 bg-slate-950/40 p-4 rounded-xl border border-slate-850 text-xs">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Jurisdiction Details</span>
                <p className="text-slate-300 leading-relaxed">{selectedDeptForPanel.description || 'No description provided.'}</p>
                <span className="text-[10px] text-slate-400 block font-semibold pt-1 border-t border-slate-800/40 mt-2">
                  Head of Department: <span className="text-brand-400">{selectedDeptForPanel.departmentHead || 'Unassigned'}</span>
                </span>
              </div>

              {/* Statistics Dashboard */}
              <div className="space-y-3.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-850 pb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-slate-500" /> Department Performance
                </span>
                
                {loadingStats ? (
                  <div className="py-6 flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
                  </div>
                ) : deptStats ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-3 text-center">
                      <span className="text-[9px] uppercase tracking-wider text-slate-550 block font-bold">Total Complaints</span>
                      <span className="text-xl font-bold text-slate-200 mt-1 block">{deptStats.totalComplaints}</span>
                    </div>
                    <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-3 text-center">
                      <span className="text-[9px] uppercase tracking-wider text-slate-550 block font-bold">Active (Pending)</span>
                      <span className="text-xl font-bold text-amber-400 mt-1 block">{deptStats.pendingComplaints}</span>
                    </div>
                    <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-3 text-center">
                      <span className="text-[9px] uppercase tracking-wider text-slate-550 block font-bold">Resolved</span>
                      <span className="text-xl font-bold text-emerald-450 mt-1 block">{deptStats.resolvedComplaints}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center">No metrics available.</p>
                )}
              </div>

              {/* Officers Queue */}
              <div className="space-y-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-850 pb-2 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-slate-500" /> Active Department Officers ({deptOfficers.length})
                </span>

                {loadingStats ? (
                  <div className="py-6 flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
                  </div>
                ) : deptOfficers.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500 bg-slate-950/20 border border-dashed border-slate-800 rounded-xl">
                    No officers assigned to this department.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {deptOfficers.map((o) => (
                      <div key={o._id} className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-brand-400 uppercase">
                          {o.fullName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{o.fullName}</p>
                          <p className="text-[10px] text-slate-500 truncate">{o.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transfer/Assign Officer */}
              {selectedDeptForPanel.status !== 'Inactive' && (
                <div className="space-y-3.5 bg-slate-950/30 border border-slate-850 rounded-2xl p-4.5">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                    <ArrowRightLeft className="h-4 w-4 text-brand-400" /> Transfer / Route Officer Here
                  </span>
                  
                  <form onSubmit={handleTransferOfficer} className="flex gap-3">
                    <select
                      value={selectedOfficerForTransfer}
                      onChange={(e) => setSelectedOfficerForTransfer(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-brand-500"
                    >
                      <option value="" className="text-slate-500">-- Choose Officer --</option>
                      {transferrableOfficers.map((o) => (
                        <option key={o._id} value={o._id} className="bg-slate-900 text-slate-250">
                          {o.fullName} ({o.departmentName || 'No Department'})
                        </option>
                      ))}
                    </select>
                    <Button 
                      type="submit" 
                      loading={transferring} 
                      disabled={!selectedOfficerForTransfer}
                      className="text-xs px-4"
                    >
                      Transfer
                    </Button>
                  </form>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Select an active officer to transfer them from their current department queue into this department.
                  </p>
                </div>
              )}
            </div>
            
            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-slate-850 bg-slate-950/20 text-right">
              <Button onClick={() => setSelectedDeptForPanel(null)}>Close Panel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Department Status Toggle Confirmation Modal */}
      {deptToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                {deptToToggle.status === 'Inactive' ? 'Reactivate Department' : 'Deactivate Department'}
              </h3>
              <button onClick={() => setDeptToToggle(null)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              {deptToToggle.status === 'Inactive' ? (
                <>
                  Are you sure you want to reactivate the <span className="text-slate-200 font-bold">{deptToToggle.name}</span>?
                  This will allow officers belonging to this department to receive new complaint assignments.
                </>
              ) : (
                <>
                  Are you sure you want to deactivate the <span className="text-slate-200 font-bold">{deptToToggle.name}</span>?
                  Officers assigned to this department will stop receiving new assignments.
                </>
              )}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeptToToggle(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-900 border border-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetDept = deptToToggle;
                  setDeptToToggle(null);
                  await handleToggleStatus(targetDept);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  deptToToggle.status === 'Inactive'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                    : 'bg-rose-500 hover:bg-rose-600 text-white'
                }`}
              >
                {deptToToggle.status === 'Inactive' ? 'Reactivate' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDepartments;
