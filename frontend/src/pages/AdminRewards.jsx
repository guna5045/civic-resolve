import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getBadgeIcon } from '../utils/formatters';
import { 
  Award, 
  Plus, 
  Edit2, 
  ToggleLeft, 
  ToggleRight, 
  X, 
  Check, 
  Sparkles, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

const AdminRewards = () => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [requirement, setRequirement] = useState('');
  const [pointsReward, setPointsReward] = useState(100);
  const [icon, setIcon] = useState('first_reporter');
  const [isSeasonal, setIsSeasonal] = useState(false);
  const [seasonalMonth, setSeasonalMonth] = useState('');

  const fetchBadges = async () => {
    setLoading(true);
    try {
      const res = await api.get('/badges');
      if (res.data.success) {
        setBadges(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load badges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, []);

  const resetForm = () => {
    setName('');
    setDescription('');
    setRequirement('');
    setPointsReward(100);
    setIcon('first_reporter');
    setIsSeasonal(false);
    setSeasonalMonth('');
    setError('');
  };

  const handleOpenEdit = (badge) => {
    setSelectedBadge(badge);
    setName(badge.name);
    setDescription(badge.description);
    setRequirement(badge.requirement);
    setPointsReward(badge.pointsReward);
    setIcon(badge.icon || 'first_reporter');
    setIsSeasonal(badge.isSeasonal || false);
    setSeasonalMonth(badge.seasonalMonth !== null && badge.seasonalMonth !== undefined ? String(badge.seasonalMonth) : '');
    setError('');
    setShowEditModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !description || !requirement) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/admin/badges', {
        name,
        description,
        requirement,
        pointsReward: Number(pointsReward),
        icon,
        isSeasonal,
        seasonalMonth: isSeasonal && seasonalMonth !== '' ? Number(seasonalMonth) : null
      });

      if (res.data.success) {
        setShowCreateModal(false);
        resetForm();
        fetchBadges();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create badge.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!name || !description || !requirement) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.put(`/admin/badges/${selectedBadge._id}`, {
        name,
        description,
        requirement,
        pointsReward: Number(pointsReward),
        icon,
        isSeasonal,
        seasonalMonth: isSeasonal && seasonalMonth !== '' ? Number(seasonalMonth) : null
      });

      if (res.data.success) {
        setShowEditModal(false);
        setSelectedBadge(null);
        resetForm();
        fetchBadges();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save edits.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (badge) => {
    try {
      const res = await api.put(`/admin/badges/${badge._id}`, {
        isActive: !badge.isActive
      });
      if (res.data.success) {
        fetchBadges();
      }
    } catch (err) {
      console.error('Failed to toggle badge active status:', err);
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">Citizen Rewards & Gamification</h2>
          <p className="text-xs text-slate-400">Centrally configure digital reputation achievements, badge icons, and XP milestone parameters.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="rounded-lg px-4 py-2.5 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-slate-950 transition-all flex items-center gap-1.5 shadow-lg shadow-brand-500/10 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Create New Reward
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((b) => (
            <div
              key={b._id}
              className={`glass-panel rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 ${
                b.isActive 
                  ? 'border-brand-500/20 bg-slate-950/20 hover:border-brand-500/30' 
                  : 'border-slate-800/60 bg-slate-950/5 opacity-55 hover:border-slate-800'
              }`}
            >
              <div>
                {/* Header details */}
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl filter drop-shadow select-none">
                    {getBadgeIcon(b.icon)}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    b.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-450 border-rose-500/20'
                  }`}>
                    {b.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Name & description */}
                <h4 className="text-base font-bold text-slate-100">{b.name}</h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{b.description}</p>
              </div>

              {/* Requirement & XP */}
              <div className="mt-4 border-t border-slate-850 pt-3 flex items-center justify-between text-[11px] text-slate-500">
                <div>
                  <span className="block text-[8px] text-slate-550 font-bold uppercase tracking-wider">Requirement</span>
                  <span className="text-slate-350 font-medium">{b.requirement}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[8px] text-slate-550 font-bold uppercase tracking-wider">Points Reward</span>
                  <span className="text-brand-405 font-bold">+{b.pointsReward} XP</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-5 pt-3.5 border-t border-slate-850 flex items-center justify-between gap-4">
                <button
                  onClick={() => handleOpenEdit(b)}
                  className="rounded-lg p-2 text-xs font-bold bg-slate-900 border border-slate-800 hover:border-brand-500/40 text-slate-300 hover:text-slate-100 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit Parameters
                </button>

                <button
                  onClick={() => handleToggleActive(b)}
                  className={`rounded-lg px-3 py-2 text-[10px] uppercase font-bold tracking-wider transition-all flex items-center gap-1 cursor-pointer border ${
                    b.isActive
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  {b.isActive ? (
                    <>
                      <ToggleRight className="h-4 w-4" /> Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4" /> Reactivate
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
            <div className="px-6 py-4.5 border-b border-slate-850 bg-slate-950/20 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Award className="h-5 w-5 text-brand-400" /> Create Civic Reward
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Input
                label="Reward / Badge Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. First Reporter, Voice of Community"
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the descriptive message citizens read when unlocking this reward..."
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-brand-500 text-slate-205"
                  rows={2}
                  required
                />
              </div>

              <Input
                label="Requirement Trigger Description *"
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="e.g. Submit 1st Complaint, Support 10 Issues"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Points Awarded (XP) *"
                  type="number"
                  value={pointsReward}
                  onChange={(e) => setPointsReward(e.target.value)}
                  required
                />
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Badge Icon Style</label>
                  <select
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-brand-500 text-slate-205"
                  >
                    <option value="first_reporter">📢 Announcement (first_reporter)</option>
                    <option value="voice_of_community">🗣️ Speech (voice_of_community)</option>
                    <option value="problem_solver">🛠️ Tools (problem_solver)</option>
                    <option value="active_citizen">🔥 Fire Streak (active_citizen)</option>
                    <option value="neighborhood_guardian">🛡️ Shield (neighborhood_guardian)</option>
                    <option value="civic_champion">🏆 Trophy (civic_champion)</option>
                    <option value="default">🎖️ Medal (Default)</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-850 pt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Seasonal Event Reward</span>
                  <span className="text-[9px] text-slate-500">Only award this reward during certain periods of the year</span>
                </div>
                <input
                  type="checkbox"
                  checked={isSeasonal}
                  onChange={(e) => setIsSeasonal(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-800 bg-slate-950 text-brand-500 focus:ring-brand-500"
                />
              </div>

              {isSeasonal && (
                <div className="animate-fade-in">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Active Seasonal Month</label>
                  <select
                    value={seasonalMonth}
                    onChange={(e) => setSeasonalMonth(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-brand-500 text-slate-205"
                  >
                    <option value="">Select Month</option>
                    <option value="0">January</option>
                    <option value="1">February</option>
                    <option value="2">March</option>
                    <option value="3">April</option>
                    <option value="4">May</option>
                    <option value="5">June</option>
                    <option value="6">July</option>
                    <option value="7">August</option>
                    <option value="8">September</option>
                    <option value="9">October</option>
                    <option value="10">November</option>
                    <option value="11">December</option>
                  </select>
                </div>
              )}

              <div className="border-t border-slate-850 pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <Button type="submit" loading={submitting}>
                  Create Reward
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
            <div className="px-6 py-4.5 border-b border-slate-850 bg-slate-950/20 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Edit2 className="h-4.5 w-4.5 text-brand-400" /> Edit Reward Parameters
              </h3>
              <button onClick={() => { setShowEditModal(false); setSelectedBadge(null); }} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Input
                label="Reward / Badge Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. First Reporter, Voice of Community"
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the descriptive message..."
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-brand-500 text-slate-205"
                  rows={2}
                  required
                />
              </div>

              <Input
                label="Requirement Trigger Description *"
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="e.g. Submit 1st Complaint, Support 10 Issues"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Points Awarded (XP) *"
                  type="number"
                  value={pointsReward}
                  onChange={(e) => setPointsReward(e.target.value)}
                  required
                />
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Badge Icon Style</label>
                  <select
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-brand-500 text-slate-205"
                  >
                    <option value="first_reporter">📢 Announcement (first_reporter)</option>
                    <option value="voice_of_community">🗣️ Speech (voice_of_community)</option>
                    <option value="problem_solver">🛠️ Tools (problem_solver)</option>
                    <option value="active_citizen">🔥 Fire Streak (active_citizen)</option>
                    <option value="neighborhood_guardian">🛡️ Shield (neighborhood_guardian)</option>
                    <option value="civic_champion">🏆 Trophy (civic_champion)</option>
                    <option value="default">🎖️ Medal (Default)</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-850 pt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Seasonal Event Reward</span>
                  <span className="text-[9px] text-slate-550">Only award this reward during certain periods of the year</span>
                </div>
                <input
                  type="checkbox"
                  checked={isSeasonal}
                  onChange={(e) => setIsSeasonal(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-800 bg-slate-950 text-brand-500 focus:ring-brand-500"
                />
              </div>

              {isSeasonal && (
                <div className="animate-fade-in">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Active Seasonal Month</label>
                  <select
                    value={seasonalMonth}
                    onChange={(e) => setSeasonalMonth(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-brand-500 text-slate-205"
                  >
                    <option value="">Select Month</option>
                    <option value="0">January</option>
                    <option value="1">February</option>
                    <option value="2">March</option>
                    <option value="3">April</option>
                    <option value="4">May</option>
                    <option value="5">June</option>
                    <option value="6">July</option>
                    <option value="7">August</option>
                    <option value="8">September</option>
                    <option value="9">October</option>
                    <option value="10">November</option>
                    <option value="11">December</option>
                  </select>
                </div>
              )}

              <div className="border-t border-slate-850 pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedBadge(null); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <Button type="submit" loading={submitting}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminRewards;
