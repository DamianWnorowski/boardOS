import React, { useState } from 'react';
import { X } from 'lucide-react';
import Portal from '../common/Portal';

interface TruckConfigModalProps {
  onSelect: (config: 'flowboy' | 'dump-trailer') => void;
  onClose: () => void;
}

const TruckConfigModal: React.FC<TruckConfigModalProps> = ({ onSelect, onClose }) => {
  const [selectedConfig, setSelectedConfig] = useState<'flowboy' | 'dump-trailer'>('flowboy');

  const handleSubmit = () => {
    onSelect(selectedConfig);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold">Select Truck Configuration</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Choose the trailer configuration for this truck:
            </p>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="flowboy"
                  checked={selectedConfig === 'flowboy'}
                  onChange={(e) => setSelectedConfig(e.target.value as 'flowboy')}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-medium">Flowboy (F/B)</div>
                  <div className="text-sm text-gray-500">Used for paving operations</div>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="dump-trailer"
                  checked={selectedConfig === 'dump-trailer'}
                  onChange={(e) => setSelectedConfig(e.target.value as 'dump-trailer')}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-medium">Dump Trailer (D/T)</div>
                  <div className="text-sm text-gray-500">Used for milling and material transport</div>
                </div>
              </label>
            </div>
          </div>
          
          <div className="p-4 border-t flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Assign Truck
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default TruckConfigModal;