import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle, DollarSign, Clock } from "lucide-react";

export default function BudgetDeviationControl({ budget, phases = [], tasks = [] }) {
  if (!budget || budget.status !== "aprobado") {
    return (
      <Card className="border-2 border-slate-200">
        <CardContent className="p-8 text-center">
          <p className="text-slate-500">No hay presupuesto aprobado para controlar desviaciones</p>
        </CardContent>
      </Card>
    );
  }

  const totalEstimado = budget.total_costos_estimados || 0;
  const totalReal = budget.total_costos_reales || 0;
  const desviacion = totalReal - totalEstimado;
  const desviacionPorcentaje = totalEstimado > 0 ? (desviacion / totalEstimado) * 100 : 0;
  const umbral = budget.umbral_alerta_desviacion || 10;
  
  const horasEstimadas = budget.recursos_humanos?.horas_estimadas || 0;
  const horasReales = budget.recursos_humanos?.horas_reales || 0;
  const desviacionHoras = horasReales - horasEstimadas;
  const desviacionHorasPorcentaje = horasEstimadas > 0 ? (desviacionHoras / horasEstimadas) * 100 : 0;

  const enAlerta = Math.abs(desviacionPorcentaje) > umbral;
  const sobrePasado = desviacion > 0;

  const getDeviationColor = (deviation) => {
    if (Math.abs(deviation) <= 5) return "text-green-600";
    if (Math.abs(deviation) <= umbral) return "text-amber-600";
    return "text-red-600";
  };

  const getDeviationBgColor = (deviation) => {
    if (Math.abs(deviation) <= 5) return "bg-green-50 border-green-200";
    if (Math.abs(deviation) <= umbral) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <div className="space-y-4">
      {enAlerta && (
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-bold text-red-900">¡Desviación crítica detectada!</p>
                <p className="text-xs text-red-700">
                  El proyecto ha superado el umbral de alerta del {umbral}% ({desviacionPorcentaje.toFixed(1)}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Resumen General */}
        <Card className={`border-2 ${getDeviationBgColor(desviacionPorcentaje)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Control de Costos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500">Estimado</p>
                <p className="text-lg font-bold text-slate-800">
                  ${totalEstimado.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Real</p>
                <p className={`text-lg font-bold ${getDeviationColor(desviacionPorcentaje)}`}>
                  ${totalReal.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-slate-600">Desviación</p>
                <div className="flex items-center gap-1">
                  {sobrePasado ? (
                    <TrendingUp className={`h-3 w-3 ${getDeviationColor(desviacionPorcentaje)}`} />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-green-600" />
                  )}
                  <span className={`text-sm font-bold ${getDeviationColor(desviacionPorcentaje)}`}>
                    {desviacion >= 0 ? '+' : ''}{desviacionPorcentaje.toFixed(1)}%
                  </span>
                </div>
              </div>
              <Progress 
                value={Math.min((totalReal / totalEstimado) * 100, 100)} 
                className="h-2"
              />
              <p className={`text-xs mt-1 ${getDeviationColor(desviacionPorcentaje)}`}>
                {sobrePasado 
                  ? `Sobre presupuesto: $${desviacion.toLocaleString()}`
                  : `Bajo presupuesto: $${Math.abs(desviacion).toLocaleString()}`
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Control de Horas */}
        <Card className={`border-2 ${getDeviationBgColor(desviacionHorasPorcentaje)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Control de Horas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500">Estimadas</p>
                <p className="text-lg font-bold text-slate-800">
                  {horasEstimadas}h
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Reales</p>
                <p className={`text-lg font-bold ${getDeviationColor(desviacionHorasPorcentaje)}`}>
                  {horasReales}h
                </p>
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-slate-600">Desviación</p>
                <div className="flex items-center gap-1">
                  {desviacionHoras > 0 ? (
                    <TrendingUp className={`h-3 w-3 ${getDeviationColor(desviacionHorasPorcentaje)}`} />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-green-600" />
                  )}
                  <span className={`text-sm font-bold ${getDeviationColor(desviacionHorasPorcentaje)}`}>
                    {desviacionHoras >= 0 ? '+' : ''}{desviacionHorasPorcentaje.toFixed(1)}%
                  </span>
                </div>
              </div>
              <Progress 
                value={Math.min((horasReales / horasEstimadas) * 100, 100)} 
                className="h-2"
              />
              <p className={`text-xs mt-1 ${getDeviationColor(desviacionHorasPorcentaje)}`}>
                {desviacionHoras >= 0 ? '+' : ''}{desviacionHoras}h de diferencia
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalle por Fases */}
      {budget.costos_por_fase && budget.costos_por_fase.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Desviación por Fase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {budget.costos_por_fase.map((fase, idx) => {
                const estimado = fase.costo_estimado || 0;
                const real = fase.costo_real || 0;
                const desv = real - estimado;
                const desvPct = estimado > 0 ? (desv / estimado) * 100 : 0;

                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{fase.phase_name}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>Est: ${estimado.toLocaleString()}</span>
                        <span>Real: ${real.toLocaleString()}</span>
                      </div>
                    </div>
                    <Badge className={
                      Math.abs(desvPct) <= 5 ? "bg-green-100 text-green-700" :
                      Math.abs(desvPct) <= umbral ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }>
                      {desvPct >= 0 ? '+' : ''}{desvPct.toFixed(1)}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalle por Costos Externos */}
      {budget.costos_externos && budget.costos_externos.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Costos Externos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {budget.costos_externos.map((costo, idx) => {
                const estimado = costo.costo_estimado || 0;
                const real = costo.costo_real || 0;
                const desv = real - estimado;
                const desvPct = estimado > 0 ? (desv / estimado) * 100 : 0;

                return (
                  <div key={idx} className="flex items-center justify-between p-2 border-b">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{costo.concepto}</p>
                      <p className="text-xs text-slate-500">{costo.proveedor}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">${real.toLocaleString()}</p>
                      <p className={`text-xs ${getDeviationColor(desvPct)}`}>
                        {desvPct >= 0 ? '+' : ''}{desvPct.toFixed(0)}%
                      </p>
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