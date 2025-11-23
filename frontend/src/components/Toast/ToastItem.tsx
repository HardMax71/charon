import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Toast, useToastStore } from '@/stores/toastStore';

interface ToastItemProps {
  toast: Toast;
}

export const ToastItem = ({ toast }: ToastItemProps) => {
  const [isExiting, setIsExiting] = useState(false);
  const removeToast = useToastStore((state) => state.removeToast);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => removeToast(toast.id), 300);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, (toast.duration ?? 5000) - 300);

    return () => clearTimeout(timer);
  }, [toast.duration]);

  const config = {
    success: {
      icon: CheckCircle2,
      className: 'bg-teal-50 border-teal-200 text-teal-900',
      iconClass: 'text-teal-600',
    },
    error: {
      icon: AlertCircle,
      className: 'bg-rose-50 border-rose-200 text-rose-900',
      iconClass: 'text-rose-600',
    },
    warning: {
      icon: AlertTriangle,
      className: 'bg-amber-50 border-amber-200 text-amber-900',
      iconClass: 'text-amber-600',
    },
    info: {
      icon: Info,
      className: 'bg-blue-50 border-blue-200 text-blue-900',
      iconClass: 'text-blue-600',
    },
  };

  const { icon: Icon, className, iconClass } = config[toast.type];

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg
        min-w-[300px] max-w-[500px] pointer-events-auto
        transition-all duration-300 ease-in-out
        ${className}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconClass}`} />

      <p className="flex-1 text-sm font-medium leading-tight">
        {toast.message}
      </p>

      <button
        onClick={handleRemove}
        aria-label="Close notification"
        title="Close"
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
