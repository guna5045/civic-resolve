import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Layout & core shells
import DashboardLayout from '../layouts/DashboardLayout';

// Public pages
import LandingPage from '../pages/LandingPage';

// Shared Pages
import Profile from '../pages/Profile';
import Notifications from '../pages/Notifications';

// Citizen pages
import CitizenDashboard from '../pages/CitizenDashboard';
import ReportIssue from '../pages/ReportIssue';
import NearbyIssues from '../pages/NearbyIssues';
import MyComplaints from '../pages/MyComplaints';
import SupportedIssues from '../pages/SupportedIssues';
import PublicMap from '../pages/PublicMap';
import Rewards from '../pages/Rewards';

// Officer pages
import OfficerDashboard from '../pages/OfficerDashboard';
import AssignedIssues from '../pages/AssignedIssues';
import OfficerMap from '../pages/OfficerMap';
import OfficerReports from '../pages/OfficerReports';
import OfficerAnalytics from '../pages/OfficerAnalytics';

// Admin pages
import AdminDashboard from '../pages/AdminDashboard';
import AdminDepartments from '../pages/AdminDepartments';
import AdminOfficers from '../pages/AdminOfficers';
import AdminComplaints from '../pages/AdminComplaints';
import AdminEscalations from '../pages/AdminEscalations';
import AdminAnalytics from '../pages/AdminAnalytics';
import AdminReports from '../pages/AdminReports';
import AdminRewards from '../pages/AdminRewards';
import AdminAuditLogs from '../pages/AdminAuditLogs';
import AdminSettings from '../pages/AdminSettings';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />

      {/* Citizen Secured Dashboard Routes */}
      <Route element={<DashboardLayout allowedRoles={['Citizen']} />}>
        <Route path="/citizen" element={<CitizenDashboard />} />
        <Route path="/citizen/report" element={<ReportIssue />} />
        <Route path="/citizen/nearby" element={<NearbyIssues />} />
        <Route path="/citizen/my-complaints" element={<MyComplaints />} />
        <Route path="/citizen/supported" element={<SupportedIssues />} />
        <Route path="/citizen/map" element={<PublicMap />} />
        <Route path="/citizen/rewards" element={<Rewards />} />
        <Route path="/citizen/notifications" element={<Notifications />} />
        <Route path="/citizen/profile" element={<Profile />} />
      </Route>

      {/* Officer Secured Dashboard Routes */}
      <Route element={<DashboardLayout allowedRoles={['Department Officer']} />}>
        <Route path="/officer" element={<OfficerDashboard />} />
        <Route path="/officer/assigned" element={<AssignedIssues />} />
        <Route path="/officer/map" element={<OfficerMap />} />
        <Route path="/officer/reports" element={<OfficerReports />} />
        <Route path="/officer/analytics" element={<OfficerAnalytics />} />
        <Route path="/officer/notifications" element={<Notifications />} />
        <Route path="/officer/profile" element={<Profile />} />
      </Route>

      {/* Admin Secured Dashboard Routes */}
      <Route element={<DashboardLayout allowedRoles={['Admin']} />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/departments" element={<AdminDepartments />} />
        <Route path="/admin/officers" element={<AdminOfficers />} />
        <Route path="/admin/complaints" element={<AdminComplaints />} />
        <Route path="/admin/escalations" element={<AdminEscalations />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/rewards" element={<AdminRewards />} />
        <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/profile" element={<Profile />} />
      </Route>

      {/* Catch-all Fallback */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
};

export default AppRoutes;
