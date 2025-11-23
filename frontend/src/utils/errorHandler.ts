import { logger } from './logger';
import { useToastStore } from '@/stores/toastStore';

export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
  severity?: 'error' | 'warning' | 'info';
}

export class ApplicationError extends Error {
  code?: string;
  details?: unknown;
  severity: 'error' | 'warning' | 'info';

  constructor(message: string, code?: string, details?: unknown, severity: 'error' | 'warning' | 'info' = 'error') {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.details = details;
    this.severity = severity;
  }
}

export const parseError = (error: unknown): AppError => {
  if (error instanceof ApplicationError) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
      severity: error.severity,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: error.name,
      severity: 'error',
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
      severity: 'error',
    };
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return {
      message: String(error.message),
      code: 'code' in error ? String(error.code) : undefined,
      details: 'details' in error ? error.details : undefined,
      severity: 'error',
    };
  }

  return {
    message: 'An unknown error occurred',
    details: error,
    severity: 'error',
  };
};

export const handleError = (error: unknown, context?: string): AppError => {
  const appError = parseError(error);

  const logMessage = context
    ? `[${context}] ${appError.message}`
    : appError.message;

  if (appError.severity === 'error') {
    logger.error(logMessage, appError.details);
  } else if (appError.severity === 'warning') {
    logger.warn(logMessage, appError.details);
  } else {
    logger.info(logMessage, appError.details);
  }

  return appError;
};

export const handleErrorWithToast = (error: unknown, context?: string): AppError => {
  const appError = handleError(error, context);

  const toast = useToastStore.getState().addToast;

  if (appError.severity === 'error') {
    toast({
      type: 'error',
      message: appError.message,
      duration: 5000,
    });
  } else if (appError.severity === 'warning') {
    toast({
      type: 'warning',
      message: appError.message,
      duration: 4000,
    });
  }

  return appError;
};

export const createErrorHandler = (context: string) => {
  return (error: unknown) => handleErrorWithToast(error, context);
};
