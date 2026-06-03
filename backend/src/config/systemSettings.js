const systemSettings = {
  supportRadiusMeters: 100,
  escalationRulesDays: 15,
  pointValues: { report: 20, support: 5, resolved: 30 },
  aiEnabled: true, // Controlled globally by admin toggle
};

module.exports = systemSettings;
