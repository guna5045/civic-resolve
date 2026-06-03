const { GoogleGenAI } = require('@google/genai');
const systemSettings = require('../config/systemSettings');

/**
 * Predefined local fallback classification engine.
 * Ensures the system remains fully functional when Gemini is disabled or fails.
 */
const runFallbackEngine = (title, description, fallbackCategory = 'Other') => {
  const text = `${title} ${description}`.toLowerCase();
  
  // 1. Fallback Category Classification
  let category = fallbackCategory;
  if (text.match(/pothole|road damage|road crack|road block|street damage|asphalt/)) {
    category = 'Roads';
  } else if (text.match(/streetlight|electric pole|power failure|transformer|electrical hazard|open wires|electric wire/)) {
    category = 'Electricity';
  } else if (text.match(/water leakage|pipe burst|dirty water|water pollution|low water pressure|water leak|pipe leak/)) {
    category = 'Water Supply';
  } else if (text.match(/garbage|waste|trash|sanitation|litter|dump|sewage/)) {
    category = 'Sanitation';
  } else if (text.match(/park bench|park damage|tree issue|garden maintenance|traffic signal|traffic light|road signal/)) {
    category = 'Public Safety';
  }

  // 2. Fallback Priority Suggestion
  let basePriority = 'Medium';
  if (text.match(/danger|hazard|emergency|critical|accident|injury|wires/)) {
    basePriority = 'Critical';
  } else if (text.match(/urgent|broken|outage|pollution/)) {
    basePriority = 'High';
  } else if (text.match(/minor|light|cosmetic/)) {
    basePriority = 'Low';
  }

  let priority = basePriority;
  const highPriorityLandmarks = ['school', 'hospital', 'bus station', 'railway station', 'government office', 'main road', 'market area', 'landmark'];
  const lowPriorityLandmarks = ['remote area', 'open land', 'low population area', 'empty field', 'abandoned'];

  const hasHighLandmark = highPriorityLandmarks.some(landmark => text.includes(landmark));
  const hasLowLandmark = lowPriorityLandmarks.some(landmark => text.includes(landmark));

  if (hasHighLandmark) {
    if (priority === 'Low') priority = 'Medium';
    else if (priority === 'Medium') priority = 'High';
    else if (priority === 'High') priority = 'Critical';
  } else if (hasLowLandmark) {
    if (priority === 'Critical') priority = 'High';
    else if (priority === 'High') priority = 'Medium';
    else if (priority === 'Medium') priority = 'Low';
  }

  // 3. Fallback Reason
  let reason = 'Fallback Engine: Classified based on keyword pattern matching of the complaint description.';
  if (hasHighLandmark) {
    reason = 'Fallback Engine: Suggested priority increased due to proximity to high-density public landmark/area.';
  } else if (hasLowLandmark) {
    reason = 'Fallback Engine: Suggested priority decreased due to report located in a low-density or remote area.';
  }

  // 4. Fallback Summary
  let summary = `Reported issue: "${title}". Description details indicate potential repairs or inspection needed in the ${category} department.`;
  if (category === 'Roads' && text.includes('pothole')) {
    summary = 'Road damage reported near public area. Municipal inspection recommended.';
  } else if (category === 'Electricity' && text.includes('wires')) {
    summary = 'Potential electrical safety hazard reported near public area. Urgent repair recommended.';
  } else if (category === 'Water Supply' && text.includes('pollution')) {
    summary = 'Water quality/pollution issue reported. Inspection and sampling recommended.';
  } else if (category === 'Sanitation' && text.includes('garbage')) {
    summary = 'Waste accumulation/litter reported. Cleanup dispatch recommended.';
  }

  return {
    category,
    priority,
    summary,
    reason,
  };
};

/**
 * Analyzes the complaint text using Google Gemini API or Fallback Engine.
 * Returns an object with { category, priority, summary, reason }.
 */
const analyzeComplaintText = async (title, description, fallbackCategory = 'Other') => {
  // Check global Admin ON/OFF Toggle
  if (!systemSettings.aiEnabled) {
    console.log('AI System Notice: AI features toggled OFF globally. Fallback engine activated.');
    return runFallbackEngine(title, description, fallbackCategory);
  }

  // Check API key configuration
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '' || process.env.GEMINI_API_KEY.includes('your_google_gemini_api_key_here')) {
    console.warn('AI System Warning: GEMINI_API_KEY is missing or contains placeholder. Fallback engine activated.');
    return runFallbackEngine(title, description, fallbackCategory);
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
    - "reason": A short explanation of the safety priority suggestion considering student, school, or landmark hazard context.
    
    Example output format:
    {"category": "Roads", "priority": "High", "summary": "Pothole causing immediate safety issues", "reason": "Proximity to high traffic lane increases accident hazard."}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = response.text ? response.text.trim() : '';
    const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJsonString);

    const validCategories = ['Roads', 'Water Supply', 'Electricity', 'Sanitation', 'Public Safety', 'Other'];
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];

    return {
      category: validCategories.includes(result.category) ? result.category : fallbackCategory,
      priority: validPriorities.includes(result.priority) ? result.priority : 'Medium',
      summary: result.summary || description,
      reason: result.reason || 'AI generated category and priority suggestion.',
    };
  } catch (error) {
    let errorCategory = 'Gemini Error';
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid') || error.status === 400 || error.status === 403) {
      errorCategory = 'Invalid API Key';
    } else if (error.status === 429 || error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('Quota exceeded')) {
      errorCategory = 'Quota Exceeded';
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('fetch failed')) {
      errorCategory = 'Network Error';
    } else if (error.status === 401) {
      errorCategory = 'Authentication Error';
    }

    console.error(`AI System Error: ${errorCategory} (${error.message}). Graceful fallback engine activated.`);
    return runFallbackEngine(title, description, fallbackCategory);
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
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '' || process.env.GEMINI_API_KEY.includes('your_google_gemini_api_key_here')) {
    return { status: 'Degraded', message: 'API key is missing or is placeholder. Fallback mode active.' };
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Respond with the word CivicResolve',
    });
    const text = response.text ? response.text.trim() : '';
    if (text.toLowerCase().includes('civicresolve')) {
      return { status: 'Healthy', provider: 'Google Gemini', message: 'Live connectivity test succeeded!' };
    } else {
      return { status: 'Degraded', provider: 'Google Gemini', message: `Unexpected response: "${text}"` };
    }
  } catch (error) {
    let errorCategory = 'Gemini Error';
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid') || error.status === 400 || error.status === 403) {
      errorCategory = 'Invalid API Key';
    } else if (error.status === 429 || error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('Quota exceeded')) {
      errorCategory = 'Quota Exceeded';
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('fetch failed')) {
      errorCategory = 'Network Error';
    } else if (error.status === 401) {
      errorCategory = 'Authentication Error';
    }
    return { status: 'Degraded', message: `Live Gemini connectivity test failed: ${errorCategory} (${error.message})` };
  }
};

module.exports = {
  analyzeComplaintText,
  generateSummary,
  generateCategory,
  generatePriority,
  healthCheck,
};
