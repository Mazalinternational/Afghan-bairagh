import React, { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

const ProductTypeManager = ({ onSelect, productType, fieldName = 'flag_size', label = 'Flag Size' }) => {
  const [types, setTypes] = useState([]);
  const [newType, setNewType] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Use different localStorage keys for different field types
  const storageKey = fieldName === 'flag_size' ? 'flagSizes' : 'flagStandTypes';

  useEffect(() => {
    loadProductTypes();
  }, [fieldName]);

  const loadProductTypes = async () => {
    try {
      // Try to load from localStorage first (fallback)
      const savedTypes = localStorage.getItem(storageKey);
      if (savedTypes) {
        setTypes(JSON.parse(savedTypes));
      } else {
        // Default common sizes based on field type
        const defaultTypes = fieldName === 'flag_size'
          ? ['3x5 feet', '4x6 feet', '5x8 feet', '2x3 feet', '6x10 feet']
          : ['Flag Stand', 'Wooden Stand', 'Metal Stand', 'Plastic Stand', 'Table Stand', 'Floor Stand'];
        setTypes(defaultTypes);
        localStorage.setItem(storageKey, JSON.stringify(defaultTypes));
      }
    } catch (error) {
      console.error('Error loading product types:', error);
    }
  };

  const handleAddType = () => {
    if (newType.trim() && !types.includes(newType.trim())) {
      const updatedTypes = [...types, newType.trim()];
      setTypes(updatedTypes);
      localStorage.setItem(storageKey, JSON.stringify(updatedTypes));
      setNewType('');
      setShowAddForm(false);
      // Auto-select the newly added type
      if (onSelect) {
        onSelect(newType.trim());
      }
    }
  };

  const handleRemoveType = (typeToRemove) => {
    const updatedTypes = types.filter(t => t !== typeToRemove);
    setTypes(updatedTypes);
    localStorage.setItem(storageKey, JSON.stringify(updatedTypes));
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} *
      </label>
      
      {/* Select dropdown with existing types */}
      <div className="flex gap-2">
        <select
          value={productType || ''}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '__add_new__') {
              setShowAddForm(true);
            } else if (value && onSelect) {
              onSelect(value);
            }
          }}
          className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select {label}</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
          <option value="__add_new__" className="font-semibold text-blue-600">
            + Add New {label}
          </option>
        </select>
      </div>

      {/* Add new type form */}
      {showAddForm && (
        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddType();
                }
              }}
              placeholder={`Enter new ${label.toLowerCase()}`}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddType}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewType('');
              }}
              className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Show existing types with remove option */}
      {types.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {types.map((type) => (
            <span
              key={type}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
            >
              {type}
              <button
                type="button"
                onClick={() => handleRemoveType(type)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductTypeManager;