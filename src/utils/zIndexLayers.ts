/**
 * Centralized Z-Index Layer Management
 * 
 * This file provides standardized z-index values for consistent UI layering
 * throughout the BoardOS application.
 */

export const Z_INDEX_LAYERS = {
  // Base application layers
  BASE: 0,
  CONTENT: 1,
  
  // Interactive element layers
  DROPDOWN: 10,
  TOOLTIP: 20,
  
  // Card and component indicators
  CARD_BADGE: 30,
  CARD_INDICATOR: 40,
  
  // Overlays and floating panels
  OVERLAY: 50,
  FLOATING_PANEL: 60,
  
  // Special components
  DEBUG_PANEL: 9999,
  
  // Modal layers (managed by ModalContext)
  MODAL_BASE: 1000,
  MODAL_INCREMENT: 10,
  
  // Critical high-priority elements
  CRITICAL_ALERT: 10000,
  EMERGENCY_OVERLAY: 10001
} as const;

/**
 * Helper function to generate Tailwind CSS z-index classes
 */
export const getZIndexClass = (layer: keyof typeof Z_INDEX_LAYERS): string => {
  const value = Z_INDEX_LAYERS[layer];
  return `z-[${value}]`;
};

/**
 * Helper function to get raw z-index values for inline styles
 */
export const getZIndexValue = (layer: keyof typeof Z_INDEX_LAYERS): number => {
  return Z_INDEX_LAYERS[layer];
};

/**
 * Type-safe z-index layer keys
 */
export type ZIndexLayer = keyof typeof Z_INDEX_LAYERS;