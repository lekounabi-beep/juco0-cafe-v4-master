/**
 * Error Handler Utility
 * Converts technical errors into user-friendly messages
 */

export type ErrorType = 
  | 'network'
  | 'auth'
  | 'validation'
  | 'not_found'
  | 'permission'
  | 'server'
  | 'unknown';

export interface UserFriendlyError {
  type: ErrorType;
  title: string;
  message: string;
  action?: string;
  technical?: string;
}

export class ErrorHandler {
  private static errorMessages: Record<ErrorType, { title: string; message: string; action?: string }> = {
    network: {
      title: 'Σφάλμα Σύνδεσης',
      message: 'Δεν υπάρχει σύνδεση στο διαδίκτυο. Παρακαλώ ελέγξτε τη σύνδεσή σας και προσπαθήστε ξανά.',
      action: 'Ελέγξτε τη σύνδεσή σας στο διαδίκτυο'
    },
    auth: {
      title: 'Σφάλμα Ταυτοποίησης',
      message: 'Η συνεδρία σας έληξε. Παρακαλώ συνδεθείτε ξανά.',
      action: 'Συνδεθείτε ξανά'
    },
    validation: {
      title: 'Σφάλμα Επικύρωσης',
      message: 'Παρακαλώ ελέγξτε τα στοιχεία που εισάγατε και προσπαθήστε ξανά.',
      action: 'Ελέγξτε τα στοιχεία σας'
    },
    not_found: {
      title: 'Δεν Βρέθηκε',
      message: 'Το στοιχείο που ζητήσατε δεν βρέθηκε.',
      action: 'Προσπαθήστε ξανά'
    },
    permission: {
      title: 'Σφάλμα Δικαιωμάτων',
      message: 'Δεν έχετε τα απαραίτητα δικαιώματα για αυτή την ενέργεια.',
      action: 'Επικοινωνήστε με τον διαχειριστή'
    },
    server: {
      title: 'Σφάλμα Διακομιστή',
      message: 'Παρουσιάστηκε σφάλμα στον διακομιστή. Παρακαλώ προσπαθήστε ξανά αργότερα.',
      action: 'Προσπαθήστε ξανά αργότερα'
    },
    unknown: {
      title: 'Απροσδόκητο Σφάλμα',
      message: 'Παρουσιάστηκε ένα απρόσμενο σφάλμα. Παρακαλώ προσπαθήστε ξανά.',
      action: 'Προσπαθήστε ξανά'
    }
  };

  static classifyError(error: any): ErrorType {
    if (!error) return 'unknown';
    
    // Network errors
    if (error.message?.includes('network') || 
        error.message?.includes('fetch') ||
        error.code === 'NETWORK_ERROR' ||
        !navigator.onLine) {
      return 'network';
    }
    
    // Auth errors
    if (error.message?.includes('auth') ||
        error.message?.includes('unauthorized') ||
        error.message?.includes('token') ||
        error.code === 'AUTH_ERROR') {
      return 'auth';
    }
    
    // Validation errors
    if (error.message?.includes('validation') ||
        error.message?.includes('invalid') ||
        error.code === 'VALIDATION_ERROR') {
      return 'validation';
    }
    
    // Not found errors
    if (error.message?.includes('not found') ||
        error.message?.includes('404') ||
        error.code === 'NOT_FOUND') {
      return 'not_found';
    }
    
    // Permission errors
    if (error.message?.includes('permission') ||
        error.message?.includes('forbidden') ||
        error.message?.includes('403') ||
        error.code === 'PERMISSION_ERROR') {
      return 'permission';
    }
    
    // Server errors
    if (error.message?.includes('server') ||
        error.message?.includes('500') ||
        error.code === 'SERVER_ERROR') {
      return 'server';
    }
    
    return 'unknown';
  }

  static getUserFriendlyError(error: any): UserFriendlyError {
    const type = this.classifyError(error);
    const messages = this.errorMessages[type];
    
    return {
      type,
      title: messages.title,
      message: messages.message,
      action: messages.action,
      technical: error.message || error.toString()
    };
  }

  static formatError(error: any): string {
    const userError = this.getUserFriendlyError(error);
    return `${userError.title}: ${userError.message}`;
  }

  static logError(error: any, context?: string) {
    const userError = this.getUserFriendlyError(error);
    
    console.error(`[ErrorHandler] ${context || 'Error'}:`, {
      type: userError.type,
      title: userError.title,
      message: userError.message,
      technical: userError.technical,
      originalError: error
    });
  }

  static isRetryable(error: any): boolean {
    const type = this.classifyError(error);
    return type === 'network' || type === 'server';
  }
}

/**
 * Hook for handling errors in React components
 */
export function useErrorHandler() {
  const handleError = (error: any, context?: string) => {
    const userError = ErrorHandler.getUserFriendlyError(error);
    ErrorHandler.logError(error, context);
    
    // You can integrate with toast notifications here
    // toast.error(userError.title, { description: userError.message });
    
    return userError;
  };

  const isRetryable = (error: any) => {
    return ErrorHandler.isRetryable(error);
  };

  return {
    handleError,
    isRetryable,
    getUserFriendlyError: ErrorHandler.getUserFriendlyError.bind(ErrorHandler)
  };
}

/**
 * Global error boundary handler
 */
export function handleGlobalError(error: Error, errorInfo: any) {
  ErrorHandler.logError(error, 'Global Error');
  
  // In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service (e.g., Sentry, LogRocket)
    console.error('Production error:', error, errorInfo);
  }
}
