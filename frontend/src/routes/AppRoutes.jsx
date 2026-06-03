import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Layout & core shells
import DashboardLayout from '../layouts/DashboardLayout';

// Public pages - Keep statically loaded for instantaneous initial paints
import LandingPage from '../pages/LandingPage';

// Shared Pages
const Profile = lazy(() => import('../pages/Profile'));
const Notifications = lazy(() => import('../pages/Notifications'));

// Citizen pages
const CitizenDashboard = lazy(() => import('../pages/CitizenDashboard'));
const ReportIssue = lazy(() => import('../pages/ReportIssue'));
const NearbyIssues = lazy(() => import('../pages/NearbyIssues'));
const MyComplaints = lazy(() => import('../pages/MyComplaints'));
const SupportedIssues = lazy(() => import('../pages/SupportedIssues'));
const PublicMap = lazy(() => import('../pages/PublicMap'));
const Rewards = lazy(() => import('../pages/Rewards'));
const ActivityHistory = lazy(() => import('../pages/ActivityHistory'));

// Officer pages
const OfficerDashboard = lazy(() => import('../pages/OfficerDashboard'));
const AssignedIssues = lazy(() => import('../pages/AssignedIssues'));
const OfficerMap = lazy(() => import('../pages/OfficerMap'));
const OfficerReports = lazy(() => import('../pages/OfficerReports'));
const OfficerAnalytics = lazy(() => import('../pages/OfficerAnalytics'));

// Admin pages
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const AdminDepartments = lazy(() => import('../pages/AdminDepartments'));
const AdminOfficers = lazy(() => import('../pages/AdminOfficers'));
const AdminComplaints = lazy(() => import('../pages/AdminComplaints'));
const AdminEscalations = lazy(() => import('../pages/AdminEscalations'));
const AdminAnalytics = lazy(() => import('../pages/AdminAnalytics'));
const AdminReports = lazy(() => import('../pages/AdminReports'));
const AdminRewards = lazy(() => import('../pages/AdminRewards'));
const AdminAuditLogs = lazy(() => import('../pages/AdminAuditLogs'));
const AdminSettings = lazy(() => import('../pages/AdminSettings'));
const AdminMap = lazy(() => import('../pages/AdminMap'));

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
        <Route path="/citizen/activity" element={<ActivityHistory />} />
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
        <Route path="/admin/map" element={<AdminMap />} />
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
