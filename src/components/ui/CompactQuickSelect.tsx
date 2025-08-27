import React from 'react';
import { useKeyboardShortcuts } from '../../context/KeyboardShortcutsContext';
import { useMagnets } from '../../hooks/useMagnet';
import DraggableQuickSelectCard from './DraggableQuickSelectCard';
import { ResourceCategory, EquipmentSubcategory, getCategoryStyle, getSubcategoryStyle } from '../../types/quickSelect';
import { Magnet, MagnetStatus } from '../../classes/Magnet';
import { ArrowLeft, X } from 'lucide-react';

const CompactQuickSelect: React.FC = () => {
  const { 
    isQuickSelectOpen, 
    quickSelectState,
    quickSelectMagnets,
    getCurrentOptions,
    executeSelectedAtIndex,
    goBack,
    closeQuickSelect,
    handleDragStart,
    executeCategory,
    executeSubcategory,
    executeMagnet
  } = useKeyboardShortcuts();
  
  const { filterMagnetsByType } = useMagnets();

  if (!isQuickSelectOpen) return null;

  const options = getCurrentOptions();

  const getAvailableCountForCategory = (category: ResourceCategory) => {
    return category.resourceTypes
      .flatMap(type => filterMagnetsByType(type))
      .filter(magnet => magnet.status === MagnetStatus.Available)
      .length;
  };

  const getAvailableCountForSubcategory = (subcategory: EquipmentSubcategory) => {
    return filterMagnetsByType(subcategory.resourceType)
      .filter(magnet => magnet.status === MagnetStatus.Available)
      .length;
  };

  const handleCategoryClick = (index: number, category: ResourceCategory) => {
    executeCategory(category);
  };

  const handleSubcategoryClick = (index: number, subcategory: EquipmentSubcategory) => {
    executeSubcategory(subcategory);
  };

  const handleMagnetClick = (index: number, magnet: Magnet) => {
    executeMagnet(magnet);
  };

  const getTitle = () => {
    switch (quickSelectState.mode) {
      case 'category':
        return 'Select Category';
      case 'subcategory':
        return 'Select Equipment';
      case 'magnets':
        return `Select ${quickSelectState.selectedCategory?.name || 'Resource'}`;
      default:
        return 'Quick Select';
    }
  };

  const renderCategoryGrid = (categories: ResourceCategory[]) => (
    <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto" data-testid="compact-categories">
      {categories.map((category, index) => {
        const isSelected = index === quickSelectState.selectedIndex;
        const categoryColors = getCategoryStyle(category);
        const availableCount = getAvailableCountForCategory(category);
        const hasAvailable = availableCount > 0;
        
        return (
          <div
            key={category.id}
            className={`relative cursor-pointer transition-all hover:scale-105 ${
              isSelected ? 'ring-2 ring-blue-400 ring-opacity-75 rounded-lg' : ''
            } ${!hasAvailable ? 'opacity-50' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleCategoryClick(index, category);
            }}
            data-testid={`compact-category-${category.id}`}
            title={`${category.description} (${availableCount} available)`}
          >
            {/* Magnet-like card - more compact */}
            <div className={`w-full h-14 rounded-md border border-gray-300 flex flex-col items-center justify-center relative overflow-hidden ${categoryColors}`}>
              {/* Icon and name */}
              <div className="text-sm mb-0.5">{category.icon}</div>
              <div className="text-xs font-semibold text-center px-1">{category.name}</div>
              
              {/* Count badge */}
              <div className="absolute top-0.5 left-0.5 bg-gray-800 text-white text-xs rounded-full px-1 py-0.5 min-w-[16px] text-center leading-none">
                {availableCount}
              </div>
              
              {/* Subcategory indicator */}
              {category.hasSubcategories && (
                <div className="absolute top-0.5 right-0.5 text-xs opacity-75">→</div>
              )}
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold z-10">
                  {index + 1}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderSubcategoryGrid = (subcategories: EquipmentSubcategory[]) => (
    <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto" data-testid="compact-subcategories">
      {subcategories.map((subcategory, index) => {
        const isSelected = index === quickSelectState.selectedIndex;
        const subcategoryColors = getSubcategoryStyle(subcategory);
        const availableCount = getAvailableCountForSubcategory(subcategory);
        const hasAvailable = availableCount > 0;
        
        return (
          <div
            key={subcategory.id}
            className={`relative cursor-pointer transition-all hover:scale-105 ${
              isSelected ? 'ring-2 ring-blue-400 ring-opacity-75 rounded-lg' : ''
            } ${!hasAvailable ? 'opacity-50' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (hasAvailable) {
                handleSubcategoryClick(index, subcategory);
              }
            }}
            data-testid={`compact-subcategory-${subcategory.id}`}
            title={`${subcategory.description} (${availableCount} available)`}
          >
            {/* Magnet-like card */}
            <div className={`w-full h-12 rounded-md border border-gray-300 flex flex-col items-center justify-center relative overflow-hidden ${subcategoryColors}`}>
              {/* Icon and name */}
              <div className="text-sm">{subcategory.icon}</div>
              <div className="text-xs font-semibold text-center px-1">{subcategory.name}</div>
              
              {/* Count badge */}
              <div className="absolute top-0.5 left-0.5 bg-gray-800 text-white text-xs rounded-full px-1 py-0.5 min-w-[16px] text-center leading-none">
                {availableCount}
              </div>
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold z-10">
                  {index + 1}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderMagnetGrid = (magnets: Magnet[]) => (
    <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto" data-testid="compact-magnets">
      {magnets.map((magnet, index) => (
        <div
          key={magnet.id}
          data-testid={`compact-magnet-${magnet.type}-${index}`}
        >
          <DraggableQuickSelectCard
            magnet={magnet}
            onDragStart={handleDragStart}
            isSelected={index === quickSelectState.selectedIndex}
            selectedIndex={index}
          />
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (options.length === 0) {
      return (
        <p className="text-center text-gray-500 py-4 text-sm">
          No available {quickSelectState.mode === 'magnets' ? 'resources' : 'options'} found
        </p>
      );
    }

    switch (quickSelectState.mode) {
      case 'category':
        return renderCategoryGrid(options as ResourceCategory[]);
      case 'subcategory':
        return renderSubcategoryGrid(options as EquipmentSubcategory[]);
      case 'magnets':
        return renderMagnetGrid(options as Magnet[]);
      default:
        return null;
    }
  };

  const canGoBack = quickSelectState.navigationHistory.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" data-testid="compact-quick-select">
      <div className="bg-white rounded-lg shadow-xl p-3 max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {canGoBack && (
              <button
                onClick={goBack}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                title="Go back"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="text-lg font-semibold">{getTitle()}</h2>
            <div className="text-xs text-gray-500 ml-2">
              {options.length > 0 && `${options.length} available`}
            </div>
          </div>
          <button
            onClick={closeQuickSelect}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
        
        <div className="mt-2 text-center text-xs text-gray-500">
          Tab: Navigate • Enter: Select • Click: Select • Drag: Assign to job • Esc: Close
        </div>
      </div>
    </div>
  );
};

export default CompactQuickSelect;