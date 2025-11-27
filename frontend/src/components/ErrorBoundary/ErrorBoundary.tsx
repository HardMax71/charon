import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToastStore } from '@/stores/toastStore';
import { handleError } from '@/utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    const appError = handleError(error, 'React');

    useToastStore.getState().addToast({
      type: 'error',
      message: appError.message,
      duration: 6000,
    });

    if (import.meta.env.PROD) {
      // TODO: Send to error reporting service (Sentry, LogRocket, etc.)
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-lg">
            {/* Error icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-semibold text-slate-900 text-center mb-2">
              Something went wrong
            </h2>

            {/* Description */}
            <p className="text-slate-500 text-center mb-6">
              The application encountered an unexpected error. Please try refreshing the page.
            </p>

            {/* Error details (dev only) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                <summary className="cursor-pointer font-medium text-slate-700 mb-2">
                  Error Details
                </summary>
                <pre className="text-xs overflow-auto text-red-600 mt-2 p-2 bg-white rounded-lg border border-slate-100">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReset} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.href = '/'}
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
