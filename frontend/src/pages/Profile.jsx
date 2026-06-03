import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { getBadgeIcon } from '../utils/formatters';
import { User, Mail, Phone, Award, Shield, Settings } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import { AccessibilityContext } from '../context/AccessibilityContext';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const { locale, changeLanguage, t } = useContext(LanguageContext);
  const { theme, setTheme } = useContext(ThemeContext);
  const {
    textSizeScale,
    contrastMode,
    highlightLinks,
    setContrastMode,
    setHighlightLinks,
    increaseText,
    decreaseText,
    resetText
  } = useContext(AccessibilityContext);

  const [stats, setStats] = useState({
    reported: 0,
    supported: 0,
    resolved: 0,
  });

  const fetchProfileStats = async () => {
    if (!user) return;
    try {
      const res = await api.get('/complaints');
      if (res.data.success) {
        const list = res.data.data;
        const reported = list.filter(c => String(c.citizen?._id || c.citizen) === String(user._id)).length;
        const resolved = list.filter(c => String(c.citizen?._id || c.citizen) === String(user._id) && ['Resolved', 'Closed'].includes(c.status)).length;
        
        let supported = 0;
        for (const c of list) {
          try {
            const checkRes = await api.get(`/complaints/${c._id}/supported`);
            if (checkRes.data.supported) {
              supported++;
            }
          } catch (e) {
            console.error(e);
          }
        }
        setStats({ reported, supported, resolved });
      }
    } catch (err) {
      console.error('Error fetching profile stats:', err);
    }
  };

  useEffect(() => {
    const initProfile = async () => {
      await refreshUser();
    };
    initProfile();
  }, []);

  useEffect(() => {
    if (user && user.role === 'Citizen') {
      fetchProfileStats();
    }
  }, [user]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">{t('profile.title')}</h2>
        <p className="text-xs text-slate-400">{t('profile.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Profile details and stats */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-20 w-20 rounded-full bg-brand-500/10 border-2 border-brand-500/30 flex items-center justify-center text-3xl font-bold text-brand-400">
                {user?.fullName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">{user?.fullName}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  {user?.role}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-800/40 pt-5 space-y-3 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-200">{user?.email}</span>
                </div>
                {user?.emailVerified ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">
                    Verified
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-450 border border-amber-500/20">
                    Unverified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-500" />
                <span className="text-slate-200">{user?.mobile || 'N/A'}</span>
              </div>
              {user?.department && (
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-200">{user?.department?.name}</span>
                </div>
              )}

              {/* Security & Authentication Details */}
              <div className="border-t border-slate-800/40 pt-3 mt-3 space-y-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 uppercase tracking-wider font-semibold">Auth Method</span>
                  <span className="text-slate-300 font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-850">
                    {user?.authMethod || 'Local'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 uppercase tracking-wider font-semibold">Member Since</span>
                  <span className="text-slate-300 font-medium">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Citizen Stats Card */}
            {user?.role === 'Citizen' && (
              <div className="border-t border-slate-800/40 pt-5 space-y-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2">{t('profile.civicActivity')}</span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg border border-slate-850 bg-slate-950/20">
                    <span className="text-slate-500 text-[10px] block">{t('profile.reported')}</span>
                    <span className="text-sm font-bold text-slate-250">{stats.reported}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-850 bg-slate-950/20">
                    <span className="text-slate-500 text-[10px] block">{t('profile.supported')}</span>
                    <span className="text-sm font-bold text-slate-250">{stats.supported}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-850 bg-slate-950/20">
                    <span className="text-slate-500 text-[10px] block">{t('profile.resolved')}</span>
                    <span className="text-sm font-bold text-emerald-450">{stats.resolved}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preferences, accessibility and badges */}
        <div className="lg:col-span-7 space-y-6">
          {/* Preferences & Accessibility Panel */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-805 pb-3">
              <Settings className="h-5 w-5 text-brand-400" />
              <h4 className="text-sm font-bold text-slate-200">{t('profile.preferences')}</h4>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{t('profile.language')}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'hi', label: 'हिंदी' },
                  { code: 'te', label: 'తెలుగు' },
                  { code: 'ta', label: 'தமிழ்' },
                  { code: 'kn', label: 'ಕನ್ನಡ' },
                  { code: 'ml', label: 'മലയാളം' }
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`py-1.5 px-2.5 text-xs font-semibold rounded-lg border transition-all ${
                      locale === lang.code
                        ? 'bg-brand-500/20 border-brand-500/40 text-brand-400 shadow-md animate-pulse'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme and link highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{t('profile.theme')}</label>
                <div className="flex gap-2">
                  {[
                    { mode: 'dark', label: 'Dark Mode' },
                    { mode: 'light', label: 'Light Mode' }
                  ].map((tMode) => (
                    <button
                      key={tMode.mode}
                      onClick={() => setTheme(tMode.mode)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        theme === tMode.mode
                          ? 'bg-brand-500/20 border-brand-500/40 text-brand-400'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                      }`}
                    >
                      {tMode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{t('profile.visualAid')}</label>
                <button
                  onClick={() => setHighlightLinks(!highlightLinks)}
                  className={`w-full py-2 text-xs font-semibold rounded-lg border transition-all ${
                    highlightLinks
                      ? 'bg-brand-500/20 border-brand-500/40 text-brand-400'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-900/60'
                  }`}
                >
                  {highlightLinks ? 'High Contrast Links ON' : 'Normal Link Contrast'}
                </button>
              </div>
            </div>

            {/* Accessibility text & contrast panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/40 pt-4">
              {/* Text Sizing */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{t('profile.textScaling')}</label>
                  <span className="text-[10px] font-bold text-brand-400">{Math.round(textSizeScale * 100)}%</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={decreaseText}
                    disabled={textSizeScale <= 0.7}
                    className="py-1.5 bg-slate-950/40 border border-slate-800 text-xs font-bold rounded-lg text-slate-350 hover:bg-slate-800/80 active:scale-95 disabled:opacity-50"
                  >
                    -
                  </button>
                  <button
                    onClick={resetText}
                    className="py-1.5 bg-slate-950/40 border border-slate-800 text-xs font-bold rounded-lg text-slate-350 hover:bg-slate-800/80 active:scale-95"
                  >
                    Reset
                  </button>
                  <button
                    onClick={increaseText}
                    disabled={textSizeScale >= 1.3}
                    className="py-1.5 bg-slate-950/40 border border-slate-800 text-xs font-bold rounded-lg text-slate-350 hover:bg-slate-800/80 active:scale-95 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Contrast mode */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{t('profile.contrastFilter')}</label>
                <select
                  value={contrastMode}
                  onChange={(e) => setContrastMode(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-brand-500 text-[11px]"
                >
                  <option value="normal" className="bg-slate-900">{t('profile.normalContrast')}</option>
                  <option value="high" className="bg-slate-900">{t('profile.highContrast')}</option>
                  <option value="dark" className="bg-slate-900">{t('profile.darkContrast')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reputation and Badges (Citizen only) */}
          {user?.role === 'Citizen' && (
            <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-805 pb-3">
                <Award className="h-5 w-5 text-brand-400" />
                <h4 className="text-sm font-bold text-slate-200">{t('profile.earnedBadgesTitle')}</h4>
              </div>

              {user?.earnedBadges?.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">{t('profile.noBadges')}</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {user?.earnedBadges?.map((eb, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/20 text-center space-y-1.5 hover:border-brand-500/20 transition-all">
                      <span className="text-3xl block filter drop-shadow">{getBadgeIcon(eb.badge?.icon)}</span>
                      <span className="text-xs font-bold text-slate-200 block truncate">{eb.badge?.name}</span>
                      <span className="text-[9px] text-slate-500 block uppercase font-mono">
                        {new Date(eb.earnedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
