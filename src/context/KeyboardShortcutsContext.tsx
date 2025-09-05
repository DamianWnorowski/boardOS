import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMagnets } from '../hooks/useMagnet';
import { Magnet, MagnetStatus } from '../classes/Magnet';
import { ResourceCategory, EquipmentSubcategory, SelectionMode, QuickSelectState, RESOURCE_CATEGORIES, EQUIPMENT_SUBCATEGORIES } from '../types/quickSelect';

interface KeyboardShortcutsContextType {
  isQuickSelectOpen: boolean;
  quickSelectState: QuickSelectState;
  quickSelectMagnets: Magnet[];
  isHelpOpen: boolean;
  openQuickSelect: () => void;
  closeQuickSelect: () => void;
  selectNext: () => void;
  selectPrevious: () => void;
  executeSelected: () => void;
  goBack: () => void;
  openHelp: () => void;
  closeHelp: () => void;
  getCurrentOptions: () => (ResourceCategory | EquipmentSubcategory | Magnet)[];
  setSelectedIndex: (index: number) => void;
  executeSelectedAtIndex: (index: number) => void;
  handleDragStart: () => void;
  executeCategory: (category: ResourceCategory) => void;
  executeSubcategory: (subcategory: EquipmentSubcategory) => void;
  executeMagnet: (magnet: Magnet) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
};

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

export const KeyboardShortcutsProvider: React.FC<KeyboardShortcutsProviderProps> = ({ children }) => {
  const { magnets, getAvailableMagnets, filterMagnetsByType } = useMagnets();
  const [isQuickSelectOpen, setIsQuickSelectOpen] = useState(false);
  const [quickSelectState, setQuickSelectState] = useState<QuickSelectState>({
    mode: 'category',
    selectedCategory: null,
    selectedSubcategory: null,
    selectedIndex: 0,
    navigationHistory: []
  });
  const [quickSelectMagnets, setQuickSelectMagnets] = useState<Magnet[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const openQuickSelect = () => {
    setQuickSelectState({
      mode: 'category',
      selectedCategory: null,
      selectedSubcategory: null,
      selectedIndex: 0,
      navigationHistory: []
    });
    setQuickSelectMagnets([]);
    setIsQuickSelectOpen(true);
  };

  const closeQuickSelect = () => {
    setIsQuickSelectOpen(false);
    setQuickSelectState({
      mode: 'category',
      selectedCategory: null,
      selectedSubcategory: null,
      selectedIndex: 0,
      navigationHistory: []
    });
    setQuickSelectMagnets([]);
    };

  const getCurrentOptions = (): (ResourceCategory | EquipmentSubcategory | Magnet)[] => {
    switch (quickSelectState.mode) {
      case 'category':
        return RESOURCE_CATEGORIES;
      case 'subcategory':
        if (quickSelectState.selectedCategory?.id === 'equipment') {
          return EQUIPMENT_SUBCATEGORIES;
        }
        return [];
      case 'magnets':
        return quickSelectMagnets;
      default:
        return [];
    }
  };

  const selectNext = () => {
    const options = getCurrentOptions();
    if (options.length > 0) {
      setQuickSelectState(prev => ({
        ...prev,
        selectedIndex: (prev.selectedIndex + 1) % options.length
      }));
    }
  };

  const selectPrevious = () => {
    const options = getCurrentOptions();
    if (options.length > 0) {
      setQuickSelectState(prev => ({
        ...prev,
        selectedIndex: (prev.selectedIndex - 1 + options.length) % options.length
      }));
    }
  };

  const executeSelected = () => {
    const options = getCurrentOptions();
    const selected = options[quickSelectState.selectedIndex];

    if (!selected) return;

    switch (quickSelectState.mode) {
      case 'category':
        const category = selected as ResourceCategory;
        if (category.hasSubcategories && category.id === 'equipment') {
          // Navigate to subcategory view for equipment
          setQuickSelectState(prev => ({
            ...prev,
            mode: 'subcategory',
            selectedCategory: category,
            selectedIndex: 0,
            navigationHistory: [...prev.navigationHistory, 'category']
          }));
        } else {
          // Navigate directly to magnets for non-equipment categories
          const categoryMagnets = category.resourceTypes.flatMap(type => 
            filterMagnetsByType(type, selectedDate)
          ).filter(magnet => magnet.isAvailableOnDate(selectedDate, jobs));
          setQuickSelectMagnets(categoryMagnets);
          setQuickSelectState(prev => ({
            ...prev,
            mode: 'magnets',
            selectedCategory: category,
            selectedIndex: 0,
            navigationHistory: [...prev.navigationHistory, 'category']
          }));
        }
        break;

      case 'subcategory':
        const subcategory = selected as EquipmentSubcategory;
        const subcategoryMagnets = filterMagnetsByType(subcategory.resourceType, selectedDate).filter(magnet => magnet.isAvailableOnDate(selectedDate, jobs));
        setQuickSelectMagnets(subcategoryMagnets);
        setQuickSelectState(prev => ({
          ...prev,
          mode: 'magnets',
          selectedSubcategory: subcategory,
          selectedIndex: 0,
          navigationHistory: [...prev.navigationHistory, 'subcategory']
        }));
        break;

      case 'magnets':
        const magnet = selected as Magnet;
        magnet.startDrag();
        closeQuickSelect();
        break;
    }
  };

  const goBack = () => {
    const lastMode = quickSelectState.navigationHistory[quickSelectState.navigationHistory.length - 1];
    if (!lastMode) {
      closeQuickSelect();
      return;
    }

    const newHistory = quickSelectState.navigationHistory.slice(0, -1);

    switch (lastMode) {
      case 'category':
        setQuickSelectState(prev => ({
          ...prev,
          mode: 'category',
          selectedCategory: null,
          selectedSubcategory: null,
          selectedIndex: 0,
          navigationHistory: newHistory
        }));
        setQuickSelectMagnets([]);
        break;

      case 'subcategory':
        setQuickSelectState(prev => ({
          ...prev,
          mode: 'subcategory',
          selectedSubcategory: null,
          selectedIndex: 0,
          navigationHistory: newHistory
        }));
        setQuickSelectMagnets([]);
        break;
    }
  };

  const openHelp = () => {
    setIsHelpOpen(true);
  };

  const closeHelp = () => {
    setIsHelpOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      switch (event.key) {
        case 'Tab':
          event.preventDefault();
          if (!isQuickSelectOpen) {
            openQuickSelect();
          } else if (event.shiftKey) {
            selectPrevious();
          } else {
            selectNext();
          }
          break;
        case 'Enter':
          if (isQuickSelectOpen) {
            event.preventDefault();
            executeSelected();
          }
          break;
        case 'Backspace':
          if (isQuickSelectOpen) {
            event.preventDefault();
            goBack();
          }
          break;
        case 'Escape':
          if (isQuickSelectOpen) {
            event.preventDefault();
            closeQuickSelect();
          } else if (isHelpOpen) {
            event.preventDefault();
            closeHelp();
          }
          break;
        case '?':
          if (!isQuickSelectOpen && !isHelpOpen) {
            event.preventDefault();
            openHelp();
          }
          break;
        // Number keys for quick selection (1-9)
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          if (isQuickSelectOpen) {
            event.preventDefault();
            const index = parseInt(event.key) - 1;
            const options = getCurrentOptions();
            if (index >= 0 && index < options.length) {
              setQuickSelectState(prev => ({
                ...prev,
                selectedIndex: index
              }));
              // Delay execution to allow state to update
              setTimeout(() => executeSelected(), 0);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isQuickSelectOpen, quickSelectState, quickSelectMagnets, isHelpOpen]);

  const setSelectedIndex = (index: number) => {
    setQuickSelectState(prev => ({
      ...prev,
      selectedIndex: index
    }));
  };

  const executeSelectedAtIndex = (index: number) => {
    setSelectedIndex(index);
    // Use setTimeout to ensure state update completes before execution
    setTimeout(() => executeSelected(), 0);
  };

  const executeCategory = (category: ResourceCategory) => {
    if (category.hasSubcategories && category.id === 'equipment') {
      // Navigate to subcategory view for equipment
      setQuickSelectState(prev => ({
        ...prev,
        mode: 'subcategory',
        selectedCategory: category,
        selectedIndex: 0,
        navigationHistory: [...prev.navigationHistory, 'category']
      }));
    } else {
      // Navigate directly to magnets for non-equipment categories
      const categoryMagnets = category.resourceTypes.flatMap(type => 
        filterMagnetsByType(type, selectedDate)
      ).filter(magnet => {
        // Use date-aware availability check instead of global status
        return magnet.isAvailableOnDate(selectedDate, jobs);
      });
      setQuickSelectMagnets(categoryMagnets);
      setQuickSelectState(prev => ({
        ...prev,
        mode: 'magnets',
        selectedCategory: category,
        selectedIndex: 0,
        navigationHistory: [...prev.navigationHistory, 'category']
      }));
    }
  };

  const executeSubcategory = (subcategory: EquipmentSubcategory) => {
    const subcategoryMagnets = filterMagnetsByType(subcategory.resourceType, selectedDate).filter(magnet => {
      // Use date-aware availability check instead of global status
      return magnet.isAvailableOnDate(selectedDate, jobs);
    });
    setQuickSelectMagnets(subcategoryMagnets);
    setQuickSelectState(prev => ({
      ...prev,
      mode: 'magnets',
      selectedSubcategory: subcategory,
      selectedIndex: 0,
      navigationHistory: [...prev.navigationHistory, 'subcategory']
    }));
  };

  const executeMagnet = (magnet: Magnet) => {
    magnet.startDrag();
    closeQuickSelect();
  };

  const handleDragStart = () => {
    // Delay closing the overlay to allow drag layer to initialize
    setTimeout(() => {
      closeQuickSelect();
    }, 50); // Small delay to let drag layer take over
  };

  const value: KeyboardShortcutsContextType = {
    isQuickSelectOpen,
    quickSelectState,
    quickSelectMagnets,
    isHelpOpen,
    openQuickSelect,
    closeQuickSelect,
    selectNext,
    selectPrevious,
    executeSelected,
    goBack,
    openHelp,
    closeHelp,
    getCurrentOptions,
    setSelectedIndex,
    executeSelectedAtIndex,
    handleDragStart,
    executeCategory,
    executeSubcategory,
    executeMagnet
  };

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
};