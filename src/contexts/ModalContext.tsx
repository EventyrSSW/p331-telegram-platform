import { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextValue {
  isAddTonModalOpen: boolean;
  openAddTonModal: () => void;
  closeAddTonModal: () => void;
}

const ModalContext = createContext<ModalContextValue | undefined>(undefined);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}

interface ModalProviderProps {
  children: ReactNode;
}

export function ModalProvider({ children }: ModalProviderProps) {
  const [isAddTonModalOpen, setIsAddTonModalOpen] = useState(false);

  const openAddTonModal = () => setIsAddTonModalOpen(true);
  const closeAddTonModal = () => setIsAddTonModalOpen(false);

  return (
    <ModalContext.Provider value={{ isAddTonModalOpen, openAddTonModal, closeAddTonModal }}>
      {children}
    </ModalContext.Provider>
  );
}
