import React from 'react';
import {
  ShoppingBagIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

const StatsCards = () => {
  const stats = [
    {
      title: 'Total Orders',
      value: '127',
      change: '5.2%',
      trend: 'up',
      icon: ShoppingBagIcon,
      color: 'blue'
    },
    {
      title: 'Pending Orders',
      value: '8',
      change: '15.3%',
      trend: 'up',
      icon: ClockIcon,
      color: 'amber'
    },
    {
      title: 'Total Revenue',
      value: 'AFN 8,450',
      change: '12.1%',
      trend: 'up',
      icon: CurrencyDollarIcon,
      color: 'green'
    },
    {
      title: 'Outstanding Dues',
      value: 'AFN 1,250',
      change: '18.7%',
      trend: 'up',
      icon: ExclamationTriangleIcon,
      color: 'red'
    },
    {
      title: 'Low Stock Items',
      value: '3',
      change: '25%',
      trend: 'up',
      icon: CubeIcon,
      color: 'purple'
    },
    {
      title: 'Employee Count',
      value: '6',
      change: '0%',
      trend: 'neutral',
      icon: UsersIcon,
      color: 'gray'
    }
  ];

  const getColorClasses = (color, trend) => {
    const colors = {
      blue: {
        bg: 'from-blue-500/20 to-blue-600/10',
        icon: 'text-blue-600',
        change: trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
      },
      amber: {
        bg: 'from-amber-500/20 to-amber-600/10',
        icon: 'text-amber-600',
        change: trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
      },
      green: {
        bg: 'from-green-500/20 to-green-600/10',
        icon: 'text-green-600',
        change: trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
      },
      red: {
        bg: 'from-red-500/20 to-red-600/10',
        icon: 'text-red-600',
        change: trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-gray-600'
      },
      purple: {
        bg: 'from-purple-500/20 to-purple-600/10',
        icon: 'text-purple-600',
        change: trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-gray-600'
      },
      gray: {
        bg: 'from-gray-500/20 to-gray-600/10',
        icon: 'text-gray-600',
        change: 'text-gray-600'
      }
    };
    return colors[color];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const colorClasses = getColorClasses(stat.color, stat.trend);
        
        return (
          <div
            key={index}
            className="group relative backdrop-blur-xl bg-white/70 p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden"
          >
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            
            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses.bg} backdrop-blur-sm`}>
                  <Icon className={`h-6 w-6 ${colorClasses.icon}`} />
                </div>
                <div className={`text-sm font-semibold ${colorClasses.change} flex items-center gap-1`}>
                  {stat.trend === 'up' && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {stat.trend === 'down' && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {stat.change}
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors">
                  {stat.title}
                </h3>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors">
                  {stat.value}
                </p>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-tr from-white/5 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
