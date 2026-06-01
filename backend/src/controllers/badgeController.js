const Badge = require('../models/Badge');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Support = require('../models/Support');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');


// Default badges to seed
const DEFAULT_BADGES = [
  {
    name: 'First Reporter',
    description: 'Submitted your first public complaint to help start resolving municipal issues.',
    icon: 'first_reporter',
    requirement: 'Submit First Complaint',
    pointsReward: 50, // Bonus points for first complaint
  },
  {
    name: 'Voice of Community',
    description: 'Actively upvoted and supported 10 different neighbor complaints.',
    icon: 'voice_of_community',
    requirement: 'Support 10 Issues',
    pointsReward: 150,
  },
  {
    name: 'Problem Solver',
    description: 'Successfully worked to have 5 of your reported issues resolved.',
    icon: 'problem_solver',
    requirement: '5 Reported Issues Resolved',
    pointsReward: 300,
  },
  {
    name: 'Active Citizen',
    description: 'Demonstrated exceptional participation with a 30-day activity streak.',
    icon: 'active_citizen',
    requirement: '30 Day Activity Streak',
    pointsReward: 400,
  },
  {
    name: 'Neighborhood Guardian',
    description: 'Supported at least 20 complaints that eventually reached successful resolution.',
    icon: 'neighborhood_guardian',
    requirement: '20 Supported Issues Resolved',
    pointsReward: 500,
  },
  {
    name: 'Civic Champion',
    description: 'Achieved ultimate status by accumulating over 1000 total reputation points.',
    icon: 'civic_champion',
    requirement: 'Reach 1000 Points',
    pointsReward: 1000,
  },
];

const getLevelFromPoints = (points) => {
  if (points >= 1000) return 5; // Civic Champion
  if (points >= 600) return 4;  // City Contributor
  if (points >= 300) return 3;  // Community Guardian
  if (points >= 100) return 2;  // Community Helper
  return 1; // Civic Starter
};

/**
 * @desc    Get all badges (seeds them if collection is empty)
 * @route   GET /api/badges
 * @access  Private
 */
const getBadges = async (req, res) => {
  try {
    let badges = await Badge.find({});
    if (badges.length === 0) {
      // Clear empty and reseed to ensure correct Part 2 rewards configuration
      await Badge.deleteMany({});
      badges = await Badge.insertMany(DEFAULT_BADGES);
    }
    res.json({ success: true, count: badges.length, data: badges });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Check and award badges for current citizen
 * @route   POST /api/badges/evaluate
 * @access  Private (Citizen only)
 */
const evaluateBadges = async (req, res) => {
  const userId = req.user._id;

  try {
    let badges = await Badge.find({});
    if (badges.length === 0) {
      badges = await Badge.insertMany(DEFAULT_BADGES);
    }

    const user = await User.findById(userId);
    
    // Core statistics count
    const complaintsCount = await Complaint.countDocuments({ citizen: userId });
    const supportsCount = await Support.countDocuments({ user: userId });
    const resolvedCount = await Complaint.countDocuments({ citizen: userId, status: { $in: ['Resolved', 'Closed'] } });

    // Fetch complaints supported by the user
    const userSupports = await Support.find({ user: userId }).select('complaint');
    const supportedComplaintIds = userSupports.map(s => s.complaint);
    
    // Count how many of those supported complaints are resolved/closed
    const supportedResolvedCount = await Complaint.countDocuments({
      _id: { $in: supportedComplaintIds },
      status: { $in: ['Resolved', 'Closed'] },
    });

    const currentBadgeIds = user.earnedBadges.map((eb) => String(eb.badge));
    const newEarned = [];

    // Evaluate conditions for badges
    for (const badge of badges) {
      if (currentBadgeIds.includes(String(badge._id))) continue;

      let qualified = false;
      if (badge.name === 'First Reporter' && complaintsCount >= 1) qualified = true;
      if (badge.name === 'Voice of Community' && supportsCount >= 10) qualified = true;
      if (badge.name === 'Problem Solver' && resolvedCount >= 5) qualified = true;
      if (badge.name === 'Active Citizen' && (user.activityStreak || 0) >= 30) qualified = true;
      if (badge.name === 'Neighborhood Guardian' && supportedResolvedCount >= 20) qualified = true;
      if (badge.name === 'Civic Champion' && (user.points || 0) >= 1000) qualified = true;

      if (qualified) {
        user.earnedBadges.push({ badge: badge._id, earnedAt: new Date() });
        user.points += badge.pointsReward;
        
        // Audit log event
        await AuditLog.create({
          user: userId,
          action: 'Badge Unlocked',
          module: 'Gamification',
          description: `Unlocked badge: "${badge.name}". Awarded +${badge.pointsReward} bonus XP.`,
        }).catch(err => console.log('Audit log generation failed:', err));

        newEarned.push(badge);

        // Notify user
        await Notification.create({
          recipient: userId,
          title: 'Badge Earned! 🏆',
          message: `Congratulations! You unlocked the "${badge.name}" badge and earned +${badge.pointsReward} points.`,
          type: 'Badge Earned',
        });
      }
    }

    // Auto-update user level based on points thresholds
    const originalLevel = user.level;
    user.level = getLevelFromPoints(user.points);

    if (user.level !== originalLevel) {
      // Trigger notification for Level Up
      await Notification.create({
        recipient: userId,
        title: 'Level Up Alert! 📈',
        message: `Congratulations! Your civic reputation level has increased to Level ${user.level}. Keep up the great work!`,
        type: 'Points Added',
      });
    }

    if (newEarned.length > 0 || user.level !== originalLevel) {
      await user.save();
    }

    res.json({
      success: true,
      newBadgesEarned: newEarned,
      totalBadgesCount: user.earnedBadges.length,
      currentPoints: user.points,
      currentLevel: user.level,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBadges,
  evaluateBadges,
};
