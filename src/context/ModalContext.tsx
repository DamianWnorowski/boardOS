import React, { createContext, useContext, useState, useRef } from 'react';

interface ModalState {
  openModals: string[];
  baseZIndex: number;
}

interface ModalContextType {
  modalState: ModalState;
  openModal: (id: string) => number;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  getZIndex: (id: string) => number;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState>({
    openModals: [],
    baseZIndex: 1000
  });

  const openModal = (id: string): number => {
    setModalState(prev => {
      if (prev.openModals.includes(id)) {
        return prev; // Already open
      }
      return {
        ...prev,
        openModals: [...prev.openModals, id]
      };
    });
    
    // Return the z-index for this modal
    return modalState.baseZIndex + modalState.openModals.length * 10;
  };

  const closeModal = (id: string) => {
    setModalState(prev => ({
      ...prev,
      openModals: prev.openModals.filter(modalId => modalId !== id)
    }));
  };

  const closeAllModals = () => {
    setModalState(prev => ({
      ...prev,
      openModals: []
    }));
  };

  const getZIndex = (id: string): number => {
    const index = modalState.openModals.indexOf(id);
    if (index === -1) return modalState.baseZIndex;
    return modalState.baseZIndex + (index + 1) * 10;
  };

  return (
    <ModalContext.Provider value={{
      modalState,
      openModal,
      closeModal,
      closeAllModals,
      getZIndex
    }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};