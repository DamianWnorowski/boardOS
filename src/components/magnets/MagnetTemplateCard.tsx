import React from 'react';
import { ResourceType } from '../../types';

interface MagnetTemplateCardProps {
  type: ResourceType;
  label: string;
  onClick: () => void;
}

const MagnetTemplateCard: React.FC<MagnetTemplateCardProps> = ({ 
  type, 
  label,
  onClick 
}) => {
  // Get emoji and colors based on equipment type
  const getEmojiForType = () => {
    switch (type) {
      case 'paver': return '🏗️';
      case 'roller': return '🎯';
      case 'sweeper': return '🧹';
      case 'millingMachine': return '⚙️';
      case 'truck': return '🚛';
      case 'operator': return '👨‍🔧';
      case 'laborer': return '👷';
      case 'foreman': return '📋';
      default: return '🚜';
    }
  };
  
  // Card styling based on resource type
  const getCardStyle = () => {
    return 'bg-gray-200 text-gray-500 border border-dashed border-gray-400';
  };

  return (
    <div 
      onClick={onClick}
      className={`px-1 py-1 transition-all duration-200 ${getCardStyle()} rounded-md hover:bg-gray-300 cursor-pointer h-10 flex flex-col justify-center w-28 opacity-70 hover:opacity-100`}
    >
      <div className="text-xs font-medium text-center flex items-center justify-center">
        <span className="mr-1">{getEmojiForType()}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="text-[8px] text-center">
        Click to add
      </div>
    </div>
  );
};

export default MagnetTemplateCard;