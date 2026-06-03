import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../constants/roles';
import api from '../services/api';
import {
  ShieldAlert,
  Users,
  Award,
  CheckCircle,
  MapPin,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Map,
  Layers,
  FileText,
  History,
  ShieldCheck,
  Globe,
  Sun,
  Moon,
  Accessibility,
  Check
} from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import { AccessibilityContext } from '../context/AccessibilityContext';

const DEFAULT_DEPARTMENTS = [
  { name: 'Roads Department' },
  { name: 'Electricity Department' },
  { name: 'Water Supply Department' },
  { name: 'Sanitation Department' },
  { name: 'Drainage & Sewerage Department' },
  { name: 'Street Lighting Department' },
  { name: 'Traffic & Signals Department' },
  { name: 'Public Health Department' },
  { name: 'Parks & Greenery Department' },
  { name: 'Building & Encroachment Department' },
];

const LandingPage = () => {
  const { login, register, verifyOtp, resendOtp, loginWithGoogle, error: authError, demoLogin } = useAuth();
  const navigate = useNavigate();

  // Context hook loaders
  const { locale, changeLanguage, t } = useContext(LanguageContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { setIsPanelOpen } = useContext(AccessibilityContext);

  // Synchronized global role state
  const [selectedRole, setSelectedRole] = useState(ROLES.CITIZEN);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  // OTP State variables
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);

  // OTP Countdown timer hook
  useEffect(() => {
    let interval = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Google SSO initialization hook
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            setLoading(true);
            setValidationError('');
            loginWithGoogle(response.credential)
              .then(() => navigate('/citizen'))
              .catch((err) => {
                const errorMsg = err.response?.data?.message || err.message || 'Google Sign-In failed.';
                setValidationError(errorMsg);
              })
              .finally(() => setLoading(false));
          },
        });

        // Render standard Google Sign-In button
        const container = document.getElementById('google-signin-btn-container');
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: 'filled_black', // matches our dark premium theme
            size: 'large',
            width: container.offsetWidth || 342,
            shape: 'rectangular',
            text: 'continue_with',
          });
        }
      }
    };

    const loadGoogleScript = () => {
      if (window.google?.accounts?.id) {
        initGoogle();
        return;
      }

      // Check if script is already in the document
      let script = document.getElementById('google-gsi-client-script');
      if (!script) {
        script = document.createElement('script');
        script.id = 'google-gsi-client-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initGoogle;
        script.onerror = () => {
          console.error('Google SSO script failed to load.');
          setValidationError('Google Sign-In script failed to load. Please verify your internet connection.');
        };
        document.body.appendChild(script);
      } else {
        script.onload = initGoogle;
      }
    };

    // Small delay to ensure DOM element '#google-signin-btn-container' is rendered first
    const timer = setTimeout(loadGoogleScript, 100);
    return () => clearTimeout(timer);
  }, [selectedRole]);

  // Dropdown visibility states
  const [showHeaderLangDropdown, setShowHeaderLangDropdown] = useState(false);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Refs for click outside handling
  const headerLangRef = useRef(null);
  const deptDropdownRef = useRef(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [departments, setDepartments] = useState(() =>
    DEFAULT_DEPARTMENTS.map((d, index) => ({
      _id: `default-${index}`,
      name: d.name,
      status: 'Active',
      isDefaultFallback: true
    }))
  );
  const [selectedDeptId, setSelectedDeptId] = useState('');

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी' },
    { code: 'te', name: 'తెలుగు' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'മലയാളം' }
  ];

  // Load departments list for officer login
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/departments');
        if (res.data.success) {
          const activeDepts = res.data.data.filter(d => d.status !== 'Inactive');
          setDepartments(activeDepts);

          // Resolve selected department to database ID if it was set to a default fallback ID
          setSelectedDeptId((prevId) => {
            if (!prevId) return prevId;
            const currentSelectedFallback = DEFAULT_DEPARTMENTS.map((d, index) => ({
              _id: `default-${index}`,
              name: d.name,
            })).find(d => d._id === prevId);

            if (currentSelectedFallback) {
              const matchedRealDept = activeDepts.find(d => d.name === currentSelectedFallback.name);
              if (matchedRealDept) {
                return matchedRealDept._id;
              }
            }
            return prevId;
          });
        }
      } catch (err) {
        console.error('Error fetching departments for login selector:', err);
      }
    };
    fetchDepts();
  }, []);

  // Close dropdown on click outside, Esc key, focus loss
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (headerLangRef.current && !headerLangRef.current.contains(e.target)) {
        setShowHeaderLangDropdown(false);
      }
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target)) {
        setShowDeptDropdown(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowHeaderLangDropdown(false);
        setShowDeptDropdown(false);
      }
    };
    const handleFocusOutline = (e) => {
      if (headerLangRef.current && !headerLangRef.current.contains(e.target)) {
        setShowHeaderLangDropdown(false);
      }
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target)) {
        setShowDeptDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusOutline);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusOutline);
    };
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setLoading(true);

    try {
      if (isRegisterMode && selectedRole === ROLES.CITIZEN) {
        if (!fullName || !email || !mobile || !password || !confirmPassword) {
          setValidationError(t('validation.allRequired') || 'All fields are required for registration.');
          setLoading(false);
          return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setValidationError('Please enter a valid email address.');
          setLoading(false);
          return;
        }

        // Mobile format validation (simple numeric and length check)
        const mobileRegex = /^\d{10}$/;
        if (!mobileRegex.test(mobile)) {
          setValidationError('Please enter a valid 10-digit mobile number.');
          setLoading(false);
          return;
        }

        // Strong password check: min 8, uppercase, lowercase, number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
          setValidationError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.');
          setLoading(false);
          return;
        }

        // Password confirmation matches
        if (password !== confirmPassword) {
          setValidationError('Passwords do not match.');
          setLoading(false);
          return;
        }

        const res = await register(fullName, email, mobile, password);
        if (res && res.success) {
          setOtpEmail(email);
          setIsOtpMode(true);
          setOtpTimer(60);
          setOtpCode('');
        } else {
          setValidationError(res?.message || 'Registration failed.');
        }
      } else {
        if (!email || !password) {
          setValidationError(t('validation.enterCredentials') || 'Please enter both email and password.');
          setLoading(false);
          return;
        }
        if (selectedRole === ROLES.OFFICER && !selectedDeptId) {
          setValidationError('Please select your department.');
          setLoading(false);
          return;
        }
        const user = await login(email, password, selectedRole, selectedRole === ROLES.OFFICER ? selectedDeptId : undefined);
        
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
      setValidationError(err.message || 'Login failed. Please check credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setValidationError('');
    setLoading(true);
    try {
      if (!otpCode || otpCode.trim().length !== 6) {
        setValidationError('Please enter a valid 6-digit OTP code.');
        setLoading(false);
        return;
      }
      await verifyOtp(otpEmail, otpCode.trim());
      navigate('/citizen');
    } catch (err) {
      setValidationError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpResend = async () => {
    setValidationError('');
    setLoading(true);
    try {
      const res = await resendOtp(otpEmail);
      if (res && res.success) {
        setOtpTimer(60);
        setValidationError('');
      } else {
        setValidationError(res?.message || 'Failed to resend OTP.');
      }
    } catch (err) {
      setValidationError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };


  // Icon maps for features
  const citizenIcons = [MapPin, Users, History, Award, Map];
  const officerIcons = [ShieldAlert, CheckCircle, Map, TrendingUp, FileText];
  const adminIcons = [Layers, Users, ShieldCheck, TrendingUp, History];

  const getRoleIcons = (role) => {
    if (role === ROLES.ADMIN) return adminIcons;
    if (role === ROLES.OFFICER) return officerIcons;
    return citizenIcons;
  };

  const getRoleKey = (role) => {
    if (role === ROLES.ADMIN) return 'admin';
    if (role === ROLES.OFFICER) return 'officer';
    return 'citizen';
  };

  // Get active statistics layout values based on current role
  const getRoleStats = () => {
    switch (selectedRole) {
      case ROLES.OFFICER:
        return {
          title: t('benefits.officerIndexHeader'),
          percentage: 88,
          metrics: [
            { value: "18", label: t('benefits.officerAssignedIssues') },
            { value: "342", label: t('benefits.officerResolvedIssues') },
            { value: "3.8 Days", label: t('benefits.officerAvgResolution') }
          ]
        };
      case ROLES.ADMIN:
        return {
          title: t('benefits.adminIndexHeader'),
          percentage: 91.8,
          metrics: [
            { value: "12", label: t('benefits.adminDepartments') },
            { value: "142", label: t('benefits.adminActiveOfficers') },
            { value: "91.8%", label: t('benefits.adminCityResolution') }
          ]
        };
      case ROLES.CITIZEN:
      default:
        return {
          title: t('benefits.indexHeader'),
          percentage: 94.2,
          metrics: [
            { value: "1,248", label: t('benefits.citizenIssuesReported') },
            { value: "8,420", label: t('benefits.citizenCommunitySupport') },
            { value: "94.2%", label: t('benefits.citizenResolutionSuccess') }
          ]
        };
    }
  };

  const activeStats = getRoleStats();
  const activeIcons = getRoleIcons(selectedRole);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-brand-500 selection:text-white flex flex-col">
      
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 w-full">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90"
          >
            <div className="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-600/35">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-100 block leading-tight">
                {t('nav.brand')}
              </span>
            </div>
          </div>

          {/* Quick Actions Toggles */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Header Language Dropdown */}
            <div className="relative" ref={headerLangRef}>
              <button
                onClick={() => setShowHeaderLangDropdown(!showHeaderLangDropdown)}
                className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors flex items-center gap-1"
                aria-label="Language Selector"
              >
                <Globe className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase hidden sm:inline">{locale}</span>
              </button>
              {showHeaderLangDropdown && (
                <div className="absolute right-0 mt-2 w-36 rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden z-50 py-1">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        changeLanguage(lang.code);
                        setShowHeaderLangDropdown(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                        locale === lang.code
                          ? 'bg-brand-600 text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                      }`}
                    >
                      <span>{lang.name}</span>
                      {locale === lang.code && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Header Theme Toggler */}
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Header Accessibility Button */}
            <button
              onClick={() => setIsPanelOpen(true)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
              title={t('accessibility.tooltip')}
            >
              <Accessibility className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 1. Header Hero Panel */}
      <section className="relative overflow-hidden pt-16 pb-16 md:pt-24 md:pb-24 border-b border-slate-900 hero-radial-bg flex-1">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero text branding */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full hero-badge text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> {t('hero.badge')}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-slate-100 font-sans">
              {t('hero.title')}
              <span className="bg-gradient-to-r from-brand-400 to-violet-500 bg-clip-text text-transparent block mt-2 text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
                {t('hero.subtitle')}
              </span>
            </h1>
            <p className="text-base text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {t('hero.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-950 px-5 py-3 text-sm bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/20 active:scale-95 cursor-pointer w-full sm:w-auto"
              >
                {t('hero.ctaExplore')}
              </button>
              <button
                onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-950 px-5 py-3 text-sm bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 active:scale-95 cursor-pointer w-full sm:w-auto"
              >
                {t('hero.ctaFeatures')}
              </button>
            </div>
          </div>

          {/* Login Container Box */}
          <div id="login-section" className="lg:col-span-5 scroll-mt-24">
            <div className="glass-panel rounded-2xl border border-slate-800 shadow-2xl p-6 md:p-8">
              
              {isOtpMode ? (
                <div className="space-y-5">
                  <div className="pb-4 border-b border-slate-800/80 mb-5 text-center">
                    <div className="h-12 w-12 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="h-6 w-6 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">Verify Your Email</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      We sent a 6-digit OTP code to <span className="text-slate-200 font-semibold">{otpEmail}</span>. Enter it to activate your account.
                    </p>
                  </div>

                  {validationError && (
                    <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 font-medium">
                      {validationError}
                    </div>
                  )}

                  <form onSubmit={handleOtpVerify} className="space-y-4">
                    <Input
                      label="One-Time Password (OTP)"
                      name="otp"
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      required
                      className="text-center tracking-[0.25em] text-lg font-bold"
                    />

                    <Button type="submit" loading={loading} className="w-full">
                      Verify & Register
                    </Button>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 mt-4">
                      <button
                        type="button"
                        onClick={handleOtpResend}
                        disabled={otpTimer > 0 || loading}
                        className={`font-semibold transition-colors ${
                          otpTimer > 0
                            ? 'text-slate-500 cursor-not-allowed'
                            : 'text-brand-400 hover:text-brand-300 hover:underline'
                        }`}
                      >
                        {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend Code'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsOtpMode(false);
                          setValidationError('');
                        }}
                        className="text-slate-400 hover:text-slate-350 hover:underline font-semibold"
                      >
                        Edit Details
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  {/* Header with Portal Access title */}
                  <div className="pb-4 border-b border-slate-800/80 mb-5">
                    <h3 className="text-lg font-bold text-slate-100">{t('nav.portalAccess')}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">{t('nav.selectProfile')}</p>
                  </div>

                  {/* Synchronized Role Toggles */}
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-950 border border-slate-900 mb-5">
                    {[ROLES.CITIZEN, ROLES.OFFICER, ROLES.ADMIN].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setSelectedRole(role);
                          setIsRegisterMode(false);
                          setValidationError('');
                          setConfirmPassword('');
                        }}
                        className={`py-2 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all ${
                          selectedRole === role
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {role === ROLES.CITIZEN 
                          ? t('auth.citizen') 
                          : role === ROLES.OFFICER 
                          ? t('auth.officer') 
                          : t('auth.admin')}
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
                        label={t('auth.fullName')}
                        name="name"
                        placeholder={t('auth.fullNamePlaceholder')}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    )}

                    {selectedRole === ROLES.OFFICER && (
                      <div className="flex flex-col gap-1.5 w-full relative" ref={deptDropdownRef}>
                        <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">
                          Department <span className="text-rose-450">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                          className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-left flex justify-between items-center"
                        >
                          <span className="truncate">
                            {selectedDeptId
                              ? departments.find((d) => d._id === selectedDeptId)?.name || 'Select Department'
                              : 'Select Department'}
                          </span>
                          <span className="text-slate-500 text-xs">▼</span>
                        </button>
                        {showDeptDropdown && (
                          <div className="absolute z-50 left-0 right-0 top-[68px] rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-2.5 space-y-2 max-h-60 overflow-hidden flex flex-col">
                            <input
                              type="text"
                              placeholder="Search department..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-brand-500 placeholder-slate-500"
                            />
                            <div className="overflow-y-auto flex-1 divide-y divide-slate-800/40">
                              {departments
                                .filter((d) => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map((d) => (
                                  <button
                                    key={d._id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedDeptId(d._id);
                                      setShowDeptDropdown(false);
                                      setSearchTerm('');
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs transition-colors rounded-md ${
                                      selectedDeptId === d._id
                                        ? 'bg-brand-650 text-white font-semibold'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                                    }`}
                                  >
                                    {d.name}
                                  </button>
                                ))}
                              {departments.filter((d) => d.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                <div className="text-center py-4 text-xs text-slate-500">No departments found</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <Input
                      label={
                        selectedRole === ROLES.CITIZEN
                          ? t('auth.email')
                          : selectedRole === ROLES.OFFICER
                          ? t('auth.officerEmail')
                          : t('auth.adminEmail')
                      }
                      name="email"
                      type="email"
                      placeholder={
                        selectedRole === ROLES.CITIZEN ? t('auth.emailPlaceholder') : 'officer@civicresolve.gov'
                      }
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />

                    {isRegisterMode && selectedRole === ROLES.CITIZEN && (
                      <Input
                        label={t('auth.mobile')}
                        name="mobile"
                        type="tel"
                        placeholder={t('auth.mobilePlaceholder')}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        required
                      />
                    )}

                    <Input
                      label={t('auth.password')}
                      name="password"
                      type="password"
                      placeholder={t('auth.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />

                    {isRegisterMode && selectedRole === ROLES.CITIZEN && (
                      <Input
                        label="Confirm Password"
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    )}

                    <Button type="submit" loading={loading} className="w-full mt-2">
                      {isRegisterMode ? t('auth.register') : t('auth.signIn')}
                    </Button>
                    
                    {/* Google SSO Options */}
                    {selectedRole === ROLES.CITIZEN && (
                      <>
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-slate-800"></div>
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-950 px-2 text-slate-505">Or continue with</span>
                          </div>
                        </div>

                        {/* Standard Google Sign-In Button Container */}
                        <div id="google-signin-btn-container" className="w-full flex justify-center mt-2 z-10"></div>
                      </>
                    )}
                  </form>

                  {/* Mode Toggle Footer */}
                  {selectedRole === ROLES.CITIZEN && (
                    <div className="mt-4 pt-4 border-t border-slate-800/60 text-center text-xs text-slate-500">
                      {isRegisterMode ? (
                        <>
                          {t('auth.alreadyHaveAccount')}{' '}
                          <button
                            onClick={() => {
                              setIsRegisterMode(false);
                              setValidationError('');
                              setConfirmPassword('');
                            }}
                            className="text-brand-400 hover:underline font-semibold"
                          >
                            {t('auth.loginHere')}
                          </button>
                        </>
                      ) : (
                        <>
                          {t('auth.firstTime')}{' '}
                          <button
                            onClick={() => {
                              setIsRegisterMode(true);
                              setValidationError('');
                              setConfirmPassword('');
                            }}
                            className="text-brand-400 hover:underline font-semibold"
                          >
                            {t('auth.registerHere')}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Role-Specific Platform Capabilities Tabs */}
      <section id="features-section" className="py-20 max-w-7xl mx-auto px-6 border-b border-slate-900 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <h2 className="text-3xl font-extrabold text-slate-100">{t('capabilities.title')}</h2>
          <p className="text-sm text-slate-400">
            {t('capabilities.subtitle')}
          </p>
        </div>

        {/* Tab Switcher Headers (Synchronized with selectedRole) */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-900 max-w-lg mx-auto mb-12">
          {[
            { key: ROLES.CITIZEN, label: t('capabilities.citizenPortal') },
            { key: ROLES.OFFICER, label: t('capabilities.officerWorkspace') },
            { key: ROLES.ADMIN, label: t('capabilities.governanceAdmin') },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setSelectedRole(tab.key);
                setIsRegisterMode(false);
                setValidationError('');
              }}
              className={`py-2.5 text-[11px] font-bold rounded-lg uppercase tracking-wider transition-all ${
                selectedRole === tab.key
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body Header sub-hero */}
        <div className="max-w-4xl mx-auto text-center mb-12 bg-slate-900/30 border border-slate-900 rounded-2xl p-6">
          <h3 className="text-lg md:text-xl font-medium text-slate-200 italic leading-relaxed">
            "{t(`capabilities.${getRoleKey(selectedRole)}.hero`)}"
          </h3>
        </div>

        {/* Features list grid (5 features + 1 Highlighted benefit card) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5].map((index) => {
            const Icon = activeIcons[index - 1] || Sparkles;
            return (
              <div key={index} className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 w-fit">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-100">
                    {t(`capabilities.${getRoleKey(selectedRole)}.f${index}Title`)}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t(`capabilities.${getRoleKey(selectedRole)}.f${index}Desc`)}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Highlighted Benefit Card */}
          <div className="glass-panel rounded-2xl benefit-card-highlight p-6 flex flex-col justify-between shadow-lg shadow-brand-500/5">
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 w-fit">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-slate-100">
                {t('capabilities.benefitHeader')}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {t(`capabilities.${getRoleKey(selectedRole)}.benefit`)}
              </p>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded w-fit mt-4">
              {t('capabilities.primaryBenefit')}
            </span>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-950 max-w-7xl mx-auto px-6 border-b border-slate-900 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <h2 className="text-3xl font-extrabold text-slate-100">{t('workflow.title')}</h2>
          <p className="text-sm text-slate-400">
            {t('workflow.subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4 relative">
              <span className="text-5xl font-extrabold text-brand-500/15 absolute right-4 top-4 font-sans">
                {t(`workflow.step${stepNum}`)}
              </span>
              <h4 className="text-base font-bold text-slate-100 pt-4">
                {t(`workflow.step${stepNum}Title`)}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t(`workflow.step${stepNum}Desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Benefits & Synchronized Statistics Section */}
      <section className="py-20 max-w-7xl mx-auto px-6 border-b border-slate-900 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold text-slate-100">{t('benefits.title')}</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {t('benefits.subtitle')}
          </p>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-300 leading-normal">{t(`benefits.${getRoleKey(selectedRole)}Benefit${num}`)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Statistics Panel linked to global selectedRole */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-8 space-y-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-brand-400" />
            <h4 className="text-lg font-bold text-slate-100">{activeStats.title}</h4>
          </div>
          <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-brand-600 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${activeStats.percentage}%` }} 
            />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            {activeStats.metrics.map((metric, idx) => (
              <div key={idx}>
                <span className="block text-2xl font-bold text-slate-200">{metric.value}</span>
                <span className="text-[9px] text-slate-500 uppercase font-semibold leading-tight block mt-1">
                  {metric.label}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 italic text-center mt-2">
            {t('benefits.disclaimer')}
          </p>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="py-12 border-t border-slate-900 bg-slate-950/60 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-sm font-bold text-slate-200">{t('footer.brand')}</h4>
            <p className="text-xs text-slate-500">{t('footer.subtitle')}</p>
          </div>
          <p className="text-[10px] text-slate-600 text-center md:text-right leading-normal">
            &copy; {new Date().getFullYear()} {t('footer.copy')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
