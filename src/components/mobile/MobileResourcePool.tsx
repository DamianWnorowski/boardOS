import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { useMobile } from '../../context/MobileContext';
import { useResourcePool } from '../../hooks/useOptimizedScheduler';
import { useScheduler } from '../../context/SchedulerContext';
import ResourceCard from '../resources/ResourceCard';
import { ResourceType } from '../../types';

const MobileResourcePool: React.FC = () => {
  const { isMobile } = useMobile();
  const { searchTerm, setSearchTerm, filteredResourceType, setFilteredResourceType } = useScheduler();
  const resourceCategories = useResourcePool();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isMobile) return null;

  const resourceTypes = [
    { value: '', label: 'All Resources' },
    { value: 'foreman', label: 'Foremen' },
    { value: 'operator', label: 'Operators' },
    { value: 'driver', label: 'Drivers' },
    { value: 'laborer', label: 'Laborers' },
    { value: 'truck', label: 'Trucks' },
    { value: 'paver', label: 'Pavers' },
    { value: 'roller', label: 'Rollers' },
    { value: 'sweeper', label: 'Sweepers' },
    { value: 'millingMachine', label: 'Milling Machines' },
  ];

  const categories = [
    { id: 'all', label: 'All', count: Object.values(resourceCategories).reduce((sum, cat) => sum + cat.available.length, 0) },
    { id: 'personnel', label: 'Personnel', count: ['foreman', 'operator', 'driver', 'laborer', 'striper', 'privateDriver'].reduce((sum, type) => sum + (resourceCategories[type]?.available.length || 0), 0) },
    { id: 'equipment', label: 'Equipment', count: ['paver', 'roller', 'sweeper', 'millingMachine', 'skidsteer', 'excavator', 'dozer', 'payloader', 'equipment'].reduce((sum, type) => sum + (resourceCategories[type]?.available.length || 0), 0) },
    { id: 'trucks', label: 'Trucks', count: resourceCategories['truck']?.available.length || 0 },
  ];

  const getFilteredResources = () => {
    let resources: any[] = [];

    if (selectedCategory === 'all') {
      resources = Object.values(resourceCategories).flatMap(cat => cat.available);
    } else if (selectedCategory === 'personnel') {
      resources = ['foreman', 'operator', 'driver', 'laborer', 'striper', 'privateDriver']
        .flatMap(type => resourceCategories[type]?.available || []);
    } else if (selectedCategory === 'equipment') {
      resources = ['paver', 'roller', 'sweeper', 'millingMachine', 'skidsteer', 'excavator', 'dozer', 'payloader', 'equipment']
        .flatMap(type => resourceCategories[type]?.available || []);
    } else if (selectedCategory === 'trucks') {
      resources = resourceCategories['truck']?.available || [];
    }

    return resources;
  };

  const filteredResources = getFilteredResources();

  return (
    <div className="bg-white h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Resource Pool</h2>
        
        {/* Search Bar */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>

        {/* Filter Toggle */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {filteredResources.length} available resources
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <Filter size={16} />
            <span className="text-sm">Filters</span>
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
            {/* Resource Type Filter */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Resource Type
              </label>
              <select
                value={filteredResourceType || ''}
                onChange={(e) => setFilteredResourceType(e.target.value || null)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              >
                {resourceTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowFilters(false)}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 bg-white">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 ${
              selectedCategory === category.id
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {category.label}
            <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
              {category.count}
            </span>
          </button>
        ))}
      </div>

      {/* Resources Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredResources.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-lg font-medium mb-2">No resources found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredResources.map(resource => (
              <div 
                key={resource.id} 
                className="bg-gray-50 p-2 rounded-lg touch-manipulation"
              >
                <ResourceCard
                  resource={resource}
                  isDragging={false}
                  isDisabled={false}
                />
                <div className="mt-2 text-xs text-center text-gray-600 capitalize">
                  {resource.type.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileResourcePool;