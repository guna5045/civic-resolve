const aiService = require('../services/aiService');

/**
 * @desc    Get AI service status and configuration state
 * @route   GET /api/ai/health
 * @access  Private (Admin only)
 */
const checkAIStatus = async (req, res) => {
  try {
    const health = await aiService.healthCheck();
    res.json({
      success: true,
      ...health
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Manually trigger AI text analysis for testing/audit
 * @route   POST /api/ai/analyze
 * @access  Private (Admin/Citizen)
 */
const analyzeText = async (req, res) => {
  const { title, description, fallbackCategory } = req.body;
  if (!title || !description) {
    return res.status(400).json({ success: false, message: 'Title and description are required' });
  }

  try {
    const analysis = await aiService.analyzeComplaintText(title, description, fallbackCategory);
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  checkAIStatus,
  analyzeText,
};
