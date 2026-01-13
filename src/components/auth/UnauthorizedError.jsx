import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function UnauthorizedError({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-lg font-semibold text-foreground mb-2">
            Acceso no autorizado
          </h1>
          
          <p className="text-sm text-muted-foreground mb-6">
            {message || 'No se pudo validar tu contexto de acceso. Por favor, intenta de nuevo.'}
          </p>

          <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-4">
            <p>Contacta al administrador del sistema si el problema persiste.</p>
          </div>
        </div>
      </div>
    </div>
  );
}