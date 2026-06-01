import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { AlertCircle, CheckCircle, RefreshCw, Trophy, Bell, Heart, PlusCircle, MapPin, Award } from 'lucide-react';
import StatsCard from '../components/common/StatsCard';
import ComplaintCard from '../components/common/ComplaintCard';
import Button from '../components/common/Button';
import { Link } from 'react-router-dom';

const getLevelName = (points) => {
  if (points >= 1000) return 'Civic Champion';
  if (points >= 600) return 'City Contributor';
  if (points >= 300) return 'Community Guardian';
  if (points >= 100) return 'Community Helper';
  return 'Civic Starter';
};

const CitizenDashboard = () => {
  const { user, refreshUser } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [supportedCount, setSupportedCount] = useState(0);
  const [activityFeed, setActivityFeed] = useState([]);
  
  const [stats, setStats] = useState({
    raised: 0,
    supported: 0,
    resolved: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await refreshUser();
      const res = await api.get('/complaints');
      if (res.data.success) {
        const allComplaints = res.data.data;
        
        // Filter user reported complaints
        const userComplaints = allComplaints.filter(c => String(c.citizen?._id || c.citizen) === String(user._id));
        setComplaints(userComplaints.slice(0, 3)); // show top 3 recent

        // Check how many complaints the user supported
        let supported = 0;
        const recentSupports = [];
        
        for (const c of allComplaints) {
          try {
            const checkRes = await api.get(`/complaints/${c._id}/supported`);
            if (checkRes.data.supported) {
              supported++;
              recentSupports.push({
                type: 'Support',
                title: 'Issue Supported',
                description: `You supported: "${c.title}"`,
                timestamp: c.updatedAt,
              });
            }
          } catch (e) {
            console.error(e);
          }
        }
        setSupportedCount(supported);

        // Stats
        const raised = userComplaints.length;
        const resolved = userComplaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length;
        const pending = userComplaints.filter(c => ['Submitted', 'Under Review', 'Assigned', 'In Progress'].includes(c.status)).length;
        setStats({ raised, supported, resolved, pending });

        // Compile Activity Feed
        const feed = [];
        userComplaints.forEach(c => {
          feed.push({
            type: 'Submit',
            title: 'Complaint Submitted',
            description: `You reported: "${c.title}"`,
            timestamp: c.createdAt,
          });
          if (c.status === 'Resolved' || c.status === 'Closed') {
            feed.push({
              type: 'Resolve',
              title: 'Complaint Resolved',
              description: `Your issue was resolved: "${c.title}"`,
              timestamp: c.updatedAt,
            });
          }
        });

        // Add badge unlocks to activity feed
        if (user.earnedBadges) {
          user.earnedBadges.forEach(b => {
            feed.push({
              type: 'Badge',
              title: 'Badge Earned 🏆',
              description: `Unlocked badge: "${b.badge?.name || 'Achievement'}"`,
              timestamp: b.earnedAt,
            });
          });
        }

        // Add supports to feed
        feed.push(...recentSupports);

        // Sort feed by timestamp desc
        feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setActivityFeed(feed.slice(0, 5));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Calculate XP progress bar
  const currentXP = user?.points || 0;
  const levelTier = getLevelName(currentXP);
  
  // Custom thresholds for progress display
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
      {/* 1. Welcoming Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-brand-500/10 border-2 border-brand-500/30 flex items-center justify-center text-3xl font-extrabold text-brand-400">
            {user?.fullName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Welcome Back, {user?.fullName}!</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-brand-400 font-semibold uppercase tracking-wider bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                {levelTier} (Level {user?.level || 1})
              </span>
              <span className="text-xs text-slate-500">
                Points: <strong className="text-slate-300">{currentXP} XP</strong>
              </span>
              <span className="text-xs text-slate-500">
                Badges: <strong className="text-slate-300">{user?.earnedBadges?.length || 0}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* XP Progress Slider */}
        <div className="w-full lg:max-w-xs space-y-1.5">
          <div className="flex justify-between text-[11px] font-semibold text-slate-400">
            <span>Reputation Rank</span>
            <span>{currentXP} / {nextLevelXP} XP</span>
          </div>
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-850">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Complaints Raised"
          value={stats.raised}
          icon={AlertCircle}
          colorClass="text-brand-400 bg-brand-500/10 border-brand-500/20"
        />
        <StatsCard
          title="Issues Supported"
          value={stats.supported}
          icon={Heart}
          colorClass="text-rose-400 bg-rose-500/10 border-rose-500/20"
        />
        <StatsCard
          title="Resolved"
          value={stats.resolved}
          icon={CheckCircle}
          colorClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        />
        <StatsCard
          title="Pending Queue"
          value={stats.pending}
          icon={RefreshCw}
          colorClass="text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
        />
      </div>

      {/* 3. Main Grid layout: Quick actions, feed, notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Recent Reports list */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-base font-bold text-slate-200">My Complaint Reports</h4>
            <Link to="/citizen/my-complaints" className="text-xs text-brand-400 font-semibold hover:underline">
              View All &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : complaints.length === 0 ? (
            <div className="glass-panel rounded-2xl border border-slate-800 py-16 text-center text-sm text-slate-500">
              No registered issues found. Report an issue to help improve the neighborhood!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {complaints.map((c) => (
                <ComplaintCard key={c._id} complaint={c} userRole="Citizen" isSupported={true} />
              ))}
            </div>
          )}

          {/* Quick Actions Panel */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-2">
              Citizen Quick Actions
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link to="/citizen/report">
                <Button variant="primary" className="w-full flex items-center justify-center gap-1.5 text-xs py-3">
                  <PlusCircle className="h-4.5 w-4.5" /> Report Public Issue
                </Button>
              </Link>
              <Link to="/citizen/nearby">
                <Button variant="secondary" className="w-full flex items-center justify-center gap-1.5 text-xs py-3">
                  <MapPin className="h-4.5 w-4.5" /> View Nearby Issues
                </Button>
              </Link>
              <Link to="/citizen/rewards">
                <Button variant="glass" className="w-full flex items-center justify-center gap-1.5 text-xs py-3">
                  <Award className="h-4.5 w-4.5" /> View My Rewards
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side: Activity Feed */}
        <div className="lg:col-span-4 glass-panel rounded-2xl border border-slate-805 p-6 space-y-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-805 pb-2">
            My Activity History
          </span>

          {loading ? (
            <div className="py-6 flex justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          ) : activityFeed.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No recent activity logged.</p>
          ) : (
            <div className="space-y-4">
              {activityFeed.map((act, index) => (
                <div key={index} className="flex items-start gap-3 text-xs">
                  <div className={`p-1.5 rounded bg-slate-950 border border-slate-850 ${
                    act.type === 'Submit' ? 'text-blue-400' : act.type === 'Support' ? 'text-rose-400' : act.type === 'Resolve' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {act.type === 'Submit' ? '➕' : act.type === 'Support' ? '❤️' : act.type === 'Resolve' ? '✓' : '🏆'}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-200 leading-normal">{act.title}</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">{act.description}</p>
                    <span className="text-[9px] text-slate-500 block mt-1">
                      {new Date(act.timestamp).toLocaleDateString()}
                    </span>
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

export default CitizenDashboard;
