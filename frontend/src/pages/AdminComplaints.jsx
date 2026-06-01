import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getStatusBadgeColor, getPriorityBadgeColor, formatDate } from '../utils/formatters';
import { Eye, X, UserCheck, Layers, ClipboardList } from 'lucide-react';
import Button from '../components/common/Button';

const AdminComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [officers, setOfficers] = useState([]);
  
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Administrative adjustment states
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [priority, setPriority] = useState('Medium');

  const fetchData = async () => {
    setLoading(true);
    try {
      const compRes = await api.get('/complaints');
      if (compRes.data.success) {
        setComplaints(compRes.data.data);
      }
      const deptRes = await api.get('/departments');
      if (deptRes.data.success) {
        setDepartments(deptRes.data.data);
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

  // Fetch officers for the department when selecting/changing department
  useEffect(() => {
    const fetchOfficersForDept = async () => {
      if (selectedDeptId) {
        try {
          const offRes = await api.get(`/officers?departmentId=${selectedDeptId}`);
          if (offRes.data.success) {
            setOfficers(offRes.data.data);
            if (offRes.data.data.length > 0) {
              setSelectedOfficerId(offRes.data.data[0]._id);
            } else {
              setSelectedOfficerId('');
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchOfficersForDept();
  }, [selectedDeptId]);

  const handleSelect = (c) => {
    setSelectedComplaint(c);
    setSelectedDeptId(c.department?._id || '');
    setSelectedOfficerId(c.assignedOfficer?._id || '');
    setPriority(c.priority || 'Medium');
  };

  const handleReassign = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.patch(`/admin/complaints/${selectedComplaint._id}/assign`, {
        departmentId: selectedDeptId,
        officerId: selectedOfficerId || null,
        priority: priority,
      });

      if (res.data.success) {
        setSelectedComplaint(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed administrative reassignment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 relative">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Complaints Administration</h2>
        <p className="text-xs text-slate-400">Reassign municipal complaints, escalate priority levels, and track resolution progress.</p>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="glass-panel rounded-xl border border-slate-800 py-16 text-center text-sm text-slate-500">
          No complaints registered in the system database.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {complaints.map((c) => (
            <div key={c._id} className="glass-panel rounded-xl border border-slate-800 p-5 flex flex-col justify-between glass-panel-hover">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest bg-brand-500/10 px-2.5 py-0.5 rounded-full border border-brand-500/20">
                    {c.category}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getStatusBadgeColor(c.status)}`}>
                    {c.status}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-100 line-clamp-1">{c.title}</h4>
                <p className="text-[11px] text-slate-550 mb-2">ID: {c.complaintId} | Sector: {c.department?.name}</p>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">{c.description}</p>
              </div>

              <div className="border-t border-slate-800/40 pt-4 flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-400">{c.assignedOfficer ? c.assignedOfficer.fullName : 'Unassigned'}</span>
                <button
                  onClick={() => handleSelect(c)}
                  className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 hover:underline"
                >
                  <Eye className="h-3.5 w-3.5" /> Adjust &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Side reassignment overlay */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <div className="flex-1" onClick={() => setSelectedComplaint(null)} />

          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-850 bg-slate-950/40">
              <div>
                <h3 className="text-base font-bold text-slate-100">Adjust Ticket Details</h3>
                <span className="text-xs text-slate-400">ID: {selectedComplaint.complaintId}</span>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleReassign} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Info panel */}
              <div className="space-y-1 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                <h5 className="text-xs font-bold text-slate-250">{selectedComplaint.title}</h5>
                <p className="text-[11px] text-slate-400">{selectedComplaint.description}</p>
              </div>

              {/* Department assignment selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Sector Department</label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-brand-500"
                >
                  {departments.map((d) => (
                    <option key={d._id} value={d._id} className="bg-slate-900 text-slate-200">
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Officer assignment selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Assigned Department Officer</label>
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-brand-500"
                >
                  <option value="" className="bg-slate-900 text-slate-450">
                    -- Leave Unassigned --
                  </option>
                  {officers.map((o) => (
                    <option key={o._id} value={o._id} className="bg-slate-900 text-slate-200">
                      {o.fullName} ({o.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-brand-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <Button type="submit" loading={submitting} className="w-full flex justify-center items-center gap-1.5 mt-4">
                <UserCheck className="h-4 w-4" /> Save Administrative Updates
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminComplaints;
