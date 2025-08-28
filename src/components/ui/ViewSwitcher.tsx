import React from 'react';
import { Calendar, CalendarDays, Grid3X3 } from 'lucide-react';
import { ViewType } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';

interface ViewSwitcherProps {
  className?: string;
  variant?: 'buttons' | 'tabs';
  size?: 'sm' | 'md' | 'lg';
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ 
  className = '', 
  variant = 'buttons',
  size = 'md'
}) => {
  const { currentView, setCurrentView } = useScheduler();

  const views = [
    { 
      id: 'day' as ViewType, 
      label: 'Day', 
      icon: Calendar,
      description: 'Daily job view with detailed assignments'
    },
    { 
      id: 'week' as ViewType, 
      label: 'Week', 
      icon: CalendarDays,
      description: '7-day overview with job planning'
    },
    { 
      id: 'month' as ViewType, 
      label: 'Month', 
      icon: Grid3X3,
      description: 'Monthly calendar view with job indicators'
    }
  ];

  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-xs',
      icon: 12,
      gap: 'space-x-1'
    },
    md: {
      button: 'px-3 py-2 text-sm',
      icon: 16,
      gap: 'space-x-2'
    },
    lg: {
      button: 'px-4 py-3 text-base',
      icon: 20,
      gap: 'space-x-3'
    }
  };

  const currentSizeClasses = sizeClasses[size];

  if (variant === 'tabs') {
    return (
      <div className={`border-b border-gray-200 ${className}`}>
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {views.map((view) => {
            const Icon = view.icon;
            const isActive = currentView === view.id;
            
            return (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={`
                  ${currentSizeClasses.button} ${currentSizeClasses.gap}
                  border-b-2 font-medium flex items-center transition-colors
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                title={view.description}
              >
                <Icon size={currentSizeClasses.icon} />
                <span>{view.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div className={`flex bg-gray-100 rounded-lg p-1 ${className}`} role="group">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.id;
        
        return (
          <button
            key={view.id}
            onClick={() => setCurrentView(view.id)}
            className={`
              ${currentSizeClasses.button} ${currentSizeClasses.gap}
              rounded-md font-medium flex items-center transition-all duration-200
              ${isActive
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
            title={view.description}
            aria-pressed={isActive}
          >
            <Icon size={currentSizeClasses.icon} />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ViewSwitcher;