import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  MapPin,
  List,
  Heart,
  Map,
  Award,
  Bell,
  User,
  Settings,
  Layers,
  Users,
  ShieldAlert,
  BarChart2,
  FileText,
  History,
  X,
} from 'lucide-react';
import { ROLES } from '../constants/roles';
import { LanguageContext } from '../context/LanguageContext';

const Sidebar = ({ role, user, isOpen, toggleSidebar }) => {
  const location = useLocation();
  const { t } = useContext(LanguageContext);

  const getRoleKey = (r) => {
    if (r === ROLES.ADMIN) return 'admin';
    if (r === ROLES.OFFICER) return 'officer';
    return 'citizen';
  };

  const getCitizenMenu = () => [
    { label: t('nav.dashboard'), path: '/citizen', icon: LayoutDashboard },
    { label: t('nav.nearbyIssues'), path: '/citizen/nearby', icon: MapPin },
    { label: t('nav.reportIssue'), path: '/citizen/report', icon: AlertTriangle },
    { label: t('nav.myComplaints'), path: '/citizen/my-complaints', icon: List },
    { label: t('nav.supportedIssues'), path: '/citizen/supported', icon: Heart },
    { label: t('nav.publicMap'), path: '/citizen/map', icon: Map },
    { label: t('nav.rewards'), path: '/citizen/rewards', icon: Award },
    { label: t('nav.notifications'), path: '/citizen/notifications', icon: Bell },
    { label: t('nav.profile'), path: '/citizen/profile', icon: User },
  ];

  const getOfficerMenu = () => [
    { label: t('nav.dashboard'), path: '/officer', icon: LayoutDashboard },
    { label: t('nav.assignedIssues'), path: '/officer/assigned', icon: List },
    { label: t('nav.departmentMap'), path: '/officer/map', icon: Map },
    { label: t('nav.reports'), path: '/officer/reports', icon: FileText },
    { label: t('nav.analytics'), path: '/officer/analytics', icon: BarChart2 },
    { label: t('nav.notifications'), path: '/officer/notifications', icon: Bell },
    { label: t('nav.profile'), path: '/officer/profile', icon: User },
  ];

  const getAdminMenu = () => [
    { label: t('nav.dashboard'), path: '/admin', icon: LayoutDashboard },
    { label: t('nav.departments'), path: '/admin/departments', icon: Layers },
    { label: t('nav.officers'), path: '/admin/officers', icon: Users },
    { label: t('nav.complaints'), path: '/admin/complaints', icon: List },
    { label: t('nav.escalations'), path: '/admin/escalations', icon: ShieldAlert },
    { label: t('nav.analytics'), path: '/admin/analytics', icon: BarChart2 },
    { label: t('nav.reports'), path: '/admin/reports', icon: FileText },
    { label: t('nav.rewards'), path: '/admin/rewards', icon: Award },
    { label: t('nav.auditLogs'), path: '/admin/audit-logs', icon: History },
    { label: t('nav.settings'), path: '/admin/settings', icon: Settings },
    { label: t('nav.profile'), path: '/admin/profile', icon: User },
  ];

  const getMenuItems = () => {
    switch (role) {
      case ROLES.CITIZEN:
        return getCitizenMenu();
      case ROLES.OFFICER:
        return getOfficerMenu();
      case ROLES.ADMIN:
        return getAdminMenu();
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Shell */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-900 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-brand-400 to-violet-500 bg-clip-text text-xl font-bold tracking-tight text-transparent">
              {t('nav.brand')}
            </span>
          </Link>
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Card info */}
        <div className="mx-4 my-6 rounded-xl bg-slate-950/40 p-4 border border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full border border-brand-500/30 bg-brand-500/10 flex items-center justify-center text-lg font-bold text-brand-400">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <h4 className="truncate text-sm font-semibold text-slate-100">{user?.fullName}</h4>
              <span className="text-xs text-brand-400 font-medium block uppercase tracking-wide">
                {role === ROLES.CITIZEN ? `Lvl ${user?.level || 1} ${t('auth.citizen')}` : t(`auth.${getRoleKey(role)}`)}
              </span>
            </div>
          </div>
          {role === ROLES.CITIZEN && (
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/40 pt-2.5 font-mono">
              <span>{t('dashboard.points')}:</span>
              <span className="font-semibold text-slate-200">{user?.points || 0} pts</span>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto pb-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) toggleSidebar();
                }}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all relative border-l-4 ${
                  isActive
                    ? 'bg-brand-500/10 border-brand-600 dark:border-brand-500 text-brand-600 dark:text-brand-400 font-bold shadow-sm'
                    : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 transition-colors ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
