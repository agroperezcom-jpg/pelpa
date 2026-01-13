import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function EstadoResultadosWidget({ mesInicio, mesFin }) {
  const { data: ventas = [] } = useQuery({
    queryKey: ['ventas'],
    queryFn: () => base44.entities.Sale.list('-created_date', 1000)
  });

  const { data: gastos = [] } = useQuery({
    queryKey: ['gastos'],
    queryFn: () => base44.entities.Expense.list('-date', 1000)
  });

  const { data: cuentasContables = [] } = useQuery({
    queryKey: ['cuentasContables'],
    queryFn: () => base44.entities.CuentaContable.list()
  });

  // Filtrar por período
  const ventasPeriodo = ventas.filter(v => 
    v.estado === 'CONFIRMADA' &&
    v.cuenta_contable_id &&
    v.created_date >= mesInicio && 
    v.created_date <= mesFin + 'T23:59:59'
  );

  const gastosPeriodo = gastos.filter(g => 
    g.cuenta_contable_id &&
    g.date >= mesInicio && 
    g.date <= mesFin
  );

  // INGRESOS
  const totalIngresos = ventasPeriodo.reduce((sum, v) => sum + (v.total || 0), 0);

  // COSTOS
  const totalCostos = gastosPeriodo
    .filter(g => {
      const cuenta = cuentasContables.find(c => c.id === g.cuenta_contable_id);
      return cuenta?.tipo_resultado === 'Costo';
    })
    .reduce((sum, g) => sum + (g.amount || 0), 0);

  // UTILIDAD BRUTA
  const utilidadBruta = totalIngresos - totalCostos;
  const margenBruto = totalIngresos > 0 ? (utilidadBruta / totalIngresos * 100) : 0;

  // GASTOS
  const totalGastos = gastosPeriodo
    .filter(g => {
      const cuenta = cuentasContables.find(c => c.id === g.cuenta_contable_id);
      return cuenta?.tipo_resultado === 'Gasto';
    })
    .reduce((sum, g) => sum + (g.amount || 0), 0);

  // UTILIDAD OPERATIVA
  const utilidadOperativa = utilidadBruta - totalGastos;
  const margenOperativo = totalIngresos > 0 ? (utilidadOperativa / totalIngresos * 100) : 0;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          Estado de Resultados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div>
            <p className="text-xs text-green-700 font-medium uppercase">Ingresos</p>
            <p className="text-xl font-bold text-green-600 mt-1">${totalIngresos.toLocaleString()}</p>
          </div>
          <TrendingUp className="h-5 w-5 text-green-600" />
        </div>

        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
          <div>
            <p className="text-xs text-red-700 font-medium uppercase">Costos</p>
            <p className="text-xl font-bold text-red-600 mt-1">${totalCostos.toLocaleString()}</p>
          </div>
          <TrendingDown className="h-5 w-5 text-red-600" />
        </div>

        <div className="flex items-center justify-between p-4 bg-blue-100 rounded-lg border-2 border-blue-300">
          <div>
            <p className="text-xs text-blue-800 font-medium uppercase">Utilidad Bruta</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">${utilidadBruta.toLocaleString()}</p>
            <p className="text-xs text-blue-600 mt-1">Margen: {margenBruto.toFixed(1)}%</p>
          </div>
          <ArrowRight className="h-5 w-5 text-blue-700" />
        </div>

        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
          <div>
            <p className="text-xs text-orange-700 font-medium uppercase">Gastos Operativos</p>
            <p className="text-xl font-bold text-orange-600 mt-1">${totalGastos.toLocaleString()}</p>
          </div>
          <TrendingDown className="h-5 w-5 text-orange-600" />
        </div>

        <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
          utilidadOperativa >= 0 
            ? 'bg-green-100 border-green-400' 
            : 'bg-red-100 border-red-400'
        }`}>
          <div>
            <p className={`text-xs font-medium uppercase ${
              utilidadOperativa >= 0 ? 'text-green-800' : 'text-red-800'
            }`}>
              Utilidad Operativa
            </p>
            <p className={`text-2xl font-bold mt-1 ${
              utilidadOperativa >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              ${utilidadOperativa.toLocaleString()}
            </p>
            <p className={`text-xs mt-1 ${
              utilidadOperativa >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              Margen: {margenOperativo.toFixed(1)}%
            </p>
          </div>
          <DollarSign className={`h-6 w-6 ${
            utilidadOperativa >= 0 ? 'text-green-700' : 'text-red-700'
          }`} />
        </div>
      </CardContent>
    </Card>
  );
}