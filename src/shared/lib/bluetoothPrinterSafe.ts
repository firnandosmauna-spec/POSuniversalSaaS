import { printWithWebBluetooth } from '@/shared/lib/bluetoothPrinter';

/**
 * Wrapper that attempts to print via Web Bluetooth. If the API is unavailable (e.g.,
 * running on an insecure origin or unsupported browser), it falls back to a mock
 * implementation that simply resolves after a short delay. This keeps the UI
 * functional during development on mobile browsers.
 */
export const printWithWebBluetoothSafe = async (textToPrint: string) => {
  if (!(navigator as any).bluetooth) {
    console.warn('Web Bluetooth API tidak didukung – menggunakan mock printer untuk development');
    // Simulate a short async delay
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    return true;
  }
  // Real implementation – may throw on failure
  return await printWithWebBluetooth(textToPrint);
};
