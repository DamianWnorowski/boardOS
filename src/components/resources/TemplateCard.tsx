import React from 'react';
import { ResourceType } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';

interface TemplateCardProps {
  equipmentType: ResourceType;
  label: string;
  onClick: () => void;
  isCompact?: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ 
  equipmentType, 
  label,
  onClick,
  isCompact = false
}) => {
  // Get emoji and colors based on equipment type
  const getEmojiForType = () => {
    switch (equipmentType) {
      case 'paver': return '';
      case 'roller': return '';
      case 'sweeper': return '';
      case 'millingMachine': return '';
      case 'truck': return '';
      default: return '';
    }
  };
  
  // Card styling based on equipment type
  const getCardStyle = () => {
    return 'bg-gray-200 text-gray-500 border border-dashed border-gray-400';
  };

  const widthClass = isCompact ? 'w-20' : 'w-28';
  return (
    <div 
      onClick={onClick}
      className={`px-1 py-1 transition-all duration-200 ${getCardStyle()} rounded-md hover:bg-gray-300 cursor-pointer h-10 flex flex-col justify-center ${widthClass} opacity-70 hover:opacity-100`}
    >
      <div className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-medium text-center flex items-center justify-center`}>
        <span className="mr-1">{getEmojiForType()}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className={`${isCompact ? 'text-[7px]' : 'text-[8px]'} text-center`}>
        Click to add
      </div>
    </div>
  );
};

export default TemplateCard;