import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../constants/roles';
import {
  ShieldAlert,
  Users,
  Award,
  CheckCircle,
  MapPin,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

const LandingPage = () => {
  const { login, register, error: authError } = useAuth();
  const navigate = useNavigate();

  // Tab & Auth Mode states
  const [selectedRole, setSelectedRole] = useState(ROLES.CITIZEN);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setLoading(true);

    try {
      if (isRegisterMode && selectedRole === ROLES.CITIZEN) {
        if (!fullName || !email || !mobile || !password) {
          setValidationError('All fields are required for registration.');
          setLoading(false);
          return;
        }
        await register(fullName, email, mobile, password);
        navigate('/citizen');
      } else {
        if (!email || !password) {
          setValidationError('Please enter both identifier and password.');
          setLoading(false);
          return;
        }
        const user = await login(email, password, selectedRole);
        
        // Redirect based on role
        if (user.role === ROLES.ADMIN) {
          navigate('/admin');
        } else if (user.role === ROLES.OFFICER) {
          navigate('/officer');
        } else {
          navigate('/citizen');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-brand-500 selection:text-white">
      {/* 1. Header Hero Panel */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24 border-b border-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/20 via-slate-950 to-slate-950">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero text branding */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-500/30 bg-brand-500/10 text-xs font-semibold text-brand-400">
              <Sparkles className="h-3.5 w-3.5" /> Transform Municipal Governance
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-slate-100 font-sans">
              AI-Powered <br />
              <span className="bg-gradient-to-r from-brand-400 to-violet-500 bg-clip-text text-transparent">
                Civic Issue Resolution
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Bridging the gap between citizens and municipal authorities. Report complaints, support local issues, track resolution timelines transparently, and earn civic rewards.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <a href="#how-it-works">
                <Button variant="secondary" className="w-full sm:w-auto">
                  Explore How it Works
                </Button>
              </a>
              <a href="#login-section">
                <Button variant="primary" className="w-full sm:w-auto group">
                  Report an Issue Now
                  <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </a>
            </div>
          </div>

          {/* Login Container Box */}
          <div id="login-section" className="lg:col-span-5">
            <div className="glass-panel rounded-2xl border border-slate-800 shadow-2xl p-6 md:p-8">
              
              {/* Role Toggle Header */}
              <div className="space-y-1.5 text-center mb-6">
                <h3 className="text-xl font-bold text-slate-100">Portal Access</h3>
                <p className="text-xs text-slate-500">Select your profile to authenticate</p>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-950 border border-slate-900 mb-6">
                {[ROLES.CITIZEN, ROLES.OFFICER, ROLES.ADMIN].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role);
                      setIsRegisterMode(false);
                      setValidationError('');
                    }}
                    className={`py-2 text-[11px] font-bold rounded-md uppercase tracking-wider transition-all ${
                      selectedRole === role
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {role === ROLES.CITIZEN ? 'Citizen' : role === ROLES.OFFICER ? 'Officer' : 'Admin'}
                  </button>
                ))}
              </div>

              {/* Error messages */}
              {(authError || validationError) && (
                <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 font-medium">
                  {validationError || authError}
                </div>
              )}

              {/* Form panel */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {isRegisterMode && selectedRole === ROLES.CITIZEN && (
                  <Input
                    label="Full Name"
                    name="name"
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                )}

                <Input
                  label={
                    selectedRole === ROLES.CITIZEN
                      ? 'Email Address'
                      : selectedRole === ROLES.OFFICER
                      ? 'Officer ID (Email)'
                      : 'Admin ID (Email)'
                  }
                  name="email"
                  type="email"
                  placeholder={
                    selectedRole === ROLES.CITIZEN ? 'citizen@example.com' : 'officer@civic.gov'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                {isRegisterMode && selectedRole === ROLES.CITIZEN && (
                  <Input
                    label="Mobile Number"
                    name="mobile"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                  />
                )}

                <Input
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <Button type="submit" loading={loading} className="w-full mt-2">
                  {isRegisterMode ? 'Register Account' : 'Authenticate Credentials'}
                </Button>
              </form>

              {/* Mode Toggle Footer */}
              {selectedRole === ROLES.CITIZEN && (
                <div className="mt-4 pt-4 border-t border-slate-800/60 text-center text-xs text-slate-500">
                  {isRegisterMode ? (
                    <>
                      Already have an account?{' '}
                      <button
                        onClick={() => setIsRegisterMode(false)}
                        className="text-brand-400 hover:underline font-semibold"
                      >
                        Login here
                      </button>
                    </>
                  ) : (
                    <>
                      First time reporting?{' '}
                      <button
                        onClick={() => setIsRegisterMode(true)}
                        className="text-brand-400 hover:underline font-semibold"
                      >
                        Register here
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Key Features section */}
      <section className="py-20 max-w-7xl mx-auto px-6 border-b border-slate-900">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <h2 className="text-3xl font-extrabold text-slate-100">Key Platform Features</h2>
          <p className="text-sm text-slate-400">
            A specialized toolset designed to solve critical public issues with absolute efficiency.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 w-fit">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-100">AI Complaint Summaries</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Google Gemini automatically catalogs and translates citizen reports, listing safety hazards and formatting priorities to streamline work allocations.
            </p>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 w-fit">
              <Users className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-100">Prevent Duplicate Submissions</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nearby complaints are mapped dynamically. Citizens can support an existing complaint with one click to boost priority instead of creating duplicates.
            </p>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 w-fit">
              <Award className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-100">Citizen Badges & Rewards</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Civic participation is rewarded. Accumulate reputation points for reports and upvotes, climb citizen levels, and earn prestigious digital badges.
            </p>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-950 max-w-7xl mx-auto px-6 border-b border-slate-900">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <h2 className="text-3xl font-extrabold text-slate-100">How Civic Resolve Operates</h2>
          <p className="text-sm text-slate-400">
            A transparent workflow showing every step from initial reporting to resolution.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {[
            { step: '1', title: 'File a Report', text: 'Select location, tag category, select priority, upload photo, and submit.' },
            { step: '2', title: 'AI Classification', description: 'Gemini summarizes the complaint, matches relevant department, and assigns SLA.' },
            { step: '3', title: 'Officer Dispatched', text: 'The assigned officer inspects the site, moves status to in-progress, and resolves.' },
            { step: '4', title: 'Resolution Shared', text: 'Citizen receives notification with resolution notes and images. XP points are awarded.' },
          ].map((item, index) => (
            <div key={index} className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4 relative">
              <span className="text-5xl font-extrabold text-brand-500/15 absolute right-4 top-4">
                {item.step}
              </span>
              <h4 className="text-base font-bold text-slate-100 pt-4">{item.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {item.text || item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Benefits Section */}
      <section className="py-20 max-w-7xl mx-auto px-6 border-b border-slate-900 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold text-slate-100">Municipal & Citizen Benefits</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Designed for municipal departments to handle complaints efficiently, and for citizens to feel their voice is valued.
          </p>
          <div className="space-y-4">
            {[
              'Reduce administrative delays by up to 40% with AI classification',
              'Eliminate redundant tasks through local support maps',
              'Transparent timeline logs prevent complaint neglect',
              'Excel/PDF analytics reporting helps administrative audits',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-300 leading-normal">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel rounded-2xl border border-slate-800 p-8 space-y-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-brand-400" />
            <h4 className="text-lg font-bold text-slate-100">Governance Transparency Index</h4>
          </div>
          <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div className="h-full bg-brand-600 rounded-full" style={{ width: '85%' }} />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="block text-2xl font-bold text-slate-200">85%</span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Response Speed</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-slate-200">92%</span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Resolution Rate</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-slate-200">4.8/5</span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Citizen Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="py-12 border-t border-slate-900 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-sm font-bold text-slate-200">Civic Resolve Platform</h4>
            <p className="text-xs text-slate-500">AI-Powered Citizen Governance and Service Resolution.</p>
          </div>
          <p className="text-[10px] text-slate-600 text-center md:text-right leading-normal">
            &copy; {new Date().getFullYear()} Civic Resolve Inc. Municipal Technology. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
