import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import BadgeCard from '../components/common/BadgeCard';
import Button from '../components/common/Button';
import { Award, CheckCircle, RefreshCw, Trophy, Star } from 'lucide-react';
import { getBadgeIcon } from '../utils/formatters';

const getLevelName = (points) => {
  if (points >= 1000) return 'Civic Champion';
  if (points >= 600) return 'City Contributor';
  if (points >= 300) return 'Community Guardian';
  if (points >= 100) return 'Community Helper';
  return 'Civic Starter';
};

const Rewards = () => {
  const { user, refreshUser } = useAuth();
  const [allBadges, setAllBadges] = useState([]);
  const [unlockedBadgesMap, setUnlockedBadgesMap] = useState({});
  const [evaluating, setEvaluating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Statistics for progress calculation
  const [stats, setStats] = useState({
    complaintsCount: 0,
    supportsCount: 0,
    resolvedCount: 0,
    supportedResolvedCount: 0,
  });

  const fetchBadgesData = async () => {
    setLoading(true);
    try {
      await refreshUser();
      const res = await api.get('/badges');
      if (res.data.success) {
        setAllBadges(res.data.data);
      }

      // Load complaints and supports count to calculate progress parameters
      const compRes = await api.get('/complaints');
      if (compRes.data.success) {
        const list = compRes.data.data;
        const complaintsCount = list.filter(c => String(c.citizen?._id || c.citizen) === String(user._id)).length;
        const resolvedCount = list.filter(c => String(c.citizen?._id || c.citizen) === String(user._id) && ['Resolved', 'Closed'].includes(c.status)).length;
        
        let supportsCount = 0;
        let supportedResolvedCount = 0;
        
        for (const c of list) {
          try {
            const checkRes = await api.get(`/complaints/${c._id}/supported`);
            if (checkRes.data.supported) {
              supportsCount++;
              if (['Resolved', 'Closed'].includes(c.status)) {
                supportedResolvedCount++;
              }
            }
          } catch (e) {
            console.error(e);
          }
        }

        setStats({
          complaintsCount,
          supportsCount,
          resolvedCount,
          supportedResolvedCount,
        });
      }
    } catch (err) {
      console.error('Error fetching badges and stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadgesData();
  }, []);

  useEffect(() => {
    if (user && user.earnedBadges) {
      const earned = {};
      user.earnedBadges.forEach((eb) => {
        const badgeId = eb.badge?._id || eb.badge;
        earned[badgeId] = eb.earnedAt;
      });
      setUnlockedBadgesMap(earned);
    }
  }, [user]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    setFeedbackMsg('');
    try {
      const res = await api.post('/badges/evaluate');
      if (res.data.success) {
        const newBadges = res.data.newBadgesEarned;
        await refreshUser();
        await fetchBadgesData();
        
        if (newBadges.length > 0) {
          const names = newBadges.map(b => `"${b.name}"`).join(', ');
          setFeedbackMsg(`Congratulations! You unlocked new badges: ${names}`);
        } else {
          setFeedbackMsg('Your rewards are up-to-date. Keep participating to unlock more!');
        }
      }
    } catch (err) {
      console.error(err);
      setFeedbackMsg('Evaluation failed. Please try again.');
    } finally {
      setEvaluating(false);
    }
  };

  // Helper to determine badge progress parameters
  const getBadgeProgress = (badgeName) => {
    let current = 0;
    let target = 1;

    switch (badgeName) {
      case 'First Reporter':
        current = stats.complaintsCount;
        target = 1;
        break;
      case 'Voice of Community':
        current = stats.supportsCount;
        target = 10;
        break;
      case 'Problem Solver':
        current = stats.resolvedCount;
        target = 5;
        break;
      case 'Active Citizen':
        current = user?.activityStreak || 0;
        target = 30;
        break;
      case 'Neighborhood Guardian':
        current = stats.supportedResolvedCount;
        target = 20;
        break;
      case 'Civic Champion':
        current = user?.points || 0;
        target = 1000;
        break;
      default:
        current = 0;
        target = 100;
    }

    const percent = Math.min(100, Math.round((current / target) * 100));
    return { current, target, percent };
  };

  const currentXP = user?.points || 0;
  const levelTier = getLevelName(currentXP);

  // Level thresholds
  let nextLevelXP = 100;
  let prevLevelXP = 0;
  if (currentXP >= 1000) {
    nextLevelXP = 2000;
    prevLevelXP = 1000;
  } else if (currentXP >= 600) {
    nextLevelXP = 1000;
    prevLevelXP = 600;
  } else if (currentXP >= 300) {
    nextLevelXP = 600;
    prevLevelXP = 300;
  } else if (currentXP >= 100) {
    nextLevelXP = 300;
    prevLevelXP = 100;
  }

  const xpPercent = Math.min(100, Math.max(0, ((currentXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Citizen Rewards & Badges</h2>
          <p className="text-xs text-slate-400">Unlock digital achievements, earn XP multipliers, and track your gamification parameters.</p>
        </div>
        <Button
          variant="primary"
          onClick={handleEvaluate}
          loading={evaluating}
          className="flex items-center gap-1.5"
        >
          <Award className="h-4 w-4" /> Evaluate Unlocks
        </Button>
      </div>

      {feedbackMsg && (
        <div className="rounded-xl bg-brand-500/10 border border-brand-500/20 p-4 text-xs text-brand-400 font-semibold text-center animate-pulse">
          {feedbackMsg}
        </div>
      )}

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-5 glass-panel rounded-2xl border border-slate-805 p-6 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 animate-bounce">
              <Star className="h-5.5 w-5.5 fill-amber-500" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block font-mono">Reputation Balance</span>
              <span className="text-3xl font-extrabold text-slate-100 tracking-tight">{currentXP} XP</span>
            </div>
          </div>

          <div className="border-t border-slate-800/40 pt-5 mt-6 space-y-3.5 text-xs text-slate-400 font-mono">
            <div className="flex justify-between">
              <span>Intake points:</span>
              <span>{(stats.complaintsCount * 20) + (stats.supportsCount * 5)} XP</span>
            </div>
            <div className="flex justify-between">
              <span>Badge Bonuses:</span>
              <span>{user?.earnedBadges?.reduce((sum, eb) => sum + (eb.badge?.pointsReward || 0), 0) || 0} XP</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-7 glass-panel rounded-2xl border border-slate-805 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Reputation rank tier</span>
                <h3 className="text-lg font-bold text-slate-200">{levelTier} (Level {user?.level || 1})</h3>
              </div>
              <Trophy className="h-6 w-6 text-brand-400" />
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Strengthen community services! Reports earn 20 XP (+50 bonus on 1st), supporting upvotes earn 5 XP, and resolutions earn 30 XP!
            </p>
          </div>

          <div className="space-y-1.5 mt-5">
            <div className="flex justify-between text-[10px] text-slate-500 font-semibold uppercase">
              <span>Progress to next rank</span>
              <span>{currentXP} / {nextLevelXP} XP</span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full border border-slate-850 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Badges and Unlocks Progress */}
      <div className="space-y-4">
        <h4 className="text-base font-bold text-slate-200">Reputation Badges Directory</h4>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allBadges.map((badge) => {
              const isUnlocked = !!unlockedBadgesMap[badge._id];
              const progress = getBadgeProgress(badge.name);

              return (
                <div
                  key={badge._id}
                  className={`glass-panel rounded-xl border p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                    isUnlocked ? 'border-brand-500/30 bg-brand-500/5 shadow-md shadow-brand-500/5' : 'border-slate-800/80 bg-slate-900/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl">{isUnlocked ? getBadgeIcon(badge.icon) : '🔒'}</div>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isUnlocked
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isUnlocked ? 'Unlocked' : 'Locked'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-200">{badge.name}</h4>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{badge.description}</p>
                  </div>

                  {/* Progress block for locked badges */}
                  <div className="mt-4 border-t border-slate-800/60 pt-3.5 space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold uppercase">
                      <span>Requirement: {badge.requirement}</span>
                      {!isUnlocked && <span>{progress.percent}%</span>}
                    </div>

                    {!isUnlocked ? (
                      <div className="h-1.5 w-full bg-slate-950 rounded-full border border-slate-850 overflow-hidden">
                        <div
                          className="h-full bg-brand-500/50 rounded-full"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 block font-medium">
                        Unlocked on: {new Date(unlockedBadgesMap[badge._id]).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Rewards;
