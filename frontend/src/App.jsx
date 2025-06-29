// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import './index.css'; // Ensure Tailwind CSS is imported
import GoalsPage from './pages/GoalsPage';
import GoalsKpiTracker from './pages/GoalsKpiTracker';
import Profile from './pages/Profile';
import Directory from './pages/Directory';
import Settings from './pages/Settings';
import PerformanceReviewsPage from './pages/PerformanceReviewsPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/goalskpitracker" element={<GoalsKpiTracker />} />
        <Route path="/dashboard/reports" element={<Dashboard />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/dashboard/settings" element={<Dashboard />} />
        <Route path="/performancereviews" element={<PerformanceReviewsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
