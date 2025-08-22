import React, { createContext, useContext, useState, useRef } from 'react';

interface DragState {
  currentDragItem: any;
  dragCount: number;
}

interface DragContextType {
  dragState: DragState;
  getIsCtrlHeld: () => boolean;
  setCurrentDragItem: (item: any) => void;
  incrementDragCount: () => void;
  resetDragState: () => void;
}

const DragContext = createContext<DragContextType | undefined>(undefined);

export const DragProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isCtrlHeldRef = useRef<boolean>(false);
  const [dragState, setDragState] = useState<DragState>({
    currentDragItem: null,
    dragCount: 0
  });

  const getIsCtrlHeld = () => {
    return isCtrlHeldRef.current;
  };

  const setCurrentDragItem = (item: any) => {
    setDragState(prev => ({ ...prev, currentDragItem: item }));
  };

  const incrementDragCount = () => {
    setDragState(prev => ({ ...prev, dragCount: prev.dragCount + 1 }));
  };

  const resetDragState = () => {
    isCtrlHeldRef.current = false;
    setDragState({
      currentDragItem: null,
      dragCount: 0
    });
  };

  // Handle global keyboard events
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        isCtrlHeldRef.current = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        isCtrlHeldRef.current = false;
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
      getIsCtrlHeld,
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