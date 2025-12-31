import { useState, useCallback } from 'react';
import { PaymentStatus } from '../components/PaymentVerificationModal/PaymentVerificationModal';

interface PaymentState {
  isOpen: boolean;
  status: PaymentStatus;
  amount: number;
  currentAttempt: number;
  maxAttempts: number;
  remainingSeconds: number;
  errorMessage?: string;
}

interface UsePaymentVerificationReturn {
  state: PaymentState;
  startVerifying: (amount: number) => void;
  updateAttempt: (attempt: number, remainingSeconds: number) => void;
  setSuccess: () => void;
  setError: (message: string) => void;
  showError: (amount: number, message: string) => void;
  reset: () => void;
}

const INITIAL_STATE: PaymentState = {
  isOpen: false,
  status: 'verifying',
  amount: 0,
  currentAttempt: 0,
  maxAttempts: 10,
  remainingSeconds: 50,
  errorMessage: undefined,
};

export function usePaymentVerification(): UsePaymentVerificationReturn {
  const [state, setState] = useState<PaymentState>(INITIAL_STATE);

  const startVerifying = useCallback((amount: number) => {
    setState({
      ...INITIAL_STATE,
      isOpen: true,
      status: 'verifying',
      amount,
      currentAttempt: 1,
      remainingSeconds: 50,
    });
  }, []);

  const updateAttempt = useCallback((attempt: number, remainingSeconds: number) => {
    setState(prev => ({
      ...prev,
      currentAttempt: attempt,
      remainingSeconds,
    }));
  }, []);

  const setSuccess = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'success',
    }));
  }, []);

  const setError = useCallback((message: string) => {
    setState(prev => ({
      ...prev,
      status: 'error',
      errorMessage: message,
    }));
  }, []);

  const showError = useCallback((amount: number, message: string) => {
    setState({
      ...INITIAL_STATE,
      isOpen: true,
      status: 'error',
      amount,
      errorMessage: message,
    });
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    startVerifying,
    updateAttempt,
    setSuccess,
    setError,
    showError,
    reset,
  };
}
