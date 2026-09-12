// Global types declarations for WaterApp

declare global {
  function showGlobalToast(message: string, type?: 'success' | 'error' | 'warning' | 'info'): void;

  interface Window {
    showGlobalToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  }
}

export {};
