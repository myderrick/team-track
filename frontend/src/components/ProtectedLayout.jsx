import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'; // from earlier

export default function ProtectedLayout() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-6">Loading…</div>;

  // No session? bounce to /login and remember where they tried to go
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}
