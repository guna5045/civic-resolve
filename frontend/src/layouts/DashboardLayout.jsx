import React, { useState, Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';

const DashboardLayout = ({ allowedRoles }) => {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <span className="text-sm text-slate-400 font-medium animate-pulse">Loading Civic Resolve...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if user not authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Redirect to unauthorized or home if role not allowed
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar Navigation */}
      <Sidebar
        role={user.role}
        user={user}
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <Navbar toggleSidebar={toggleSidebar} />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6 lg:p-8">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                  <span className="text-xs text-slate-500 font-medium animate-pulse">Loading panel...</span>
                </div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
