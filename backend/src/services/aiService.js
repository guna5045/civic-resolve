const { GoogleGenAI } = require('@google/genai');

/**
 * Analyzes the complaint text using Google Gemini API.
 * Returns an object with { category, priority, summary }.
 * Falls back to user selected category and default settings if Gemini fails.
 * 
 * @param {string} title 
 * @param {string} description 
 * @param {string} fallbackCategory 
 * @returns {Promise<{category: string, priority: string, summary: string}>}
 */
const analyzeComplaintText = async (title, description, fallbackCategory = 'Other') => {
  const defaultFallback = {
    category: fallbackCategory,
    priority: 'Medium',
    summary: description,
  };

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_google_gemini_api_key_here') || process.env.GEMINI_API_KEY === '') {
    // Return mock analysis
    return {
      category: ['Roads', 'Water Supply', 'Electricity', 'Sanitation', 'Public Safety'].includes(fallbackCategory) ? fallbackCategory : 'Roads',
      priority: description.toLowerCase().includes('emergency') || description.toLowerCase().includes('danger') ? 'Critical' : 'Medium',
      summary: `[Mock AI Summary] Reported issue: "${title}". Description details indicate potential repairs needed. Recommended dispatch.`,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `Analyze the following citizen civic complaint.
    Title: ${title}
    Description: ${description}
    
    Output ONLY a valid raw JSON object (no markdown formatting, no code block backticks) with these exact keys:
    - "category": Must be exactly one of: "Roads", "Water Supply", "Electricity", "Sanitation", "Public Safety", or "Other".
    - "priority": Must be exactly one of: "Low", "Medium", "High", or "Critical".
    - "summary": A concise summary of the issue in under 80 words.
    
    Example output format:
    {"category": "Roads", "priority": "High", "summary": "Pothole causing immediate safety issues"}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = response.text ? response.text.trim() : '';
    
    // Parse JSON safely
    // Remove potential markdown wrappers if Gemini returned them
    const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJsonString);

    // Validate properties
    const validCategories = ['Roads', 'Water Supply', 'Electricity', 'Sanitation', 'Public Safety', 'Other'];
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];

    return {
      category: validCategories.includes(result.category) ? result.category : defaultFallback.category,
      priority: validPriorities.includes(result.priority) ? result.priority : defaultFallback.priority,
      summary: result.summary || defaultFallback.summary,
    };
  } catch (error) {
    console.error('Gemini AI Analysis failed. Falling back gracefully:', error);
    return defaultFallback;
  }
};

const generateSummary = async (title, description) => {
  const analysis = await analyzeComplaintText(title, description);
  return analysis.summary;
};

const generateCategory = async (title, description) => {
  const analysis = await analyzeComplaintText(title, description);
  return analysis.category;
};

const generatePriority = async (title, description) => {
  const analysis = await analyzeComplaintText(title, description);
  return analysis.priority;
};

const healthCheck = async () => {
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_google_gemini_api_key_here') && process.env.GEMINI_API_KEY !== '') {
    return { status: 'Healthy', api: 'Gemini 2.5 Active' };
  }
  return { status: 'Degraded', message: 'Mock API fallback active (No key configured)' };
};

module.exports = {
  analyzeComplaintText,
  generateSummary,
  generateCategory,
  generatePriority,
  healthCheck,
};
