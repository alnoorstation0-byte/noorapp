// Global types declarations for Al-Noor Gas Stations App

declare global {
  function showGlobalToast(message: string, type?: 'success' | 'error' | 'warning' | 'info'): void;

  interface Window {
    showGlobalToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  }
}

export {};
