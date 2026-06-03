require('dotenv').config();
const { analyzeComplaintText } = require('./src/services/aiService');
const systemSettings = require('./src/config/systemSettings');

const testCases = [
  {
    name: 'Pothole',
    title: 'Huge pothole in the middle of the road',
    description: 'A large pothole on the main road near government school is causing cars to swerve and creating a traffic accident hazard.',
    fallbackCategory: 'Roads'
  },
  {
    name: 'Streetlight',
    title: 'Broken streetlight pole',
    description: 'The streetlight near the city hospital is completely dark, causing safety concerns for pedestrians at night.',
    fallbackCategory: 'Electricity'
  },
  {
    name: 'Water Pollution',
    title: 'Dirty water pollution issue',
    description: 'The tap water contains visible dirt and chemical odors coming from the water supply line near the market area.',
    fallbackCategory: 'Water Supply'
  },
  {
    name: 'Garbage Dump',
    title: 'Overflowing garbage dump',
    description: 'Sanitation hazard: large piles of trash and waste accumulating in the open land next to a housing colony.',
    fallbackCategory: 'Sanitation'
  },
  {
    name: 'Park Damage',
    title: 'Damaged park bench and tree branches',
    description: 'Tree branches fell and broke a park bench inside the community park near the railway station.',
    fallbackCategory: 'Public Safety'
  },
  {
    name: 'Traffic Signal Failure',
    title: 'Traffic light signal failure',
    description: 'The traffic signal at the main road intersection is not working, causing heavy gridlock and high pedestrian risk.',
    fallbackCategory: 'Public Safety'
  }
];

const runTest = async () => {
  console.log('============================================================');
  console.log('CIVIC RESOLVE AI & FALLBACK OPERATION MODES VALIDATION');
  console.log('============================================================\n');

  // TEST 1: AI DISABLED (FALLBACK ENGINE MODE)
  console.log('------------------------------------------------------------');
  console.log('MODE 1: AI DISABLED (FALLBACK MODE ACTIVE)');
  console.log('------------------------------------------------------------');
  systemSettings.aiEnabled = false;

  for (const tc of testCases) {
    const res = await analyzeComplaintText(tc.title, tc.description, tc.fallbackCategory);
    console.log(`[TEST CASE: ${tc.name}]`);
    console.log(`- Category: ${res.category}`);
    console.log(`- Priority: ${res.priority}`);
    console.log(`- Summary:  ${res.summary}`);
    console.log(`- Reason:   ${res.reason}`);
    console.log();
  }

  // TEST 2: AI ENABLED (GEMINI API MODE)
  console.log('------------------------------------------------------------');
  console.log('MODE 2: AI ENABLED (GEMINI API MODE ACTIVE)');
  console.log('------------------------------------------------------------');
  systemSettings.aiEnabled = true;

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_google_gemini_api_key_here') || process.env.GEMINI_API_KEY === '') {
    console.log('Notice: GEMINI_API_KEY is not configured or placeholder. Gemini calls will trigger error logging and fallback.');
  }

  for (const tc of testCases) {
    const res = await analyzeComplaintText(tc.title, tc.description, tc.fallbackCategory);
    console.log(`[TEST CASE: ${tc.name}]`);
    console.log(`- Category: ${res.category}`);
    console.log(`- Priority: ${res.priority}`);
    console.log(`- Summary:  ${res.summary}`);
    console.log(`- Reason:   ${res.reason}`);
    console.log();
  }

  console.log('============================================================');
  console.log('VALIDATION TESTS RUN COMPLETED');
  console.log('============================================================');
};

runTest().catch(err => console.error('Test execution failed:', err));
