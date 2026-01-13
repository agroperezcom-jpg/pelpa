import React from 'react';
import { useExternalAuth } from '@/components/context/ExternalAuthContext';
import UnauthorizedError from './UnauthorizedError';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Guard component that ensures external auth context is valid
 * Shows loading state while checking, error if invalid, or children if valid
 */
export default function ContextGuard({ children }) {
  const { isLoading, error, isAuthenticated } = useExternalAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4 p-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !isAuthenticated) {
    return <UnauthorizedError message={error} />;
  }

  return children;
}