import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function PublicRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="p-6">Loading…</div>;
  return session ? <Navigate to="/dashboard" replace /> : children;
}
