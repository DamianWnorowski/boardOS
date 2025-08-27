import React from 'react';
import { ChevronRight } from 'lucide-react';
import { QuickSelectState } from '../../types/quickSelect';

interface BreadcrumbNavigationProps {
  quickSelectState: QuickSelectState;
}

const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({ quickSelectState }) => {
  if (quickSelectState.mode === 'category') {
    return null; // No breadcrumb at root level
  }

  const breadcrumbs: { label: string; icon?: string }[] = [];

  // Add category breadcrumb
  if (quickSelectState.selectedCategory) {
    breadcrumbs.push({
      label: quickSelectState.selectedCategory.name,
      icon: quickSelectState.selectedCategory.icon
    });
  }

  // Add subcategory breadcrumb if in equipment subcategory view
  if (quickSelectState.mode === 'subcategory') {
    // No subcategory breadcrumb needed, just show we're in subcategory view
  }

  // Add subcategory breadcrumb if in magnets view and we came from subcategory
  if (quickSelectState.mode === 'magnets' && quickSelectState.selectedSubcategory) {
    breadcrumbs.push({
      label: quickSelectState.selectedSubcategory.name,
      icon: quickSelectState.selectedSubcategory.icon
    });
  }

  return (
    <div className="flex items-center space-x-1 text-sm text-gray-600 mb-4" data-testid="breadcrumb">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight size={14} className="text-gray-400" />}
          <div className="flex items-center space-x-1">
            {crumb.icon && <span className="text-base">{crumb.icon}</span>}
            <span className="font-medium">{crumb.label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default BreadcrumbNavigation;