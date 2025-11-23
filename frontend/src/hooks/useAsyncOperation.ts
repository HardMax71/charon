import { useState, useCallback } from 'react';

interface UseAsyncOperationOptions<T> {
  onSuccess?: (result: T) => void;
  onComplete?: () => void;
}

export const useAsyncOperation = <T = void, Args extends any[] = any[]>(
  operation: (...args: Args) => Promise<T>,
  options?: UseAsyncOperationOptions<T>
) => {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (...args: Args): Promise<T | undefined> => {
      setLoading(true);

      const result = await operation(...args);
      options?.onSuccess?.(result);
      options?.onComplete?.();
      setLoading(false);

      return result;
    },
    [operation, options]
  );

  return { loading, execute };
};
