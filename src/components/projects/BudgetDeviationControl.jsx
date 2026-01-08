import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Package,
  RefreshCw
} from "lucide-react";

export default function BudgetDeviationControl({ budget, phases, tasks }) {
  const [realCosts, setRealCosts] = useState({
    costos_fijos_real: budget.costos_fijos || 0,
    costos_variables_real: budget.costos_variables || 0,
    horas_reales: budget.recursos_humanos?.horas_reales || 0,
    costos_externos_real: budget.costos_externos?.map(c => c.costo_real || 0) || []
  });

  const queryClient = useQueryClient();

  const updateBudgetMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ProjectBudget.update(budget.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectBudgets'] });
    }
  });

  const handleSaveRealCosts = () => {
    const horasReales = parseFloat(realCosts.horas_reales) || 0;
    const costoHora = budget.recursos_humanos?.costo_hora || 0;
    const totalRRHHReal = horasReales * costoHora;

    const costosFijosReal = parseFloat(realCosts.costos_fijos_real) || 0;
    const costosVariablesReal = parseFloat(realCosts.costos_variables_real) || 0;

    const totalCostosExternosReal = (budget.costos_externos || []).reduce((sum, costo, idx) => {
      return sum + (parseFloat(realCosts.costos_externos_real[idx]) || 0);
    }, 0);

    const totalCostosReales = costosFijosReal + costosVariablesReal + totalRRHHReal + totalCostosExternosReal;
    const totalCostosEstimados = budget.total_costos_estimados || 0;
    const desviacionPorcentaje = totalCostosEstimados > 0 
      ? ((totalCostosReales - totalCostosEstimados) / totalCostosEstimados * 100) 
      : 0;

    const newCostosExternos = (budget.costos_externos || []).map((costo, idx) => ({
      ...costo,
      costo_real: parseFloat(realCosts.costos_externos_real[idx]) || 0
    }));

    updateBudgetMutation.mutate({
      costos_fijos: costosFijosReal,
      costos_variables: costosVariablesReal,
      recursos_humanos: {
        ...budget.recursos_humanos,
        horas_reales: horasReales,
        total_real: totalRRHHReal
      },
      costos_externos: newCostosExternos,
      total_costos_reales: totalCostosReales,
      desviacion_porcentaje: desviacionPorcentaje
    });
  };

  const totalCostosEstimados = budget.total_costos_estimados || 0;
  const totalCostosReales = budget.total_costos_reales || 0;
  const desviacion = totalCostosReales - totalCostosEstimados;
  const desviacionPorcentaje = budget.desviacion_porcentaje || 0;
  const umbralAlerta = budget.umbral_alerta_desviacion || 10;

  const tieneAlerta = Math.abs(desviacionPorcentaje) > umbralAlerta;
  const esNegativo = desviacion < 0;
  const progresoEjecucion = totalCostosEstimados > 0 
    ? Math.min((totalCostosReales / totalCostosEstimados) * 100, 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Alerta de Desviación */}
      {tieneAlerta && (
        <Alert className={`border-2 ${esNegativo ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <AlertTriangle className={`h-4 w-4 ${esNegativo ? 'text-green-600' : 'text-red-600'}`} />
          <AlertDescription className={esNegativo ? 'text-green-800' : 'text-red-800'}>
            <strong>Desviación del {Math.abs(desviacionPorcentaje).toFixed(1)}%</strong>
            {esNegativo 
              ? ' - El proyecto está por debajo del presupuesto estimado'
              : ' - El proyecto ha superado el presupuesto estimado'}
          </AlertDescription>
        </Alert>
      )}

      {/* Resumen Ejecutivo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-medium text-slate-500 uppercase">Estimado</p>
            </div>
            <p className="text-xl font-bold text-slate-800">
              ${totalCostosEstimados.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <p className="text-xs font-medium text-slate-500 uppercase">Real</p>
            </div>
            <p className="text-xl font-bold text-green-600">
              ${totalCostosReales.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {desviacion >= 0 ? (
                <TrendingUp className="h-4 w-4 text-red-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-600" />
              )}
              <p className="text-xs font-medium text-slate-500 uppercase">Desviación</p>
            </div>
            <p className={`text-xl font-bold ${desviacion >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {desviacion >= 0 ? '+' : ''}${desviacion.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-purple-600" />
              <p className="text-xs font-medium text-slate-500 uppercase">Ejecución</p>
            </div>
            <p className="text-xl font-bold text-purple-600">
              {progresoEjecucion.toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Progreso */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Ejecución Presupuestaria</p>
              <Badge variant={tieneAlerta ? (esNegativo ? 'default' : 'destructive') : 'secondary'}>
                {desviacionPorcentaje.toFixed(1)}%
              </Badge>
            </div>
            <Progress 
              value={progresoEjecucion} 
              className={`h-3 ${tieneAlerta && !esNegativo ? 'bg-red-100' : 'bg-slate-100'}`}
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>Estimado: ${totalCostosEstimados.toLocaleString()}</span>
              <span>Real: ${totalCostosReales.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registro de Costos Reales */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            Actualizar Costos Reales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Costos Fijos Reales</Label>
              <Input
                type="number"
                step="0.01"
                value={realCosts.costos_fijos_real}
                onChange={(e) => setRealCosts({ ...realCosts, costos_fijos_real: e.target.value })}
                placeholder={`Estimado: $${budget.costos_fijos?.toLocaleString() || 0}`}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Costos Variables Reales</Label>
              <Input
                type="number"
                step="0.01"
                value={realCosts.costos_variables_real}
                onChange={(e) => setRealCosts({ ...realCosts, costos_variables_real: e.target.value })}
                placeholder={`Estimado: $${budget.costos_variables?.toLocaleString() || 0}`}
              />
            </div>
          </div>

          {/* Recursos Humanos Reales */}
          <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
            <Label className="text-sm font-semibold">Recursos Humanos - Horas Trabajadas</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Horas Reales</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={realCosts.horas_reales}
                  onChange={(e) => setRealCosts({ ...realCosts, horas_reales: e.target.value })}
                  placeholder={`Estimado: ${budget.recursos_humanos?.horas_estimadas || 0}h`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Costo Total RRHH</Label>
                <p className="text-lg font-bold text-blue-600 mt-2">
                  ${((parseFloat(realCosts.horas_reales) || 0) * (budget.recursos_humanos?.costo_hora || 0)).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Costos Externos Reales */}
          {budget.costos_externos && budget.costos_externos.length > 0 && (
            <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
              <Label className="text-sm font-semibold">Costos Externos Reales</Label>
              <div className="space-y-2">
                {budget.costos_externos.map((costo, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 items-center">
                    <p className="text-sm font-medium text-slate-700">{costo.concepto}</p>
                    <p className="text-xs text-slate-500">Est: ${costo.costo_estimado?.toLocaleString()}</p>
                    <Input
                      type="number"
                      step="0.01"
                      value={realCosts.costos_externos_real[idx] || ""}
                      onChange={(e) => {
                        const newArray = [...realCosts.costos_externos_real];
                        newArray[idx] = e.target.value;
                        setRealCosts({ ...realCosts, costos_externos_real: newArray });
                      }}
                      placeholder="Real"
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSaveRealCosts}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={updateBudgetMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${updateBudgetMutation.isPending ? 'animate-spin' : ''}`} />
              {updateBudgetMutation.isPending ? 'Guardando...' : 'Guardar Costos Reales'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Desglose por Fase */}
      {budget.costos_por_fase && budget.costos_por_fase.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Desglose por Fase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {budget.costos_por_fase.map((fase, idx) => {
                const estimado = fase.costo_estimado || 0;
                const real = fase.costo_real || 0;
                const desviacionFase = real - estimado;
                const porcentajeFase = estimado > 0 ? (desviacionFase / estimado * 100) : 0;

                return (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-slate-700">{fase.phase_name}</p>
                      <Badge variant={Math.abs(porcentajeFase) > 10 ? 'destructive' : 'secondary'} className="text-xs">
                        {porcentajeFase >= 0 ? '+' : ''}{porcentajeFase.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">Estimado</p>
                        <p className="font-medium">${estimado.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Real</p>
                        <p className="font-medium">${real.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Diferencia</p>
                        <p className={`font-medium ${desviacionFase >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {desviacionFase >= 0 ? '+' : ''}${desviacionFase.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}