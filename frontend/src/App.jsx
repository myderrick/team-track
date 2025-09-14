import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from '@/context/AuthContext';
import ProtectedLayout from '@/components/ProtectedLayout';
import { OrgProvider } from './context/OrgContext';
import Login from '@/pages/Login';
import SignUp from '@/pages/SignUp';
import AddEmployee from '@/pages/AddEmployee';
import AuthCallback from '@/pages/AuthCallback';
import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import GoalsPage from '@/pages/GoalsPage';
import GoalsKpiTracker from '@/pages/GoalsKpiTracker';
import Profile from '@/pages/Profile';
import Directory from '@/pages/Directory';
import Settings from '@/pages/Settings';
import PerformanceReviewsPage from '@/pages/PerformanceReviewsPage';
import NotFound from '@/pages/NotFound';
import SelfReview from '@/pages/staff/StaffReview';
import StaffDashboard from '@/pages/staff/StaffDashboard';
import StaffGoals from '../src/pages/staff/StaffGoals'; 

import '@/index.css';
import StaffRegister from './pages/staff/Register';

export default function App() {
  return (
    <AuthProvider>
      <OrgProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Everything below here requires auth */}
          <Route element={<ProtectedLayout />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/employees/add" element={<AddEmployee />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/goalskpitracker" element={<GoalsKpiTracker />} />
            <Route path="/dashboard/reports" element={<Dashboard />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/dashboard/settings" element={<Dashboard />} />
            <Route path="/performancereviews" element={<PerformanceReviewsPage />} />
            <Route path="/selfreview" element={<SelfReview />} />
            <Route path="/staff" element={<StaffDashboard />} />
            <Route path="/staff/register" element={<StaffRegister />} />
            
            <Route path="/staff/self-review" element={<SelfReview />} />
            <Route path="/staff/goals" element={<StaffGoals />} />
           {/* <Route path="/staff/settings" element={<Settings staffMode />} /> */}
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      </OrgProvider>
    </AuthProvider>
  );
}
