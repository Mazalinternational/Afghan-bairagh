import React from 'react';

const PrintingPressImage = () => {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1586953208448-b95a79798f07?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-purple-900/70 to-indigo-900/80" />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center p-8 w-full">
        <div className="max-w-xs text-center text-white">
          {/* Printing Press Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
              <svg 
                className="w-10 h-10 text-white" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M18 3H6C4.9 3 4 3.9 4 5v6c0 1.1.9 2 2 2h1v4c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-4h1c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17v-4h6v4H9zm9-6H6V5h12v6z"/>
                <circle cx="8" cy="7" r="1"/>
                <circle cx="16" cy="7" r="1"/>
                <path d="M7 15h2v1H7zm4 0h2v1h-2zm4 0h2v1h-2z"/>
              </svg>
            </div>
          </div>
          
          {/* Title and Description */}
          <h1 className="text-2xl font-bold mb-2 drop-shadow-lg">
            Afghan Flag Printing
          </h1>
          <h2 className="text-lg font-semibold mb-4 text-blue-200">
            Management System
          </h2>
          <p className="text-sm text-white/90 leading-relaxed drop-shadow-sm">
            Streamline your printing operations with comprehensive management tools.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrintingPressImage;
