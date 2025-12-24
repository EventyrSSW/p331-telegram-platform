import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddTonModal } from '../AddTonModal';

describe('AddTonModal - Leading Zeros Validation', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    currentBalance: 100,
    isWalletConnected: true,
    onConnectWallet: vi.fn(),
    onSendTransaction: vi.fn(),
    isProcessing: false,
  };

  const getAmountDisplay = () => {
    // Find the amount display by looking for the container and then getting the first span (amountValue)
    const amountDisplay = document.querySelector('[class*="amountDisplay"]');
    const amountValue = amountDisplay?.querySelector('[class*="amountValue"]');
    return amountValue?.textContent || '';
  };

  it('should allow entering single zero', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    // Initial state should be "0"
    expect(getAmountDisplay()).toBe('0');
  });

  it('should prevent entering second zero after initial zero', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    // Click "0" button
    const zeroButton = screen.getByRole('button', { name: '0' });
    await user.click(zeroButton);

    // Should still be "0", not "00"
    expect(getAmountDisplay()).toBe('0');
  });

  it('should prevent entering "00.1" pattern', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    // Try to enter "00.1"
    const zeroButton = screen.getByRole('button', { name: '0' });
    const decimalButton = screen.getByRole('button', { name: '.' });
    const oneButton = screen.getByRole('button', { name: '1' });

    await user.click(zeroButton); // Should stay "0"
    expect(getAmountDisplay()).toBe('0');

    await user.click(decimalButton); // Should become "0."
    expect(getAmountDisplay()).toBe('0.');

    await user.click(oneButton); // Should become "0.1"
    expect(getAmountDisplay()).toBe('0.1');
  });

  it('should allow "0.1" pattern (one leading zero before decimal)', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const decimalButton = screen.getByRole('button', { name: '.' });
    const oneButton = screen.getByRole('button', { name: '1' });

    await user.click(decimalButton); // "0."
    await user.click(oneButton); // "0.1"

    expect(getAmountDisplay()).toBe('0.1');
  });

  it('should allow entering "10000" (trailing zeros are valid)', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const oneButton = screen.getByRole('button', { name: '1' });
    const zeroButton = screen.getByRole('button', { name: '0' });

    await user.click(oneButton); // "1"
    await user.click(zeroButton); // "10"
    await user.click(zeroButton); // "100"
    await user.click(zeroButton); // "1000"
    await user.click(zeroButton); // "10000"

    expect(getAmountDisplay()).toBe('10000');
  });

  it('should replace initial "0" with non-zero digit', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const fiveButton = screen.getByRole('button', { name: '5' });
    await user.click(fiveButton);

    // Should replace "0" with "5"
    expect(getAmountDisplay()).toBe('5');
  });

  it('should prevent "000001" pattern', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const zeroButton = screen.getByRole('button', { name: '0' });
    const oneButton = screen.getByRole('button', { name: '1' });

    await user.click(zeroButton); // "0"
    expect(getAmountDisplay()).toBe('0');

    await user.click(zeroButton); // Should stay "0"
    expect(getAmountDisplay()).toBe('0');

    await user.click(zeroButton); // Should stay "0"
    expect(getAmountDisplay()).toBe('0');

    await user.click(oneButton); // Should become "1"
    expect(getAmountDisplay()).toBe('1');
  });

  it('should allow "1.00" (trailing zeros after decimal are valid)', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const oneButton = screen.getByRole('button', { name: '1' });
    const decimalButton = screen.getByRole('button', { name: '.' });
    const zeroButton = screen.getByRole('button', { name: '0' });

    await user.click(oneButton); // "1"
    await user.click(decimalButton); // "1."
    await user.click(zeroButton); // "1.0"
    await user.click(zeroButton); // "1.00"

    expect(getAmountDisplay()).toBe('1.00');
  });

  it('should allow preset amounts to work correctly', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const preset10 = screen.getByRole('button', { name: '10 TON' });
    await user.click(preset10);

    expect(getAmountDisplay()).toBe('10');
  });

  it('should handle backspace correctly with leading zeros', async () => {
    const user = userEvent.setup();
    render(<AddTonModal {...defaultProps} />);

    const oneButton = screen.getByRole('button', { name: '1' });
    // The backspace button has an SVG icon but no text, so we find it by its position (last button in numpad)
    const buttons = screen.getAllByRole('button');
    const backspaceButton = buttons.find(btn => btn.querySelector('svg[class*="backspaceIcon"]'))!;

    await user.click(oneButton); // "1"
    expect(getAmountDisplay()).toBe('1');

    await user.click(backspaceButton); // Should go back to "0"
    expect(getAmountDisplay()).toBe('0');

    await user.click(backspaceButton); // Should stay "0"
    expect(getAmountDisplay()).toBe('0');
  });
});
