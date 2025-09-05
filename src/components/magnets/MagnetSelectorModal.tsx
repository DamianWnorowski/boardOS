import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { ResourceType } from '../../types';
import { useMagnets } from '../../hooks/useMagnet';
import MagnetCard from './MagnetCard';

interface MagnetSelectorModalProps {
  title: string;
  resourceType: ResourceType;
  onSelect: (magnetId: string) => void;
  onClose: () => void;
}

const MagnetSelectorModal: React.FC<MagnetSelectorModalProps> = ({
  title,
  resourceType,
  onSelect,
  onClose
}) => {
  const { magnets, filterMagnetsByType } = useMagnets();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter magnets by type and search term
  const filteredMagnets = filterMagnetsByType(resourceType).filter(magnet => {
    if (!searchTerm) return true;
    
    return (
      magnet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      magnet.identifier?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  // Group magnets by model for equipment
  const isEquipment = ['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
                        'roller', 'dozer', 'payloader', 'equipment'].includes(resourceType);
  
  const groupedMagnets = isEquipment 
    ? filteredMagnets.reduce((groups, magnet) => {
        const model = magnet.model || 'Other';
        if (!groups[model]) {
          groups[model] = [];
        }
        groups[model].push(magnet);
        return groups;
      }, {} as Record<string, typeof filteredMagnets>)
    : { 'All': filteredMagnets };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {Object.keys(groupedMagnets).length === 0 ? (
            <p className="text-center text-gray-500 my-8">
              No available {resourceType}s found
            </p>
          ) : (
            Object.entries(groupedMagnets).map(([group, magnetList]) => (
              <div key={group} className="mb-4">
                {isEquipment && Object.keys(groupedMagnets).length > 1 && (
                  <h3 className="text-sm font-medium text-gray-700 mb-2">{group}</h3>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {magnetList.map(magnet => (
                    <div
                      key={magnet.id}
                      onClick={() => onSelect(magnet.id)}
                      className="cursor-pointer hover:scale-105 transition-transform"
                    >
                      <MagnetCard
                        magnetId={magnet.id}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default MagnetSelectorModal;