import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function AdminRoute({ children }) {
  const { currentUser, userProfile, isAdmin, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen text="Verifying Admin Authorization..." />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    // Authorized admin email check: vaultstore27@gmail.com
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
