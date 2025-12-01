import { useState, useCallback } from 'react';

interface UseAsyncOperationOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export const useAsyncOperation = <T = void, Args extends unknown[] = unknown[]>(
  operation: (...args: Args) => Promise<T>,
  options?: UseAsyncOperationOptions<T>
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: Args): Promise<T | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const result = await operation(...args);
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options?.onError?.(error);
        return undefined;
      } finally {
        options?.onComplete?.();
        setLoading(false);
      }
    },
    [operation, options]
  );

  return { loading, error, execute };
};
