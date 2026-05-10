import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAccessToken, getRefreshToken } from '../../utils/tokenStorage';

const InitialRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const [hasAccount, setHasAccount] = useState(null);

  useEffect(() => {
    // Check if user has previously registered (has account)
    const checkUserAccount = () => {
      const rememberedUser = localStorage.getItem('rememberMe');
      const hasToken = getAccessToken();
      const hasRefresh = getRefreshToken();
      
      // If user has tokens or remember me is set, they have an account
      setHasAccount(rememberedUser || hasToken || hasRefresh);
    };

    if (!loading) {
      checkUserAccount();
    }
  }, [loading]);

  if (loading || hasAccount === null) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // If authenticated, go to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // If has account but not authenticated, go to login
  if (hasAccount) {
    return <Navigate to="/login" replace />;
  }

  // If no account, go to register
  return <Navigate to="/register" replace />;
};

export default InitialRoute;
