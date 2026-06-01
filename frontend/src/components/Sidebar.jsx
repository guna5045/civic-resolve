import React from 'react';
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

const Sidebar = ({ role, user, isOpen, toggleSidebar }) => {
  const location = useLocation();

  const getCitizenMenu = () => [
    { label: 'Dashboard', path: '/citizen', icon: LayoutDashboard },
    { label: 'Report Issue', path: '/citizen/report', icon: AlertTriangle },
    { label: 'Nearby Issues', path: '/citizen/nearby', icon: MapPin },
    { label: 'My Complaints', path: '/citizen/my-complaints', icon: List },
    { label: 'Supported Issues', path: '/citizen/supported', icon: Heart },
    { label: 'Public Map', path: '/citizen/map', icon: Map },
    { label: 'Rewards', path: '/citizen/rewards', icon: Award },
    { label: 'Notifications', path: '/citizen/notifications', icon: Bell },
    { label: 'Profile', path: '/citizen/profile', icon: User },
  ];

  const getOfficerMenu = () => [
    { label: 'Dashboard', path: '/officer', icon: LayoutDashboard },
    { label: 'Assigned Issues', path: '/officer/assigned', icon: List },
    { label: 'Department Map', path: '/officer/map', icon: Map },
    { label: 'Reports', path: '/officer/reports', icon: FileText },
    { label: 'Analytics', path: '/officer/analytics', icon: BarChart2 },
    { label: 'Notifications', path: '/officer/notifications', icon: Bell },
    { label: 'Profile', path: '/officer/profile', icon: User },
  ];

  const getAdminMenu = () => [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Departments', path: '/admin/departments', icon: Layers },
    { label: 'Officers', path: '/admin/officers', icon: Users },
    { label: 'Complaints', path: '/admin/complaints', icon: List },
    { label: 'Escalations', path: '/admin/escalations', icon: ShieldAlert },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart2 },
    { label: 'Reports', path: '/admin/reports', icon: FileText },
    { label: 'Rewards', path: '/admin/rewards', icon: Award },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: History },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
    { label: 'Profile', path: '/admin/profile', icon: User },
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
              Civic Resolve
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
                {role === ROLES.CITIZEN ? `Lvl ${user?.level || 1} Citizen` : role}
              </span>
            </div>
          </div>
          {role === ROLES.CITIZEN && (
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/40 pt-2.5">
              <span>XP Points:</span>
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
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
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
