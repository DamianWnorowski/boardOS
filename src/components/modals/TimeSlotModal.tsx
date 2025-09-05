import React, { useState } from 'react';
import { X, Clock, CalendarClock } from 'lucide-react';
import { Assignment, TimeSlot } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';

interface TimeSlotModalProps {
  assignment: Assignment;
  otherAssignments: Assignment[];
  onClose: () => void;
}

const TimeSlotModal: React.FC<TimeSlotModalProps> = ({ 
  assignment, 
  otherAssignments,
  onClose 
}) => {
  const { getResourceById, getJobById, updateAssignment, updateTimeSlot } = useScheduler();
  
  const resource = getResourceById(assignment.resourceId);
  const job = getJobById(assignment.jobId);
  
  const currentTimeSlot = assignment.timeSlot || { 
    startTime: '07:00', 
    endTime: '15:30',
    isFullDay: true
  };
  
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(currentTimeSlot);
  const [isFullDay, setIsFullDay] = useState<boolean>(currentTimeSlot.isFullDay || false);
  
  // Get other jobs this resource is assigned to
  const otherJobs = otherAssignments.map(a => {
    const otherJob = getJobById(a.jobId);
    return {
      assignment: a,
      job: otherJob,
      timeSlot: a.timeSlot
    };
  });
  
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
  
  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    setTimeSlot({
      ...timeSlot,
      [field]: value,
      isFullDay: isFullDay
    });
  };
  
  const handleSubmit = () => {
    updateTimeSlot(assignment.id, {
      ...timeSlot,
      isFullDay: isFullDay
    });
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
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
              {resource?.name}
            </p>
            <p className="text-sm text-gray-600">
              Assigned to: {job?.name}
            </p>
          </div>
          
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
          
          {otherJobs.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Other Assignments Today:</h3>
              <div className="divide-y border rounded">
                {otherJobs.map(({ job, assignment, timeSlot }) => (
                  <div key={assignment.id} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{job?.name}</p>
                      <p className="text-xs text-gray-500">
                        {timeSlot?.isFullDay 
                          ? 'Full day' 
                          : timeSlot 
                            ? `${timeSlot.startTime} - ${timeSlot.endTime}`
                            : 'No time specified'}
                      </p>
                    </div>
                    <button
                      className="text-blue-500 text-sm hover:underline"
                      onClick={() => {
                        updateTimeSlot(assignment.id, timeSlot || { startTime: '07:00', endTime: '15:30', isFullDay: true });
                        onClose();
                      }}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
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

export default TimeSlotModal;