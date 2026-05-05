import React from 'react';

const PageHeader = ({ title, subtitle, icon: Icon, actions, compact }) => {
  return (
    <div
      className={`bg-blue-50 dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl dark:shadow-lg dark:hover:shadow-2xl relative overflow-hidden ${
        compact ? 'p-2 mb-1' : 'p-3 mb-3'
      }`}
    >
      {/* Decorative shapes */}
      <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-400/60 dark:bg-blue-600/40 rounded-full opacity-50" />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-400/60 dark:bg-blue-600/40 rounded-full opacity-30" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
          {Icon && (
            <Icon
              className={`text-blue-600 dark:text-blue-400 ${compact ? 'h-4 w-4' : 'h-5 w-5'}`}
            />
          )}
          <div>
            <h1 className={`font-bold text-gray-900 dark:text-white ${compact ? 'text-base' : 'text-lg'}`}>{title}</h1>
            {subtitle && (
              <p className={`text-gray-600 dark:text-gray-400 ${compact ? 'text-[11px] leading-tight' : 'text-xs'}`}>{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
