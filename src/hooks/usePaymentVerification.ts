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
  startSending: (amount: number) => void;
  startVerifying: () => void;
  updateAttempt: (attempt: number, remainingSeconds: number) => void;
  setSuccess: () => void;
  setError: (message: string) => void;
  reset: () => void;
}

const INITIAL_STATE: PaymentState = {
  isOpen: false,
  status: 'sending',
  amount: 0,
  currentAttempt: 0,
  maxAttempts: 10,
  remainingSeconds: 50,
  errorMessage: undefined,
};

export function usePaymentVerification(): UsePaymentVerificationReturn {
  const [state, setState] = useState<PaymentState>(INITIAL_STATE);

  const startSending = useCallback((amount: number) => {
    setState({
      ...INITIAL_STATE,
      isOpen: true,
      status: 'sending',
      amount,
    });
  }, []);

  const startVerifying = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'verifying',
      currentAttempt: 1,
      remainingSeconds: 50,
    }));
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

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    startSending,
    startVerifying,
    updateAttempt,
    setSuccess,
    setError,
    reset,
  };
}
