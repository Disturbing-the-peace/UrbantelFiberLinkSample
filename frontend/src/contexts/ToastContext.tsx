'use client';

import { createContext, useContext, ReactNode } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  loading: (message: string) => string;
  dismiss: (toastId: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const contextValue: ToastContextType = {
    success: (message: string) => {
      toast.success(message, {
        duration: 4000,
        position: 'top-right',
      });
    },
    error: (message: string) => {
      toast.error(message, {
        duration: 5000,
        position: 'top-right',
      });
    },
    loading: (message: string) => {
      return toast.loading(message, {
        position: 'top-right',
      });
    },
    dismiss: (toastId: string) => {
      toast.dismiss(toastId);
    },
  };

  return (
    <ToastContext.Provider value={contextValue}>
      <Toaster
        toastOptions={{
          className: '',
          style: {
            padding: '16px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
