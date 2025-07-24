import { useState } from 'react';

// Helper function to revive Date objects from JSON
const dateReviver = (key: string, value: any) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date;
  }
  return value;
};

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      
      const parsed = JSON.parse(item, dateReviver);
      return parsed;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      // Clear corrupted data
      try {
        window.localStorage.removeItem(key);
      } catch (clearError) {
        console.error(`Error clearing corrupted localStorage key "${key}":`, clearError);
      }
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}