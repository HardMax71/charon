import axios, { AxiosError } from 'axios';
import { handleErrorWithToast, ApplicationError } from './errorHandler';

export const setupGlobalErrorHandler = () => {
  axios.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        let message = 'Server error occurred';

        if (typeof data === 'object' && data !== null && 'detail' in data) {
          message = String(data.detail);
        } else if (typeof data === 'object' && data !== null && 'message' in data) {
          message = String(data.message);
        } else if (typeof data === 'string') {
          message = data;
        }

        const appError = new ApplicationError(
          message,
          `HTTP_${status}`,
          { url: error.config?.url, method: error.config?.method },
          status >= 500 ? 'error' : 'warning'
        );

        handleErrorWithToast(appError, 'API');
        return Promise.reject(appError);
      }

      if (error.request) {
        const appError = new ApplicationError(
          'Network error: Unable to reach server',
          'NETWORK_ERROR',
          { url: error.config?.url }
        );
        handleErrorWithToast(appError, 'Network');
        return Promise.reject(appError);
      }

      const appError = new ApplicationError(
        error.message || 'Request failed',
        'REQUEST_ERROR'
      );
      handleErrorWithToast(appError, 'Request');
      return Promise.reject(appError);
    }
  );

  window.addEventListener('error', (event: ErrorEvent) => {
    event.preventDefault();
    handleErrorWithToast(event.error || event.message, 'Runtime');
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    event.preventDefault();
    handleErrorWithToast(event.reason, 'Promise');
  });
};
