import { useRef } from 'react';

const useDebounce = <T extends (...args: any[]) => void>(func: T, delay: number) => {
  const timeoutId = useRef<number | null>(null);

  const debouncedFunc = (...args: Parameters<T>) => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }

    timeoutId.current = window.setTimeout(() => {
      func(...args);
      timeoutId.current = null; // Reset after execution
    }, delay);
  };

  const cancelDebounce = () => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
  }

  return [debouncedFunc, cancelDebounce];
};

export default useDebounce;