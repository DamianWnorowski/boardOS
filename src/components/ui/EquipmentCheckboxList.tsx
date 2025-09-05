import React from 'react';
import { Check } from 'lucide-react';

interface EquipmentCheckboxListProps {
  selectedEquipment: string[];
  onEquipmentToggle: (equipment: string) => void;
  disabled?: boolean;
}

const EQUIPMENT_TYPES = [
  { value: 'skidsteer', label: 'Skidsteer' },
  { value: 'paver', label: 'Paver' },
  { value: 'excavator', label: 'Excavator' },
  { value: 'sweeper', label: 'Sweeper' },
  { value: 'millingMachine', label: 'Milling Machine' },
  { value: 'grader', label: 'Grader' },
  { value: 'dozer', label: 'Dozer' },
  { value: 'payloader', label: 'Payloader' },
  { value: 'roller', label: 'Roller' },
  { value: 'equipment', label: 'Other Equipment' }
];

const EquipmentCheckboxList: React.FC<EquipmentCheckboxListProps> = ({
  selectedEquipment,
  onEquipmentToggle,
  disabled = false
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Allowed Equipment
      </label>
      <div className="grid grid-cols-2 gap-3">
        {EQUIPMENT_TYPES.map(equipment => (
          <label
            key={equipment.value}
            className={`flex items-center space-x-2 cursor-pointer p-2 rounded-md border ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
            } ${
              selectedEquipment.includes(equipment.value) 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200'
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={selectedEquipment.includes(equipment.value)}
              onChange={() => !disabled && onEquipmentToggle(equipment.value)}
              disabled={disabled}
            />
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              selectedEquipment.includes(equipment.value)
                ? 'bg-blue-500 border-blue-500'
                : 'border-gray-300'
            }`}>
              {selectedEquipment.includes(equipment.value) && (
                <Check size={12} className="text-white" />
              )}
            </div>
            <span className="text-sm text-gray-700">{equipment.label}</span>
          </label>
        ))}
      </div>
      {selectedEquipment.length === 0 && (
        <p className="text-xs text-gray-500 italic">
          No equipment selected - operator cannot operate any equipment
        </p>
      )}
    </div>
  );
};

export default EquipmentCheckboxList;