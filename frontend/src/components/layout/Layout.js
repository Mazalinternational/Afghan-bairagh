import React, { useState } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';
import { useLanguage } from '../../context/LanguageContext';

const Layout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage === 'prs' || currentLanguage === 'ps';

  return (
    <div className="flex h-screen min-h-0 bg-gray-100 dark:bg-gray-900">
      <Sidebar
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      {/* Fixed sidebar does not use layout width — offset main so desktop content is not drawn under the bar (md:w-44 = 11rem) */}
      <div
        className={`flex-1 relative min-w-0 overflow-hidden ${
          isRTL ? 'md:mr-44' : 'md:ml-44'
        }`}
      >
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`md:hidden fixed top-3 ${isRTL ? 'right-3' : 'left-3'} z-30 p-2 rounded-lg bg-gray-800/90 backdrop-blur text-white hover:bg-gray-700`}
          aria-label="Open menu"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        <main className="absolute inset-0 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-0 pt-12 md:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
