import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTabAwayTracker } from '../hooks/useTabAwayTracker';

/**
 * TabAwayTracker
 * 
 * Headless component mounted inside AuthProvider.
 * Actively monitors Page Visibility API changes for authenticated students.
 * Student UI never renders or exposes this component.
 */
export default function TabAwayTracker() {
  const { currentUser, userProfile } = useAuth();
  useTabAwayTracker(currentUser, userProfile);
  return null;
}
