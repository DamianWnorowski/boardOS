import { Resource, ResourceType } from '../types';

// This is now repurposed to handle attachment compatibility rules
export const canResourcesLink = (_resource1: Resource, _resource2: Resource): boolean => {
  void _resource1; void _resource2; // Acknowledge unused parameters for future implementation
  // Future implementation will check specific resource compatibility
  // For attachment functionality, we'll allow any resources to attach
  return true;
};

export const getValidLinkTypes = (_resourceType: ResourceType): ResourceType[] => {
  void _resourceType; // Acknowledge unused parameter for future implementation
  // Future implementation will return valid types based on input resourceType
  // All resource types can be attached
  return [
    'operator', 
    'driver', 
    'striper', 
    'foreman', 
    'laborer', 
    'privateDriver',
    'skidsteer',
    'paver',
    'excavator',
    'sweeper',
    'millingMachine',
    'grader',
    'dozer',
    'payloader',
    'roller',
    'equipment'
  ];
};