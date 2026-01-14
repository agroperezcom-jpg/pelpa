import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, Loader2, AlertCircle, RefreshCw, Database } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminUserSetup() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const adminEmails = [
    "agroperezcom@gmail.com",
    "pelpaar@gmail.com"
  ];

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const response = await base44.functions.invoke('syncUsers', {});
      setDiagnosticData(response.data);
    } catch (error) {
      toast.error('Error al cargar diagnóstico: ' + error.message);
    } finally {
      setDiagLoading(false);
    }
  };

  const createUserInDB = async (email, fullName) => {
    try {
      const response = await base44.functions.invoke('createUserInDB', { email, full_name: fullName });
      return { email, success: response.data.success };
    } catch (error) {
      return { email, success: false, error: error.message };
    }
  };

  const setAdminRole = async (email) => {
    try {
      const response = await base44.functions.invoke('setAdminRole', { email });
      return { email, success: true, data: response.data };
    } catch (error) {
      // Try to extract meaningful error message
      const errorMsg = error.response?.data?.error || error.message;
      return { email, success: false, error: errorMsg };
    }
  };

  const handleCreateMissingUsers = async () => {
    if (!diagnosticData?.users) return;
    
    setLoading(true);
    const emailsInDB = diagnosticData.users.map(u => u.email);
    const missingEmails = adminEmails.filter(e => !emailsInDB.includes(e));

    if (missingEmails.length === 0) {
      toast.info('Todos los usuarios ya existen en la base de datos');
      setLoading(false);
      return;
    }

    const createPromises = missingEmails.map(email => 
      createUserInDB(email, email.split('@')[0])
    );
    const createResults = await Promise.all(createPromises);
    
    toast.success(`${createResults.filter(r => r.success).length}/${missingEmails.length} usuarios creados`);
    await loadDiagnostics();
    setLoading(false);
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
      await loadDiagnostics();
    } else {
      toast.error(`${successCount}/${adminEmails.length} usuarios actualizados`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Configuración de Administradores
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Asigna roles de administrador a usuarios específicos
        </p>
      </div>

      {/* DIAGNÓSTICO */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Diagnóstico de Usuarios
          </CardTitle>
          <CardDescription>
            Estado actual de usuarios en la base de datos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            onClick={loadDiagnostics}
            disabled={diagLoading}
            className="w-full"
          >
            {diagLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cargando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Cargar Diagnóstico
              </>
            )}
          </Button>

          {diagnosticData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-white border border-blue-200">
                  <p className="text-2xl font-bold text-blue-700">{diagnosticData.total}</p>
                  <p className="text-xs text-blue-600 mt-1">Usuarios en BD</p>
                </div>
                <div className="p-3 rounded-lg bg-white border border-purple-200">
                  <p className="text-2xl font-bold text-purple-700">{diagnosticData.admin_count}</p>
                  <p className="text-xs text-purple-600 mt-1">Administradores</p>
                </div>
                <div className="p-3 rounded-lg bg-white border border-amber-200">
                  <p className="text-2xl font-bold text-amber-700">{adminEmails.length - (diagnosticData.users?.filter(u => adminEmails.includes(u.email)).length || 0)}</p>
                  <p className="text-xs text-amber-600 mt-1">Faltantes</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Usuarios en base de datos:</p>
                <div className="bg-white rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
                  {diagnosticData.users?.map(u => (
                    <div key={u.id} className="p-3 border-b last:border-b-0 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{u.email}</p>
                        <p className="text-xs text-gray-500">{u.full_name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                  {!diagnosticData.users?.length && (
                    <div className="p-4 text-center text-gray-500 text-sm">No hay usuarios en la BD</div>
                  )}
                </div>
              </div>

              {adminEmails.some(e => !diagnosticData.users?.find(u => u.email === e)) && (
                <Button 
                  onClick={handleCreateMissingUsers}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando usuarios...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Crear Usuarios Faltantes
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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