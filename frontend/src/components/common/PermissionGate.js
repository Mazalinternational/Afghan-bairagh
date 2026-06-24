import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPath, getDefaultAllowedPath } from '../../utils/permissions';

const PermissionGate = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return children;

  if (!canAccessPath(user, location.pathname)) {
    return <Navigate to={getDefaultAllowedPath(user)} replace />;
  }

  return children;
};

export default PermissionGate;
