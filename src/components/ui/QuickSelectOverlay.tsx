import React from 'react';\nimport { getZIndexClass } from '../../utils/zIndexLayers';
import { useKeyboardShortcuts } from '../../context/KeyboardShortcutsContext';
import MagnetCard from '../magnets/MagnetCard';
import BreadcrumbNavigation from './BreadcrumbNavigation';
import { ResourceCategory, EquipmentSubcategory, getCategoryStyle, getSubcategoryStyle } from '../../types/quickSelect';
import { Magnet } from '../../classes/Magnet';

const QuickSelectOverlay: React.FC = () => {
  const { 
    isQuickSelectOpen, 
    quickSelectState,
    quickSelectMagnets,
    getCurrentOptions
  } = useKeyboardShortcuts();

  if (!isQuickSelectOpen) return null;

  const options = getCurrentOptions();

  const getTitle = () => {
    switch (quickSelectState.mode) {
      case 'category':
        return 'Select Resource Category';
      case 'subcategory':
        return 'Select Equipment Type';
      case 'magnets':
        return `Select ${quickSelectState.selectedCategory?.name || 'Resource'}`;
      default:
        return 'Quick Select';
    }
  };

  const getHelpText = () => {
    switch (quickSelectState.mode) {
      case 'category':
        return 'Tab: Next • Shift+Tab: Previous • Enter: Select • 1-9: Quick Select • Esc: Close';
      case 'subcategory':
        return 'Tab: Next • Shift+Tab: Previous • Enter: Select • Backspace: Back • Esc: Close';
      case 'magnets':
        return 'Tab: Next • Shift+Tab: Previous • Enter: Select • Backspace: Back • Esc: Close';
      default:
        return 'Tab: Next • Shift+Tab: Previous • Enter: Select • Esc: Close';
    }
  };

  const renderCategoryGrid = (categories: ResourceCategory[]) => (
    <div className="grid grid-cols-4 gap-4 max-h-80 overflow-y-auto" data-testid="quick-select-categories">
      {categories.map((category, index) => {
        const isSelected = index === quickSelectState.selectedIndex;
        const categoryColors = getCategoryStyle(category);
        
        return (
          <div
            key={category.id}
            className={`relative cursor-pointer transition-all hover:scale-105 ${
              isSelected ? 'ring-4 ring-blue-500 ring-opacity-75 rounded-lg' : ''
            }`}
            data-testid={`category-${category.id}`}
          >
            {isSelected && (
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold z-10">
                {index + 1}
              </div>
            )}
            
            {/* Magnet-like card */}
            <div className={`w-full h-20 rounded-lg border-2 border-gray-300 flex flex-col items-center justify-center relative overflow-hidden ${categoryColors}`}>
              {/* Icon and name */}
              <div className="text-lg mb-1">{category.icon}</div>
              <div className="text-xs font-bold text-center px-1">{category.name}</div>
              
              {/* Subcategory indicator */}
              {category.hasSubcategories && (
                <div className="absolute top-1 right-1 text-xs opacity-75">→</div>
              )}
            </div>
            
            {/* Description below card */}
            <div className="text-xs text-gray-500 mt-1 text-center">{category.description}</div>
          </div>
        );
      })}
    </div>
  );

  const renderSubcategoryGrid = (subcategories: EquipmentSubcategory[]) => (
    <div className="grid grid-cols-5 gap-3 max-h-80 overflow-y-auto" data-testid="equipment-subcategories">
      {subcategories.map((subcategory, index) => {
        const isSelected = index === quickSelectState.selectedIndex;
        const subcategoryColors = getSubcategoryStyle(subcategory);
        
        return (
          <div
            key={subcategory.id}
            className={`relative cursor-pointer transition-all hover:scale-105 ${
              isSelected ? 'ring-4 ring-blue-500 ring-opacity-75 rounded-lg' : ''
            }`}
            data-testid={`subcategory-${subcategory.id}`}
          >
            {isSelected && (
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold z-10">
                {index + 1}
              </div>
            )}
            
            {/* Magnet-like card */}
            <div className={`w-full h-16 rounded-lg border-2 border-gray-300 flex flex-col items-center justify-center relative overflow-hidden ${subcategoryColors}`}>
              {/* Icon and name */}
              <div className="text-base mb-1">{subcategory.icon}</div>
              <div className="text-xs font-bold text-center px-1">{subcategory.name}</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderMagnetGrid = (magnets: Magnet[]) => (
    <div className="grid grid-cols-5 gap-3 max-h-80 overflow-y-auto" data-testid="magnets-grid">
      {magnets.map((magnet, index) => (
        <div
          key={magnet.id}
          className={`relative ${
            index === quickSelectState.selectedIndex 
              ? 'ring-4 ring-blue-500 ring-opacity-75 rounded-lg' 
              : ''
          }`}
          data-testid={`magnet-${magnet.type}-${index}`}
        >
          {index === quickSelectState.selectedIndex && (
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold z-10">
              ✓
            </div>
          )}
          <MagnetCard magnetId={magnet.id} />
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (options.length === 0) {
      return (
        <p className="text-center text-gray-500 py-8">
          No available {quickSelectState.mode === 'magnets' ? 'magnets' : 'options'} found
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

  const getStatusText = () => {
    if (options.length === 0) return '';
    
    const current = quickSelectState.selectedIndex + 1;
    const total = options.length;
    const selectedItem = options[quickSelectState.selectedIndex];
    
    let itemName = '';
    if (quickSelectState.mode === 'category') {
      itemName = (selectedItem as ResourceCategory)?.name;
    } else if (quickSelectState.mode === 'subcategory') {
      itemName = (selectedItem as EquipmentSubcategory)?.name;
    } else if (quickSelectState.mode === 'magnets') {
      itemName = (selectedItem as Magnet)?.name;
    }
    
    return `${current} of ${total} ${quickSelectState.mode} ${itemName ? `• ${itemName}` : ''}`;
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${getZIndexClass('OVERLAY')}`} data-testid="quick-select-overlay">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{getTitle()}</h2>
          <div className="text-sm text-gray-500">
            {getHelpText()}
          </div>
        </div>
        
        <BreadcrumbNavigation quickSelectState={quickSelectState} />
        
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-600">
          {getStatusText()}
        </div>
      </div>
    </div>
  );
};

export default QuickSelectOverlay;