import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminUserSetup() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const adminEmails = [
    "agroperezcom@gmail.com",
    "pelpaar@gmail.com"
  ];

  const setAdminRole = async (email) => {
    try {
      const response = await base44.functions.invoke('setAdminRole', { email });
      return { email, success: true, data: response.data };
    } catch (error) {
      return { email, success: false, error: error.message };
    }
  };

  const handleSetAllAdmins = async () => {
    setLoading(true);
    setResults([]);

    const promises = adminEmails.map(email => setAdminRole(email));
    const resultsArray = await Promise.all(promises);
    
    setResults(resultsArray);
    setLoading(false);

    const successCount = resultsArray.filter(r => r.success).length;
    if (successCount === adminEmails.length) {
      toast.success('Todos los usuarios actualizados a ADMIN correctamente');
    } else {
      toast.error(`${successCount}/${adminEmails.length} usuarios actualizados`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Configuración de Administradores
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Asigna roles de administrador a usuarios específicos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios Administradores</CardTitle>
          <CardDescription>
            Los siguientes usuarios serán marcados como ADMIN con acceso completo al módulo de Configuración
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {adminEmails.map(email => (
              <div key={email} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-sm font-medium">{email}</span>
                {results.find(r => r.email === email)?.success && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
                {results.find(r => r.email === email)?.success === false && (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
              </div>
            ))}
          </div>

          <Button 
            onClick={handleSetAllAdmins} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Actualizando usuarios...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Asignar Rol de Administrador
              </>
            )}
          </Button>

          {results.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Resultados:</p>
              {results.map(result => (
                <div 
                  key={result.email} 
                  className={`p-3 rounded-lg text-sm ${
                    result.success 
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                      : 'bg-red-50 text-red-900 border border-red-200'
                  }`}
                >
                  <p className="font-medium">{result.email}</p>
                  <p className="text-xs mt-1">
                    {result.success ? '✓ Actualizado correctamente' : `✗ Error: ${result.error}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-900">
                Importante
              </p>
              <p className="text-sm text-amber-700">
                Los usuarios deberán cerrar sesión y volver a iniciar sesión para que los cambios surtan efecto.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}