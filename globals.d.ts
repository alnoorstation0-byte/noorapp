// Global types declarations for Taj Al-Mawadah App

declare global {
  function showGlobalToast(message: string, type?: 'success' | 'error' | 'warning' | 'info'): void;

  interface Window {
    showGlobalToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  }
}

export {};
