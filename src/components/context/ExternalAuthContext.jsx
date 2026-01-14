import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * External Authentication Context
 * Manages user context provided by external Auth Gateway
 * 
 * Expected context from window.__AUTH_CONTEXT__:
 * {
 *   user_email: string,
 *   user_full_name: string,
 *   company_id: string,
 *   role: 'admin' | 'user',
 *   environment_mode: 'DEMO' | 'PRODUCCION'
 * }
 */
const ExternalAuthContext = createContext(null);

export function ExternalAuthProvider({ children }) {
  const [authContext, setAuthContext] = useState(undefined); // undefined = loading
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeContext = async () => {
      try {
        // Check for external auth context from gateway
        const context = window.__AUTH_CONTEXT__;
        
        if (!context) {
          // No context = unauthenticated (null)
          setAuthContext(null);
          setError(null);
          setIsLoading(false);
          return;
        }

        // Validate required fields
        const required = ['user_email', 'user_full_name', 'company_id', 'role', 'environment_mode'];
        const missing = required.filter(field => !context[field]);
        
        if (missing.length > 0) {
          throw new Error(`Missing required context fields: ${missing.join(', ')}`);
        }

        // Validate role - CRITICAL: admin check is single source of truth
        if (!['admin', 'user'].includes(context.role)) {
          throw new Error('Invalid role in context');
        }

        // Validate environment_mode
        if (!['DEMO', 'PRODUCCION'].includes(context.environment_mode)) {
          throw new Error('Invalid environment_mode in context');
        }

        // Clear cached permissions to force fresh evaluation
        sessionStorage.removeItem('cached_permissions');
        
        // Context is valid - set authenticated
        setAuthContext(context);
        setError(null);
      } catch (err) {
        console.error('Auth context initialization failed:', err);
        setError(err.message);
        setAuthContext(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeContext();
    
    // Re-evaluate context on focus (login/refresh)
    const handleFocus = () => {
      setIsLoading(true);
      initializeContext();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Build user object from authContext - single source of truth
  const user = authContext ? {
    email: authContext.user_email,
    full_name: authContext.user_full_name,
    role: authContext.role,
    company_id: authContext.company_id,
    environment_mode: authContext.environment_mode
  } : null;

  const value = {
    authContext,
    isLoading,
    error,
    isAuthenticated: !!authContext,
    user,
    companyId: authContext?.company_id,
    environmentMode: authContext?.environment_mode,
    isAdmin: user?.role === 'admin', // Direct check from user object
    isDemo: authContext?.environment_mode === 'DEMO',
    isProduction: authContext?.environment_mode === 'PRODUCCION'
  };

  return (
    <ExternalAuthContext.Provider value={value}>
      {children}
    </ExternalAuthContext.Provider>
  );
}

export function useExternalAuth() {
  const context = useContext(ExternalAuthContext);
  if (!context) {
    throw new Error('useExternalAuth must be used within ExternalAuthProvider');
  }
  return context;
}