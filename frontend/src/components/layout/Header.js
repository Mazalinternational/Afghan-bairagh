import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-2">
        <h2 className="text-xl font-semibold text-gray-800">
          Welcome back, {user?.first_name || 'User'}
        </h2>
        
        <button className="p-2 text-gray-400 hover:text-gray-600">
          <BellIcon className="h-6 w-6" />
        </button>
        
        <div className="relative group">
          <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
            <UserCircleIcon className="h-8 w-8 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              {user?.username}
            </span>
          </button>
          
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 hidden group-hover:block">
            <button
              onClick={logout}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
