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
  const [authContext, setAuthContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeContext = async () => {
      try {
        // Check for external auth context from gateway
        const context = window.__AUTH_CONTEXT__;
        
        if (!context) {
          throw new Error('No external authentication context provided');
        }

        // Validate required fields
        const required = ['user_email', 'user_full_name', 'company_id', 'role', 'environment_mode'];
        const missing = required.filter(field => !context[field]);
        
        if (missing.length > 0) {
          throw new Error(`Missing required context fields: ${missing.join(', ')}`);
        }

        // Validate role - CRITICAL: admin check is done here
        if (!['admin', 'user'].includes(context.role)) {
          throw new Error('Invalid role in context');
        }

        // Validate environment_mode
        if (!['DEMO', 'PRODUCCION'].includes(context.environment_mode)) {
          throw new Error('Invalid environment_mode in context');
        }

        // Clear any cached permissions to force fresh evaluation
        sessionStorage.removeItem('cached_permissions');
        
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
    
    // Re-evaluate context when window regains focus (login refresh)
    const handleFocus = () => initializeContext();
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const value = {
    authContext,
    isLoading,
    error,
    isAuthenticated: !!authContext,
    user: authContext ? {
      email: authContext.user_email,
      full_name: authContext.user_full_name,
      role: authContext.role
    } : null,
    companyId: authContext?.company_id,
    environmentMode: authContext?.environment_mode,
    isAdmin: authContext?.role === 'admin',
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