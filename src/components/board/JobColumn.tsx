import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit, X, StickyNote, Check, Lock, MessageSquare } from 'lucide-react';
import { Job } from '../../types';
import { useScheduler } from '../../context/SchedulerContext';
import { useModal } from '../../context/ModalContext';
import JobRow from './JobRow';
import { rowTypes, rowTypeLabels } from '../../data/mockData';
import EditJobModal from '../modals/EditJobModal';
import SendSMSModal from '../modals/SendSMSModal';
import ErrorBoundary from '../common/ErrorBoundary';
// Removed unused logger import

interface JobColumnProps {
  job: Job;
}

const JobColumn: React.FC<JobColumnProps> = ({ job }) => {
  const { removeJob, getJobNotes, finalizeJob, unfinalizeJob, assignments } = useScheduler();
  const { openModal, closeModal } = useModal();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSendSMSModalOpen, setIsSendSMSModalOpen] = useState(false);
  const [_isProcessing, setIsProcessing] = useState(false);
  
  // Get all notes for this job
  const jobNotes = getJobNotes(job.id);
  
  const jobTypeLabel = () => {
    switch (job.type) {
      case 'milling': return 'Milling';
      case 'paving': return 'Paving';
      case 'both': return 'Milling/Paving';
      case 'drainage': return 'Drainage';
      case 'stripping': return 'Stripping';
      case 'hired': return 'Hired';
      default: return 'Other';
    }
  };
  
  const getJobTypeColor = () => {
    switch (job.type) {
      case 'milling': return 'text-blue-600';
      case 'paving': return 'text-green-600';
      case 'both': return 'text-purple-600';
      case 'drainage': return 'text-cyan-600';
      case 'stripping': return 'text-yellow-600';
      case 'hired': return 'text-indigo-600';
      default: return 'text-gray-600';
    }
  };
  
  const getJobBackgroundStyle = () => {
    if (job.shift === 'night') {
      return job.finalized 
        ? 'bg-red-100 border-2 border-red-300' 
        : 'bg-red-50/70 backdrop-blur-sm border border-red-200';
    }
    return job.finalized 
      ? 'bg-green-50 border-2 border-green-200' 
      : 'bg-white/95 backdrop-blur-sm';
  };
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  const handleRemoveJob = async () => {
    if (confirm('Are you sure you want to remove this job?')) {
      setIsProcessing(true);
      try {
        await removeJob(job.id);
      } catch (error) {
        console.error('Error removing job:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };
  
  const handleEditJob = () => {
    setIsEditModalOpen(true);
    openModal('edit-job');
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    closeModal('edit-job');
  };

  const handleFinalizeJob = async () => {
    if (job.finalized) {
      if (confirm('Are you sure you want to unfinalize this job? This will allow editing again.')) {
        setIsProcessing(true);
        try {
          await unfinalizeJob(job.id);
        } catch (error) {
          console.error('Error unfinalizing job:', error);
        } finally {
          setIsProcessing(false);
        }
      }
    } else {
      // Check if job has assignments
      const jobAssignments = assignments.filter(a => a.jobId === job.id);
      if (jobAssignments.length === 0) {
        alert('Cannot finalize job: No resources are assigned to this job.');
        return;
      }
      
      if (confirm('Are you sure you want to finalize this job? This will lock it from editing and mark it ready for export.')) {
        setIsProcessing(true);
        try {
          await finalizeJob(job.id);
        } catch (error) {
          console.error('Error finalizing job:', error);
        } finally {
          setIsProcessing(false);
        }
      }
    }
  };

  // TODO: Export functionality - currently unused
  // const handleExportJob = () => {
  //   // Generate job export text
  //   const jobAssignments = assignments.filter(a => a.jobId === job.id);
  //   
  //   // Filter out attached assignments - we'll handle them separately
  //   const mainAssignments = jobAssignments.filter(a => !a.attachedTo);
  //   
  //   const groupedByRow = mainAssignments.reduce((groups, assignment) => {
  //     if (!groups[assignment.row]) {
  //       groups[assignment.row] = [];
  //     }
  //     const resource = getResourceById(assignment.resourceId);
  //     if (resource) {
  //       // Get attached assignments for this main assignment
  //       const attachedAssignments = jobAssignments.filter(a => a.attachedTo === assignment.id);
  //       const _attachedResources = attachedAssignments.map(a => getResourceById(a.resourceId)).filter(Boolean);
  //       
  //       const assignmentGroup = {
  //         resource,
  //         assignment,
  //         startTime: assignment.timeSlot?.startTime || job.startTime || '07:00',
  //         attachedAssignments: attachedAssignments.map(a => ({
  //           resource: getResourceById(a.resourceId)!,
  //           assignment: a,
  //           startTime: a.timeSlot?.startTime || assignment.timeSlot?.startTime || job.startTime || '07:00'
  //         }))
  //       };
  //       
  //       groups[assignment.row].push(assignmentGroup);
  //     }
  //     return groups;
  //   }, {} as Record<string, unknown[]>);

  //   let exportText = `JOB: ${job.name}\n`;
  //   if (job.number) exportText += `Job #: ${job.number}\n`;
  //   exportText += `Type: ${jobTypeLabel()}\n`;
  //   if (job.location) exportText += `Location: ${job.location.address}\n`;
  //   exportText += `Start Time: ${job.startTime || '07:00'}\n`;
  //   exportText += `Date: ${new Date().toLocaleDateString()}\n\n`;

  //   // Add plant information for paving jobs
  //   if ((job.type === 'paving' || job.type === 'both') && job.plants && job.plants.length > 0) {
  //     exportText += `Asphalt Plants: ${job.plants.join(', ')}\n\n`;
  //   }

  //   // Add crew assignments by row
  //   Object.entries(groupedByRow).forEach(([rowType, rowAssignments]) => {
  //     if (rowAssignments.length > 0) {
  //       exportText += `${rowTypeLabels[rowType as RowType]}:\n`;
  //       rowAssignments.forEach(({ resource, startTime, attachedAssignments }) => {
  //         const cleanName = resource.name.replace(/\([^)]*\)\s*/g, '');
  //         
  //         // For equipment and trucks, show the main resource first
  //         if (['skidsteer', 'paver', 'excavator', 'sweeper', 'millingMachine', 
  //              'roller', 'dozer', 'payloader', 'equipment', 'truck'].includes(resource.type)) {
  //           exportText += `  • ${cleanName}`;
  //           if (attachedAssignments && attachedAssignments.length > 0) {
  //             // For vehicles (trucks and sweepers) with people attached, show yard departure time
  //             if (resource.type === 'truck' || resource.type === 'sweeper') {
  //               const attachedNames = attachedAssignments.map(a => 
  //                 a.resource.name.replace(/\([^)]*\)\s*/g, '')
  //               );
  //               exportText += ` with ${attachedNames.map((name, i) => 
  //                 `${name} (${attachedAssignments[i].startTime})`
  //               ).join(', ')}`;
  //             } else {
  //               // Only show equipment time if no attached personnel
  //               exportText += ` (${startTime})`;
  //             }
  //           } else {
  //             exportText += ` (${startTime})`;
  //           }
  //           exportText += '\n';
  //         } else if (resource.type === 'truck') {
  //           // For trucks (vehicles) with people attached, show yard departure time
  //           exportText += `  • ${cleanName}`;
  //           if (attachedAssignments && attachedAssignments.length > 0) {
  //             const attachedNames = attachedAssignments.map(a => 
  //               a.resource.name.replace(/\([^)]*\)\s*/g, '')
  //             ).join(', ');
  //             exportText += ` with ${attachedNames} (${startTime})`;
  //           } else {
  //             exportText += ` (${startTime})`;
  //           }
  //           exportText += '\n';
  //         } else {
  //           // For personnel, show with time
  //           exportText += `  • ${cleanName} (${startTime})`;
  //           if (attachedAssignments && attachedAssignments.length > 0) {
  //             const attachedInfo = attachedAssignments.map(a => 
  //               `${a.resource.name.replace(/\([^)]*\)\s*/g, '')} (${a.startTime})`
  //             ).join(', ');
  //             exportText += ` with ${attachedInfo}`;
  //           }
  //           exportText += '\n';
  //         }
  //       });
  //       exportText += '\n';
  //     }
  //   });

  //   if (job.notes) {
  //     exportText += `Notes: ${job.notes}\n`;
  //   }

  //   // Copy to clipboard and show alert
  //   navigator.clipboard.writeText(exportText).then(() => {
  //     alert('Job details copied to clipboard!');
  //   }).catch(() => {
  //     // Fallback: show in alert
  //     alert(`Job details:\n\n${exportText}`);
  //   });
  // };

  const handleSendSMS = () => {
    setIsSendSMSModalOpen(true);
    openModal('send-sms');
  };
  
  return (
    <ErrorBoundary>
      <div className={`w-64 rounded-md shadow-md flex flex-col ${getJobBackgroundStyle()}`}>
        <div className="p-3 border-b border-gray-200">
          {/* Finalized Status Banner */}
          {job.finalized && (
            <div className="mb-2 bg-green-100 border border-green-300 rounded-md p-2 flex items-center justify-between">
              <div className="flex items-center text-green-800">
                <Lock size={14} className="mr-1" />
                <span className="text-xs font-medium">FINALIZED</span>
              </div>
              <button
                onClick={handleSendSMS}
                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs flex items-center"
                title="Send job details via SMS"
              >
                <MessageSquare size={12} className="mr-1" />
                Send SMS
              </button>
            </div>
          )}
          
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg">{job.name}</h3>
            <div className="flex space-x-1">
              {/* Finalize/Unfinalize Button */}
              <button
                onClick={handleFinalizeJob}
                className={`p-1 rounded ${
                  job.finalized 
                    ? 'text-green-600 hover:text-green-800' 
                    : 'text-blue-600 hover:text-blue-800'
                }`}
                title={job.finalized ? "Unfinalize job" : "Finalize job"}
              >
                {job.finalized ? <Lock size={16} /> : <Check size={16} />}
              </button>
              <button
                onClick={toggleExpand}
                aria-label="Toggle notes"
                className="p-1 text-gray-500 hover:text-gray-700 rounded"
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {!job.finalized && <button
                onClick={handleEditJob}
                className="p-1 text-gray-500 hover:text-gray-700 rounded"
                title="Edit job"
              >
                <Edit size={16} />
              </button>}
              {!job.finalized && <button
                onClick={handleRemoveJob}
                className="p-1 text-gray-500 hover:text-red-600 rounded"
              >
                <X size={16} />
              </button>}
            </div>
          </div>
        
          <div className="space-y-1 text-sm">
            {job.number && (
              <div className="flex justify-between">
                <span className="text-gray-500">Job #:</span>
                <span className="font-medium">{job.number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Shift:</span>
              <span className={`font-medium ${job.shift === 'night' ? 'text-red-600' : 'text-blue-600'}`}>
                {job.shift === 'night' ? '🌙 Night' : '☀️ Day'}
              </span>
            </div>
            <div className="flex justify-between">
              {job.location ? (
                <button 
                  onClick={() => {
                    if ('lat' in job.location! && 'lng' in job.location!) {
                      window.open(`https://www.openstreetmap.org/?mlat=${job.location!.lat}&mlon=${job.location!.lng}&zoom=15`, '_blank');
                    } else if ('street' in job.location!) {
                      const query = `${job.location!.street}, ${job.location!.city}, ${job.location!.province}`;
                      window.open(`https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`, '_blank');
                    }
                  }}
                  className="text-blue-600 hover:text-blue-800 underline text-sm truncate max-w-32 flex items-center"
                  title={
                    'address' in job.location! 
                      ? job.location!.address 
                      : `${job.location!.street}, ${job.location!.city}, ${job.location!.province}`
                  }
                >
                  📍 {
                    'address' in job.location! 
                      ? job.location!.address.split(',')[0]
                      : job.location!.street.split(' ').slice(0, 2).join(' ')
                  }
                </button>
              ) : (
                <span className="text-gray-500">No location set</span>
              )}
              <span 
                className={`font-medium ${getJobTypeColor()}`}
              >
                {(job.type === 'paving' || job.type === 'both') && job.plants && job.plants.length > 0 
                  ? `${job.plants.join(', ')} - ${jobTypeLabel()}`
                  : jobTypeLabel()
                }
              </span>
            </div>
          </div>
          {isExpanded && job.notes && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-medium mb-1">Notes:</h4>
              <p className="text-sm text-gray-600">{job.notes}</p>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <ErrorBoundary>
            {rowTypes.map((rowType) => (
              <JobRow
                key={`${job.id}-${rowType}`}
                jobId={job.id}
                rowType={rowType}
                label={rowTypeLabels[rowType]}
              />
            ))}
          </ErrorBoundary>
        </div>
        
        {/* Job Notes Section */}
        {jobNotes.length > 0 && (
          <div className="border-t border-gray-200 p-3 bg-yellow-50">
            <div className="flex items-center mb-2">
              <StickyNote size={14} className="text-yellow-600 mr-1" />
              <h4 className="text-sm font-medium text-yellow-800">Notes</h4>
            </div>
            <div className="space-y-2">
              {jobNotes.map(({ assignment, resource, note }) => (
                <div key={assignment.id} className="bg-white rounded border border-yellow-200 p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">
                      {resource.name.replace(/\([^)]*\)\s*/g, '')}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {resource.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{note}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Edit Job Modal */}
        {isEditModalOpen && (
          <EditJobModal job={job} onClose={handleCloseEditModal} />
        )}
        
        {/* Send SMS Modal */}
        {isSendSMSModalOpen && (
          <SendSMSModal job={job} onClose={() => {
            setIsSendSMSModalOpen(false);
            closeModal('send-sms');
          }} />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(JobColumn, (prevProps, nextProps) => {
  // Re-render if job data changes
  return (
    prevProps.job.id === nextProps.job.id &&
    prevProps.job.finalized === nextProps.job.finalized &&
    prevProps.job.name === nextProps.job.name
  );
});