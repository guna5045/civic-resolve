import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';

const AdminSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    supportRadiusMeters: 100,
    escalationRulesDays: 15,
    pointValues: { report: 20, support: 5, resolved: 30 }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/settings');
      if (res.data.success) {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await api.put('/admin/settings', settings);
      if (res.data.success) {
        setSettings(res.data.data);
        setMessage('System settings updated successfully.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handlePointChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      pointValues: {
        ...prev.pointValues,
        [key]: parseInt(value) || 0
      }
    }));
  };

  return (
    <div className="space-y-8 max-w-xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Governance Settings</h2>
        <p className="text-xs text-slate-400">Configure administrative parameters, gamification reward points, and proximity thresholds.</p>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs font-semibold text-emerald-400">
          <CheckCircle className="h-4 w-4" /> {message}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-semibold text-rose-400">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Rules Section */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-2">
              System Parameters
            </span>

            <Input
              label="Proximity Support Radius (Meters)"
              type="number"
              value={settings.supportRadiusMeters}
              onChange={(e) => setSettings({ ...settings, supportRadiusMeters: parseInt(e.target.value) || 0 })}
              required
            />
          </div>

          {/* AI Settings Section */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-2">
              AI Management Control Center
            </span>

            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-xs font-bold text-slate-250 block uppercase tracking-wider">Enable Gemini AI Features</label>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  When enabled, Google Gemini is used to summarize issues, suggest categories, and assess priority. When disabled, the local Fallback Engine runs without API requests.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, aiEnabled: !settings.aiEnabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.aiEnabled ? 'bg-brand-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.aiEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 text-xs flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">AI Operational Mode</span>
                <p className="text-slate-200 font-bold mt-0.5">
                  {settings.aiEnabled ? 'AI Active' : 'Fallback Engine Active'}
                </p>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                settings.aiEnabled 
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                  : 'text-amber-450 bg-amber-500/10 border border-amber-500/20'
              }`}>
                {settings.aiEnabled ? 'Google Gemini' : 'Local Rule Engine'}
              </span>
            </div>
          </div>

          {/* Gamification Points Section */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-2">
              Citizen Gamification XP Rewards
            </span>

            <Input
              label="XP for Reporting a Complaint"
              type="number"
              value={settings.pointValues?.report}
              onChange={(e) => handlePointChange('report', e.target.value)}
              required
            />

            <Input
              label="XP for Supporting / Upvoting an Issue"
              type="number"
              value={settings.pointValues?.support}
              onChange={(e) => handlePointChange('support', e.target.value)}
              required
            />

            <Input
              label="XP for Accepted Resolved Issue"
              type="number"
              value={settings.pointValues?.resolved}
              onChange={(e) => handlePointChange('resolved', e.target.value)}
              required
            />
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-2">
              Administrative Account
            </span>

            <Input
              label="Administrator Name"
              value={user?.fullName || 'City Admin'}
              disabled
            />

            <Input
              label="Admin Email/ID"
              value={user?.email || 'admin@civic.gov'}
              disabled
            />

            <Input
              label="Profile Role Privilege"
              value={user?.role || 'Admin'}
              disabled
            />
          </div>

          <Button type="submit" loading={saving} className="w-full flex items-center justify-center gap-1.5">
            <Save className="h-4 w-4" /> Save Configuration Parameters
          </Button>
        </form>
      )}
    </div>
  );
};

export default AdminSettings;
