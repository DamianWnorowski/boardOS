import React, { useState } from 'react';
import { X, Clock, CalendarClock } from 'lucide-react';
import { TimeSlot } from '../../types';
import { useMagnet } from '../../hooks/useMagnet';

interface MagnetTimeSlotModalProps {
  magnetId: string;
  onClose: () => void;
}

const MagnetTimeSlotModal: React.FC<MagnetTimeSlotModalProps> = ({ 
  magnetId, 
  onClose 
}) => {
  const { magnet, updateTimeSlot } = useMagnet(magnetId);
  
  if (!magnet) {
    onClose();
    return null;
  }
  
  // Get the first assignment (default)
  const primaryAssignment = magnet.assignments[0];
  
  if (!primaryAssignment) {
    onClose();
    return null;
  }
  
  const currentTimeSlot = primaryAssignment.timeSlot || { 
    startTime: '07:00', 
    endTime: '15:30',
    isFullDay: true
  };
  
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(currentTimeSlot);
  const [isFullDay, setIsFullDay] = useState<boolean>(currentTimeSlot.isFullDay || false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(primaryAssignment.id);
  
  // Handle full day toggle
  const handleFullDayToggle = () => {
    if (!isFullDay) {
      // If switching to full day, set default times
      setTimeSlot({
        startTime: '07:00',
        endTime: '15:30',
        isFullDay: true
      });
    }
    setIsFullDay(!isFullDay);
  };
  
  // Handle time change
  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    setTimeSlot({
      ...timeSlot,
      [field]: value,
      isFullDay: isFullDay
    });
  };
  
  // Handle selecting a different assignment
  const handleAssignmentSelect = (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    
    // Load the time slot for this assignment
    const assignment = magnet.assignments.find(a => a.id === assignmentId);
    if (assignment) {
      const assignmentTimeSlot = assignment.timeSlot || { 
        startTime: '07:00', 
        endTime: '15:30',
        isFullDay: true
      };
      
      setTimeSlot(assignmentTimeSlot);
      setIsFullDay(assignmentTimeSlot.isFullDay || false);
    }
  };
  
  // Handle submit
  const handleSubmit = () => {
    updateTimeSlot(selectedAssignmentId, {
      ...timeSlot,
      isFullDay: isFullDay
    });
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Set Work Schedule</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <p className="font-medium">
              {magnet.name}
            </p>
            <p className="text-sm text-gray-600">
              Managing time assignments across jobs
            </p>
          </div>
          
          {/* Assignment selector if multiple assignments */}
          {magnet.assignments.length > 1 && (
            <div className="mb-4 border rounded-md divide-y">
              <h3 className="text-sm font-medium p-2 bg-gray-50">Select Assignment to Edit:</h3>
              {magnet.assignments.map(assignment => (
                <div 
                  key={assignment.id}
                  onClick={() => handleAssignmentSelect(assignment.id)}
                  className={`p-3 cursor-pointer ${
                    selectedAssignmentId === assignment.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Job ID: {assignment.jobId}</p>
                      <p className="text-xs text-gray-500">
                        {assignment.timeSlot?.isFullDay 
                          ? 'Full day' 
                          : assignment.timeSlot 
                            ? `${assignment.timeSlot.startTime} - ${assignment.timeSlot.endTime}`
                            : 'No time specified'}
                      </p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      selectedAssignmentId === assignment.id ? 'bg-blue-500' : 'bg-gray-300'
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mb-4">
            <label className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                checked={isFullDay}
                onChange={handleFullDayToggle}
                className="rounded text-blue-600"
              />
              <span>Full day assignment</span>
            </label>
            
            {!isFullDay && (
              <div className="space-y-4">
                <div className="flex items-center">
                  <Clock size={18} className="mr-2 text-gray-500" />
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div>
                      <label className="block text-sm mb-1">Start Time</label>
                      <input
                        type="time"
                        value={timeSlot.startTime}
                        onChange={(e) => handleTimeChange('startTime', e.target.value)}
                        className="border rounded p-2 w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">End Time</label>
                      <input
                        type="time"
                        value={timeSlot.endTime}
                        onChange={(e) => handleTimeChange('endTime', e.target.value)}
                        className="border rounded p-2 w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-1">Time Conflict Rules:</h3>
            <p className="text-xs text-yellow-700">
              Resources can only be assigned to multiple jobs on the same day if their time slots don't overlap.
              Please ensure times don't conflict with other assignments.
            </p>
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
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default MagnetTimeSlotModal;