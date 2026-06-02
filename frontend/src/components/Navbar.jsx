import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Bell, LogOut, Menu, User, Settings, Check, Globe, Accessibility, Sun, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import { AccessibilityContext } from '../context/AccessibilityContext';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { locale, changeLanguage, t } = useContext(LanguageContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { setIsPanelOpen } = useContext(AccessibilityContext);
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const langRef = useRef(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (document.hidden) return;
      try {
        const res = await api.get('/notifications');
        if (res.data.success) {
          setNotifications(res.data.data);
          const unread = res.data.data.filter(n => !n.isRead).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    if (user?._id) {
      fetchNotifications();
      // Poll every 60 seconds
      const timer = setInterval(fetchNotifications, 60000);

      // Listen for visibility changes to refresh notifications immediately when tab becomes active
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchNotifications();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [user?._id]);

  // Click outside and focus controls to close dropdowns
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setShowLangDropdown(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowNotifDropdown(false);
        setShowProfileDropdown(false);
        setShowLangDropdown(false);
      }
    };
    const handleFocusOutline = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setShowLangDropdown(false);
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

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleMarkSingleRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी' },
    { code: 'te', name: 'తెలుగు' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'മലയാളം' }
  ];

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6 backdrop-blur-md sticky top-0 z-30">
      {/* Mobile Toggle & Search */}
      <div className="flex flex-1 items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Global Search */}
        <div className="relative max-w-md w-full hidden md:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-500" />
          </span>
          <input
            type="text"
            placeholder={t('nav.searchPlaceholder')}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Language Selector Dropdown */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors flex items-center gap-1.5"
            title={t('nav.selectProfile') || 'Language'}
          >
            <Globe className="h-5 w-5" />
            <span className="text-xs font-semibold hidden sm:inline uppercase">{locale}</span>
          </button>
          {showLangDropdown && (
            <div className="absolute right-0 mt-3 w-40 rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden z-50 py-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setShowLangDropdown(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2 text-sm transition-colors ${
                    locale === lang.code
                      ? 'bg-brand-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <span>{lang.name}</span>
                  {locale === lang.code && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Accessibility Toggler */}
        <button
          onClick={() => setIsPanelOpen(true)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          title={t('accessibility.tooltip') || 'Accessibility Settings'}
        >
          <Accessibility className="h-5 w-5" />
        </button>

        {/* Notifications Icon & Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-slate-900 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-3 w-80 rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/40">
                <span className="text-sm font-semibold text-slate-200">{t('nav.notifications')}</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                  >
                    {t('nav.markAllRead')}
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">{t('nav.noNotifications')}</div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={`p-3.5 hover:bg-slate-800/40 transition-colors relative flex items-start gap-2.5 ${
                        !notif.isRead ? 'bg-brand-500/5' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <h5 className="text-xs font-semibold text-slate-200">{notif.title}</h5>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                          {notif.message}
                        </p>
                        <span className="text-[9px] text-slate-500 block mt-1.5">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {!notif.isRead && (
                        <button
                          onClick={(e) => handleMarkSingleRead(notif._id, e)}
                          title="Mark read"
                          className="h-5 w-5 rounded bg-slate-800 flex items-center justify-center text-slate-400 hover:text-brand-400 border border-slate-700/60"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-800 transition-colors"
          >
            <div className="h-8 w-8 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-3 w-56 rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden z-50 py-1 divide-y divide-slate-800/60">
              <div className="px-4 py-2.5">
                <p className="text-xs font-medium text-slate-400">{t('nav.signedInAs')}</p>
                <p className="text-sm font-semibold text-slate-200 truncate mt-0.5">{user?.email}</p>
              </div>
              <div className="py-1">
                <Link
                  to={user?.role === 'Admin' ? '/admin/profile' : user?.role === 'Department Officer' ? '/officer/profile' : '/citizen/profile'}
                  onClick={() => setShowProfileDropdown(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                >
                  <User className="h-4 w-4" />
                  {t('nav.profile')}
                </Link>
                <Link
                  to={user?.role === 'Admin' ? '/admin/settings' : user?.role === 'Department Officer' ? '/officer/profile' : '/citizen/profile'}
                  onClick={() => setShowProfileDropdown(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  {t('nav.settings')}
                </Link>
              </div>
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.signOut')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
