import React, { createContext, useContext, useState, useRef } from 'react';

interface DragState {
  isCtrlHeld: boolean;
  currentDragItem: any;
  dragCount: number;
}

interface DragContextType {
  dragState: DragState;
  setCtrlHeld: (value: boolean) => void;
  setCurrentDragItem: (item: any) => void;
  incrementDragCount: () => void;
  resetDragState: () => void;
}

const DragContext = createContext<DragContextType | undefined>(undefined);

export const DragProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dragState, setDragState] = useState<DragState>({
    isCtrlHeld: false,
    currentDragItem: null,
    dragCount: 0
  });

  const setCtrlHeld = (value: boolean) => {
    setDragState(prev => ({ ...prev, isCtrlHeld: value }));
  };

  const setCurrentDragItem = (item: any) => {
    setDragState(prev => ({ ...prev, currentDragItem: item }));
  };

  const incrementDragCount = () => {
    setDragState(prev => ({ ...prev, dragCount: prev.dragCount + 1 }));
  };

  const resetDragState = () => {
    setDragState({
      isCtrlHeld: false,
      currentDragItem: null,
      dragCount: 0
    });
  };

  // Handle global keyboard events
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setCtrlHeld(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        setCtrlHeld(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <DragContext.Provider value={{
      dragState,
      setCtrlHeld,
      setCurrentDragItem,
      incrementDragCount,
      resetDragState
    }}>
      {children}
    </DragContext.Provider>
  );
};

export const useDragContext = () => {
  const context = useContext(DragContext);
  if (context === undefined) {
    throw new Error('useDragContext must be used within a DragProvider');
  }
  return context;
};