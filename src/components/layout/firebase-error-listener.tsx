
'use client';

import { useEffect, useCallback } from 'react';
import { errorEmitter } from '@/lib/error-emitter';
import { type PermissionError } from '@/lib/errors';

// This is a client component that listens for permission errors
// and re-throws them so they can be caught by the Next.js development overlay,
// providing a rich debugging experience for security rules.
// It is intended to be used in the root layout of the application.
export function FirebaseErrorListener({ children }: { children: React.ReactNode }) {

    const handlePermissionError = useCallback((error: PermissionError) => {
        // Re-throw the error to make it visible in the Next.js error overlay
        // during development. This provides a much better debugging experience
        // for security rule violations than a simple console.log or toast.
        throw error;
    }, []);

    useEffect(() => {
        errorEmitter.on('permission-error', handlePermissionError);

        return () => {
            errorEmitter.off('permission-error', handlePermissionError);
        };
    }, [handlePermissionError]);

    return <>{children}</>;
}
