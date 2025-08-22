// Safe wrappers for localStorage access to support non-browser environments
export const safeLocalStorage = {
  getItem: (key: string) =>
    typeof window !== 'undefined' ? window.localStorage.getItem(key) : null,
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  }
};